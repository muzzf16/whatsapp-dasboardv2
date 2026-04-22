const express = require('express');
const router = express.Router();
const { getContacts, createContact, updateContact, deleteContact } = require('../controllers/contactController');
const auth = require('../middleware/authMiddleware');
const { authorizeMinimumRole } = require('../middleware/authorizeRoles');
const { auditMutatingRequests } = require('../middleware/securityMiddleware');

router.use(auth);
router.use(auditMutatingRequests('contact'));

// @route   GET api/contacts
// @desc    Get all contacts
// @access  Private
router.get('/', authorizeMinimumRole('viewer'), getContacts);

// @route   POST api/contacts
// @desc    Create a contact
// @access  Private
router.post('/', authorizeMinimumRole('operator'), createContact);

// @route   PUT api/contacts/:id
// @desc    Update a contact
// @access  Private
router.put('/:id', authorizeMinimumRole('operator'), updateContact);

// @route   DELETE api/contacts/:id
// @desc    Delete a contact
// @access  Private
router.delete('/:id', authorizeMinimumRole('operator'), deleteContact);

module.exports = router;
