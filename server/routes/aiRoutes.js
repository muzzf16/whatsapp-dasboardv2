const express = require('express');
const { getAiConfigController, updateAiConfigController, uploadAutoReplyController } = require('../controllers/aiController');
const multer = require('multer');
const auth = require('../middleware/authMiddleware');
const { auditMutatingRequests } = require('../middleware/securityMiddleware');

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        cb(null, allowed.includes(file.mimetype));
    }
});

router.use(auth);
router.use(auditMutatingRequests('ai'));

router.get('/ai-config', getAiConfigController);
router.post('/ai-config', updateAiConfigController);
router.post('/auto-reply/upload', upload.single('file'), uploadAutoReplyController);

module.exports = router;
