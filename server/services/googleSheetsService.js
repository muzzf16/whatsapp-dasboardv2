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

            // Expected columns: Name, Account, Amount, Date, Empty, Phone
            return rows.map(row => ({
                name: row[0],
                account: row[1],
                amount: row[2],
                dueDate: row[3],
                phoneNumber: row[5]
            })).filter(row => row.name && row.account && row.amount && row.dueDate && row.phoneNumber);

        } catch (error) {
            console.error('Error fetching data from Google Sheets:', error?.message || error);
            throw new Error('Failed to fetch data from Google Sheets. Check Spreadsheet ID and permissions.');
        }
    }

    async getCollectionData(spreadsheetId, range = 'DataNasabah!A2:H') {
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

            // Map rows to objects with rowIndex for updating
            // Expected columns: Name, NoHP, Amount, DueDate, Status, LastReminded, Notes, ...
            return rows.map((row, index) => ({
                rowIndex: index + 2, // 1-based index, +1 for header
                name: row[0],
                phone: row[1],
                amount: row[2],
                dueDate: row[3],
                status: row[4],
                lastReminded: row[5],
                notes: row[6]
            })).filter(row => row.name && row.phone); // Basic validation

        } catch (error) {
            console.error('Error fetching collection data:', error?.message || error);
            return [];
        }
    }

    async updateRow(spreadsheetId, range, values) {
        if (!this.enabled) return;
        if (!this.sheets) {
            await this.init();
        }

        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [values]
                }
            });
            console.log(`[GoogleSheets] Updated row at ${range}`);
        } catch (error) {
            console.error(`Error updating row at ${range}:`, error?.message || error);
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
