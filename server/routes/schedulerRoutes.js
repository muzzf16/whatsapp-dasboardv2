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
const auth = require('../middleware/authMiddleware');
const { auditMutatingRequests } = require('../middleware/securityMiddleware');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        cb(null, allowed.includes(file.mimetype));
    }
});

router.use(auth);
router.use(auditMutatingRequests('schedule'));

router.post('/schedule', addScheduledMessageController);
router.get('/schedule', getScheduledMessagesController);
router.delete('/schedule', deleteAllScheduledMessagesController);
router.delete('/schedule/:id', deleteScheduledMessageController);
router.post('/schedule/sync', syncScheduledMessagesController);
router.get('/diagnostics/google-sheets', getGoogleSheetsDiagnosticsController);
router.post('/upload-excel', upload.single('file'), uploadExcelController);

module.exports = router;
