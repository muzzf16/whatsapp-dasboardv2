const db = require('../db');

const addMessage = (messageData) => {
    return new Promise((resolve, reject) => {
        const {
            connection_id,
            type,
            sender,
            recipient,
            push_name,
            message,
            file_name,
            timestamp,
            group_name,
            initiated_by_user_id = null,
            delivery_source = null
        } = messageData;
        const sql = `INSERT INTO messages (
            connection_id, type, sender, recipient, push_name, message, file_name, timestamp, group_name, initiated_by_user_id, delivery_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [
            connection_id,
            type,
            sender,
            recipient,
            push_name,
            message,
            file_name,
            timestamp,
            group_name,
            initiated_by_user_id,
            delivery_source
        ], function (err) {
            if (err) {
                console.error('Error inserting message:', err.message);
                reject(err);
            } else {
                resolve(this.lastID);
            }
        });
    });
};

const getMessages = (connectionId, type, limit = 100) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM messages WHERE connection_id = ? AND type = ? ORDER BY timestamp DESC LIMIT ?`;
        db.all(sql, [connectionId, type, limit], (err, rows) => {
            if (err) {
                console.error('Error fetching messages:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const getDashboardStats = (connectionId) => {
    return new Promise((resolve, reject) => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const sqlTotal = `SELECT COUNT(*) as count FROM messages WHERE connection_id = ? AND type = 'outgoing'`;
        const sqlMonth = `SELECT COUNT(*) as count FROM messages WHERE connection_id = ? AND type = 'outgoing' AND timestamp >= ?`;

        db.get(sqlTotal, [connectionId], (err, rowTotal) => {
            if (err) return reject(err);

            db.get(sqlMonth, [connectionId, startOfMonth], (err, rowMonth) => {
                if (err) return reject(err);

                resolve({
                    totalSent: rowTotal.count,
                    totalSentMonth: rowMonth.count
                });
            });
        });
    });
};

const countOutgoingMessages = ({ connectionId = null, initiatedByUserId = null, since = null }) => {
    return new Promise((resolve, reject) => {
        const clauses = [`type = 'outgoing'`];
        const params = [];

        if (connectionId) {
            clauses.push('connection_id = ?');
            params.push(connectionId);
        }

        if (initiatedByUserId) {
            clauses.push('initiated_by_user_id = ?');
            params.push(initiatedByUserId);
        }

        if (since) {
            clauses.push('timestamp >= ?');
            params.push(since);
        }

        const sql = `SELECT COUNT(*) as count FROM messages WHERE ${clauses.join(' AND ')}`;
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error('Error counting outgoing messages:', err.message);
                reject(err);
            } else {
                resolve(row?.count || 0);
            }
        });
    });
};

const getSessionAccess = (userId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT connection_id FROM session_access WHERE user_id = ?`;
        db.all(sql, [userId], (err, rows) => {
            if (err) {
                console.error('Error fetching session access:', err.message);
                reject(err);
            } else {
                resolve(rows.map(row => row.connection_id));
            }
        });
    });
};

const grantSessionAccess = (userId, connectionId) => {
    return new Promise((resolve, reject) => {
        const sql = `INSERT OR IGNORE INTO session_access (user_id, connection_id) VALUES (?, ?)`;
        db.run(sql, [userId, connectionId], (err) => {
            if (err) {
                console.error('Error granting session access:', err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

const revokeSessionAccess = (userId, connectionId) => {
    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM session_access WHERE user_id = ? AND connection_id = ?`;
        db.run(sql, [userId, connectionId], (err) => {
            if (err) {
                console.error('Error revoking session access:', err.message);
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

module.exports = {
    addMessage,
    getMessages,
    getDashboardStats,
    countOutgoingMessages,
    getSessionAccess,
    grantSessionAccess,
    revokeSessionAccess
};
