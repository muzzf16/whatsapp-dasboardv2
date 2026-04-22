const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../db');
const { ROLE_ORDER, isValidRole, normalizeRole } = require('../utils/roles');

const ALLOWED_ROLES = new Set(ROLE_ORDER);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
    });
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(err) {
            if (err) {
                reject(err);
                return;
            }
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
}

function normalizeUserInput(body) {
    return {
        username: typeof body.username === 'string' ? body.username.trim() : '',
        email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
        password: typeof body.password === 'string' ? body.password : '',
        full_name: typeof body.full_name === 'string' ? body.full_name.trim() : '',
        role: normalizeRole(body.role || 'operator'),
        avatar_url: typeof body.avatar_url === 'string' ? body.avatar_url.trim() : ''
    };
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
    return typeof password === 'string'
        && password.length >= 12
        && /[a-z]/.test(password)
        && /[A-Z]/.test(password)
        && /\d/.test(password);
}

function signToken(user, mfaVerified = true) {
    const payload = {
        user: {
            id: user.id,
            role: normalizeRole(user.role),
            mfa_verified: mfaVerified
        }
    };

    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

function isDuplicateError(err) {
    return err?.message?.includes('UNIQUE constraint failed');
}

exports.register = async (req, res) => {
    const { username, email, password, full_name } = normalizeUserInput(req.body);

    if (!username || !validateEmail(email) || !validatePassword(password)) {
        return res.status(400).json({
            msg: 'Username, valid email, and a strong password are required. Password must be at least 12 characters and include uppercase, lowercase, and a number.'
        });
    }

    try {
        const userCount = await dbGet('SELECT COUNT(*) AS count FROM users');
        const allowPublicRegistration = process.env.ALLOW_PUBLIC_REGISTRATION === 'true';

        if (userCount.count > 0 && !allowPublicRegistration) {
            return res.status(403).json({ msg: 'Public registration is disabled. Ask an administrator to create your account.' });
        }

        const hashedPassword = await hashPassword(password);
        const role = userCount.count === 0 ? 'admin' : 'operator';
        const result = await dbRun(
            'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, role]
        );

        const token = signToken({ id: result.lastID, role });
        res.status(201).json({ token });
    } catch (err) {
        console.error(err.message);
        if (isDuplicateError(err)) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        res.status(500).send('Server Error');
    }
};

exports.login = async (req, res) => {
    const { email, password } = normalizeUserInput(req.body);

    if (!validateEmail(email) || !password) {
        return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    try {
        const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        if (user.mfa_enabled) {
            // User has MFA enabled, return a pre-auth token that only allows MFA verification
            const preAuthToken = signToken(user, false);
            return res.json({ 
                mfa_required: true, 
                token: preAuthToken,
                msg: 'MFA is required to complete login' 
            });
        }

        res.json({ token: signToken(user, true) });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await dbGet(
            'SELECT id, username, email, full_name, avatar_url, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json({ ...user, role: normalizeRole(user.role) });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.updateProfile = async (req, res) => {
    const { full_name, avatar_url } = normalizeUserInput(req.body);

    try {
        await dbRun('UPDATE users SET full_name = ?, avatar_url = ? WHERE id = ?', [full_name, avatar_url, req.user.id]);
        res.json({ msg: 'Profile updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const rows = await dbAll('SELECT id, username, email, full_name, role, created_at FROM users ORDER BY created_at DESC');
        res.json(rows.map((row) => ({ ...row, role: normalizeRole(row.role) })));
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.createUser = async (req, res) => {
    const { username, email, password, full_name, role } = normalizeUserInput(req.body);

    if (!username || !validateEmail(email) || !validatePassword(password)) {
        return res.status(400).json({
            msg: 'Username, valid email, and a strong password are required. Password must be at least 12 characters and include uppercase, lowercase, and a number.'
        });
    }

    if (!isValidRole(role)) {
        return res.status(400).json({ msg: 'Role is invalid' });
    }

    try {
        const hashedPassword = await hashPassword(password);
        const result = await dbRun(
            'INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, full_name, role]
        );
        res.status(201).json({ msg: 'User created successfully', id: result.lastID });
    } catch (err) {
        console.error(err.message);
        if (isDuplicateError(err)) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        res.status(500).send('Server Error');
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { username, email, full_name, role, password } = normalizeUserInput(req.body);
    const fields = [];
    const params = [];

    if (username) {
        fields.push('username = ?');
        params.push(username);
    }
    if (email) {
        if (!validateEmail(email)) {
            return res.status(400).json({ msg: 'Email is invalid' });
        }
        fields.push('email = ?');
        params.push(email);
    }
    if (full_name) {
        fields.push('full_name = ?');
        params.push(full_name);
    }
    if (role) {
        if (!isValidRole(role)) {
            return res.status(400).json({ msg: 'Role is invalid' });
        }
        fields.push('role = ?');
        params.push(role);
    }
    if (password) {
        if (!validatePassword(password)) {
            return res.status(400).json({ msg: 'Password does not meet strength requirements' });
        }
        fields.push('password = ?');
        params.push(await hashPassword(password));
    }

    if (fields.length === 0) {
        return res.status(400).json({ msg: 'No valid fields to update' });
    }

    try {
        params.push(id);
        const result = await dbRun(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
        if (result.changes === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ msg: 'User updated successfully' });
    } catch (err) {
        console.error(err.message);
        if (isDuplicateError(err)) {
            return res.status(400).json({ msg: 'Username or email already exists' });
        }
        res.status(500).send('Server Error');
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    if (String(req.user.id) === String(id)) {
        return res.status(400).json({ msg: 'You cannot delete your own account' });
    }

    try {
        const result = await dbRun('DELETE FROM users WHERE id = ?', [id]);
        if (result.changes === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json({ msg: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

exports.setupMFA = async (req, res) => {
    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const secret = speakeasy.generateSecret({
            name: `WhatsAppDashboard:${user.email}`
        });

        // Store secret temporarily in DB (unverified)
        await dbRun('UPDATE users SET mfa_secret = ? WHERE id = ?', [secret.base32, user.id]);

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
        res.json({
            qrCode: qrCodeUrl,
            secret: secret.base32
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.verifyMFA = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ msg: 'Token is required' });

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user || !user.mfa_secret) return res.status(400).json({ msg: 'MFA not set up' });

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token
        });

        if (verified) {
            await dbRun('UPDATE users SET mfa_enabled = 1 WHERE id = ?', [user.id]);
            res.json({ msg: 'MFA enabled successfully' });
        } else {
            res.status(400).json({ msg: 'Invalid verification token' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.loginMFA = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ msg: 'Token is required' });

    try {
        const user = await dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user || !user.mfa_enabled || !user.mfa_secret) {
            return res.status(400).json({ msg: 'MFA is not enabled for this user' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token
        });

        if (verified) {
            // Return a full token with mfa_verified: true
            res.json({ token: signToken(user, true) });
        } else {
            res.status(400).json({ msg: 'Invalid MFA token' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.disableMFA = async (req, res) => {
    try {
        await dbRun('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?', [req.user.id]);
        res.json({ msg: 'MFA disabled' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

// --- SESSION ACCESS MANAGEMENT ---

const databaseService = require('../services/databaseService');

exports.getUserSessions = async (req, res) => {
    try {
        const { id } = req.params;
        const sessions = await databaseService.getSessionAccess(id);
        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.grantSessionAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { connectionId } = req.body;
        if (!connectionId) return res.status(400).json({ msg: 'connectionId is required' });
        
        await databaseService.grantSessionAccess(id, connectionId);
        res.json({ msg: 'Access granted' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

exports.revokeSessionAccess = async (req, res) => {
    try {
        const { id, connectionId } = req.params;
        await databaseService.revokeSessionAccess(id, connectionId);
        res.json({ msg: 'Access revoked' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
};

