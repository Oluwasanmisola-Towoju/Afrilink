/**
 * src/controllers/transaction.controller.js
 *
 * The centerpiece of the product. Covers:
 *  #6  Buyer Dashboard          -> listMyTransactions (role=buyer)
 *  #9  Create Transaction       -> createTransaction
 *  #10 Seller Dashboard         -> listMyTransactions (role=seller)
 *  #11 Incoming Transaction Review -> acceptTransaction / rejectTransaction
 *  #12 Transaction Workspace    -> getTransactionById, advanceStatus, postMessage
 *  #15 Completed Transaction / #16 Transaction History -> listMyTransactions
 */

const { prisma } = require('../../config/dbHandler');
const { ok, created, fail } = require('../utils/apiResponse.util');
const { canTransition } = require('../utils/timeline.util');

/** Full include set for the Transaction Workspace screen — everything on
 *  that one page (order details, payment, documents, messages, timeline). */
const WORKSPACE_INCLUDE = {
    buyer: { select: { id: true, companyName: true, verificationStatus: true } },
    seller: { select: { id: true, companyName: true, verificationStatus: true } },
    payment: true,
    documents: true,
    dispute: true,
    messages: { orderBy: { createdAt: 'asc' }, include: { sender: { select: { id: true, fullName: true } } } },
    timelineEvents: { orderBy: { createdAt: 'asc' } },
};

/** Determines whether the caller's business is the buyer or seller on this transaction. */
function roleOnTransaction(transaction, businessId) {
    if (transaction.buyerId === businessId) return 'buyer';
    if (transaction.sellerId === businessId) return 'seller';
    return null;
}

/**
 * POST /api/transactions
 * body: { sellerId, product, quantity, unitPrice, currency, deliveryLocation,
 *         expectedDeliveryDate, paymentConditions }
 * Screen #9. Caller's business becomes the buyer.
 */
const createTransaction = async (req, res) => {
    const buyerId = req.user.business.id;
    const {
        sellerId,
        product,
        quantity,
        unitPrice,
        currency,
        deliveryLocation,
        expectedDeliveryDate,
        paymentConditions,
    } = req.body;

    if (sellerId === buyerId) {
        return fail(res, 400, 'A business cannot create a transaction with itself.');
    }

    const seller = await prisma.business.findUnique({ where: { id: sellerId } });
    if (!seller) return fail(res, 404, 'Seller business not found.');
    if (seller.verificationStatus !== 'VERIFIED') {
        return fail(res, 400, 'You can only trade with verified businesses.');
    }

    const transaction = await prisma.$transaction(async (tx) => {
        const newTransaction = await tx.transaction.create({
            data: {
                buyerId,
                sellerId,
                product,
                quantity: Number(quantity),
                unitPrice,
                currency: currency || 'USD',
                deliveryLocation,
                expectedDeliveryDate: new Date(expectedDeliveryDate),
                paymentConditions,
                status: 'CREATED',
            },
        });

        await tx.timelineEvent.create({
            data: {
                transactionId: newTransaction.id,
                status: 'CREATED',
                actorId: req.user.id,
                note: 'Transaction created by buyer.',
            },
        });

        return newTransaction;
    });

    return created(res, transaction);
};

/**
 * GET /api/transactions?role=buyer|seller&status=CREATED
 * Screens #6, #10, #15, #16 — dashboards + history, filtered client-side by tab.
 */
const listMyTransactions = async (req, res) => {
    const businessId = req.user.business.id;
    const { role, status } = req.query;

    const where = {
        ...(role === 'buyer' ? { buyerId: businessId } : {}),
        ...(role === 'seller' ? { sellerId: businessId } : {}),
        ...(!role ? { OR: [{ buyerId: businessId }, { sellerId: businessId }] } : {}),
        ...(status ? { status } : {}),
    };

    const transactions = await prisma.transaction.findMany({
        where,
        include: {
            buyer: { select: { id: true, companyName: true } },
            seller: { select: { id: true, companyName: true } },
            payment: { select: { status: true } },
        },
        orderBy: { updatedAt: 'desc' },
    });

    // Quick stat counts for the dashboard header cards (active / awaiting
    // payment / in transit / completed) so the frontend doesn't recompute them.
    const stats = {
        active: transactions.filter((t) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(t.status)).length,
        awaitingPayment: transactions.filter((t) => t.status === 'ACCEPTED').length,
        inTransit: transactions.filter((t) => ['SHIPPED', 'IN_TRANSIT'].includes(t.status)).length,
        completed: transactions.filter((t) => t.status === 'COMPLETED').length,
    };

    return ok(res, transactions, 200, { stats });
};

