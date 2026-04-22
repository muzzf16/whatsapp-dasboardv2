const db = require('../db');

/**
 * Middleware to check if a user has access to a specific WhatsApp connection.
 * Admins have access to all sessions.
 * Other roles must be explicitly assigned in the session_access table.
 */
const checkSessionAccess = (req, res, next) => {
    const connectionId = req.params.connectionId || req.body.connectionId;
    
    if (!connectionId) {
        return res.status(400).json({ status: 'error', message: 'connectionId is required for access check.' });
    }

    // Admins bypass this check
    if (req.user.role === 'admin') {
        return next();
    }

    db.get(
        'SELECT 1 FROM session_access WHERE user_id = ? AND connection_id = ?',
        [req.user.id, connectionId],
        (err, row) => {
            if (err) {
                console.error('[SessionAccess] DB Error:', err.message);
                return res.status(500).json({ status: 'error', message: 'Internal server error during access check.' });
            }

            if (!row) {
                return res.status(403).json({ 
                    status: 'error', 
                    message: `You do not have permission to access session: ${connectionId}` 
                });
            }

            next();
        }
    );
};

module.exports = { checkSessionAccess };
