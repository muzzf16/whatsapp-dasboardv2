const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const AUDIT_LOG_FILE = path.join(LOG_DIR, 'audit_central.log');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Append-only Audit Log Sink
 * This service ensures logs are written to an immutable-style log file 
 * and can be forwarded to a centralized logging server.
 */
class AuditSink {
    constructor() {
        this.centralSinkUrl = process.env.AUDIT_SINK_URL || null;
        this.secret = process.env.AUDIT_SINK_SECRET || 'audit-secret';
    }

    /**
     * Log an action to the centralized sink
     * @param {Object} entry Audit log entry
     */
    async log(entry) {
        const logEntry = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            ...entry
        };

        const logString = JSON.stringify(logEntry) + '\n';

        // 1. Write to local append-only file (standard sink)
        try {
            fs.appendFileSync(AUDIT_LOG_FILE, logString, 'utf8');
        } catch (err) {
            console.error('Failed to write to local audit sink:', err.message);
        }

        // 2. Forward to centralized HTTP sink if configured
        if (this.centralSinkUrl) {
            try {
                await axios.post(this.centralSinkUrl, logEntry, {
                    headers: {
                        'X-Audit-Source': 'whatsapp-dashboard',
                        'X-Audit-Signature': this.secret, // Simple signature for demo
                        'Content-Type': 'application/json'
                    },
                    timeout: 2000
                });
            } catch (err) {
                // In a real banking app, we might retry or alert if the central sink is down
                console.error('Failed to forward to centralized audit sink:', err.message);
            }
        }

        // 3. Always log to console in development
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUDIT] ${logEntry.action} by user ${logEntry.user_id}`);
        }
    }
}

module.exports = new AuditSink();
