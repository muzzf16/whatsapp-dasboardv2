const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const configService = require('./configService');

const fs = require('fs');
const aiService = require('./aiService');
const googleSheetsService = require('./googleSheetsService');
const autoReplyService = require('./autoReplyService');
const databaseService = require('./databaseService');

class Connection {
    constructor(connectionId, io) {
        if (!connectionId || typeof connectionId !== 'string' || connectionId.trim() === '') {
            console.error('FATAL: Invalid connectionId provided to Connection constructor', connectionId);
            throw new Error('Invalid connectionId');
        }
        this.connectionId = connectionId;
        this.io = io;
        this.sock = null;
        this.qrCodeData = null;
        this.connectionStatus = 'disconnected';
        this.messageLogs = [];
        this.outgoingMessageLogs = [];
        this.authDir = path.join('auth_info_multi_device', this.connectionId);
        this.lastDisconnectInfo = null;
        this.reconnectDelay = 1000; // ms
        this.reconnectMaxDelay = 30000; // ms
        this.reconnectTimer = null;
    }

    async connect() {
        try {
            console.log(`[${this.connectionId}] Initiating WhatsApp connection. authDir=${this.authDir}`);
            const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: 'silent' }),
            });

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    this.qrCodeData = qr;
                    this.connectionStatus = 'waiting for QR scan';
                    try {
                        const qrUrl = await qrcode.toDataURL(qr);
                        this.io.emit('qr_code', { connectionId: this.connectionId, qrUrl });
                        this.io.emit('status', { connectionId: this.connectionId, status: this.connectionStatus });
                    } catch (err) {
                        console.error(`[${this.connectionId}] Failed to generate QR code URL`, err);
                    }
                }

                if (connection === 'close') {
                    // store the lastDisconnect info for diagnostics and emit event
                    this.lastDisconnectInfo = lastDisconnect || null;
                    // Write last disconnect details to a log for debugging
                    try {
                        const logsDir = path.join(__dirname, '..', 'logs');
                        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
                        const fn = path.join(logsDir, `${this.connectionId}-lastDisconnect.json`);
                        fs.writeFileSync(fn, JSON.stringify({ timestamp: new Date().toISOString(), lastDisconnect: this.lastDisconnectInfo }, null, 2));
                    } catch (err) {
                        console.warn(`[${this.connectionId}] Failed to write lastDisconnect log:`, err?.message || err);
                    }
                    const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                    const reason = lastDisconnect?.error || lastDisconnect;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    this.connectionStatus = 'disconnected';
                    this.io.emit('status', { connectionId: this.connectionId, status: this.connectionStatus });
                    // Send webhook about status change so external monitoring can act
                    this.callWebhook({ event: 'status_change', connectionId: this.connectionId, status: this.connectionStatus, reason: this.lastDisconnectInfo });
                    console.warn(`[${this.connectionId}] connection closed. Reason:`, { statusCode, reason });
                    if (shouldReconnect) {
                        this.connectionStatus = 'reconnecting';
                        this.io.emit('status', { connectionId: this.connectionId, status: this.connectionStatus });
                        console.log(`[${this.connectionId}] Reconnecting in ${this.reconnectDelay}ms...`);
                        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
                        this.reconnectTimer = setTimeout(() => {
                            this.reconnectTimer = null;
                            this.connect();
                            // Notify webhook about reconnect attempt
                            this.callWebhook({ event: 'reconnecting', connectionId: this.connectionId, delayMs: this.reconnectDelay, reason: this.lastDisconnectInfo });
                        }, this.reconnectDelay);
                        // Exponential backoff for reconnects
                        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.reconnectMaxDelay);
                    } else {
                        console.log(`[${this.connectionId}] Logged out or disqualified, not reconnecting.`);
                        this.io.emit('status', { connectionId: this.connectionId, status: 'logged out', reason: statusCode || (reason && reason.message) || 'unknown' });
                        // Send webhook specifically for logout events
                        this.callWebhook({ event: 'session_logged_out', connectionId: this.connectionId, reason: this.lastDisconnectInfo });

                        // Explicitly clear auth if 401 (Unauthorized) or Conflict
                        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                            console.log(`[${this.connectionId}] Session invalid (401/Logged Out). Clearing auth data.`);
                            this.destroy(true).catch(err => console.error(`[${this.connectionId}] Failed to destroy session:`, err));
                        }
                    }
                } else if (connection === 'open') {
                    // reset reconnect backoff
                    this.reconnectDelay = 1000;
                    console.log(`[${this.connectionId}] Connection open.`);
                    this.connectionStatus = 'connected';
                    // Send webhook for open
                    this.callWebhook({ event: 'session_open', connectionId: this.connectionId });
                    this.qrCodeData = null;
                    this.io.emit('status', { connectionId: this.connectionId, status: this.connectionStatus });
                    this.io.emit('qr_code', { connectionId: this.connectionId, qrUrl: null });
                }
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('messages.upsert', async (m) => {
                const msg = m.messages[0];
                if (!msg.key.fromMe && m.type === 'notify') {
                    const sender = msg.key.remoteJid;

                    // Filter out status messages and group messages
                    if (sender === 'status@broadcast' || sender.endsWith('@g.us')) {
                        return;
                    }

                    // Fix for LID: Use remoteJidAlt if available and current sender is LID
                    if (sender.includes('@lid') && msg.key.remoteJidAlt) {
                        sender = msg.key.remoteJidAlt;
                    }

                    const unwrapMessage = (m) => {
                        if (!m) return null;
                        return m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message || m;
                    };

                    const messageContent = unwrapMessage(msg.message);
                    let text = '';

                    if (messageContent) {
                        text = messageContent.conversation
                            || messageContent.extendedTextMessage?.text
                            || messageContent.imageMessage?.caption
                            || messageContent.videoMessage?.caption
                            || messageContent.documentMessage?.caption
                            || messageContent.documentMessage?.fileName
                            || (messageContent.stickerMessage ? '[Sticker]' : null)
                            || (messageContent.audioMessage ? '[Audio]' : null)
                            || (messageContent.imageMessage ? '[Image]' : null)
                            || (messageContent.videoMessage ? '[Video]' : null)
                            || (messageContent.documentMessage ? '[Document]' : null)
                            || (messageContent.contactMessage ? '[Contact]' : null)
                            || (messageContent.locationMessage ? '[Location]' : null)
                            || (messageContent.protocolMessage && messageContent.protocolMessage.type === 'REVOKE' ? '[Message Revoked]' : null)
                            || 'No text content';
                    } else {
                        text = 'No text content';
                    }

                    let groupName = null;
                    if (sender.endsWith('@g.us')) {
                        const group = await this.sock.groupMetadata(sender);
                        groupName = group.subject;
                    }

                    if (!text) text = 'No text content';

                    const log = {
                        from: sender,
                        sender: sender,
                        pushName: msg.pushName,
                        text,
                        timestamp: new Date().toISOString(),
                        groupName: groupName,
                        senderName: msg.pushName,
                    };
                    // this.messageLogs.unshift(log); // Removed in-memory log
                    // if (this.messageLogs.length > 100) this.messageLogs.pop();

                    try {
                        await databaseService.addMessage({
                            connection_id: this.connectionId,
                            type: 'incoming',
                            sender: sender,
                            recipient: null,
                            push_name: msg.pushName,
                            message: text,
                            file_name: null, // Modify if we handle files
                            timestamp: log.timestamp,
                            group_name: groupName
                        });
                    } catch (err) {
                        console.error('Failed to save incoming message to DB:', err);
                    }

                    this.io.emit('new_message', { connectionId: this.connectionId, log });

                    const webhookPayload = {
                        event: 'new_message',
                        connectionId: this.connectionId,
                        sender: sender.split('@')[0],
                        message: text,
                        timestamp: log.timestamp,
                        groupName: groupName,
                        senderName: msg.pushName,
                        originalMessage: msg
                    };
                    this.callWebhook(webhookPayload);

                    // Log to Google Sheets
                    if (process.env.GOOGLE_SPREADSHEET_ID) {
                        googleSheetsService.appendMessage(process.env.GOOGLE_SPREADSHEET_ID, {
                            timestamp: log.timestamp,
                            connectionId: this.connectionId,
                            sender: sender.split('@')[0],
                            message: text,
                            type: 'Incoming'
                        }).catch(err => console.error('[GoogleSheets] appendMessage failed:', err?.message || err));
                    }

                    // AI Auto-reply
                    try {
                        // Only reply to direct messages or mentions (optional refinement, for now all text messages)
                        // Avoid replying to status updates or very short messages if needed
                        if (text && text.length > 1) {
                            // 1. Check Auto-Replies first
                            const autoReply = autoReplyService.findReply(text);
                            if (autoReply) {
                                console.log(`[AutoReply] Matched keyword for ${sender}`);
                                await new Promise(resolve => setTimeout(resolve, 1000));
                                await this.sendMessage(sender, autoReply);
                            } else {
                                // 2. Fallback to AI
                                const aiResponse = await aiService.generateReply(text);
                                if (aiResponse) {
                                    console.log(`[AI] Replying to ${sender}`);
                                    // Add a small delay to simulate typing
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    await this.sendMessage(sender, aiResponse);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`[AI] Error generating/sending reply:`, error);
                    }
                }
            });
        } catch (error) {
            console.error(`[${this.connectionId}] Error connecting:`, error);
            this.io.emit('status', { connectionId: this.connectionId, status: 'disconnected' });
        }
    }

    async callWebhook(payload) {
        const webhookUrl = await configService.getWebhookUrl();
        const webhookSecret = await configService.getWebhookSecret();
        if (!webhookUrl) {
            return;
        }
        console.log(`[WEBHOOK] Sending to: ${webhookUrl}`);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (webhookSecret) {
                const signature = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload)).digest('hex');
                headers['X-Webhook-Signature'] = signature;
            }
            await axios.post(webhookUrl, payload, { headers });
            console.log(`[WEBHOOK] Successfully sent payload.`);
        } catch (error) {
            console.error(`[WEBHOOK] Error sending payload:`, error.message);
        }
    }

    async sendMessage(to, message, file) {
        if (this.connectionStatus !== 'connected' || !this.sock) {
            throw new Error('WhatsApp is not connected.');
        }
        const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;

        let messageOptions = {};
        if (file) {
            const buffer = Buffer.from(file.base64, 'base64');
            if (file.type.startsWith('image/')) {
                messageOptions = { image: buffer, caption: message };
            } else {
                messageOptions = { document: buffer, mimetype: file.type, fileName: file.name, caption: message };
            }
        } else {
            messageOptions = { text: message };
        }

        const sentMessage = await this.sock.sendMessage(jid, messageOptions);

        const log = {
            to: jid,
            text: message || (file ? `[File: ${file.name}]` : '[No Content]'),
            timestamp: new Date().toISOString(),
            file: file ? file.name : null,
            status: sentMessage ? 'sent' : 'failed',
        };
        // this.outgoingMessageLogs.unshift(log);
        // if (this.outgoingMessageLogs.length > 100) this.outgoingMessageLogs.pop();

        try {
            await databaseService.addMessage({
                connection_id: this.connectionId,
                type: 'outgoing',
                sender: null,
                recipient: jid,
                push_name: null,
                message: log.text,
                file_name: log.file,
                timestamp: log.timestamp,
                group_name: null
            });
        } catch (err) {
            console.error('Failed to save outgoing message to DB:', err);
        }

        this.io.emit('new_outgoing_message', { connectionId: this.connectionId, log });

        // Log to Google Sheets
        if (process.env.GOOGLE_SPREADSHEET_ID) {
            googleSheetsService.appendMessage(process.env.GOOGLE_SPREADSHEET_ID, {
                timestamp: log.timestamp,
                connectionId: this.connectionId,
                sender: jid.split('@')[0], // Destination number
                message: log.text,
                type: 'Outgoing'
            }).catch(err => console.error('[GoogleSheets] appendMessage failed:', err?.message || err));
        }
    }

    async sendBroadcastMessage(numbers, message, file, delay = 1000) {
        if (this.connectionStatus !== 'connected' || !this.sock) {
            throw new Error('WhatsApp is not connected.');
        }
        for (const number of numbers) {
            // Add a delay to avoid being flagged as spam
            await new Promise(resolve => setTimeout(resolve, delay));
            await this.sendMessage(number, message, file);
        }
    }

    getStatus() {
        return { status: this.connectionStatus };
    }

    getDiagnostics() {
        return {
            connectionId: this.connectionId,
            status: this.connectionStatus,
            authDir: this.authDir,
            lastDisconnect: this.lastDisconnectInfo,
            messagesCount: this.messageLogs.length,
            outgoingMessagesCount: this.outgoingMessageLogs.length
        };
    }

    getQRCode() {
        return { qr: this.qrCodeData };
    }

    async getMessages() {
        try {
            const rows = await databaseService.getMessages(this.connectionId, 'incoming');
            const messages = rows.map(row => ({
                from: row.sender,
                sender: row.sender,
                pushName: row.push_name,
                senderName: row.push_name,
                text: row.message,
                timestamp: row.timestamp,
                groupName: row.group_name
            }));
            return { messages };
        } catch (err) {
            console.error('Error getting messages from DB:', err);
            return { messages: [] };
        }
    }

    async getOutgoingMessages() {
        try {
            const rows = await databaseService.getMessages(this.connectionId, 'outgoing');
            const messages = rows.map(row => ({
                to: row.recipient,
                text: row.message,
                timestamp: row.timestamp,
                file: row.file_name,
                status: 'sent'
            }));
            return { messages };
        } catch (err) {
            console.error('Error getting outgoing messages from DB:', err);
            return { messages: [] };
        }
    }

    async disconnect() {
        try {
            if (this.sock && typeof this.sock.logout === 'function') {
                // logout() may be async and can throw asynchronously.
                // Await it to catch any thrown errors and avoid unhandled promise rejections.
                await this.sock.logout();
            }
        } catch (err) {
            console.error(`[${this.connectionId}] Error during logout (ignored):`, err?.message || err);
        }
        this.sock = null;
    }

    async destroy(skipLogout = false) {
        if (!skipLogout) {
            await this.disconnect();
        }
        // Clear any pending reconnect timers
        try {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        } catch (err) {
            // ignore
        }
        if (fs.existsSync(this.authDir)) {
            fs.rmSync(this.authDir, { recursive: true, force: true });
        }
    }
}

