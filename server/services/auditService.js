const db = require('../db');
const { redactSensitive } = require('../utils/security');
const auditSink = require('./auditSink');

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
                
                // Forward to append-only sink
                auditSink.log({
                    user_id: userId,
                    action,
                    entity_type: entityType,
                    entity_id: entityId,
                    metadata: safeMetadata,
                    ip_address: ipAddress,
                    user_agent: userAgent
                }).catch(e => console.error('[AuditSink] Error:', e.message));

                resolve();
            }
        );
    });
}

module.exports = {
    recordAuditLog,
};
