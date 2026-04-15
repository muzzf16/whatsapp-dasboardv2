const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const configService = require('../configService');
const aiService = require('../aiService');
const googleSheetsService = require('../googleSheetsService');
const autoReplyService = require('../autoReplyService');
const databaseService = require('../databaseService');

class MessageProcessor {
    constructor(connectionId, io, sendMessageCallback) {
        this.connectionId = connectionId;
        this.io = io;
        this.sendMessageCallback = sendMessageCallback;
        this.userId = null;
    }

    setUserId(userId) {
        this.userId = userId;
    }

    async processMessage(m) {
        console.log(`[WA-DEBUG][${this.connectionId}] messages.upsert type: ${m.type}, messages: ${m.messages.length}`);
        const msg = m.messages[0];
        if (!msg.key.fromMe && (m.type === 'notify' || m.type === 'append')) {
            // Log to file for debugging
            const logPath = path.join(__dirname, '..', '..', 'incoming_message_log.json');
            console.log(`[WA-DEBUG] Writing log to: ${logPath}`);
            fs.writeFileSync(logPath, JSON.stringify(msg, null, 2));

            let sender = msg.key.remoteJid;

            // Filter out status messages and group messages
            if (sender === 'status@broadcast' || sender.endsWith('@g.us')) {
                return;
            }

            // Filter out self-messages (sent from other linked devices)
            if (this.userId) {
                const senderNumber = sender.split('@')[0].split(':')[0];
                const myNumber = this.userId.split('@')[0].split(':')[0];
                if (senderNumber === myNumber) {
                    return;
                }
            }

            // Fix for LID: Use remoteJidAlt if available and current sender is LID
            if (sender.includes('@lid') && msg.key.remoteJidAlt) {
                sender = msg.key.remoteJidAlt;
            }

            const unwrapMessage = (m) => {
                if (!m) return null;
                return m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message || m;
            };

            const messageContent = unwrapMessage(msg.message);
            let text = '';

            if (messageContent) {
                text = messageContent.conversation
                    || messageContent.extendedTextMessage?.text
                    || messageContent.imageMessage?.caption
                    || messageContent.videoMessage?.caption
                    || messageContent.documentMessage?.caption
                    || messageContent.documentMessage?.fileName
                    || (messageContent.stickerMessage ? '[Sticker]' : null)
                    || (messageContent.audioMessage ? '[Audio]' : null)
                    || (messageContent.imageMessage ? '[Image]' : null)
                    || (messageContent.videoMessage ? '[Video]' : null)
                    || (messageContent.documentMessage ? '[Document]' : null)
                    || (messageContent.contactMessage ? '[Contact]' : null)
                    || (messageContent.locationMessage ? '[Location]' : null)
                    || (messageContent.protocolMessage && messageContent.protocolMessage.type === 'REVOKE' ? '[Message Revoked]' : null)
                    || 'No text content';
            } else {
                text = 'No text content';
            }

            // We are filtering out group messages above so groupName will always be null for now
            // But keeping logic in case we enable groups later
            let groupName = null;
            /* 
            if (sender.endsWith('@g.us')) {
                const group = await this.sock.groupMetadata(sender); // Would need socket access here
                groupName = group.subject;
            }
            */

            if (!text) text = 'No text content';

            const log = {
                from: sender,
                sender: sender,
                pushName: msg.pushName,
                text,
                timestamp: new Date().toISOString(),
                groupName: groupName,
                senderName: msg.pushName,
            };

            try {
                await databaseService.addMessage({
                    connection_id: this.connectionId,
                    type: 'incoming',
                    sender: sender,
                    recipient: null,
                    push_name: msg.pushName,
                    message: text,
                    file_name: null, // Modify if we handle files
                    timestamp: log.timestamp,
                    group_name: groupName
                });
            } catch (err) {
                console.error(`[${this.connectionId}] Failed to save incoming message to DB:`, err);
            }

            // Update in-memory log if callback is provided
            if (this.onNewMessage) {
                this.onNewMessage(log);
            }

            this.io.emit('new_message', { connectionId: this.connectionId, log });

            const webhookPayload = {
                event: 'new_message',
                connectionId: this.connectionId,
                sender: sender.split('@')[0],
                message: text,
                timestamp: log.timestamp,
                groupName: groupName,
                senderName: msg.pushName,
                originalMessage: msg
            };
            this.callWebhook(webhookPayload);

            // Log to Google Sheets
            if (process.env.GOOGLE_SPREADSHEET_ID) {
                googleSheetsService.appendMessage(process.env.GOOGLE_SPREADSHEET_ID, {
                    timestamp: log.timestamp,
                    connectionId: this.connectionId,
                    sender: sender.split('@')[0],
                    message: text,
                    type: 'Incoming'
                }).catch(err => console.error(`[GoogleSheets][${this.connectionId}] appendMessage failed:`, err?.message || err));
            }

            // AI Auto-reply
            await this.handleAutoReply(text, sender);
        }
    }

    async handleAutoReply(text, sender) {
        try {
            // Only reply to meaningful messages
            if (!text || text.length <= 1) return;

            // 1. Check Auto-Replies first (works for ALL senders)
            const autoReply = autoReplyService.findReply(text);
            if (autoReply) {
                console.log(`[AutoReply][${this.connectionId}] Matched keyword for ${sender}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.sendMessageCallback(sender, autoReply);
                return;
            }

            // 2. AI Auto-reply — ONLY for nasabah tagihan kredit
            const senderNumber = sender.split('@')[0];
            const googleSheetsService = require('../googleSheetsService');
            const nasabah = await googleSheetsService.isNasabah(senderNumber);

            if (!nasabah) {
                console.log(`[AI][${this.connectionId}] Sender ${senderNumber} is NOT a nasabah. Skipping AI reply.`);
                return;
            }

            console.log(`[AI][${this.connectionId}] Sender ${senderNumber} is nasabah: ${nasabah.name}. Generating AI reply...`);
            const aiResponse = await aiService.generateReply(text, senderNumber);
            if (aiResponse) {
                console.log(`[AI][${this.connectionId}] Replying to ${sender} (${nasabah.name})`);
                // Add a small delay to simulate typing
                await new Promise(resolve => setTimeout(resolve, 2000));
                await this.sendMessageCallback(sender, aiResponse);
            }
        } catch (error) {
            console.error(`[AI][${this.connectionId}] Error generating/sending reply:`, error);
        }
    }

    async callWebhook(payload) {
        const webhookUrl = await configService.getWebhookUrl();
        const webhookSecret = await configService.getWebhookSecret();
        if (!webhookUrl) {
            return;
        }
        console.log(`[WEBHOOK][${this.connectionId}] Sending to: ${webhookUrl}`);
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (webhookSecret) {
                const signature = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload)).digest('hex');
                headers['X-Webhook-Signature'] = signature;
            }
            await axios.post(webhookUrl, payload, { headers });
            console.log(`[WEBHOOK][${this.connectionId}] Successfully sent payload.`);
        } catch (error) {
            console.error(`[WEBHOOK][${this.connectionId}] Error sending payload:`, error.message);
        }
    }
}

module.exports = MessageProcessor;
