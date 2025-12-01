const express = require('express');
const {
    addScheduledMessageController,
    getScheduledMessagesController,
    deleteScheduledMessageController,
    syncScheduledMessagesController
} = require('../controllers/schedulerController');

const router = express.Router();

router.post('/schedule', addScheduledMessageController);
router.get('/schedule', getScheduledMessagesController);
router.delete('/schedule/:id', deleteScheduledMessageController);
router.post('/schedule/sync', syncScheduledMessagesController);

module.exports = router;
