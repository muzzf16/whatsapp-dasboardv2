const { hasAnyRole, hasMinimumRole } = require('../utils/roles');

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user?.role || !hasAnyRole(req.user.role, allowedRoles)) {
            return res.status(403).json({ msg: 'Access denied for your role' });
        }
        next();
    };
}

function authorizeMinimumRole(minimumRole) {
    return (req, res, next) => {
        if (!req.user?.role || !hasMinimumRole(req.user.role, minimumRole)) {
            return res.status(403).json({ msg: 'Access denied for your role' });
        }
        next();
    };
}

module.exports = {
    authorizeRoles,
    authorizeMinimumRole,
};
