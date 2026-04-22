const { ROLE_ORDER, normalizeRole, isValidRole } = require('../server/utils/roles');

console.log('ROLE_ORDER:', ROLE_ORDER);
console.log('normalizeRole("user"):', normalizeRole("user"));
console.log('isValidRole("user"):', isValidRole("user"));
console.log('normalizeRole("operator"):', normalizeRole("operator"));
console.log('isValidRole("operator"):', isValidRole("operator"));
console.log('normalizeRole(""):', normalizeRole(""));
console.log('isValidRole(""):', isValidRole(""));
console.log('normalizeRole(undefined):', normalizeRole(undefined));
console.log('isValidRole(undefined):', isValidRole(undefined));
