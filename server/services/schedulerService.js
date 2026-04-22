const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const whatsappService = require('./whatsapp');
const googleSheetsService = require('./googleSheetsService');
const messageQuotaService = require('./messageQuotaService');
const { normalizeConnectionId, normalizePhoneNumber, normalizeMessageText } = require('../utils/security');
const { normalizeRole } = require('../utils/roles');

const SCHEDULE_FILE = path.join(__dirname, '../scheduledMessages.json');

function parseDate(input) {
    if (!input) return new Date(NaN);

    const str = input.toString().trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
        const date = new Date(str);
        if (!Number.isNaN(date.getTime())) return date;
    }

    const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const match = str.match(dmyRegex);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        const date = new Date(year, month, day);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
            return date;
        }
    }

    const monthNames = {
        januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
        juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
        jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, agu: 7, sep: 8, okt: 9, nov: 10, des: 11,
    };
    const idDateRegex = /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/;
    const matchId = str.toLowerCase().match(idDateRegex);
    if (matchId && Object.prototype.hasOwnProperty.call(monthNames, matchId[2])) {
        return new Date(parseInt(matchId[3], 10), monthNames[matchId[2]], parseInt(matchId[1], 10));
    }

    const fallbackDate = new Date(str);
    return Number.isNaN(fallbackDate.getTime()) ? new Date(NaN) : fallbackDate;
}

class SchedulerService {
    constructor() {
        this.scheduledMessages = [];
        this.jobs = new Map();
        this.loadScheduledMessages();
    }

    getScheduledMessages({ connectionId, userId } = {}) {
        return this.scheduledMessages.filter((message) => {
            if (connectionId && message.connectionId !== connectionId) return false;
            if (userId && message.userId && message.userId !== userId) return false;
            return true;
        });
    }

    addScheduledMessage(connectionId, recipient, message, scheduledTime, isRecurring = false, userId = null, userRole = 'operator') {
        const safeConnectionId = normalizeConnectionId(connectionId);
        const safeRecipient = normalizePhoneNumber(recipient);
        const safeMessage = normalizeMessageText(message);
        const date = new Date(scheduledTime);
        const safeUserRole = normalizeRole(userRole);

        if (!safeConnectionId || !safeRecipient || !safeMessage || Number.isNaN(date.getTime())) {
            throw new Error('Invalid scheduled message input');
        }

        const id = uuidv4();
<<<<<<< HEAD
        this.scheduleMessage(id, safeConnectionId, safeRecipient, safeMessage, date.toISOString(), isRecurring, userId, safeUserRole);
        return {
            id,
            connectionId: safeConnectionId,
            recipient: safeRecipient,
            message: safeMessage,
            scheduledTime: date.toISOString(),
            isRecurring,
            userId,
            userRole: safeUserRole,
        };
=======
        this.scheduleMessage(id, safeConnectionId, safeRecipient, safeMessage, date.toISOString(), isRecurring, userId);
        return { id, connectionId: safeConnectionId, recipient: safeRecipient, message: safeMessage, scheduledTime: date.toISOString(), isRecurring, userId };
>>>>>>> 4aa9cc5dd2f6e8f9ac818cc0c751adf4486c8e9a
    }

    deleteScheduledMessage(id) {
        this.cancelMessage(id);
    }

    async syncWithGoogleSheets(spreadsheetId, connectionId, userId = null, userRole = 'operator') {
        const messages = await googleSheetsService.getScheduledMessagesFromSheet(spreadsheetId);
        let count = 0;

        for (const entry of messages) {
            const { name, account, amount, dueDate, phoneNumber } = entry;
            const dateObj = parseDate(dueDate);
            if (Number.isNaN(dateObj.getTime())) {
                continue;
            }

            dateObj.setHours(9, 0, 0, 0);
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            if (!normalizedPhone) {
                continue;
            }

            const message = `Halo ${name}, ini adalah pengingat tagihan kredit Anda sebesar ${amount} untuk rekening ${account}. Jatuh tempo pada ${dueDate}.`;
            this.addScheduledMessage(connectionId, normalizedPhone, message, dateObj.toISOString(), false, userId, userRole);
            count += 1;
        }

        return count;
    }

