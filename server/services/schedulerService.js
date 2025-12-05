const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const whatsappService = require('./whatsappService');
const googleSheetsService = require('./googleSheetsService');

const SCHEDULE_FILE = path.join(__dirname, '../scheduledMessages.json');

class SchedulerService {
    constructor() {
        this.scheduledMessages = [];
        this.jobs = new Map();
        this.loadScheduledMessages();
    }

    getScheduledMessages() {
        return this.scheduledMessages;
    }

    addScheduledMessage(connectionId, recipient, message, scheduledTime) {
        const id = uuidv4();
        this.scheduleMessage(id, connectionId, recipient, message, scheduledTime);
        return { id, connectionId, recipient, message, scheduledTime };
    }

    deleteScheduledMessage(id) {
        this.cancelMessage(id);
    }

    async syncWithGoogleSheets(spreadsheetId, connectionId) {
        const messages = await googleSheetsService.getScheduledMessagesFromSheet(spreadsheetId);
        let count = 0;
        for (const msg of messages) {
            // msg format: { name, account, amount, dueDate, phoneNumber }
            const { name, account, amount, dueDate, phoneNumber } = msg;

            try {
                // Parse date - assuming YYYY-MM-DD or similar standard format
                // If it's already a date string that Date() accepts
                const dateObj = new Date(dueDate);

                if (isNaN(dateObj.getTime())) {
                    console.warn(`Skipping invalid date for ${name}: ${dueDate}`);
                    continue;
                }

                // Set default time to 09:00:00
                dateObj.setHours(9, 0, 0, 0);

                // Ensure the date is in the future? Optional, but for now just schedule it.
                // If date is in past, node-cron might not fire or fire immediately depending on config, 
                // but usually we want to schedule for future. 
                // However, let's just trust the date for now or maybe check if it's valid ISO.

                const scheduledTime = dateObj.toISOString();
                const message = `Halo ${name}, ini adalah pengingat tagihan kredit Anda sebesar ${amount} untuk rekening ${account}. Jatuh tempo pada ${dueDate}.`;

                this.addScheduledMessage(connectionId, phoneNumber, message, scheduledTime);
                count++;
            } catch (err) {
                console.error(`Error processing row for ${name}:`, err.message);
            }
        }
        return count;
    }

    loadScheduledMessages() {
        if (fs.existsSync(SCHEDULE_FILE)) {
            try {
                const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
                this.scheduledMessages = JSON.parse(data);
                // Re-schedule messages that were active before shutdown
                this.scheduledMessages.forEach(msg => {
                    this.scheduleMessage(msg.id, msg.connectionId, msg.recipient, msg.message, msg.scheduledTime, false);
                });
            } catch (error) {
                console.error("Error loading scheduled messages:", error);
                this.scheduledMessages = [];
            }
        }
    }

    saveScheduledMessages() {
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(this.scheduledMessages, null, 2), 'utf8');
    }

    scheduleMessage(id, connectionId, recipient, message, scheduledTime, save = true) {
        // Cancel existing job if any (for updates)
        if (this.jobs.has(id)) {
            this.jobs.get(id).stop();
            this.jobs.delete(id);
        }

        if (save) {
            const existingMessageIndex = this.scheduledMessages.findIndex(msg => msg.id === id);
            const newMessage = { id, connectionId, recipient, message, scheduledTime };
            if (existingMessageIndex !== -1) {
                this.scheduledMessages[existingMessageIndex] = newMessage;
            } else {
                this.scheduledMessages.push(newMessage);
            }
            this.saveScheduledMessages();
        }

        const date = new Date(scheduledTime);
        // Use node-cron's Date object scheduling which is simpler and handles timezones better (uses system time by default)

        const job = cron.schedule(
            `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} ${date.getDate()} * *`,
            async () => {
                try {
                    await whatsappService.sendMessage(connectionId, recipient, message);
                    // this.deleteScheduledMessage(id); // Keep for recurring
                } catch (error) {
                    console.error(`Failed to send message to ${recipient}:`, error);
                }
            }
        );

        this.jobs.set(id, job);
    }

    cancelMessage(id) {
        const job = this.jobs.get(id);
        if (job) {
            job.stop();
            this.jobs.delete(id);
        }

        this.scheduledMessages = this.scheduledMessages.filter(msg => msg.id !== id);
        this.saveScheduledMessages();
    }
}

module.exports = new SchedulerService();
