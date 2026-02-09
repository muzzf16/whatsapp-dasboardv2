const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

exports.register = async (req, res) => {
    const { username, email, password, full_name } = req.body;

    try {
        // Check if user exists
        db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, user) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Server Error');
            }
            if (user) {
                return res.status(400).json({ msg: 'User already exists' });
            }

            // Encrypt password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            db.run('INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)', [username, email, hashedPassword, full_name], function (err) {
                if (err) {
                    console.error(err.message);
                    return res.status(500).send('Server Error');
                }

                const payload = {
                    user: {
                        id: this.lastID
                    }
                };

                jwt.sign(
                    payload,
                    process.env.JWT_SECRET || 'secret',
                    { expiresIn: 360000 },
                    (err, token) => {
                        if (err) throw err;
                        res.json({ token });
                    }
                );
            });
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Server Error');
            }
            if (!user) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const payload = {
                user: {
                    id: user.id
                }
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET || 'secret',
                { expiresIn: 360000 },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token });
                }
            );
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getProfile = async (req, res) => {
    try {
        db.get('SELECT id, username, email, full_name, avatar_url, created_at FROM users WHERE id = ?', [req.user.id], (err, user) => {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Server Error');
            }
            res.json(user);
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    const { full_name, avatar_url } = req.body;
    try {
        db.run('UPDATE users SET full_name = ?, avatar_url = ? WHERE id = ?', [full_name, avatar_url, req.user.id], function (err) {
            if (err) {
                console.error(err.message);
                return res.status(500).send('Server Error');
            }
            res.json({ msg: 'Profile updated' });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
