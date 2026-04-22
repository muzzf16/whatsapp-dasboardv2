const approvalService = require('../services/approvalService');

async function listApprovalRequestsController(req, res) {
    try {
        const approvals = await approvalService.listApprovalRequests({ user: req.user });
        res.status(200).json({ status: 'success', data: approvals });
    } catch (error) {
        console.error('Failed to fetch approval requests:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch approval requests.' });
    }
}

async function approveRequestController(req, res) {
    try {
        const result = await approvalService.approveRequest({
            id: req.params.id,
            approverId: req.user.id,
        });
        res.status(200).json({ status: 'success', message: 'Approval request approved.', data: result });
    } catch (error) {
        const statusCode = error.statusCode || (error.message.includes('not found') ? 404 : 400);
        res.status(statusCode).json({ status: 'error', message: error.message, details: error.details });
    }
}

async function rejectRequestController(req, res) {
    try {
        await approvalService.rejectRequest({
            id: req.params.id,
            approverId: req.user.id,
            reason: typeof req.body.reason === 'string' ? req.body.reason.trim() : '',
        });
        res.status(200).json({ status: 'success', message: 'Approval request rejected.' });
    } catch (error) {
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ status: 'error', message: error.message });
    }
}

module.exports = {
    listApprovalRequestsController,
    approveRequestController,
    rejectRequestController,
};
