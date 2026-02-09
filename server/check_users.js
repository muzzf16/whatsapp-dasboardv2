const db = require('./db');

db.all("SELECT id, username, email, full_name, created_at FROM users", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Users found:', rows.length);
        console.log(rows);
    }
});
