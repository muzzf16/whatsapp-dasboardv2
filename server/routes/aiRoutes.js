const express = require('express');
const { getAiConfigController, updateAiConfigController, uploadAutoReplyController } = require('../controllers/aiController');
const multer = require('multer');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/ai-config', getAiConfigController);
router.post('/ai-config', updateAiConfigController);
router.post('/auto-reply/upload', upload.single('file'), uploadAutoReplyController);

module.exports = router;
