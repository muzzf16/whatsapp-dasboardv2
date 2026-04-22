const xlsx = require('xlsx');
const schedulerService = require('./schedulerService');
const { normalizePhoneNumber } = require('../utils/security');

function findColumnValue(row, patterns) {
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const key = keys.find((candidate) => {
            const normalizedKey = candidate.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            const normalizedPattern = pattern.replace(/[^a-z0-9]/g, '');
            return normalizedKey === normalizedPattern || normalizedKey.includes(normalizedPattern);
        });
        if (key) return row[key];
    }
    return undefined;
}

function parseWorksheetDate(value) {
    if (typeof value === 'number') {
        return new Date(Math.round((value - 25569) * 86400 * 1000));
    }
    return new Date(value);
}

async function importWorkbookBuffer({ buffer, connectionId, isRecurring = false, userId = null, userRole = 'operator' }) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    let scheduledCount = 0;

    rows.forEach((row, index) => {
        const name = findColumnValue(row, ['nama', 'name', 'customer']);
        const accountNumber = findColumnValue(row, ['no rekening', 'norekening', 'rekening', 'account', 'acc']);
        const amount = findColumnValue(row, ['tagihan', 'amount', 'bill', 'total']);
        const dueDateStr = findColumnValue(row, ['tanggal jatuh tempo', 'jatuh tempo', 'due date', 'tgl jatuh tempo']);
        const notes = findColumnValue(row, ['keterangan', 'notes', 'desc', 'deskripsi']);
        const phoneNumber = findColumnValue(row, ['nomor telepon', 'telepon', 'telp', 'no hp', 'nohp', 'phone', 'mobile', 'wa']);

        if (!(name && accountNumber && amount && dueDateStr)) {
            return;
        }

        let dueDate;
        try {
            dueDate = parseWorksheetDate(dueDateStr);
        } catch (error) {
            console.warn(`[ExcelImport] Date parse error for row ${index + 1}:`, error);
            return;
        }

        if (Number.isNaN(dueDate.getTime())) {
            console.warn(`[ExcelImport] Invalid date for ${name}: ${dueDateStr}`);
            return;
        }

        dueDate.setFullYear(new Date().getFullYear());
        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        if (!normalizedPhone) {
            console.warn(`[ExcelImport] No valid phone number for ${name}`);
            return;
        }

        [-1, 0, 4].forEach((offset) => {
            const scheduleDate = new Date(dueDate);
            scheduleDate.setDate(dueDate.getDate() + offset);
            scheduleDate.setHours(9, 0, 0, 0);

            const message = `Halo ${name}, ini adalah pengingat tagihan kredit Anda sebesar ${amount} untuk rekening ${accountNumber}. Jatuh tempo pada ${dueDate.toISOString().split('T')[0]}. ${notes ? `Keterangan: ${notes}` : ''}`;

            try {
                schedulerService.addScheduledMessage(
                    connectionId,
                    normalizedPhone,
                    message,
                    scheduleDate.toISOString(),
                    isRecurring,
                    userId,
                    userRole
                );
                scheduledCount += 1;
            } catch (error) {
                console.error(`[ExcelImport] Failed to schedule row ${index + 1}:`, error);
            }
        });
    });

    return scheduledCount;
}

module.exports = {
    importWorkbookBuffer,
};
