const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile } = require('../controllers/userController');
const auth = require('../middleware/authMiddleware');

// @route   POST api/users/register
// @desc    Register user
// @access  Public
router.post('/register', register);

// @route   POST api/users/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', login);

// @route   GET api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, getProfile);

// @route   PUT api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, updateProfile);

module.exports = router;
