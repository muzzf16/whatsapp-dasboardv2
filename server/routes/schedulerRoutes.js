const express = require('express');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const {
    addScheduledMessageController,
    getScheduledMessagesController,
    deleteScheduledMessageController,
    deleteAllScheduledMessagesController,
    syncScheduledMessagesController,
    getGoogleSheetsDiagnosticsController,
    uploadExcelController
} = require('../controllers/schedulerController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Optional auth middleware: extracts user from token if present, but doesn't block if missing.
// This allows backward compatibility while associating schedules with users.
const optionalAuth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) {
        req.user = null;
        return next();
    }
    // Delegate to auth middleware
    authMiddleware(req, res, next);
};

router.post('/schedule', optionalAuth, addScheduledMessageController);
router.get('/schedule', optionalAuth, getScheduledMessagesController);
router.delete('/schedule', optionalAuth, deleteAllScheduledMessagesController);
router.delete('/schedule/:id', optionalAuth, deleteScheduledMessageController);
router.post('/schedule/sync', optionalAuth, syncScheduledMessagesController);
router.get('/diagnostics/google-sheets', getGoogleSheetsDiagnosticsController);
router.post('/upload-excel', optionalAuth, upload.single('file'), uploadExcelController);

module.exports = router;
