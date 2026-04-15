const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const whatsappService = require('./whatsapp');
const googleSheetsService = require('./googleSheetsService');
const collectionService = require('./collectionService');
const { normalizeConnectionId, normalizePhoneNumber, normalizeMessageText } = require('../utils/security');

const SCHEDULE_FILE = path.join(__dirname, '../scheduledMessages.json');

function parseDate(input) {
    if (!input) return new Date(NaN);

    const str = input.toString().trim();

    // 1. ISO Format YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d;
    }

    // 2. DD/MM/YYYY or DD-MM-YYYY (Prioritize this for ID users)
    const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = str.match(dmyRegex);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);

        // Basic validity check (month 0-11, day 1-31)
        if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const date = new Date(year, month, day);
            // Verify it didn't rollover (e.g. Feb 31 -> Mar 3)
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                return date;
            }
        }
    }

    // 3. Indonesian Month Names
    const monthNames = {
        'januari': 0, 'februari': 1, 'maret': 2, 'april': 3, 'mei': 4, 'juni': 5,
        'juli': 6, 'agustus': 7, 'september': 8, 'oktober': 9, 'november': 10, 'desember': 11,
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'jun': 5,
        'jul': 6, 'agu': 7, 'sep': 8, 'okt': 9, 'nov': 10, 'des': 11
    };

    // Regex for "25 Desember 2023" (Case insensitive)
    const idDateRegex = /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/;
    const matchId = str.toLowerCase().match(idDateRegex);

    if (matchId) {
        const day = parseInt(matchId[1], 10);
        const monthStr = matchId[2];
        const year = parseInt(matchId[3], 10);

        if (monthNames.hasOwnProperty(monthStr)) {
            const date = new Date(year, monthNames[monthStr], day);
            if (!isNaN(date.getTime())) return date;
        }
    }

    // 4. Fallback to standard Date
    const fallbackDate = new Date(str);
    if (!isNaN(fallbackDate.getTime())) return fallbackDate;

    return new Date(NaN);
}

class SchedulerService {
    constructor() {
        this.scheduledMessages = [];
        this.jobs = new Map();
        this.loadScheduledMessages();
    }

    getScheduledMessages({ connectionId, userId } = {}) {
        let messages = this.scheduledMessages;
        if (connectionId) {
            messages = messages.filter(m => m.connectionId === connectionId);
        }
        if (userId) {
            messages = messages.filter(m => m.userId === userId || !m.userId);
        }
        return messages;
    }

    addScheduledMessage(connectionId, recipient, message, scheduledTime, isRecurring = false, userId = null) {
        const safeConnectionId = normalizeConnectionId(connectionId);
        const safeRecipient = normalizePhoneNumber(recipient);
        const safeMessage = normalizeMessageText(message);
        const date = new Date(scheduledTime);

        if (!safeConnectionId || !safeRecipient || !safeMessage || Number.isNaN(date.getTime())) {
            throw new Error('Invalid scheduled message input');
        }

        const id = uuidv4();
        this.scheduleMessage(id, safeConnectionId, safeRecipient, safeMessage, date.toISOString(), isRecurring, userId);
        return { id, connectionId: safeConnectionId, recipient: safeRecipient, message: safeMessage, scheduledTime: date.toISOString(), isRecurring, userId };
    }
    }

    deleteScheduledMessage(id) {
        this.cancelMessage(id);
    }

    async syncWithGoogleSheets(spreadsheetId, connectionId, userId = null) {
        const messages = await googleSheetsService.getScheduledMessagesFromSheet(spreadsheetId);
        let count = 0;
        for (const msg of messages) {
            // msg format: { name, account, amount, dueDate, phoneNumber }
            const { name, account, amount, dueDate, phoneNumber } = msg;

            try {
                // Parse date using custom helper to support DD/MM/YYYY and ID formats
                const dateObj = parseDate(dueDate);

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

                const normalizedPhone = normalizePhoneNumber(phoneNumber);
                if (!normalizedPhone) {
                    console.warn(`Skipping row for ${name}: invalid phone number`);
                    continue;
                }

                this.addScheduledMessage(connectionId, normalizedPhone, message, scheduledTime, false, userId);
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
                    this.scheduleMessage(msg.id, msg.connectionId, msg.recipient, msg.message, msg.scheduledTime, msg.isRecurring || false, msg.userId || null, false);
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

    scheduleMessage(id, connectionId, recipient, message, scheduledTime, isRecurring = false, userId = null, save = true) {
        // Cancel existing job if any (for updates)
        if (this.jobs.has(id)) {
            this.jobs.get(id).stop();
            this.jobs.delete(id);
        }

        if (save) {
            const existingMessageIndex = this.scheduledMessages.findIndex(msg => msg.id === id);
            const newMessage = { id, connectionId, recipient, message, scheduledTime, isRecurring, userId };
            if (existingMessageIndex !== -1) {
                this.scheduledMessages[existingMessageIndex] = newMessage;
            } else {
                this.scheduledMessages.push(newMessage);
            }
            this.saveScheduledMessages();
        }

        const date = new Date(scheduledTime);
        if (isNaN(date.getTime())) {
            console.error(`Invalid scheduled time for message ${id}: ${scheduledTime}`);
            if (save) {
                // optionally remove it or just don't schedule it?
                // If we're loading, 'save' is false. If we're adding, 'save' is true.
                // If it's invalid input, we probably shouldn't crash.
            }
            return;
        }
        if (!isRecurring && date.getTime() <= Date.now()) {
            console.warn(`Skipping past scheduled time for message ${id}`);
            if (save) {
                this.scheduledMessages = this.scheduledMessages.filter(msg => msg.id !== id);
                this.saveScheduledMessages();
            }
            return;
        }
        // Use node-cron's Date object scheduling which is simpler and handles timezones better (uses system time by default)

        let job;

        try {
            if (isRecurring) {
                // Recurring monthly on the same day/time
                job = cron.schedule(
                    `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} ${date.getDate()} * *`,
                    async () => {
                        try {
                            await whatsappService.sendMessage(connectionId, recipient, message);
                        } catch (error) {
                            console.error(`Failed to send message to ${recipient}:`, error);
                        }
                    }
                );
            } else {
                // One-time schedule
                job = cron.schedule(
                    date,
                    async () => {
                        try {
                            await whatsappService.sendMessage(connectionId, recipient, message);
                            this.deleteScheduledMessage(id); // Remove after sending
                        } catch (error) {
                            console.error(`Failed to send message to ${recipient}:`, error);
                        }
                    }
                );
            }
            this.jobs.set(id, job);
        } catch (scheduleError) {
            console.error(`Failed to schedule cron job for ${id}:`, scheduleError);
            if (save) {
                // If we failed to schedule, maybe we should remove it from the list?
                // Or keep it but marked as error?
                // For now, let's just log it. The entry exists in JSON but no job is running.
            }
        }
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

    deleteAllScheduledMessages({ connectionId, userId } = {}) {
        const toDelete = this.scheduledMessages.filter(msg => {
            if (connectionId && msg.connectionId !== connectionId) return false;
            if (userId && msg.userId && msg.userId !== userId) return false;
            return true;
        });

        toDelete.forEach(msg => {
            const job = this.jobs.get(msg.id);
            if (job) {
                job.stop();
                this.jobs.delete(msg.id);
            }
        });

        const deleteIds = new Set(toDelete.map(m => m.id));
        this.scheduledMessages = this.scheduledMessages.filter(msg => !deleteIds.has(msg.id));
        this.saveScheduledMessages();
    }
}

module.exports = new SchedulerService();
