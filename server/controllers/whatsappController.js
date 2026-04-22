const whatsappService = require('../services/whatsapp');
const configService = require('../services/configService');
const qrcode = require('qrcode');
const approvalService = require('../services/approvalService');
const contactPolicyService = require('../services/contactPolicyService');
const messageQuotaService = require('../services/messageQuotaService');
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

const getAllConnectionsController = async (req, res) => {
    try {
        let connections = whatsappService.getAllConnections();

        // PRIVACY: Filter connections based on access for non-admins
        if (req.user.role !== 'admin') {
            const databaseService = require('../services/databaseService');
            const allowedIds = await databaseService.getSessionAccess(req.user.id);
            connections = connections.filter(c => allowedIds.includes(c.id));
        }

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
        await messageQuotaService.assertCanDispatch({
            connectionId,
            userId: req.user.id,
            role: req.user.role,
            requestedCount: 1,
        });
        await whatsappService.sendMessage(connectionId, number, message, file, {
            initiatedByUserId: req.user.id,
            deliverySource: 'manual',
        });
        res.status(200).json({ status: 'success', message: `Message sent to ${number} via ${connectionId}` });
    } catch (error) {
        console.error('Failed to send message:', error);
        if (error.message.includes('opted out')) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        if (messageQuotaService.isQuotaExceededError(error)) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message, details: error.details });
        }
        res.status(500).json({ status: 'error', message: 'Failed to send message.' });
    }
};

const getSendPolicyController = async (req, res) => {
    const connectionId = normalizeConnectionId(req.params.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid `connectionId` is required.' });
    }

    try {
        const policy = await messageQuotaService.getSendPolicyStatus({
            connectionId,
            userId: req.user.id,
            role: req.user.role,
        });
        res.status(200).json({ status: 'success', data: policy });
    } catch (error) {
        console.error('Failed to get send policy:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get send policy.' });
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
            const { permittedNumbers } = await contactPolicyService.filterDeliverableNumbers(numbers);
            if (permittedNumbers.length === 0) {
                return res.status(409).json({ status: 'error', message: 'All target recipients have opted out of messaging.' });
            }
            messageQuotaService.assertCampaignLimit(permittedNumbers.length);
            await messageQuotaService.assertCanDispatch({
                connectionId,
                userId: req.user.id,
                role: req.user.role,
                requestedCount: permittedNumbers.length,
            });
            if (approvalService.shouldRequireApproval(req.user.role)) {
                const approval = await approvalService.createApprovalRequest({
                    actionType: 'broadcast_message',
                    summary: `Broadcast ke ${permittedNumbers.length} nomor via session ${connectionId}`,
                    payload: {
                        mode: 'broadcast',
                        connectionId,
                        numbers: permittedNumbers,
                        message,
                        delay,
                        userId: req.user.id,
                        requesterRole: req.user.role,
                    },
                    requestedBy: req.user.id,
                });
                return res.status(202).json({ status: 'pending_approval', message: 'Broadcast submitted for approval.', data: approval });
            }
            await whatsappService.sendBroadcastMessage(connectionId, permittedNumbers, message, null, delay, {
                initiatedByUserId: req.user.id,
                deliverySource: 'broadcast',
            });
            return res.status(200).json({ status: 'success', message: 'Broadcast started.' });
        }

        if (req.body.messages && Array.isArray(req.body.messages)) {
            const messages = [];
            for (const msg of req.body.messages) {
                const to = normalizePhoneNumber(msg.to);
                const text = normalizeMessageText(msg.text);
                if (!to || !text) {
                    return res.status(400).json({ status: 'error', message: 'Each broadcast item must contain valid `to` and `text`.' });
                }
                messages.push({ to, text });
            }
            const { permittedNumbers } = await contactPolicyService.filterDeliverableNumbers(messages.map((msg) => msg.to));
            const filteredMessages = messages.filter((msg) => permittedNumbers.includes(msg.to));
            if (filteredMessages.length === 0) {
                return res.status(409).json({ status: 'error', message: 'All target recipients have opted out of messaging.' });
            }
            messageQuotaService.assertCampaignLimit(filteredMessages.length);
            await messageQuotaService.assertCanDispatch({
                connectionId,
                userId: req.user.id,
                role: req.user.role,
                requestedCount: filteredMessages.length,
            });

            if (approvalService.shouldRequireApproval(req.user.role)) {
                const approval = await approvalService.createApprovalRequest({
                    actionType: 'broadcast_message',
                    summary: `Batch send ${filteredMessages.length} pesan via session ${connectionId}`,
                    payload: {
                        mode: 'messages',
                        connectionId,
                        messages: filteredMessages,
                        userId: req.user.id,
                        requesterRole: req.user.role,
                    },
                    requestedBy: req.user.id,
                });
                return res.status(202).json({ status: 'pending_approval', message: 'Batch send submitted for approval.', data: approval });
            }

            for (const msg of filteredMessages) {
                await whatsappService.sendMessage(connectionId, msg.to, msg.text, null, {
                    initiatedByUserId: req.user.id,
                    deliverySource: 'broadcast',
                });
            }
            return res.status(200).json({ status: 'success', message: 'Broadcast sent.' });
        }

        return res.status(400).json({ status: 'error', message: 'Invalid request format. Provide `numbers` and `message` OR `messages` array.' });

    } catch (error) {
        console.error('Failed to start broadcast:', error);
        if (error.message.includes('opted out')) {
            return res.status(409).json({ status: 'error', message: error.message });
        }
        if (messageQuotaService.isQuotaExceededError(error)) {
            return res.status(error.statusCode).json({ status: 'error', message: error.message, details: error.details });
        }
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
        const normalizedSecret = secret !== undefined
            ? (typeof secret === 'string' ? secret.trim() : '')
            : undefined;

        if (approvalService.shouldRequireApproval(req.user.role)) {
            const approval = await approvalService.createApprovalRequest({
                actionType: 'webhook_update',
                summary: `Update webhook endpoint ke ${validation.value || '(disabled)'}`,
                payload: {
                    url: validation.value,
                    secret: normalizedSecret,
                },
                requestedBy: req.user.id,
            });
            return res.status(202).json({ status: 'pending_approval', message: 'Webhook update submitted for approval.', data: approval });
        }

        await configService.setWebhookUrl(validation.value);
        if (normalizedSecret !== undefined) {
            await configService.setWebhookSecret(normalizedSecret);
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
    getSendPolicyController,
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