/**
 * GET /api/transactions/:id
 * Screen #12 — Transaction Workspace. Single call, every panel on the page.
 */
const getTransactionById = async (req, res) => {
    const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
        include: WORKSPACE_INCLUDE,
    });
    if (!transaction) return fail(res, 404, 'Transaction not found.');

    const businessId = req.user.business?.id;
    const role = roleOnTransaction(transaction, businessId);
    if (!role && req.user.role !== 'ADMIN') {
        return fail(res, 403, 'You do not have access to this transaction.');
    }

    return ok(res, { ...transaction, viewerRole: role || 'admin' });
};

/**
 * POST /api/transactions/:id/accept
 * Screen #11 — seller accepts the proposed transaction.
 */
const acceptTransaction = (req, res) => changeStatus(req, res, 'ACCEPTED', 'Seller accepted the transaction.');

/**
 * POST /api/transactions/:id/reject
 * Screen #11 — seller declines.
 */
const rejectTransaction = (req, res) => changeStatus(req, res, 'REJECTED', 'Seller rejected the transaction.');

/**
 * POST /api/transactions/:id/advance
 * body: { status, note? }
 * Generic timeline-advance endpoint used for the seller-triggered steps on
 * the workspace: SHIPPED, IN_TRANSIT. (PAYMENT_SECURED and PAYMENT_RELEASED
 * go through payment.controller.js since they carry payment side-effects.)
 */
const advanceStatus = async (req, res) => {
    const { status, note } = req.body;
    return changeStatus(req, res, status, note);
};

/**
 * Shared implementation: validates the transition against the timeline
 * state machine, applies it, and writes an audit event in one DB transaction.
 */
async function changeStatus(req, res, toStatus, note) {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return fail(res, 404, 'Transaction not found.');

    const businessId = req.user.business?.id;
    const actorRole = req.user.role === 'ADMIN' ? 'admin' : roleOnTransaction(transaction, businessId);
    if (!actorRole) return fail(res, 403, 'You do not have access to this transaction.');

    const { allowed, reason } = canTransition(transaction.status, toStatus, actorRole);
    if (!allowed) return fail(res, 400, reason);

    const updated = await prisma.$transaction(async (tx) => {
        const updatedTransaction = await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: toStatus },
        });

        await tx.timelineEvent.create({
            data: {
                transactionId: transaction.id,
                status: toStatus,
                actorId: req.user.id,
                note,
            },
        });

        // Completing a trade bumps both businesses' trust-profile counters.
        if (toStatus === 'COMPLETED') {
            await tx.business.update({
                where: { id: updatedTransaction.buyerId },
                data: { completedTradesCount: { increment: 1 } },
            });
            await tx.business.update({
                where: { id: updatedTransaction.sellerId },
                data: { completedTradesCount: { increment: 1 } },
            });
        }

        return updatedTransaction;
    });

    return ok(res, updated);
}

/**
 * POST /api/transactions/:id/messages
 * body: { content }
 * Workspace message thread panel.
 */
const postMessage = async (req, res) => {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return fail(res, 404, 'Transaction not found.');

    const businessId = req.user.business?.id;
    if (!roleOnTransaction(transaction, businessId) && req.user.role !== 'ADMIN') {
        return fail(res, 403, 'You do not have access to this transaction.');
    }

    const message = await prisma.message.create({
        data: {
            transactionId: transaction.id,
            senderId: req.user.id,
            content: req.body.content,
        },
        include: { sender: { select: { id: true, fullName: true } } },
    });

    return created(res, message);
};

/**
 * POST /api/transactions/:id/documents
 * body: { type, fileUrl, fileName }
 * Documents checklist panel (Purchase Order, Invoice, Certificate of
 * Origin, Delivery Document).
 */
const uploadTransactionDocument = async (req, res) => {
    const { type, fileUrl, fileName } = req.body;
    const document = await prisma.document.create({
        data: {
            type,
            fileUrl,
            fileName,
            transactionId: req.params.id,
            uploadedById: req.user.id,
        },
    });
    return created(res, document);
};

module.exports = {
    createTransaction,
    listMyTransactions,
    getTransactionById,
    acceptTransaction,
    rejectTransaction,
    advanceStatus,
    postMessage,
    uploadTransactionDocument,
    roleOnTransaction,
};
