const whatsappService = require('./whatsapp');
const googleSheetsService = require('./googleSheetsService');
const configService = require('./configService'); // Assuming we might needconfig, or just env

class CollectionService {
    constructor() {
        this.spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
        this.sheetName = 'DataNasabah';
    }

    async checkDueDates() {
        if (!this.spreadsheetId) {
            console.warn('CollectionService: No Spreadsheet ID configured.');
            return;
        }

        console.log('CollectionService: Checking due dates...');
        const rows = await googleSheetsService.getCollectionData(this.spreadsheetId, `${this.sheetName}!A2:H`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let remindersSent = 0;

        for (const row of rows) {
            const { rowIndex, name, phone, amount, dueDate, status, lastReminded } = row;

            if (status && status.toLowerCase() === 'lunas') continue;

            const due = this.parseDate(dueDate);
            if (isNaN(due.getTime())) continue;

            // Calculate Days Past Due (DPD)
            const diffTime = today - due;
            const dpd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Logic: Send reminder if DPD >= 0 (Due today or past due)
            // And hasn't been reminded today
            if (dpd >= 0) {
                const lastRemindedDate = this.parseDate(lastReminded);
                const isRemindedToday = !isNaN(lastRemindedDate.getTime()) &&
                    lastRemindedDate.toDateString() === today.toDateString();

                if (!isRemindedToday) {
                    await this.sendReminder(phone, name, amount, dueDate, dpd);

                    // Update Sheet: Status (if changed logic needed), LastReminded
                    // Column F is LastReminded (Index 5 in 0-based array from getCollectionData, likely column F in sheet)
                    // Update specific cell for LastReminded
                    const range = `${this.sheetName}!F${rowIndex}`;
                    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
                    await googleSheetsService.updateRow(this.spreadsheetId, range, [todayStr]);

                    remindersSent++;
                }
            }
        }
        console.log(`CollectionService: Sent ${remindersSent} reminders.`);
        return remindersSent;
    }

    async sendReminder(phone, name, amount, dueDate, dpd) {
        let message = '';
        if (dpd === 0) {
            message = `Halo ${name}, mengingatkan bahwa tagihan Anda sebesar ${amount} jatuh tempo hari ini (${dueDate}). Mohon segera lakukan pembayaran. Terima kasih.`;
        } else if (dpd > 0 && dpd <= 3) {
            message = `Halo ${name}, tagihan Anda sebesar ${amount} telah lewat jatuh tempo ${dpd} hari (${dueDate}). Mohon segera selesaikan pembayaran untuk menghindari denda.`;
        } else {
            message = `PENTING: Sdr ${name}, tagihan Anda Rp${amount} sudah menunggak ${dpd} hari. Segera lunasi hari ini atau hubungi kami untuk solusi pembayaran.`;
        }

        // Get active connection (assuming first connected one for now, or use a specific one)
        // We need a way to get a valid connection ID. 
        // For automation, we often pick the 'primary' one or iterate.
        // Let's rely on whatsappService to handle connection selection or we pick the first available?
        // whatsappService.sendMessage requires connectionId.
        const connections = whatsappService.getAllConnections();
        const activeConn = connections.find(c => c.status === 'connected');

        if (activeConn) {
            try {
                await whatsappService.sendMessage(activeConn.connectionId, phone, message);
            } catch (err) {
                console.error(`Failed to send reminder to ${phone}:`, err.message);
            }
        } else {
            console.warn('CollectionService: No active WhatsApp connection found to send reminders.');
        }
    }

    // Helper to parse dates (YYYY-MM-DD or similar)
    parseDate(input) {
        if (!input) return new Date(NaN);
        const d = new Date(input);
        // Basic check, might need robust parsing like in schedulerService if format varies
        return d;
    }
}

module.exports = new CollectionService();
