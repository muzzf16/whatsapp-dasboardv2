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
const { authorizeMinimumRole } = require('../middleware/authorizeRoles');
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

router.post('/schedule', authorizeMinimumRole('operator'), addScheduledMessageController);
router.get('/schedule', authorizeMinimumRole('viewer'), getScheduledMessagesController);
router.delete('/schedule', authorizeMinimumRole('operator'), deleteAllScheduledMessagesController);
router.delete('/schedule/:id', authorizeMinimumRole('operator'), deleteScheduledMessageController);
router.post('/schedule/sync', authorizeMinimumRole('operator'), syncScheduledMessagesController);
router.get('/diagnostics/google-sheets', authorizeMinimumRole('viewer'), getGoogleSheetsDiagnosticsController);
router.post('/upload-excel', authorizeMinimumRole('operator'), upload.single('file'), uploadExcelController);

module.exports = router;
