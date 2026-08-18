const express = require('express');
const router = express.Router();

const disputeController = require('../controllers/dispute.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

// #17 admin dispute queue
router.get('/', requireAuth, requireRole('ADMIN'), asyncHandler(disputeController.listDisputes));

// #14 Dispute Case View
router.get('/:id', requireAuth, asyncHandler(disputeController.getDisputeById));

router.patch('/:id/evidence', requireAuth, asyncHandler(disputeController.updateEvidenceChecklist));

router.post(
    '/:id/resolve',
    requireAuth,
    requireRole('ADMIN'),
    validateBody(['resolution']),
    asyncHandler(disputeController.resolveDispute)
);

module.exports = router;
