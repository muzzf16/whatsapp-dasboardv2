const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../service-account.json');

class GoogleSheetsService {
    constructor() {
        this.auth = null;
        this.sheets = null;
    }

    async init() {
        if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
            throw new Error('Service account file not found. Please place "service-account.json" in the server directory.');
        }

        this.auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const client = await this.auth.getClient();
        this.sheets = google.sheets({ version: 'v4', auth: client });
    }

    async getScheduledMessagesFromSheet(spreadsheetId, range = 'Sheet1!A2:D') {
        if (!this.sheets) {
            await this.init();
        }

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) {
                return [];
            }

            // Expected columns: Number, Message, Date (YYYY-MM-DD), Time (HH:mm)
            return rows.map(row => ({
                number: row[0],
                message: row[1],
                date: row[2],
                time: row[3]
            })).filter(row => row.number && row.message && row.date && row.time);

        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error);
            throw new Error('Failed to fetch data from Google Sheets. Check Spreadsheet ID and permissions.');
        }
    }
}

module.exports = new GoogleSheetsService();
