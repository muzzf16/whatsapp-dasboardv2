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
    const { connectionId } = req.params;
    try {
        whatsappService.disconnectConnection(connectionId);
        res.status(200).json({ status: 'success', message: `Session ${connectionId} disconnected.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to disconnect session.', details: error.message });
    }
};

const disconnectAllConnectionsController = async (req, res) => {
    try {
        whatsappService.disconnectAllConnections();
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

const getMessagesController = (req, res) => {
    const { connectionId } = req.params;
    res.status(200).json(whatsappService.getMessages(connectionId));
};

const getOutgoingMessagesController = (req, res) => {
    const { connectionId } = req.params;
    res.status(200).json(whatsappService.getOutgoingMessages(connectionId));
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

// === BROADCAST CONTROLLERS ===

const sendBroadcastMessageController = async (req, res) => {
    const { connectionId } = req.params;

    try {
        if (req.body.numbers && req.body.message) {
            await whatsappService.sendBroadcastMessage(connectionId, req.body.numbers, req.body.message);
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
        res.status(200).json({ webhookUrl: url });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get webhook URL.' });
    }
};

const updateWebhookController = async (req, res) => {
    const { url, secret } = req.body;
    console.log('Received webhook update request:', { url, secret });
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
    getAllBroadcastsController,
    getWebhookController,
    updateWebhookController,
};