    loadScheduledMessages() {
        if (!fs.existsSync(SCHEDULE_FILE)) {
            return;
        }

        try {
            const data = fs.readFileSync(SCHEDULE_FILE, 'utf8');
            this.scheduledMessages = JSON.parse(data);
            this.scheduledMessages.forEach((message) => {
                this.scheduleMessage(
                    message.id,
                    message.connectionId,
                    message.recipient,
                    message.message,
                    message.scheduledTime,
                    message.isRecurring || false,
                    message.userId || null,
                    message.userRole || 'operator',
                    false
                );
            });
        } catch (error) {
            console.error('Error loading scheduled messages:', error);
            this.scheduledMessages = [];
        }
    }

    saveScheduledMessages() {
        fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(this.scheduledMessages, null, 2), 'utf8');
    }

    scheduleMessage(id, connectionId, recipient, message, scheduledTime, isRecurring = false, userId = null, userRole = 'operator', save = true) {
        if (this.jobs.has(id)) {
            this.jobs.get(id).stop();
            this.jobs.delete(id);
        }

        if (save) {
            const nextMessage = { id, connectionId, recipient, message, scheduledTime, isRecurring, userId, userRole: normalizeRole(userRole) };
            const existingIndex = this.scheduledMessages.findIndex((item) => item.id === id);
            if (existingIndex >= 0) {
                this.scheduledMessages[existingIndex] = nextMessage;
            } else {
                this.scheduledMessages.push(nextMessage);
            }
            this.saveScheduledMessages();
        }

        const date = new Date(scheduledTime);
        if (Number.isNaN(date.getTime())) {
            console.error(`Invalid scheduled time for message ${id}: ${scheduledTime}`);
            return;
        }

        if (!isRecurring && date.getTime() <= Date.now()) {
            if (save) {
                this.scheduledMessages = this.scheduledMessages.filter((item) => item.id !== id);
                this.saveScheduledMessages();
            }
            return;
        }

        try {
            if (isRecurring) {
                const expression = `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} ${date.getDate()} * *`;
                const job = cron.schedule(expression, async () => {
                    try {
                        await messageQuotaService.assertCanDispatch({
                            connectionId,
                            userId,
                            role: userRole,
                            requestedCount: 1,
                        });
                        await whatsappService.sendMessage(connectionId, recipient, message, null, {
                            initiatedByUserId: userId,
                            deliverySource: 'scheduler',
                        });
                    } catch (error) {
                        console.error(`Failed to send recurring message to ${recipient}:`, error);
                    }
                });
                this.jobs.set(id, job);
                return;
            }

            const expression = `${date.getSeconds()} ${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
            const job = cron.schedule(expression, async () => {
                try {
                    await messageQuotaService.assertCanDispatch({
                        connectionId,
                        userId,
                        role: userRole,
                        requestedCount: 1,
                    });
                    await whatsappService.sendMessage(connectionId, recipient, message, null, {
                        initiatedByUserId: userId,
                        deliverySource: 'scheduler',
                    });
                    this.deleteScheduledMessage(id);
                } catch (error) {
                    if (messageQuotaService.isQuotaExceededError(error)) {
                        const retryDate = new Date();
                        retryDate.setDate(retryDate.getDate() + 1);
                        retryDate.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0);
                        console.warn(`Quota reached for scheduled message ${id}. Rescheduling to ${retryDate.toISOString()}.`);
                        this.scheduleMessage(id, connectionId, recipient, message, retryDate.toISOString(), false, userId, userRole, true);
                        return;
                    }
                    console.error(`Failed to send scheduled message to ${recipient}:`, error);
                }
            });
            this.jobs.set(id, job);
        } catch (error) {
            console.error(`Failed to schedule cron job for ${id}:`, error);
        }
    }

    cancelMessage(id) {
        const job = this.jobs.get(id);
        if (job) {
            job.stop();
            this.jobs.delete(id);
        }

        this.scheduledMessages = this.scheduledMessages.filter((message) => message.id !== id);
        this.saveScheduledMessages();
    }

    deleteAllScheduledMessages({ connectionId, userId } = {}) {
        const deleteIds = new Set(
            this.scheduledMessages
                .filter((message) => {
                    if (connectionId && message.connectionId !== connectionId) return false;
                    if (userId && message.userId && message.userId !== userId) return false;
                    return true;
                })
                .map((message) => message.id)
        );

        deleteIds.forEach((id) => {
            const job = this.jobs.get(id);
            if (job) {
                job.stop();
                this.jobs.delete(id);
            }
        });

        this.scheduledMessages = this.scheduledMessages.filter((message) => !deleteIds.has(message.id));
        this.saveScheduledMessages();
    }
}

module.exports = new SchedulerService();
