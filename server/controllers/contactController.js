const db = require('../db');
const { normalizePhoneNumber } = require('../utils/security');

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
    const { name, phone, email, tags, notes } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
        return res.status(400).json({ msg: 'Valid phone number is required' });
    }

    const sql = 'INSERT INTO contacts (name, phone, email, tags, notes) VALUES (?, ?, ?, ?, ?)';
    db.run(sql, [name, normalizedPhone, email, tags, notes], function (err) {
        if (err) {
            console.error(err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ msg: 'Phone number already exists' });
            }
            return res.status(500).send('Server Error');
        }
        res.json({ id: this.lastID, name, phone: normalizedPhone, email, tags, notes });
    });
};

exports.updateContact = (req, res) => {
    const { id } = req.params;
    const { name, phone, email, tags, notes } = req.body;
    const normalizedPhone = normalizePhoneNumber(phone);
    if (!normalizedPhone) {
        return res.status(400).json({ msg: 'Valid phone number is required' });
    }

    const sql = 'UPDATE contacts SET name = ?, phone = ?, email = ?, tags = ?, notes = ? WHERE id = ?';
    db.run(sql, [name, normalizedPhone, email, tags, notes, id], function (err) {
        if (err) {
            console.error(err.message);
            return res.status(500).send('Server Error');
        }
        if (this.changes === 0) {
            return res.status(404).json({ msg: 'Contact not found' });
        }
        res.json({ msg: 'Contact updated', contact: { id, name, phone: normalizedPhone, email, tags, notes } });
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
