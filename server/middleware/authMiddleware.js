const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null;
    const token = bearerToken || req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'Authentication token is required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.user?.id) {
            return res.status(401).json({ msg: 'Token payload is invalid' });
        }
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid or has expired' });
    }
};

module.exports = authMiddleware;