class MultiDeviceManager {
    constructor(io) {
        this.connections = new Map();
        this.io = io;
    }

    startConnection(connectionId) {
        if (this.connections.has(connectionId)) {
            return this.connections.get(connectionId);
        }
        const connection = new Connection(connectionId, this.io);
        this.connections.set(connectionId, connection);
        connection.connect();
        return connection;
    }

    async disconnectConnection(connectionId) {
        if (this.connections.has(connectionId)) {
            const connection = this.connections.get(connectionId);
            await connection.destroy();
            this.connections.delete(connectionId);
        }
    }

    async disconnectAll() {
        for (const connectionId of Array.from(this.connections.keys())) {
            await this.disconnectConnection(connectionId);
        }
    }

    getConnection(connectionId) {
        return this.connections.get(connectionId);
    }

    getAllConnections() {
        return Array.from(this.connections.values()).map(conn => ({
            connectionId: conn.connectionId,
            status: conn.connectionStatus,
        }));
    }
}

let manager;

const initWhatsApp = (socketIo) => {
    manager = new MultiDeviceManager(socketIo);
};

const startConnection = (connectionId) => {
    return manager.startConnection(connectionId);
};

const disconnectConnection = async (connectionId) => {
    await manager.disconnectConnection(connectionId);
};

const disconnectAllConnections = async () => {
    await manager.disconnectAll();
};

