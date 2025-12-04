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
    let { connectionId, spreadsheetId } = req.body;

    if (!spreadsheetId) {
        spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    }

    if (!connectionId || !spreadsheetId) {
        return res.status(400).json({ status: 'error', message: 'connectionId is required, and spreadsheetId must be provided or set in .env' });
    }

    try {
        const count = await schedulerService.syncWithGoogleSheets(spreadsheetId, connectionId);
        res.status(200).json({ status: 'success', message: `Successfully synced ${count} messages from Google Sheets.` });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to sync with Google Sheets', details: error.message });
    }
};

const getGoogleSheetsDiagnosticsController = async (req, res) => {
    try {
        const diag = await (require('../services/googleSheetsService')).getDiagnostics();
        res.status(200).json({ status: 'success', data: diag });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Failed to get Google Sheets diagnostics', details: error.message });
    }
};

const xlsx = require('xlsx');

const uploadExcelController = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const { connectionId } = req.body;
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'connectionId is required' });
    }

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);

        let scheduledCount = 0;

        // Helper to find value with fuzzy key matching
        const findColumnValue = (row, patterns) => {
            const keys = Object.keys(row);
            for (const pattern of patterns) {
                const key = keys.find(k => {
                    const normalizedKey = k.trim().toLowerCase().replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric
                    const normalizedPattern = pattern.replace(/[^a-z0-9]/g, '');
                    return normalizedKey === normalizedPattern || normalizedKey.includes(normalizedPattern);
                });
                if (key) return row[key];
            }
            return undefined;
        };

        data.forEach((row, index) => {
            // Fuzzy match columns
            const name = findColumnValue(row, ['nama', 'name', 'customer']);
            const accountNumber = findColumnValue(row, ['no rekening', 'norekening', 'rekening', 'account', 'acc']);
            const amount = findColumnValue(row, ['tagihan', 'amount', 'bill', 'total']);
            const dueDateStr = findColumnValue(row, ['tanggal jatuh tempo', 'jatuh tempo', 'due date', 'tgl jatuh tempo']);
            const notes = findColumnValue(row, ['keterangan', 'notes', 'desc', 'deskripsi']);
            const phoneNumber = findColumnValue(row, ['nomor telepon', 'telepon', 'telp', 'no hp', 'nohp', 'phone', 'mobile', 'wa']);

            if (name && accountNumber && amount && dueDateStr) {
                // Parse due date. Assuming it's a valid date string or Excel serial date.
                // If it's Excel serial date, xlsx handles it if cellDates: true is passed to read, but here we use default.
                // Let's assume standard date string YYYY-MM-DD or similar for now, or handle JS Date if parsed.

                let dueDate;
                if (typeof dueDateStr === 'number') {
                    // Excel serial date
                    dueDate = new Date(Math.round((dueDateStr - 25569) * 86400 * 1000));
                } else {
                    dueDate = new Date(dueDateStr);
                }

                if (isNaN(dueDate.getTime())) {
                    console.warn(`Invalid date for ${name}: ${dueDateStr}`);
                    return;
                }

                // Override year with current year
                const currentYear = new Date().getFullYear();
                dueDate.setFullYear(currentYear);

                // Calculate offsets: h-1, h+0, h+4
                const offsets = [-1, 0, 4];

                offsets.forEach(offset => {
                    const scheduleDate = new Date(dueDate);
                    scheduleDate.setDate(dueDate.getDate() + offset);

                    // Set a default time, e.g., 09:00 AM
                    scheduleDate.setHours(9, 0, 0, 0);

                    const scheduledTimeStr = scheduleDate.toISOString(); // Scheduler expects ISO string or similar that Date constructor accepts

                    const message = `Halo ${name}, ini adalah pengingat tagihan kredit Anda sebesar ${amount} untuk rekening ${accountNumber}. Jatuh tempo pada ${dueDate.toISOString().split('T')[0]}. ${notes ? `Keterangan: ${notes}` : ''}`;

                    if (phoneNumber) {
                        schedulerService.addScheduledMessage(connectionId, phoneNumber, message, scheduledTimeStr);
                        scheduledCount++;
                    } else {
                        console.warn(`No phone number for ${name}`);
                    }
                });
            } else {
                // console.log(`Skipping row ${index + 1}: Missing required fields. Keys found: ${Object.keys(row).join(', ')}`);
            }
        });

        if (scheduledCount === 0) {
            return res.status(200).json({ status: 'warning', message: 'Tidak ada pesan yang dijadwalkan. Pastikan kolom "Nomor Telepon" ada dan terisi, serta format tanggal benar.' });
        }

        res.status(200).json({ status: 'success', message: `Berhasil menjadwalkan ${scheduledCount} pesan.` });

    } catch (error) {
        console.error("Error processing Excel upload:", error);
        res.status(500).json({ status: 'error', message: 'Failed to process Excel file', details: error.message });
    }
};

module.exports = {
    addScheduledMessageController,
    getScheduledMessagesController,
    deleteScheduledMessageController,
    syncScheduledMessagesController,
    getGoogleSheetsDiagnosticsController,
    uploadExcelController
};
