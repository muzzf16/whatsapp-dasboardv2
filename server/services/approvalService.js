const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const whatsappService = require('./whatsapp');
const configService = require('./configService');
const schedulerService = require('./schedulerService');
const scheduleImportService = require('./scheduleImportService');
const messageQuotaService = require('./messageQuotaService');
const { sanitizeFilename, redactSensitive } = require('../utils/security');
const { hasMinimumRole } = require('../utils/roles');

const APPROVAL_UPLOAD_DIR = path.join(__dirname, '..', 'approval_payloads');

function ensureUploadDir() {
    if (!fs.existsSync(APPROVAL_UPLOAD_DIR)) {
        fs.mkdirSync(APPROVAL_UPLOAD_DIR, { recursive: true });
    }
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function shouldRequireApproval(role) {
    return role === 'operator';
}

async function stageApprovalFile(buffer, originalName) {
    ensureUploadDir();
    const fileName = `${uuidv4()}-${sanitizeFilename(originalName)}`;
    const filePath = path.join(APPROVAL_UPLOAD_DIR, fileName);
    await fs.promises.writeFile(filePath, buffer);
    return filePath;
}

async function createApprovalRequest({ actionType, summary, payload, requestedBy }) {
    const serializedPayload = JSON.stringify(payload);
    const result = await dbRun(
        `INSERT INTO approval_requests (action_type, status, summary, payload, requested_by)
         VALUES (?, 'pending', ?, ?, ?)`,
        [actionType, summary, serializedPayload, requestedBy || null]
    );

    return {
        id: result.lastID,
        actionType,
        status: 'pending',
        summary,
    };
}

async function listApprovalRequests({ user }) {
    const params = [];
    let sql = `SELECT approval_requests.*, requester.username AS requester_username, requester.full_name AS requester_name,
                      approver.username AS approver_username, approver.full_name AS approver_name
               FROM approval_requests
               LEFT JOIN users requester ON requester.id = approval_requests.requested_by
               LEFT JOIN users approver ON approver.id = approval_requests.approved_by`;

    if (!hasMinimumRole(user?.role, 'supervisor')) {
        sql += ' WHERE approval_requests.requested_by = ?';
        params.push(user?.id || null);
    }

    sql += ' ORDER BY approval_requests.created_at DESC';
    const rows = await dbAll(sql, params);
    return rows.map((row) => ({
        ...row,
        payload: redactSensitive(safeParseJson(row.payload)),
    }));
}

function safeParseJson(value) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return null;
    }
}

async function getApprovalRequestById(id) {
    const row = await dbGet('SELECT * FROM approval_requests WHERE id = ?', [id]);
    if (!row) return null;
    return {
        ...row,
        payload: safeParseJson(row.payload),
    };
}

async function executeApprovedAction(approvalRequest) {
    const payload = approvalRequest.payload || {};

    switch (approvalRequest.action_type) {
        case 'broadcast_message':
            if (payload.mode === 'messages' && Array.isArray(payload.messages)) {
                await messageQuotaService.assertCampaignLimit(payload.messages.length);
                await messageQuotaService.assertCanDispatch({
                    connectionId: payload.connectionId,
                    userId: payload.userId || approvalRequest.requested_by || null,
                    role: payload.requesterRole || 'operator',
                    requestedCount: payload.messages.length,
                });
                for (const message of payload.messages) {
                    await whatsappService.sendMessage(payload.connectionId, message.to, message.text, null, {
                        initiatedByUserId: payload.userId || approvalRequest.requested_by || null,
                        deliverySource: 'approval',
                    });
                }
                return { deliveredCount: payload.messages.length };
            }
            await messageQuotaService.assertCampaignLimit((payload.numbers || []).length);
            await messageQuotaService.assertCanDispatch({
                connectionId: payload.connectionId,
                userId: payload.userId || approvalRequest.requested_by || null,
                role: payload.requesterRole || 'operator',
                requestedCount: (payload.numbers || []).length,
            });
            await whatsappService.sendBroadcastMessage(
                payload.connectionId,
                payload.numbers || [],
                payload.message,
                null,
                payload.delay,
                {
                    initiatedByUserId: payload.userId || approvalRequest.requested_by || null,
                    deliverySource: 'approval',
                }
            );
            return { deliveredCount: (payload.numbers || []).length };
        case 'webhook_update':
            await configService.setWebhookUrl(payload.url || '');
            if (payload.secret !== undefined) {
                await configService.setWebhookSecret(payload.secret || '');
            }
            return { updated: true };
        case 'schedule_sync':
            return schedulerService.syncWithGoogleSheets(
                payload.spreadsheetId,
                payload.connectionId,
                payload.userId || null,
                payload.requesterRole || 'operator'
            );
        case 'excel_import': {
            const buffer = await fs.promises.readFile(payload.filePath);
            const count = await scheduleImportService.importWorkbookBuffer({
                buffer,
                connectionId: payload.connectionId,
                isRecurring: Boolean(payload.isRecurring),
                userId: payload.userId || null,
                userRole: payload.requesterRole || 'operator',
            });
            return { scheduledCount: count };
        }
        default:
            throw new Error(`Unsupported approval action: ${approvalRequest.action_type}`);
    }
}

async function approveRequest({ id, approverId }) {
    const approval = await getApprovalRequestById(id);
    if (!approval) {
        throw new Error('Approval request not found');
    }
    if (approval.status !== 'pending') {
        throw new Error('Approval request has already been reviewed');
    }

    const executionResult = await executeApprovedAction(approval);
    await dbRun(
        `UPDATE approval_requests
         SET status = 'approved', approved_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [approverId, id]
    );

    if (approval.action_type === 'excel_import' && approval.payload?.filePath) {
        fs.promises.unlink(approval.payload.filePath).catch(() => {});
    }

    return executionResult;
}

async function rejectRequest({ id, approverId, reason }) {
    const approval = await getApprovalRequestById(id);
    if (!approval) {
        throw new Error('Approval request not found');
    }
    if (approval.status !== 'pending') {
        throw new Error('Approval request has already been reviewed');
    }

    await dbRun(
        `UPDATE approval_requests
         SET status = 'rejected', approved_by = ?, rejection_reason = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [approverId, reason || null, id]
    );

    if (approval.action_type === 'excel_import' && approval.payload?.filePath) {
        fs.promises.unlink(approval.payload.filePath).catch(() => {});
    }
}

module.exports = {
    shouldRequireApproval,
    stageApprovalFile,
    createApprovalRequest,
    listApprovalRequests,
    approveRequest,
    rejectRequest,
};
