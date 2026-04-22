const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

function runAlter(sql) {
    db.run(sql, (err) => {
        if (err && !/duplicate column name/i.test(err.message)) {
            console.error(`Migration failed for "${sql}": ${err.message}`);
        }
    });
}

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        connection_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'incoming' or 'outgoing'
        sender TEXT,
        recipient TEXT,
        push_name TEXT,
        message TEXT,
        file_name TEXT,
        timestamp DATETIME,
        group_name TEXT,
        initiated_by_user_id INTEGER,
        delivery_source TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
        mfa_enabled INTEGER DEFAULT 0,
        mfa_secret TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT UNIQUE,
        email TEXT,
        tags TEXT, -- Comma separated tags
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    runAlter(`ALTER TABLE contacts ADD COLUMN is_opted_out INTEGER NOT NULL DEFAULT 0`);
    runAlter(`ALTER TABLE contacts ADD COLUMN opted_out_at DATETIME`);
    runAlter(`ALTER TABLE contacts ADD COLUMN consent_source TEXT`);
    runAlter(`ALTER TABLE contacts ADD COLUMN consent_updated_at DATETIME`);
    runAlter(`ALTER TABLE messages ADD COLUMN initiated_by_user_id INTEGER`);
    runAlter(`ALTER TABLE messages ADD COLUMN delivery_source TEXT`);
    runAlter(`ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0`);
    runAlter(`ALTER TABLE users ADD COLUMN mfa_secret TEXT`);

    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        metadata TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS approval_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        summary TEXT,
        payload TEXT NOT NULL,
        requested_by INTEGER,
        approved_by INTEGER,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS session_access (
        user_id INTEGER,
        connection_id TEXT,
        PRIMARY KEY (user_id, connection_id)
    )`);

    db.run('CREATE INDEX IF NOT EXISTS idx_messages_connection_type_timestamp ON messages (connection_id, type, timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_initiated_by_timestamp ON messages (initiated_by_user_id, timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (phone)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_opt_out ON contacts (is_opted_out, phone)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_approval_requests_status_created_at ON approval_requests (status, created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests (requested_by)');
    db.run('CREATE INDEX IF NOT EXISTS idx_session_access_connection_id ON session_access (connection_id)');
});

module.exports = db;
