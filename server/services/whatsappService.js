const axios = require('axios');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const configService = require('./configService');

// Store multiple sessions
const sessions = new Map();
const broadcasts = new Map(); // Untuk melacak progres broadcast
let io;

// Initialize the service with the socket.io instance
const init = (socketIo) => {
    io = socketIo;
};

// Call webhook with a payload
async function callWebhook(payload) {
    const webhookUrl = await configService.getWebhookUrl();
    if (!webhookUrl) return;

    console.log(`[WEBHOOK] Sending to: ${webhookUrl} for connection: ${payload.connectionId}`);
    try {
        // Here you could add a signature for security
        await axios.post(webhookUrl, payload, { headers: { 'Content-Type': 'application/json' } });
        console.log(`[WEBHOOK] Successfully sent payload for ${payload.connectionId}.`);
    } catch (error) {
        console.error(`[WEBHOOK] Error sending payload for ${payload.connectionId}:`, error.message);
    }
}

// Start a new session or reconnect
async function startSession(connectionId) {
    if (!io) {
        console.error("Socket.IO not initialized!");
        return;
    }

    if (sessions.has(connectionId) && sessions.get(connectionId).sock) {
        console.log(`Session ${connectionId} already exists.`);
        io.emit('status', { connectionId, status: sessions.get(connectionId).status });
        return;
    }

    console.log(`Starting session: ${connectionId}`);
    const { state, saveCreds } = await useMultiFileAuthState(`auth_info_baileys/${connectionId}`);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
    });

    sessions.set(connectionId, {
        sock,
        qr: null,
        status: 'connecting',
        messages: [],
    });

    sock.ev.on('connection.update', async (update) => {
        const session = sessions.get(connectionId);
        if (!session) return;

        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            session.qr = qr;
            session.status = 'waiting for QR scan';
            io.emit('qr_code', { connectionId, qr: session.qr });
            io.emit('status', { connectionId, status: session.status });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            session.status = 'disconnected';
            io.emit('status', { connectionId, status: session.status });
            
            if (shouldReconnect) {
                console.log(`Reconnecting session: ${connectionId}`);
                startSession(connectionId);
            } else {
                console.log(`Session ${connectionId} logged out.`);
                session.status = 'logged out';
                io.emit('status', { connectionId, status: session.status });
                sessions.delete(connectionId);
            }
        } else if (connection === 'open') {
            session.status = 'connected';
            session.qr = null;
            io.emit('status', { connectionId, status: session.status });
            io.emit('qr_code', { connectionId, qrUrl: null });
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        const session = sessions.get(connectionId);
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const sender = msg.key.remoteJid;
            const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'No text content';
            const log = {
                connectionId,
                sender,
                message: text,
                timestamp: new Date().toISOString(),
            };
            
            session.messages.unshift(log);
            if (session.messages.length > 100) session.messages.pop();
            
            io.emit('new_message', log);

            const webhookPayload = {
                event: 'new_message',
                connectionId,
                sender: sender.split('@')[0],
                message: text,
                timestamp: log.timestamp,
                originalMessage: msg
            };
            await callWebhook(webhookPayload);
        }
    });
}

async function disconnectSession(connectionId) {
    const session = sessions.get(connectionId);
    if (session && session.sock) {
        console.log(`Logging out session: ${connectionId}`);
        await session.sock.logout();
        sessions.delete(connectionId);
        return true;
    }
    return false;
}

const sendMessage = async (connectionId, to, message) => {
    const session = sessions.get(connectionId);
    if (!session || session.status !== 'connected' || !session.sock) {
        throw new Error(`Session ${connectionId} is not connected.`);
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    await session.sock.sendMessage(jid, { text: message });
};

const broadcastMessage = async (connectionId, messages) => {
    const session = sessions.get(connectionId);
    if (!session || session.status !== 'connected') {
        throw new Error(`Session ${connectionId} is not connected.`);
    }

    const broadcastId = `brd-${Date.now()}`;
    const broadcastJob = {
        id: broadcastId,
        connectionId,
        status: 'running',
        total: messages.length,
        sent: 0,
        failed: 0,
        startTime: new Date(),
    };
    broadcasts.set(broadcastId, broadcastJob);
    io.emit('broadcast_update', broadcastJob);

    console.log(`[BROADCAST] Starting job ${broadcastId} on session ${connectionId} to ${messages.length} numbers.`);

    for (const msg of messages) {
        try {
            await sendMessage(connectionId, msg.to, msg.text);
            broadcastJob.sent++;
            console.log(`[BROADCAST] Job ${broadcastId}: Message sent to ${msg.to}`);
        } catch (error) {
            broadcastJob.failed++;
            console.error(`[BROADCAST] Job ${broadcastId}: Failed to send to ${msg.to}:`, error.message);
        } finally {
            io.emit('broadcast_update', broadcastJob);
            const delay = Math.floor(Math.random() * (7000 - 2000 + 1)) + 2000; // 2-7 seconds delay
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    broadcastJob.status = 'completed';
    broadcastJob.endTime = new Date();
    io.emit('broadcast_update', broadcastJob);
    console.log(`[BROADCAST] Finished job ${broadcastId}.`);
    return broadcastId;
};

const getStatus = (connectionId) => {
    const session = sessions.get(connectionId);
    return { status: session ? session.status : 'not found' };
};

const getQRCode = (connectionId) => {
    const session = sessions.get(connectionId);
    return { qr: session ? session.qr : null };
};

const getMessages = (connectionId) => {
    const session = sessions.get(connectionId);
    return { messages: session ? session.messages : [] };
};

const getAllConnections = () => {
    return Array.from(sessions.keys()).map(id => ({
        id,
        status: sessions.get(id).status,
    }));
};

const getAllBroadcasts = () => {
    return Array.from(broadcasts.values()).sort((a, b) => b.startTime - a.startTime);
};

module.exports = {
    init,
    startSession,
    disconnectSession,
    sendMessage,
    getStatus,
    getQRCode,
    getMessages,
    getAllConnections,
    broadcastMessage,
    getAllBroadcasts, // Ekspor baru
};
