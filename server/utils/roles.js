const ROLE_ORDER = ['viewer', 'operator', 'supervisor', 'admin'];

function normalizeRole(role) {
    if (typeof role !== 'string') {
        return 'viewer';
    }

    const normalized = role.trim().toLowerCase();
    return normalized === 'user' ? 'operator' : normalized;
}

function isValidRole(role) {
    return ROLE_ORDER.includes(normalizeRole(role));
}

function roleRank(role) {
    const normalized = normalizeRole(role);
    const index = ROLE_ORDER.indexOf(normalized);
    return index === -1 ? -1 : index;
}

function hasMinimumRole(role, minimumRole) {
    return roleRank(role) >= roleRank(minimumRole);
}

function hasAnyRole(role, allowedRoles = []) {
    const normalized = normalizeRole(role);
    return allowedRoles.map(normalizeRole).includes(normalized);
}

module.exports = {
    ROLE_ORDER,
    normalizeRole,
    isValidRole,
    roleRank,
    hasMinimumRole,
    hasAnyRole,
};
