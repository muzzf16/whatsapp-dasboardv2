const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../service-account.json');

class GoogleSheetsService {
    constructor() {
        this.auth = null;
        this.sheets = null;
        this.enabled = true; // disable if init fails
        this.initialized = false;
        this.initError = null;
    }

    async init() {
        if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
            console.warn('Google Sheets service: service-account.json not found; Google Sheets integration disabled.');
            this.enabled = false;
            return;
        }

        try {
            this.auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_FILE,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
            const client = await this.auth.getClient();
            this.sheets = google.sheets({ version: 'v4', auth: client });
            this.initialized = true;
        } catch (error) {
            console.error('Google Sheets service: failed to initialize. Google Sheets integration disabled.', error?.message || error);
            this.enabled = false;
            this.initError = error?.message || error;
            this.enabled = false;
            return;
        }
    }

    async appendMessage(spreadsheetId, data) {
        if (!this.enabled) return; // quietly skip when disabled
        if (!this.sheets) {
            await this.init();
        }

        try {
            // Data: [Timestamp, ConnectionID, Sender, Message, Type]
            const values = [
                [
                    data.timestamp,
                    data.connectionId,
                    data.sender,
                    data.message,
                    data.type
                ]
            ];

            await this.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Sheet1!A:E',
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: values
                }
            });
        } catch (error) {
            console.error('Error appending to Google Sheet:', error?.message || error);
        }
    }

    async getScheduledMessagesFromSheet(spreadsheetId, range = 'Sheet1!A2:D') {
        if (!this.enabled) return [];
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
            console.error('Error fetching data from Google Sheets:', error?.message || error);
            throw new Error('Failed to fetch data from Google Sheets. Check Spreadsheet ID and permissions.');
        }
    }

    getDiagnostics() {
        return {
            enabled: this.enabled,
            initialized: this.initialized,
            initError: this.initError,
        };
    }
}

module.exports = new GoogleSheetsService();
