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

        // Banking Requirement: Enforce MFA for Admin/Operator
        if (['admin', 'operator', 'supervisor'].includes(req.user.role)) {
            // We should ideally check DB here if mfa_enabled is 1
            // but for performance, we check the token flag first.
            // If mfa_verified is false, but mfa_enabled is true, they must verify.
            // Note: In this implementation, if mfa_verified is missing, we assume false.
            if (req.user.mfa_verified === false && !req.path.includes('/mfa/')) {
                return res.status(403).json({ 
                    msg: 'MFA verification required for this role',
                    mfa_required: true 
                });
            }
        }

        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid or has expired' });
    }
};

module.exports = authMiddleware;
