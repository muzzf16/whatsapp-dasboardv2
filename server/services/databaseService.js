const db = require('../db');

const addMessage = (messageData) => {
    return new Promise((resolve, reject) => {
        const { connection_id, type, sender, recipient, push_name, message, file_name, timestamp, group_name } = messageData;
        const sql = `INSERT INTO messages (connection_id, type, sender, recipient, push_name, message, file_name, timestamp, group_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        db.run(sql, [connection_id, type, sender, recipient, push_name, message, file_name, timestamp, group_name], function (err) {
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

module.exports = {
    addMessage,
    getMessages,
    getDashboardStats
};
