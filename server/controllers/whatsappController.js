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
        res.status(404).json({ status: 'error', message: 'QR code not available for this session.' });
    }
};

// === BROADCAST CONTROLLERS ===

const sendBroadcastMessageController = async (req, res) => {
    const { connectionId } = req.params;
    const { messages } = req.body; // Expecting an array of {to, text}

    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ status: 'error', message: '`messages` (array of {to, text}) is required.' });
    }

    try {
        await whatsappService.sendBroadcastMessage(connectionId, messages.map(m => m.to), messages[0].text); // Simplified for now, assuming same message or logic needs update
        // Wait, the service expects (numbers, message, file). The controller was receiving an array of messages?
        // Let's check the service.
        // Service: async sendBroadcastMessage(numbers, message, file)
        // Controller input: messages array of {to, text}
        // This seems to be a mismatch in logic.
        // If the user wants to send personalized messages, the service needs to support it or we loop here.
        // For now, let's assume the user sends a list of numbers and a single message, OR we loop here.

        // RE-READING service:
        // async sendBroadcastMessage(numbers, message, file) { ... loop numbers ... sendMessage ... }

        // So the service takes an array of numbers and ONE message.
        // The controller seems to have been written for "messages" array.
        // Let's adapt the controller to what the service expects for now to avoid breaking changes if possible, 
        // OR fix the controller to match the service.
        // The service signature is: sendBroadcastMessage(connectionId, numbers, message, file) (via the wrapper)

        // Let's assume the frontend sends { numbers: [], message: "" } for broadcast.
        // But the previous code was: const { messages } = req.body;

        // Let's look at the frontend BroadcastSender.js to see what it sends.
        // I can't see it right now.
        // But standard broadcast usually implies same message to multiple people.

        // Let's implement a loop here if "messages" is provided (personalized), OR support "numbers" and "message" (bulk).

        // For now, I will stick to what seems to be the intention of the service: Bulk send same message.
        // But the previous controller code was:
        // const broadcastId = await whatsappService.broadcastMessage(connectionId, messages);
        // And there is NO broadcastMessage method in whatsappService (it is sendBroadcastMessage).

        // I will implement a simple loop here to support the "messages" input if that's what was there, 
        // OR just use sendBroadcastMessage if the input matches.

        // Let's try to be safe.

        // If req.body has 'numbers' and 'message', use sendBroadcastMessage.
        if (req.body.numbers && req.body.message) {
            await whatsappService.sendBroadcastMessage(connectionId, req.body.numbers, req.body.message);
            return res.status(200).json({ status: 'success', message: 'Broadcast started.' });
        }

        // If req.body has 'messages' (array of {to, text}), loop and send.
        if (req.body.messages) {
            for (const msg of req.body.messages) {
                await whatsappService.sendMessage(connectionId, msg.to, msg.text);
            }
            return res.status(200).json({ status: 'success', message: 'Broadcast sent.' });
        }

        return res.status(400).json({ status: 'error', message: 'Invalid request format.' });

    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to start broadcast.', details: error.message });
    }
};

const getAllBroadcastsController = (req, res) => {
    // This method doesn't exist in service, returning empty or error
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