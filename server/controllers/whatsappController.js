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
        await whatsappService.startSession(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} initiated.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to start session.', details: error.message });
    }
};

const disconnectConnectionController = async (req, res) => {
    const { connectionId } = req.params;
    try {
        const success = await whatsappService.disconnectSession(connectionId);
        if (success) {
            res.status(200).json({ status: 'success', message: `Session ${connectionId} disconnected.` });
        } else {
            res.status(404).json({ status: 'error', message: `Session ${connectionId} not found.` });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to disconnect session.', details: error.message });
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
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ status: 'error', message: '`number` and `message` are required.' });
    }
    try {
        await whatsappService.sendMessage(connectionId, number, message);
        res.status(200).json({ status: 'success', message: `Message sent to ${number} via ${connectionId}` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to send message.', details: error.message });
    }
};

const getStatusController = (req, res) => {
    const { connectionId } = req.params;
    res.status(200).json(whatsappService.getStatus(connectionId));
};

const getMessagesController = (req, res) => {
    const { connectionId } = req.params;
    res.status(200).json(whatsappService.getMessages(connectionId));
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
        res.status(404).json({ status: 'error', message: 'QR code not available for this session.' });
    }
};

// === BROADCAST CONTROLLERS ===

const broadcastMessageController = async (req, res) => {
    const { connectionId } = req.params;
    const { messages } = req.body; // Expecting an array of {to, text}

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ status: 'error', message: '`messages` (array of {to, text}) is required.' });
    }

    try {
        const broadcastId = await whatsappService.broadcastMessage(connectionId, messages);
        res.status(202).json({ status: 'accepted', message: `Personalized broadcast to ${messages.length} numbers has been started.`, broadcastId });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to start broadcast.', details: error.message });
    }
};

const getAllBroadcastsController = (req, res) => {
    try {
        const broadcasts = whatsappService.getAllBroadcasts();
        res.status(200).json(broadcasts);
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get broadcasts.', details: error.message });
    }
};

// === WEBHOOK CONTROLLERS ===

const getWebhookController = async (req, res) => {
    try {
        const url = await configService.getWebhookUrl();
        res.status(200).json({ webhookUrl: url });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get webhook URL.' });
    }
};

const updateWebhookController = async (req, res) => {
    const { url } = req.body;
    if (typeof url !== 'string') {
        return res.status(400).json({ status: 'error', message: '`url` (string) is required.' });
    }
    try {
        await configService.setWebhookUrl(url);
        res.status(200).json({ status: 'success', message: 'Webhook URL updated successfully.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to update webhook URL.' });
    }
};

// === EXPORTS ===

module.exports = {
    startConnectionController,
    disconnectConnectionController,
    getAllConnectionsController,
    sendMessageController,
    getStatusController,
    getMessagesController,
    getQRCodeController,
    broadcastMessageController,
    getAllBroadcastsController,
    getWebhookController,
    updateWebhookController,
};