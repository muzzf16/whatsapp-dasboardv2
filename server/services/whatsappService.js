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
    }

    async connect() {
        try {
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
                    const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.connectionStatus = 'disconnected';
                    this.io.emit('status', { connectionId: this.connectionId, status: this.connectionStatus });
                    if (shouldReconnect) {
                        console.log(`[${this.connectionId}] Reconnecting...`);
                        this.connect();
                    } else {
                        console.log(`[${this.connectionId}] Logged out, not reconnecting.`);
                        this.io.emit('status', { connectionId: this.connectionId, status: 'logged out' });
                        this.destroy(true);
                    }
                } else if (connection === 'open') {
                    this.connectionStatus = 'connected';
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
                    this.messageLogs.unshift(log);
                    if (this.messageLogs.length > 100) this.messageLogs.pop();

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
                        });
                    }

                    // AI Auto-reply
                    try {
                        // Only reply to direct messages or mentions (optional refinement, for now all text messages)
                        // Avoid replying to status updates or very short messages if needed
                        if (text && text.length > 1) {
                            const aiResponse = await aiService.generateReply(text);
                            if (aiResponse) {
                                console.log(`[AI] Replying to ${sender}`);
                                // Add a small delay to simulate typing
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                await this.sendMessage(sender, aiResponse);
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
        this.outgoingMessageLogs.unshift(log);
        if (this.outgoingMessageLogs.length > 100) this.outgoingMessageLogs.pop();
        this.io.emit('new_outgoing_message', { connectionId: this.connectionId, log });

        // Log to Google Sheets
        if (process.env.GOOGLE_SPREADSHEET_ID) {
            googleSheetsService.appendMessage(process.env.GOOGLE_SPREADSHEET_ID, {
                timestamp: log.timestamp,
                connectionId: this.connectionId,
                sender: jid.split('@')[0], // Destination number
                message: log.text,
                type: 'Outgoing'
            });
        }
    }

    async sendBroadcastMessage(numbers, message, file) {
        if (this.connectionStatus !== 'connected' || !this.sock) {
            throw new Error('WhatsApp is not connected.');
        }
        for (const number of numbers) {
            // Add a delay to avoid being flagged as spam
            await new Promise(resolve => setTimeout(resolve, 1000));
            await this.sendMessage(number, message, file);
        }
    }

    getStatus() {
        return { status: this.connectionStatus };
    }

    getQRCode() {
        return { qr: this.qrCodeData };
    }

    getMessages() {
        return { messages: this.messageLogs };
    }

    getOutgoingMessages() {
        return { messages: this.outgoingMessageLogs };
    }

    disconnect() {
        try {
            if (this.sock) {
                this.sock.logout();
            }
        } catch (err) {
            console.error(`[${this.connectionId}] Error during logout (ignored):`, err.message);
        }
        this.sock = null;
    }

    destroy(skipLogout = false) {
        if (!skipLogout) {
            this.disconnect();
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

    disconnectConnection(connectionId) {
        if (this.connections.has(connectionId)) {
            const connection = this.connections.get(connectionId);
            connection.destroy();
            this.connections.delete(connectionId);
        }
    }

    disconnectAll() {
        for (const connectionId of this.connections.keys()) {
            this.disconnectConnection(connectionId);
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

const disconnectConnection = (connectionId) => {
    manager.disconnectConnection(connectionId);
};

const disconnectAllConnections = () => {
    manager.disconnectAll();
};

const sendMessage = async (connectionId, to, message, file) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        await connection.sendMessage(to, message, file);
    } else {
        throw new Error('Connection not found.');
    }
};

const sendBroadcastMessage = async (connectionId, numbers, message, file) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        await connection.sendBroadcastMessage(numbers, message, file);
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

const getQRCode = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getQRCode();
    }
    return { qr: null };
};

const getMessages = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getMessages();
    }
    return { messages: [] };
};

const getOutgoingMessages = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getOutgoingMessages();
    }
    return { messages: [] };
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
};
