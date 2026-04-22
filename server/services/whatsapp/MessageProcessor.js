const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const configService = require('../configService');
const aiService = require('../aiService');
const googleSheetsService = require('../googleSheetsService');
const autoReplyService = require('../autoReplyService');
const databaseService = require('../databaseService');
const contactPolicyService = require('../contactPolicyService');

function unwrapMessage(message) {
    if (!message) return null;
    return message.ephemeralMessage?.message
        || message.viewOnceMessage?.message
        || message.viewOnceMessageV2?.message
        || message.documentWithCaptionMessage?.message
        || message;
}

function extractMessageText(messageContent) {
    if (!messageContent) return 'No text content';

    return messageContent.conversation
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
}

function isRestrictedCredentialText(text) {
    return /\b(pin|otp|one time password|password|kata sandi|cvv|kode akses)\b/i.test(text || '');
}

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
            this.writeIncomingMessageDebugLog(msg);

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

            const messageContent = unwrapMessage(msg.message);
            let text = extractMessageText(messageContent);

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
                senderName: msg.pushName
            };
            if (process.env.WEBHOOK_INCLUDE_ORIGINAL_MESSAGE === 'true') {
                webhookPayload.originalMessage = msg;
            }
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

    writeIncomingMessageDebugLog(msg) {
        if (process.env.DEBUG_INCOMING_MESSAGES !== 'true') {
            return;
        }

        try {
            const logPath = path.join(__dirname, '..', '..', 'incoming_message_log.json');
            const debugPayload = {
                timestamp: new Date().toISOString(),
                id: msg.key?.id,
                remoteJid: msg.key?.remoteJid,
                fromMe: msg.key?.fromMe,
                pushName: msg.pushName,
                messageTypes: msg.message ? Object.keys(unwrapMessage(msg.message) || {}) : []
            };
            fs.writeFileSync(logPath, JSON.stringify(debugPayload, null, 2));
        } catch (error) {
            console.warn(`[WA-DEBUG][${this.connectionId}] Failed to write incoming debug log:`, error?.message || error);
        }
    }

    async handleAutoReply(text, sender) {
        try {
            const senderNumber = sender.split('@')[0];

            if (contactPolicyService.isOptOutKeyword(text)) {
                await contactPolicyService.upsertConsent(senderNumber, {
                    optedOut: true,
                    source: 'whatsapp_inbound_keyword'
                });
                await this.sendMessageCallback(sender, 'Permintaan berhenti pesan sudah kami terima. Anda tidak akan menerima pesan operasional lebih lanjut sampai Anda mengirim START atau menghubungi kanal resmi.');
                return;
            }

            if (contactPolicyService.isOptInKeyword(text)) {
                await contactPolicyService.upsertConsent(senderNumber, {
                    optedOut: false,
                    source: 'whatsapp_inbound_keyword'
                });
                await this.sendMessageCallback(sender, 'Status langganan pesan Anda sudah diaktifkan kembali. Terima kasih.');
                return;
            }

            if (await contactPolicyService.isPhoneOptedOut(senderNumber)) {
                console.log(`[Policy][${this.connectionId}] Sender ${senderNumber} is opted out. Skipping auto reply.`);
                return;
            }

            if (isRestrictedCredentialText(text)) {
                await this.sendMessageCallback(sender, 'Demi keamanan, mohon jangan mengirim PIN, OTP, password, CVV, atau kode akses melalui chat ini. Hubungi kanal resmi bank jika Anda membutuhkan bantuan verifikasi.');
                return;
            }

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
            await axios.post(webhookUrl, payload, { headers, timeout: 10000 });
            console.log(`[WEBHOOK][${this.connectionId}] Successfully sent payload.`);
        } catch (error) {
            console.error(`[WEBHOOK][${this.connectionId}] Error sending payload:`, error.message);
        }
    }
}

module.exports = MessageProcessor;
