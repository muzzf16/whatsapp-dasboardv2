const db = require('./db');

db.serialize(() => {
    db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column "role" already exists.');
            } else {
                console.error('Error adding column "role":', err.message);
            }
        } else {
            console.log('Column "role" added successfully.');
        }
    });
});
