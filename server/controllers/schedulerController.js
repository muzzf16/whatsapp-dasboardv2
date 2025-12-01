const schedulerService = require('../services/schedulerService');

const addScheduledMessageController = (req, res) => {
    const { connectionId, number, message, scheduledTime } = req.body;

    if (!connectionId || !number || !message || !scheduledTime) {
        return res.status(400).json({ status: 'error', message: 'All fields are required: connectionId, number, message, scheduledTime' });
    }

    try {
        const newMessage = schedulerService.addScheduledMessage(connectionId, number, message, scheduledTime);
        res.status(201).json({ status: 'success', message: 'Message scheduled successfully', data: newMessage });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to schedule message', details: error.message });
    }
};

const getScheduledMessagesController = (req, res) => {
    try {
        const messages = schedulerService.getScheduledMessages();
        res.status(200).json({ status: 'success', data: messages });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to fetch scheduled messages', details: error.message });
    }
};

const deleteScheduledMessageController = (req, res) => {
    const { id } = req.params;
    try {
        schedulerService.deleteScheduledMessage(id);
        res.status(200).json({ status: 'success', message: 'Scheduled message deleted successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to delete scheduled message', details: error.message });
    }
};

const syncScheduledMessagesController = async (req, res) => {
    const { connectionId, spreadsheetId } = req.body;

    if (!connectionId || !spreadsheetId) {
        return res.status(400).json({ status: 'error', message: 'connectionId and spreadsheetId are required' });
    }

    try {
        const count = await schedulerService.syncWithGoogleSheets(spreadsheetId, connectionId);
        res.status(200).json({ status: 'success', message: `Successfully synced ${count} messages from Google Sheets.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to sync with Google Sheets', details: error.message });
    }
};

module.exports = {
    addScheduledMessageController,
    getScheduledMessagesController,
    deleteScheduledMessageController,
    syncScheduledMessagesController
};
