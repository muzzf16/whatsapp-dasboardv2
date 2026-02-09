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

// @route   GET api/users
// @desc    Get all users
// @access  Admin
const admin = require('../middleware/adminMiddleware');
const { getAllUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

router.get('/', [auth, admin], getAllUsers);

// @route   POST api/users
// @desc    Create a user (Admin)
// @access  Admin
router.post('/', [auth, admin], createUser);

// @route   PUT api/users/:id
// @desc    Update a user (Admin)
// @access  Admin
router.put('/:id', [auth, admin], updateUser);

// @route   DELETE api/users/:id
// @desc    Delete a user
// @access  Admin
router.delete('/:id', [auth, admin], deleteUser);

module.exports = router;
