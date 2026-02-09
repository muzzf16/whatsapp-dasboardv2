const express = require('express');
const multer = require('multer');
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

router.post('/schedule', addScheduledMessageController);
router.get('/schedule', getScheduledMessagesController);
router.delete('/schedule', deleteAllScheduledMessagesController);
router.delete('/schedule/:id', deleteScheduledMessageController);
router.post('/schedule/sync', syncScheduledMessagesController);
router.get('/diagnostics/google-sheets', getGoogleSheetsDiagnosticsController);
router.post('/upload-excel', upload.single('file'), uploadExcelController);

module.exports = router;
