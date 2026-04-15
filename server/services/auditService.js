const db = require('../db');
const { redactSensitive } = require('../utils/security');

function recordAuditLog({ userId, action, entityType, entityId, metadata, ipAddress, userAgent }) {
    return new Promise((resolve) => {
        const safeMetadata = metadata ? JSON.stringify(redactSensitive(metadata)).slice(0, 10000) : null;

        db.run(
            `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                userId || null,
                action,
                entityType || null,
                entityId || null,
                safeMetadata,
                ipAddress || null,
                userAgent || null
            ],
            (err) => {
                if (err) {
                    console.error('[Audit] Failed to write audit log:', err.message);
                }
                resolve();
            }
        );
    });
}

module.exports = {
    recordAuditLog,
};
