const express = require('express');
const {
    startConnectionController,
    disconnectConnectionController,
    disconnectAllConnectionsController,
    sendMessageController,
    sendBroadcastMessageController,
    getSendPolicyController,
    getStatusController,
    getMessagesController,
    getOutgoingMessagesController,
    getQRCodeController,
    getDiagnosticsController,
    reinitConnectionController,
    getAllConnectionsController,
    getWebhookController,
    updateWebhookController,
    getDashboardStatsController,
} = require('../controllers/whatsappController');
const auth = require('../middleware/authMiddleware');
const { authorizeMinimumRole } = require('../middleware/authorizeRoles');
const { auditMutatingRequests } = require('../middleware/securityMiddleware');
const { checkSessionAccess } = require('../middleware/sessionAccessMiddleware');

const router = express.Router();

router.use(auth);
router.use(auditMutatingRequests('whatsapp'));

// Connection management routes
router.post('/connections/start', authorizeMinimumRole('supervisor'), startConnectionController);
router.post('/connections/disconnect', authorizeMinimumRole('supervisor'), disconnectConnectionController);
router.post('/connections/disconnect-all', authorizeMinimumRole('supervisor'), disconnectAllConnectionsController);
router.get('/connections', authorizeMinimumRole('viewer'), getAllConnectionsController);

// Per-connection routes
router.post('/:connectionId/send-message', authorizeMinimumRole('operator'), checkSessionAccess, sendMessageController);
router.post('/:connectionId/broadcast-message', authorizeMinimumRole('operator'), checkSessionAccess, sendBroadcastMessageController);
router.get('/:connectionId/send-policy', authorizeMinimumRole('operator'), checkSessionAccess, getSendPolicyController);
router.get('/:connectionId/status', authorizeMinimumRole('viewer'), checkSessionAccess, getStatusController);
router.get('/:connectionId/messages', authorizeMinimumRole('viewer'), checkSessionAccess, getMessagesController);
router.get('/:connectionId/outgoing-messages', authorizeMinimumRole('viewer'), checkSessionAccess, getOutgoingMessagesController);
router.get('/:connectionId/dashboard-stats', authorizeMinimumRole('viewer'), checkSessionAccess, getDashboardStatsController);
router.get('/:connectionId/qrcode', authorizeMinimumRole('viewer'), checkSessionAccess, getQRCodeController);
router.post('/:connectionId/reinit', authorizeMinimumRole('supervisor'), checkSessionAccess, reinitConnectionController);
router.get('/:connectionId/diagnostics', authorizeMinimumRole('viewer'), checkSessionAccess, getDiagnosticsController);

// Webhook routes
router.get('/webhook', authorizeMinimumRole('viewer'), getWebhookController);
router.post('/webhook', authorizeMinimumRole('operator'), updateWebhookController);

module.exports = router;
