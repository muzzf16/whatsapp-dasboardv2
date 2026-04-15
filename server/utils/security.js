const crypto = require('crypto');
const path = require('path');

const MAX_MESSAGE_LENGTH = 4096;
const CONNECTION_ID_PATTERN = /^[a-zA-Z0-9_-]{3,64}$/;
const SENSITIVE_KEYS = new Set([
    'password',
    'token',
    'authorization',
    'apiKey',
    'api_key',
    'secret',
    'webhookSecret',
    'base64',
    'private_key'
]);

function normalizeConnectionId(connectionId) {
    if (typeof connectionId !== 'string') {
        return null;
    }

    const trimmed = connectionId.trim();
    return CONNECTION_ID_PATTERN.test(trimmed) ? trimmed : null;
}

function normalizePhoneNumber(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }

    const digits = String(value).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 16) {
        return null;
    }

    return digits;
}

function normalizeMessageText(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_MESSAGE_LENGTH) {
        return null;
    }

    return normalized;
}

function normalizeDelay(value, fallback = 1000) {
    const delay = Number(value ?? fallback);
    if (!Number.isFinite(delay)) {
        return fallback;
    }

    return Math.min(Math.max(Math.round(delay), 1000), 10 * 60 * 1000);
}

function sanitizeFilename(originalName = '') {
    const parsed = path.parse(path.basename(originalName));
    const safeBase = parsed.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 80) || 'upload';
    const safeExt = parsed.ext.toLowerCase().replace(/[^a-z0-9.]/g, '').slice(0, 16);
    return `${Date.now()}-${crypto.randomUUID()}-${safeBase}${safeExt}`;
}

function isSafePath(baseDir, candidatePath) {
    const resolvedBase = path.resolve(baseDir);
    const resolvedCandidate = path.resolve(candidatePath);
    return resolvedCandidate === resolvedBase || resolvedCandidate.startsWith(`${resolvedBase}${path.sep}`);
}

function validateWebhookUrl(url) {
    if (typeof url !== 'string') {
        return { valid: false, message: '`url` (string) is required.' };
    }

    const trimmed = url.trim();
    if (trimmed === '') {
        return { valid: true, value: '' };
    }

    try {
        const parsed = new URL(trimmed);
        const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
        if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhost)) {
            return { valid: false, message: 'Webhook URL must use HTTPS, except localhost during development.' };
        }
        return { valid: true, value: parsed.toString() };
    } catch (error) {
        return { valid: false, message: 'Webhook URL is invalid.' };
    }
}

function redactSensitive(value) {
    if (Array.isArray(value)) {
        return value.map(redactSensitive);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    return Object.entries(value).reduce((result, [key, entryValue]) => {
        result[key] = SENSITIVE_KEYS.has(key) ? '[REDACTED]' : redactSensitive(entryValue);
        return result;
    }, {});
}

module.exports = {
    MAX_MESSAGE_LENGTH,
    normalizeConnectionId,
    normalizePhoneNumber,
    normalizeMessageText,
    normalizeDelay,
    sanitizeFilename,
    isSafePath,
    validateWebhookUrl,
    redactSensitive,
};
