const db = require('./db');

const usernameToPromote = 'testuser';

db.run("UPDATE users SET role = 'admin' WHERE username = ?", [usernameToPromote], function (err) {
    if (err) {
        console.error('Error promoting user:', err.message);
    } else {
        if (this.changes > 0) {
            console.log(`User '${usernameToPromote}' promoted to admin.`);
        } else {
            console.log(`User '${usernameToPromote}' not found.`);
        }
    }
});
