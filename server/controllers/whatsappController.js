const whatsappService = require('../services/whatsapp');
const configService = require('../services/configService');
const qrcode = require('qrcode');
const {
    normalizeConnectionId,
    normalizePhoneNumber,
    normalizeMessageText,
    normalizeDelay,
    validateWebhookUrl
} = require('../utils/security');

// === SESSION MANAGEMENT CONTROLLERS ===

const startConnectionController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.body.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: '`connectionId` must be 3-64 characters and contain only letters, numbers, underscore, or dash.' });
    }
    try {
        await whatsappService.startConnection(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} initiated.` });
    } catch (error) {
        console.error('Failed to start session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to start session.' });
    }
};

const disconnectConnectionController = async (req, res) => {
    // connectionId may be provided either in params (older routes) or body (frontend usage)
    const connectionId = normalizeConnectionId(req.params?.connectionId || req.body?.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    try {
        await whatsappService.disconnectConnection(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} disconnected.` });
    } catch (error) {
        console.error('Failed to disconnect session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to disconnect session.' });
    }
};

const reinitConnectionController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    try {
        // Ensure the session is stopped and auth state cleared
        await whatsappService.disconnectConnection(connectionId);
        // Start the session again to produce a fresh QR
        await whatsappService.startConnection(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} reinitialized.` });
    } catch (error) {
        console.error('Failed to reinit session:', error);
        res.status(500).json({ status: 'error', message: 'Failed to reinit session.' });
    }
};

const disconnectAllConnectionsController = async (req, res) => {
    try {
        await whatsappService.disconnectAllConnections();
        res.status(200).json({ status: 'success', message: 'All sessions disconnected.' });
    } catch (error) {
        console.error('Failed to disconnect all sessions:', error);
        res.status(500).json({ status: 'error', message: 'Failed to disconnect all sessions.' });
    }
};

const getAllConnectionsController = (req, res) => {
    try {
        const connections = whatsappService.getAllConnections();
        res.status(200).json(connections);
    } catch (error) {
        console.error('Failed to get connections:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get connections.' });
    }
};

// === PER-CONNECTION CONTROLLERS ===

const sendMessageController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    const number = normalizePhoneNumber(req.body.number);
    const message = normalizeMessageText(req.body.message || '');
    const { file } = req.body;

    if (!connectionId || !number || (!message && !file)) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId`, `number`, and `message` (or file) are required.' });
    }
    try {
        await whatsappService.sendMessage(connectionId, number, message, file);
        res.status(200).json({ status: 'success', message: `Message sent to ${number} via ${connectionId}` });
    } catch (error) {
        console.error('Failed to send message:', error);
        res.status(500).json({ status: 'error', message: 'Failed to send message.' });
    }
};

const getStatusController = (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    res.status(200).json(whatsappService.getStatus(connectionId));
};

const getMessagesController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    const result = await whatsappService.getMessages(connectionId);
    res.status(200).json(result);
};

const getOutgoingMessagesController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    const result = await whatsappService.getOutgoingMessages(connectionId);
    res.status(200).json(result);
};

const getQRCodeController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    const { qr } = whatsappService.getQRCode(connectionId);
    if (qr) {
        try {
            const qrUrl = await qrcode.toDataURL(qr);
            res.status(200).json({ qrUrl });
        } catch (err) {
            res.status(500).json({ status: 'error', message: 'Failed to generate QR code.' });
        }
    } else {
        // Return 200 with null to indicate no QR code yet (e.g. connected or loading), avoiding frontend 404 errors
        res.status(200).json({ qrUrl: null, message: 'QR code not available for this session.' });
    }
};

const getDiagnosticsController = (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    try {
        const diagnostics = whatsappService.getDiagnostics(connectionId);
        res.status(200).json({ status: 'success', data: diagnostics });
    } catch (error) {
        console.error('Failed to get diagnostics:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get diagnostics.' });
    }
};

const getDashboardStatsController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }
    try {
        const stats = await whatsappService.getDashboardStats(connectionId);
        res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
        console.error('Failed to get dashboard stats:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get dashboard stats.' });
    }
};

// === BROADCAST CONTROLLERS ===

const sendBroadcastMessageController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }

    try {
        if (req.body.numbers && req.body.message) {
            const numbers = Array.isArray(req.body.numbers)
                ? req.body.numbers.map(normalizePhoneNumber).filter(Boolean)
                : [];
            const message = normalizeMessageText(req.body.message);
            const delay = normalizeDelay(req.body.delay);
            if (numbers.length === 0 || !message) {
                return res.status(400).json({ status: 'error', message: 'Valid `numbers` and `message` are required.' });
            }
            await whatsappService.sendBroadcastMessage(connectionId, numbers, message, null, delay);
            return res.status(200).json({ status: 'success', message: 'Broadcast started.' });
        }

        if (req.body.messages && Array.isArray(req.body.messages)) {
            for (const msg of req.body.messages) {
                const to = normalizePhoneNumber(msg.to);
                const text = normalizeMessageText(msg.text);
                if (!to || !text) {
                    return res.status(400).json({ status: 'error', message: 'Each broadcast item must contain valid `to` and `text`.' });
                }
                await whatsappService.sendMessage(connectionId, to, text);
            }
            return res.status(200).json({ status: 'success', message: 'Broadcast sent.' });
        }

        return res.status(400).json({ status: 'error', message: 'Invalid request format. Provide `numbers` and `message` OR `messages` array.' });

    } catch (error) {
        console.error('Failed to start broadcast:', error);
        res.status(500).json({ status: 'error', message: 'Failed to start broadcast.' });
    }
};

const getAllBroadcastsController = (req, res) => {
    res.status(501).json({ status: 'error', message: 'Not implemented' });
};

// === WEBHOOK CONTROLLERS ===

const getWebhookController = async (req, res) => {
    try {
        const url = await configService.getWebhookUrl();
        const secret = await configService.getWebhookSecret();
        res.status(200).json({ webhookUrl: url, webhookSecret: secret });
    } catch (error) {
        console.error('Failed to get webhook URL:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get webhook URL.' });
    }
};

const updateWebhookController = async (req, res) => {
    const { url, secret } = req.body;
    const validation = validateWebhookUrl(url);
    if (!validation.valid) {
        return res.status(400).json({ status: 'error', message: validation.message });
    }
    try {
        await configService.setWebhookUrl(validation.value);
        if (secret !== undefined) {
            await configService.setWebhookSecret(typeof secret === 'string' ? secret.trim() : '');
        }
        res.status(200).json({ status: 'success', message: 'Webhook settings updated successfully.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update webhook settings.' });
    }
};

module.exports = {
    startConnectionController,
    disconnectConnectionController,
    disconnectAllConnectionsController,
    getAllConnectionsController,
    sendMessageController,
    sendBroadcastMessageController,
    getStatusController,
    getMessagesController,
    getOutgoingMessagesController,
    getQRCodeController,
    getDiagnosticsController,
    getAllBroadcastsController,
    getWebhookController,
    updateWebhookController,
    reinitConnectionController,
    getDashboardStatsController,
};
