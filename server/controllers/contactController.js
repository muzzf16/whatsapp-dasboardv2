const db = require('../db');
const { normalizePhoneNumber } = require('../utils/security');

function normalizeOptOut(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

exports.getContacts = (req, res) => {
    const { search } = req.query;
    let sql = 'SELECT * FROM contacts';
    let params = [];

    if (search) {
        sql += ' WHERE name LIKE ? OR phone LIKE ? OR tags LIKE ?';
        params = [`%${search}%`, `%${search}%`, `%${search}%`];
    }

    sql += ' ORDER BY name ASC';

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Server Error');
        }
        res.json(rows);
    });
};

exports.createContact = (req, res) => {
    const { name, phone, email, tags, notes, is_opted_out, consent_source } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
        return res.status(400).json({ msg: 'Valid phone number is required' });
    }

    const optedOut = normalizeOptOut(is_opted_out);
    const now = new Date().toISOString();

    const sql = `INSERT INTO contacts (name, phone, email, tags, notes, is_opted_out, opted_out_at, consent_source, consent_updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [name, normalizedPhone, email, tags, notes, optedOut ? 1 : 0, optedOut ? now : null, consent_source || 'manual', now], function (err) {
        if (err) {
            console.error(err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ msg: 'Phone number already exists' });
            }
            return res.status(500).send('Server Error');
        }
        res.json({
            id: this.lastID,
            name,
            phone: normalizedPhone,
            email,
            tags,
            notes,
            is_opted_out: optedOut ? 1 : 0,
            consent_source: consent_source || 'manual',
            consent_updated_at: now,
            opted_out_at: optedOut ? now : null
        });
    });
};

exports.updateContact = (req, res) => {
    const { id } = req.params;
    const { name, phone, email, tags, notes, is_opted_out, consent_source } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
        return res.status(400).json({ msg: 'Valid phone number is required' });
    }

    const optedOut = normalizeOptOut(is_opted_out);
    const now = new Date().toISOString();

    const sql = `UPDATE contacts
                 SET name = ?, phone = ?, email = ?, tags = ?, notes = ?, is_opted_out = ?, opted_out_at = ?, consent_source = ?, consent_updated_at = ?
                 WHERE id = ?`;
    db.run(sql, [name, normalizedPhone, email, tags, notes, optedOut ? 1 : 0, optedOut ? now : null, consent_source || 'manual', now, id], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Server Error');
        }
        if (this.changes === 0) {
            return res.status(404).json({ msg: 'Contact not found' });
        }
        res.json({
            msg: 'Contact updated',
            contact: {
                id,
                name,
                phone: normalizedPhone,
                email,
                tags,
                notes,
                is_opted_out: optedOut ? 1 : 0,
                consent_source: consent_source || 'manual',
                consent_updated_at: now,
                opted_out_at: optedOut ? now : null
            }
        });
    });
};

exports.deleteContact = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM contacts WHERE id = ?';
    db.run(sql, [id], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Server Error');
        }
        if (this.changes === 0) {
            return res.status(404).json({ msg: 'Contact not found' });
        }
        res.json({ msg: 'Contact deleted' });
    });
};