const sendMessage = async (connectionId, to, message, file) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        await connection.sendMessage(to, message, file);
    } else {
        throw new Error('Connection not found.');
    }
};

const sendBroadcastMessage = async (connectionId, numbers, message, file, delay) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        await connection.sendBroadcastMessage(numbers, message, file, delay);
    } else {
        throw new Error('Connection not found.');
    }
};

const getStatus = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getStatus();
    }
    return { status: 'disconnected' };
};

const getDiagnostics = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getDiagnostics();
    }
    return { status: 'disconnected' };
};

const getQRCode = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getQRCode();
    }
    return { qr: null };
};

const getMessages = async (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return await connection.getMessages();
    }
    // Attempt to get from DB even if not connected? 
    // For now, consistent with previous behavior only if connection exists
    // But logically, we might want to view messages even if disconnected.
    // However, existing code checks connection. Let's stick to manager for now or improve.
    // If connection is not active, manager.getConnection returns undefined.
    // We should probably allow fetching logs even if disconnected? 
    // The previous implementation returned [] if not connected.
    // Let's keep it checking manager for now to avoid breaking changes, but since we have DB, we COULD fetch.
    // BUT the previous implementation relied on `connection` instance to hold the logs.
    // Now logs are in DB. We can fetch using `databaseService` directly if connectionId is known.

    // Let's improve it: Fetch from DB directly.
    try {
        const rows = await databaseService.getMessages(connectionId, 'incoming');
        const messages = rows.map(row => ({
            from: row.sender,
            sender: row.sender,
            pushName: row.push_name,
            senderName: row.push_name,
            text: row.message,
            timestamp: row.timestamp,
            groupName: row.group_name
        }));
        return { messages };
    } catch (err) {
        return { messages: [] };
    }
};

const getOutgoingMessages = async (connectionId) => {
    try {
        const rows = await databaseService.getMessages(connectionId, 'outgoing');
        const messages = rows.map(row => ({
            to: row.recipient,
            text: row.message,
            timestamp: row.timestamp,
            file: row.file_name,
            status: 'sent'
        }));
        return { messages };
    } catch (err) {
        return { messages: [] };
    }
};

const getDashboardStats = async (connectionId) => {
    try {
        return await databaseService.getDashboardStats(connectionId);
    } catch (err) {
        console.error('Error getting dashboard stats from DB:', err);
        return { totalSent: 0, totalSentMonth: 0 };
    }
};

const getAllConnections = () => {
    return manager.getAllConnections();
};

module.exports = {
    initWhatsApp,
    startConnection,
    disconnectConnection,
    disconnectAllConnections,
    sendMessage,
    sendBroadcastMessage,
    getStatus,
    getQRCode,
    getMessages,
    getOutgoingMessages,
    getAllConnections,
    getDiagnostics,
    getDashboardStats,
};
