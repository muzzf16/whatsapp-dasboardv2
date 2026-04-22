const schedulerService = require('../services/schedulerService');
const approvalService = require('../services/approvalService');
const scheduleImportService = require('../services/scheduleImportService');
const {
    normalizeConnectionId,
    normalizePhoneNumber,
    normalizeMessageText
} = require('../utils/security');

const addScheduledMessageController = (req, res) => {
    const connectionId = normalizeConnectionId(req.body.connectionId);
    const number = normalizePhoneNumber(req.body.number);
    const message = normalizeMessageText(req.body.message);
    const { scheduledTime, isRecurring } = req.body;
    const userId = req.user?.id || null;
    const userRole = req.user?.role || 'operator';
    const scheduleDate = new Date(scheduledTime);

    if (!connectionId || !number || !message || !scheduledTime || Number.isNaN(scheduleDate.getTime())) {
        return res.status(400).json({ status: 'error', message: 'Valid connectionId, number, message, and scheduledTime are required' });
    }

    if (scheduleDate.getTime() <= Date.now()) {
        return res.status(400).json({ status: 'error', message: 'scheduledTime must be in the future' });
    }

    try {
        const newMessage = schedulerService.addScheduledMessage(connectionId, number, message, scheduledTime, isRecurring, userId, userRole);
        res.status(201).json({ status: 'success', message: 'Message scheduled successfully', data: newMessage });
    } catch (error) {
        console.error('Failed to schedule message:', error);
        res.status(500).json({ status: 'error', message: 'Failed to schedule message' });
    }
};

const getScheduledMessagesController = (req, res) => {
    try {
        const userId = req.user?.id || null;
        const connectionId = req.query.connectionId || null;
        const messages = schedulerService.getScheduledMessages({ connectionId, userId });
        res.status(200).json({ status: 'success', data: messages });
    } catch (error) {
        console.error('Failed to fetch scheduled messages:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch scheduled messages' });
    }
};

const deleteScheduledMessageController = (req, res) => {
    const { id } = req.params;
    try {
        schedulerService.deleteScheduledMessage(id);
        res.status(200).json({ status: 'success', message: 'Scheduled message deleted successfully' });
    } catch (error) {
        console.error('Failed to delete scheduled message:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete scheduled message' });
    }
};

const deleteAllScheduledMessagesController = (req, res) => {
    try {
        const userId = req.user?.id || null;
        const connectionId = req.query.connectionId || req.body.connectionId || null;
        schedulerService.deleteAllScheduledMessages({ connectionId, userId });
        res.status(200).json({ status: 'success', message: 'All scheduled messages deleted successfully' });
    } catch (error) {
        console.error('Failed to delete all scheduled messages:', error);
        res.status(500).json({ status: 'error', message: 'Failed to delete all scheduled messages' });
    }
};

const syncScheduledMessagesController = async (req, res) => {
    let { spreadsheetId } = req.body;
    const connectionId = normalizeConnectionId(req.body.connectionId);
    const userId = req.user?.id || null;

    if (!spreadsheetId) {
        spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    }

    if (!connectionId || !spreadsheetId) {
        return res.status(400).json({ status: 'error', message: 'connectionId is required, and spreadsheetId must be provided or set in .env' });
    }

    try {
        if (approvalService.shouldRequireApproval(req.user.role)) {
            return requestScheduleSyncApprovalController(req, res);
        }
        const count = await schedulerService.syncWithGoogleSheets(spreadsheetId, connectionId, userId, req.user.role);
        res.status(200).json({ status: 'success', message: `Successfully synced ${count} messages from Google Sheets.` });
    } catch (error) {
        console.error('Failed to sync with Google Sheets:', error);
        res.status(500).json({ status: 'error', message: 'Failed to sync with Google Sheets' });
    }
};

const getGoogleSheetsDiagnosticsController = async (req, res) => {
    try {
        const diag = await (require('../services/googleSheetsService')).getDiagnostics();
        res.status(200).json({ status: 'success', data: diag });
    } catch (error) {
        console.error('Failed to get Google Sheets diagnostics:', error);
        res.status(500).json({ status: 'error', message: 'Failed to get Google Sheets diagnostics' });
    }
};

const uploadExcelController = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { isRecurring } = req.body;
    const connectionId = normalizeConnectionId(req.body.connectionId);
    const userId = req.user?.id || null;
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid connectionId is required' });
    }

    const isRecurringBool = isRecurring === 'true';

    try {
        if (approvalService.shouldRequireApproval(req.user.role)) {
            return requestExcelImportApprovalController(req, res);
        }
        const scheduledCount = await scheduleImportService.importWorkbookBuffer({
            buffer: req.file.buffer,
            connectionId,
            isRecurring: isRecurringBool,
            userId,
            userRole: req.user.role,
        });

        if (scheduledCount === 0) {
            return res.status(200).json({ status: 'warning', message: 'Tidak ada pesan yang dijadwalkan. Pastikan kolom "Nomor Telepon" ada dan terisi, serta format tanggal benar.' });
        }

        res.status(200).json({ status: 'success', message: `Berhasil menjadwalkan ${scheduledCount} pesan.` });

    } catch (error) {
        console.error("Error processing Excel upload:", error);
        res.status(500).json({ status: 'error', message: 'Failed to process Excel file' });
    }
};

const requestScheduleSyncApprovalController = async (req, res) => {
    let { spreadsheetId } = req.body;
    const connectionId = normalizeConnectionId(req.body.connectionId);
    if (!spreadsheetId) {
        spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    }

    if (!connectionId || !spreadsheetId) {
        return res.status(400).json({ status: 'error', message: 'connectionId is required, and spreadsheetId must be provided or set in .env' });
    }

    try {
        const approval = await approvalService.createApprovalRequest({
            actionType: 'schedule_sync',
            summary: `Sync Google Sheets untuk session ${connectionId}`,
            payload: {
                connectionId,
                spreadsheetId,
                userId: req.user.id,
                requesterRole: req.user.role,
            },
            requestedBy: req.user.id,
        });
        res.status(202).json({ status: 'pending_approval', message: 'Sync request submitted for approval.', data: approval });
    } catch (error) {
        console.error('Failed to request schedule sync approval:', error);
        res.status(500).json({ status: 'error', message: 'Failed to request approval.' });
    }
};

const requestExcelImportApprovalController = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const connectionId = normalizeConnectionId(req.body.connectionId);
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'Valid connectionId is required' });
    }

    try {
        const filePath = await approvalService.stageApprovalFile(req.file.buffer, req.file.originalname);
        const approval = await approvalService.createApprovalRequest({
            actionType: 'excel_import',
            summary: `Import Excel schedule untuk session ${connectionId}`,
            payload: {
                connectionId,
                isRecurring: req.body.isRecurring === 'true',
                filePath,
                fileName: req.file.originalname,
                userId: req.user.id,
                requesterRole: req.user.role,
            },
            requestedBy: req.user.id,
        });
        res.status(202).json({ status: 'pending_approval', message: 'Excel import submitted for approval.', data: approval });
    } catch (error) {
        console.error('Failed to request Excel import approval:', error);
        res.status(500).json({ status: 'error', message: 'Failed to request approval.' });
    }
};

module.exports = {
    addScheduledMessageController,
    getScheduledMessagesController,
    deleteScheduledMessageController,
    deleteAllScheduledMessagesController,
    syncScheduledMessagesController,
    requestScheduleSyncApprovalController,
    getGoogleSheetsDiagnosticsController,
    uploadExcelController,
    requestExcelImportApprovalController
};
