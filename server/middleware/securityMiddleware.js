const jwt = require('jsonwebtoken');
const auditService = require('../services/auditService');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function securityHeaders(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    if (req.path.startsWith('/api')) {
        res.setHeader('Cache-Control', 'no-store');
    }

    next();
}

function createRateLimiter({ windowMs, max, keyGenerator }) {
    const buckets = new Map();

    return (req, res, next) => {
        const now = Date.now();
        const key = keyGenerator ? keyGenerator(req) : req.ip;
        const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

        if (bucket.resetAt <= now) {
            bucket.count = 0;
            bucket.resetAt = now + windowMs;
        }

        bucket.count += 1;
        buckets.set(key, bucket);

        if (bucket.count > max) {
            return res.status(429).json({ msg: 'Too many requests. Please try again later.' });
        }

        next();
    };
}

function auditMutatingRequests(entityType) {
    return (req, res, next) => {
        if (!MUTATING_METHODS.has(req.method)) {
            return next();
        }

        res.on('finish', () => {
            auditService.recordAuditLog({
                userId: req.user?.id,
                action: `${req.method} ${req.originalUrl}`,
                entityType,
                entityId: req.params?.id || req.params?.connectionId || req.body?.connectionId || null,
                metadata: {
                    statusCode: res.statusCode,
                    params: req.params,
                    query: req.query,
                    body: req.body
                },
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            });
        });

        next();
    };
}

function authenticateSocket(socket, next) {
    const token = socket.handshake.auth?.token
        || socket.handshake.headers?.['x-auth-token']
        || socket.handshake.query?.token;

    if (!token) {
        return next(new Error('Authentication token is required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.user?.id) {
            return next(new Error('Token payload is invalid'));
        }
        socket.user = decoded.user;
        next();
    } catch (error) {
        next(new Error('Token is not valid or has expired'));
    }
}

module.exports = {
    securityHeaders,
    createRateLimiter,
    auditMutatingRequests,
    authenticateSocket,
};
