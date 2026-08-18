const express = require('express');
const router = express.Router();

const transactionController = require('../controllers/transaction.controller');
const paymentController = require('../controllers/payment.controller');
const disputeController = require('../controllers/dispute.controller');
const { requireAuth, requireVerifiedBusiness } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

// #9 Create Transaction — only verified businesses can initiate trade.
router.post(
    '/',
    requireAuth,
    requireVerifiedBusiness,
    validateBody(['sellerId', 'product', 'quantity', 'unitPrice', 'deliveryLocation', 'expectedDeliveryDate', 'paymentConditions']),
    asyncHandler(transactionController.createTransaction)
);

// #6 / #10 / #16 dashboards + history — ?role=buyer|seller&status=...
router.get('/', requireAuth, asyncHandler(transactionController.listMyTransactions));

// #12 Transaction Workspace
router.get('/:id', requireAuth, asyncHandler(transactionController.getTransactionById));

// #11 Incoming Transaction Review
router.post('/:id/accept', requireAuth, asyncHandler(transactionController.acceptTransaction));
router.post('/:id/reject', requireAuth, asyncHandler(transactionController.rejectTransaction));

// #12 generic timeline advance (SHIPPED, IN_TRANSIT, DELIVERED)
router.post(
    '/:id/advance',
    requireAuth,
    validateBody(['status']),
    asyncHandler(transactionController.advanceStatus)
);

// #12 message thread panel
router.post(
    '/:id/messages',
    requireAuth,
    validateBody(['content']),
    asyncHandler(transactionController.postMessage)
);

// #12 documents checklist panel
router.post(
    '/:id/documents',
    requireAuth,
    validateBody(['type', 'fileUrl', 'fileName']),
    asyncHandler(transactionController.uploadTransactionDocument)
);

// #13 Secure Payment
router.post('/:id/payment', requireAuth, asyncHandler(paymentController.fundTransaction));
router.post('/:id/payment/release', requireAuth, asyncHandler(paymentController.releasePayment));

// #14 Dispute raised from within a transaction
router.post(
    '/:id/dispute',
    requireAuth,
    validateBody(['reason']),
    asyncHandler(disputeController.raiseDispute)
);

module.exports = router;
