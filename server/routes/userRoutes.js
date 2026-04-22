const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile } = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');
const { createRateLimiter, auditMutatingRequests } = require('../middleware/securityMiddleware');
const authRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 20,
    keyGenerator: (req) => req.ip
});

// @route   POST api/users/register
// @desc    Register user
// @access  Public
router.post('/register', authRateLimiter, register);

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authRateLimiter, login);

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, getProfile);

// MFA Routes
const { setupMFA, verifyMFA, loginMFA, disableMFA } = require('../controllers/userController');
router.post('/mfa/setup', auth, setupMFA);
router.post('/mfa/verify', auth, verifyMFA);
router.post('/mfa/login', auth, loginMFA);
router.post('/mfa/disable', auth, disableMFA);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, auditMutatingRequests('user'), updateProfile);

// @route   GET api/users
// @desc    Get all users
// @access  Admin
const admin = require('../middleware/adminMiddleware');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

router.get('/', [auth, admin], getAllUsers);

// @route   POST api/users
// @desc    Create a user (Admin)
// @access  Admin
router.post('/', [auth, admin, auditMutatingRequests('user')], createUser);

// @route   PUT api/users/:id
// @desc    Update a user (Admin)
// @access  Admin
router.put('/:id', [auth, admin, auditMutatingRequests('user')], updateUser);

// @route   DELETE api/users/:id
// @desc    Delete a user
// @access  Admin
router.delete('/:id', [auth, admin, auditMutatingRequests('user')], deleteUser);

module.exports = router;
