const fs = require('fs');
const path = require('path');
const db = require('../db');
const deliveryPolicyService = require('./deliveryPolicyService');

const APPROVAL_UPLOAD_DIR = path.join(__dirname, '..', 'approval_payloads');
const OPERATIONAL_LOG_DIR = path.join(__dirname, '..', 'logs');
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve({ changes: this.changes });
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

function subtractDays(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
}

async function cleanupMessages(days) {
    const cutoff = subtractDays(days).toISOString();
    return dbRun('DELETE FROM messages WHERE timestamp IS NOT NULL AND datetime(timestamp) < datetime(?)', [cutoff]);
}

async function cleanupAuditLogs(days) {
    const cutoff = subtractDays(days).toISOString();
    return dbRun('DELETE FROM audit_logs WHERE datetime(created_at) < datetime(?)', [cutoff]);
}

async function cleanupReviewedApprovals(days) {
    const cutoff = subtractDays(days).toISOString();
    return dbRun(
        `DELETE FROM approval_requests
         WHERE status IN ('approved', 'rejected')
         AND datetime(COALESCE(reviewed_at, created_at)) < datetime(?)`,
        [cutoff]
    );
}

async function cleanupApprovalPayloadFiles(days) {
    if (!fs.existsSync(APPROVAL_UPLOAD_DIR)) {
        return 0;
    }

    const pendingApprovals = await dbAll(
        `SELECT payload FROM approval_requests WHERE status = 'pending'`
    );
    const referencedFiles = new Set(
        pendingApprovals
            .map((row) => {
                try {
                    return JSON.parse(row.payload || '{}')?.filePath || null;
                } catch (error) {
                    return null;
                }
            })
            .filter(Boolean)
    );

    const cutoffMs = subtractDays(days).getTime();
    let deletedCount = 0;
    const files = await fs.promises.readdir(APPROVAL_UPLOAD_DIR, { withFileTypes: true });
    for (const file of files) {
        if (!file.isFile()) {
            continue;
        }

        const filePath = path.join(APPROVAL_UPLOAD_DIR, file.name);
        if (referencedFiles.has(filePath)) {
            continue;
        }

        try {
            const stats = await fs.promises.stat(filePath);
            if (stats.mtimeMs < cutoffMs) {
                await fs.promises.unlink(filePath);
                deletedCount += 1;
            }
        } catch (error) {
            console.warn('[Retention] Failed to process approval payload file:', filePath, error.message);
        }
    }

    return deletedCount;
}

async function cleanupOperationalLogs(days) {
    if (!fs.existsSync(OPERATIONAL_LOG_DIR)) {
        return 0;
    }

    const cutoffMs = subtractDays(days).getTime();
    let deletedCount = 0;
    const files = await fs.promises.readdir(OPERATIONAL_LOG_DIR, { withFileTypes: true });
    for (const file of files) {
        if (!file.isFile()) {
            continue;
        }

        const filePath = path.join(OPERATIONAL_LOG_DIR, file.name);
        // Do not cleanup the centralized audit sink
        if (file.name === 'audit_central.log') {
            continue;
        }
        try {
            const stats = await fs.promises.stat(filePath);
            if (stats.mtimeMs < cutoffMs) {
                await fs.promises.unlink(filePath);
                deletedCount += 1;
            }
        } catch (error) {
            console.warn('[Retention] Failed to process operational log file:', filePath, error.message);
        }
    }

    return deletedCount;
}

async function runCleanup() {
    const policy = deliveryPolicyService.getRetentionPolicy();
    const [messages, audits, approvals, approvalFiles, logFiles] = await Promise.all([
        cleanupMessages(policy.messageRetentionDays),
        cleanupAuditLogs(policy.auditLogRetentionDays),
        cleanupReviewedApprovals(policy.approvalRetentionDays),
        cleanupApprovalPayloadFiles(policy.approvalRetentionDays),
        cleanupOperationalLogs(policy.operationalLogRetentionDays),
    ]);

    console.log('[Retention] Cleanup complete:', {
        messagesDeleted: messages.changes,
        auditLogsDeleted: audits.changes,
        approvalsDeleted: approvals.changes,
        approvalFilesDeleted: approvalFiles,
        logFilesDeleted: logFiles,
    });
}

let cleanupTimer = null;

function init() {
    runCleanup().catch((error) => {
        console.error('[Retention] Initial cleanup failed:', error);
    });

    if (cleanupTimer) {
        clearInterval(cleanupTimer);
    }

    cleanupTimer = setInterval(() => {
        runCleanup().catch((error) => {
            console.error('[Retention] Scheduled cleanup failed:', error);
        });
    }, CLEANUP_INTERVAL_MS);
    if (typeof cleanupTimer.unref === 'function') {
        cleanupTimer.unref();
    }
}

module.exports = {
    init,
    runCleanup,
};
