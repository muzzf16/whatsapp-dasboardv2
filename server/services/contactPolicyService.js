const db = require('../db');
const { normalizePhoneNumber } = require('../utils/security');

const OPTOUT_KEYWORDS = ['stop', 'unsubscribe', 'berhenti', 'stop wa', 'jangan chat', 'opt out'];
const OPTIN_KEYWORDS = ['start', 'lanjut', 'resume', 'aktifkan'];

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
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

async function getContactByPhone(phone) {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) return null;
    return dbGet('SELECT * FROM contacts WHERE phone = ?', [normalizedPhone]);
}

async function isPhoneOptedOut(phone) {
    const contact = await getContactByPhone(phone);
    return Boolean(contact?.is_opted_out);
}

async function filterDeliverableNumbers(numbers = []) {
    const permittedNumbers = [];
    const optedOutNumbers = [];
    const seen = new Set();

    for (const value of numbers) {
        const normalizedPhone = normalizePhoneNumber(value);
        if (!normalizedPhone || seen.has(normalizedPhone)) {
            continue;
        }
        seen.add(normalizedPhone);

        if (await isPhoneOptedOut(normalizedPhone)) {
            optedOutNumbers.push(normalizedPhone);
        } else {
            permittedNumbers.push(normalizedPhone);
        }
    }

    return {
        permittedNumbers,
        optedOutNumbers,
    };
}

async function upsertConsent(phone, { optedOut, source = 'manual', name = '' }) {
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
        return null;
    }

    const now = new Date().toISOString();
    const existing = await getContactByPhone(normalizedPhone);
    const nextOptedOut = optedOut ? 1 : 0;
    const optedOutAt = optedOut ? now : null;

    if (existing) {
        await dbRun(
            `UPDATE contacts
             SET is_opted_out = ?, opted_out_at = ?, consent_source = ?, consent_updated_at = ?, name = COALESCE(NULLIF(?, ''), name)
             WHERE phone = ?`,
            [nextOptedOut, optedOutAt, source, now, name, normalizedPhone]
        );
        return { ...existing, is_opted_out: nextOptedOut, opted_out_at: optedOutAt, consent_source: source, consent_updated_at: now };
    }

    const result = await dbRun(
        `INSERT INTO contacts (name, phone, email, tags, notes, is_opted_out, opted_out_at, consent_source, consent_updated_at)
         VALUES (?, ?, '', '', '', ?, ?, ?, ?)`,
        [name || normalizedPhone, normalizedPhone, nextOptedOut, optedOutAt, source, now]
    );

    return {
        id: result.lastID,
        name: name || normalizedPhone,
        phone: normalizedPhone,
        is_opted_out: nextOptedOut,
        opted_out_at: optedOutAt,
        consent_source: source,
        consent_updated_at: now,
    };
}

function isOptOutKeyword(text = '') {
    const normalized = String(text).trim().toLowerCase();
    return OPTOUT_KEYWORDS.includes(normalized);
}

function isOptInKeyword(text = '') {
    const normalized = String(text).trim().toLowerCase();
    return OPTIN_KEYWORDS.includes(normalized);
}

module.exports = {
    getContactByPhone,
    isPhoneOptedOut,
    filterDeliverableNumbers,
    upsertConsent,
    isOptOutKeyword,
    isOptInKeyword,
};
