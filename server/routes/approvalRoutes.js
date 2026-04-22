const express = require('express');
const auth = require('../middleware/authMiddleware');
const { authorizeMinimumRole } = require('../middleware/authorizeRoles');
const { auditMutatingRequests } = require('../middleware/securityMiddleware');
const {
    listApprovalRequestsController,
    approveRequestController,
    rejectRequestController,
} = require('../controllers/approvalController');

const router = express.Router();

router.use(auth);
router.use(auditMutatingRequests('approval'));

router.get('/', authorizeMinimumRole('operator'), listApprovalRequestsController);
router.post('/:id/approve', authorizeMinimumRole('supervisor'), approveRequestController);
router.post('/:id/reject', authorizeMinimumRole('supervisor'), rejectRequestController);

module.exports = router;
