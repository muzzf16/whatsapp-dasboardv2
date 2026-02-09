const whatsappService = require('../services/whatsappService');
const configService = require('../services/configService');
const qrcode = require('qrcode');

// === SESSION MANAGEMENT CONTROLLERS ===

const startConnectionController = async (req, res) => {
    const { connectionId } = req.body;
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: '`connectionId` is required.' });
    }
    try {
        await whatsappService.startConnection(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} initiated.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to start session.', details: error.message });
    }
};

const disconnectConnectionController = async (req, res) => {
    // connectionId may be provided either in params (older routes) or body (frontend usage)
    const connectionId = req.params?.connectionId || req.body?.connectionId;
    try {
        await whatsappService.disconnectConnection(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} disconnected.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to disconnect session.', details: error.message });
    }
};

const reinitConnectionController = async (req, res) => {
    const { connectionId } = req.params;
    try {
        // Ensure the session is stopped and auth state cleared
        await whatsappService.disconnectConnection(connectionId);
        // Start the session again to produce a fresh QR
        await whatsappService.startConnection(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} reinitialized.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to reinit session.', details: error.message });
    }
};

const disconnectAllConnectionsController = async (req, res) => {
    try {
        await whatsappService.disconnectAllConnections();
        res.status(200).json({ status: 'success', message: 'All sessions disconnected.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to disconnect all sessions.', details: error.message });
    }
};

const getAllConnectionsController = (req, res) => {
    try {
        const connections = whatsappService.getAllConnections();
        res.status(200).json(connections);
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get connections.', details: error.message });
    }
};

// === PER-CONNECTION CONTROLLERS ===

const sendMessageController = async (req, res) => {
    const { connectionId } = req.params;
    const { number, message, file } = req.body;

    if (!number || (!message && !file)) {
        return res.status(400).json({ status: 'error', message: '`number` and `message` (or file) are required.' });
    }
    try {
        await whatsappService.sendMessage(connectionId, number, message, file);
        res.status(200).json({ status: 'success', message: `Message sent to ${number} via ${connectionId}` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to send message.', details: error.message });
    }
};

const getStatusController = (req, res) => {
    const { connectionId } = req.params;
    res.status(200).json(whatsappService.getStatus(connectionId));
};

const getMessagesController = async (req, res) => {
    const { connectionId } = req.params;
    const result = await whatsappService.getMessages(connectionId);
    res.status(200).json(result);
};

const getOutgoingMessagesController = async (req, res) => {
    const { connectionId } = req.params;
    const result = await whatsappService.getOutgoingMessages(connectionId);
    res.status(200).json(result);
};

const getQRCodeController = async (req, res) => {
    const { connectionId } = req.params;
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
    const { connectionId } = req.params;
    try {
        const diagnostics = whatsappService.getDiagnostics(connectionId);
        res.status(200).json({ status: 'success', data: diagnostics });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get diagnostics.', details: error.message });
    }
};

const getDashboardStatsController = async (req, res) => {
    const { connectionId } = req.params;
    try {
        const stats = await whatsappService.getDashboardStats(connectionId);
        res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get dashboard stats.', details: error.message });
    }
};

// === BROADCAST CONTROLLERS ===

const sendBroadcastMessageController = async (req, res) => {
    const { connectionId } = req.params;

    try {
        if (req.body.numbers && req.body.message) {
            const delay = req.body.delay || 1000;
            await whatsappService.sendBroadcastMessage(connectionId, req.body.numbers, req.body.message, null, delay);
            return res.status(200).json({ status: 'success', message: 'Broadcast started.' });
        }

        if (req.body.messages && Array.isArray(req.body.messages)) {
            for (const msg of req.body.messages) {
                await whatsappService.sendMessage(connectionId, msg.to, msg.text);
            }
            return res.status(200).json({ status: 'success', message: 'Broadcast sent.' });
        }

        return res.status(400).json({ status: 'error', message: 'Invalid request format. Provide `numbers` and `message` OR `messages` array.' });

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to start broadcast.', details: error.message });
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
        res.status(500).json({ status: 'error', message: 'Failed to get webhook URL.', details: error.message });
    }
};

const updateWebhookController = async (req, res) => {
    const { url, secret } = req.body;
    if (typeof url !== 'string') {
        return res.status(400).json({ status: 'error', message: '`url` (string) is required.' });
    }
    try {
        await configService.setWebhookUrl(url);
        if (secret !== undefined) {
            await configService.setWebhookSecret(secret);
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