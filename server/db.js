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
        group_name TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        avatar_url TEXT,
        role TEXT DEFAULT 'user',
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

    db.run('CREATE INDEX IF NOT EXISTS idx_messages_connection_type_timestamp ON messages (connection_id, type, timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts (phone)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)');
});

module.exports = db;
