const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const MessageProcessor = require('./MessageProcessor');
const databaseService = require('../databaseService');
const googleSheetsService = require('../googleSheetsService');

class Client {
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
        this.messageLogs = []; // Deprecated, but keeping structure if needed
        this.outgoingMessageLogs = []; // Deprecated
        this.authDir = path.join('auth_info_multi_device', this.connectionId);
        this.lastDisconnectInfo = null;
        this.reconnectDelay = 1000; // ms
        this.reconnectMaxDelay = 30000; // ms
        this.reconnectTimer = null;

        this.messageProcessor = new MessageProcessor(this.connectionId, this.io, this.sendMessage.bind(this));

        // Restore in-memory logging for diagnostics
        this.messageProcessor.onNewMessage = (log) => {
            this.messageLogs.unshift(log);
            if (this.messageLogs.length > 100) this.messageLogs.pop();
        };


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
                        const logsDir = path.join(__dirname, '..', '..', 'logs');
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

                    // Send webhook about status change
                    this.messageProcessor.callWebhook({ event: 'status_change', connectionId: this.connectionId, status: this.connectionStatus, reason: this.lastDisconnectInfo });

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
                            this.messageProcessor.callWebhook({ event: 'reconnecting', connectionId: this.connectionId, delayMs: this.reconnectDelay, reason: this.lastDisconnectInfo });
                        }, this.reconnectDelay);
                        // Exponential backoff for reconnects
                        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.reconnectMaxDelay);
                    } else {
                        console.log(`[${this.connectionId}] Logged out or disqualified, not reconnecting.`);
                        this.io.emit('status', { connectionId: this.connectionId, status: 'logged out', reason: statusCode || (reason && reason.message) || 'unknown' });
                        // Send webhook specifically for logout events
                        this.messageProcessor.callWebhook({ event: 'session_logged_out', connectionId: this.connectionId, reason: this.lastDisconnectInfo });

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
                    this.messageProcessor.callWebhook({ event: 'session_open', connectionId: this.connectionId });
                    this.qrCodeData = null;
                    this.io.emit('status', { connectionId: this.connectionId, status: this.connectionStatus });
                    this.io.emit('qr_code', { connectionId: this.connectionId, qrUrl: null });
                }
            });

            this.sock.ev.on('creds.update', saveCreds);

            // Delegate message processing
            this.sock.ev.on('messages.upsert', (m) => this.messageProcessor.processMessage(m));

        } catch (error) {
            console.error(`[${this.connectionId}] Error connecting:`, error);
            this.connectionStatus = 'disconnected';
            this.io.emit('status', { connectionId: this.connectionId, status: 'disconnected' });

            // Retry logic for initialization errors
            console.log(`[${this.connectionId}] Reconnecting (init error) in ${this.reconnectDelay}ms...`);
            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => {
                this.reconnectTimer = null;
                this.connect();
            }, this.reconnectDelay);
            // Exponential backoff
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.reconnectMaxDelay);
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
            messagesCount: this.messageLogs.length, // Always 0 or low now as we don't store in memory
            outgoingMessagesCount: this.outgoingMessageLogs.length
        };
    }

    getQRCode() {
        return { qr: this.qrCodeData };
    }

    // Kept for backward compatibility, but delegates to DB in manager/index usually
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

    async disconnect() {
        try {
            if (this.sock && typeof this.sock.logout === 'function') {
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

module.exports = Client;
