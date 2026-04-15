const express = require('express');
const router = express.Router();
const { getContacts, createContact, updateContact, deleteContact } = require('../controllers/contactController');
const auth = require('../middleware/authMiddleware');
const { auditMutatingRequests } = require('../middleware/securityMiddleware');

router.use(auth);
router.use(auditMutatingRequests('contact'));

// @route   GET api/contacts
// @desc    Get all contacts
// @access  Private
router.get('/', getContacts);

// @route   POST api/contacts
// @desc    Create a contact
// @access  Private
router.post('/', createContact);

// @route   PUT api/contacts/:id
// @desc    Update a contact
// @access  Private
router.put('/:id', updateContact);

// @route   DELETE api/contacts/:id
// @desc    Delete a contact
// @access  Private
router.delete('/:id', deleteContact);

module.exports = router;
