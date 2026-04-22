const { normalizeRole } = require('../utils/roles');

const DEFAULT_ROLE_LIMITS = {
    viewer: 0,
    operator: 250,
    supervisor: 1000,
    admin: 2500,
};

function parseInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getRoleDailyLimit(role) {
    const normalizedRole = normalizeRole(role);
    const envKey = `ROLE_DAILY_SEND_LIMIT_${normalizedRole.toUpperCase()}`;
    return parseInteger(process.env[envKey], DEFAULT_ROLE_LIMITS[normalizedRole] ?? DEFAULT_ROLE_LIMITS.operator);
}

function getSessionDailyLimit() {
    return parseInteger(process.env.SESSION_DAILY_SEND_LIMIT, 3000);
}

function getCampaignRecipientLimit() {
    return parseInteger(process.env.CAMPAIGN_RECIPIENT_LIMIT, 300);
}

function getRetentionPolicy() {
    return {
        messageRetentionDays: parseInteger(process.env.MESSAGE_RETENTION_DAYS, 180),
        auditLogRetentionDays: parseInteger(process.env.AUDIT_LOG_RETENTION_DAYS, 365),
        approvalRetentionDays: parseInteger(process.env.APPROVAL_RETENTION_DAYS, 180),
        operationalLogRetentionDays: parseInteger(process.env.OPERATIONAL_LOG_RETENTION_DAYS, 30),
    };
}

module.exports = {
    getRoleDailyLimit,
    getSessionDailyLimit,
    getCampaignRecipientLimit,
    getRetentionPolicy,
};
