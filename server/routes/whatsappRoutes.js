const express = require('express');
const {
    startConnectionController,
    disconnectConnectionController,
    getAllConnectionsController,
    sendMessageController,
    getStatusController,
    getMessagesController,
    getQRCodeController,
    getWebhookController,
    updateWebhookController,
    broadcastMessageController,
    getAllBroadcastsController,
} = require('../controllers/whatsappController');

const router = express.Router();

// Session management
router.get('/connections', getAllConnectionsController);
router.post('/connections/start', startConnectionController);
router.post('/connections/:connectionId/disconnect', disconnectConnectionController);

// Broadcast management
router.get('/broadcasts', getAllBroadcastsController);
router.post('/:connectionId/broadcast-message', broadcastMessageController);

// Per-connection actions
router.post('/:connectionId/send-message', sendMessageController);
router.get('/:connectionId/status', getStatusController);
router.get('/:connectionId/messages', getMessagesController);
router.get('/:connectionId/qrcode', getQRCodeController);

// Webhook (global)
router.get('/webhook', getWebhookController);
router.post('/webhook', updateWebhookController);

module.exports = router;