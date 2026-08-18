/**
 * src/controllers/payment.controller.js
 *
 * Screen #13 — Secure Payment. Per the PRD, AfriLink does NOT hold funds
 * itself in the MVP — it records payment status from a licensed escrow
 * partner. `callEscrowPartner` below is the single seam to swap in a real
 * integration (Paystack/Flutterwave/PAPSS-connected partner) later without
 * touching controller logic.
 */

const { prisma } = require('../../config/dbHandler');
const { ok, created, fail } = require('../utils/apiResponse.util');
const { canTransition } = require('../utils/timeline.util');
const { roleOnTransaction } = require('./transaction.controller');

/** Mocked escrow call — replace with a real payment/escrow partner SDK. */
async function callEscrowPartner(transaction) {
    return {
        escrowReference: `MOCK-ESCROW-${transaction.id.slice(0, 8).toUpperCase()}`,
        provider: 'AfriLink Escrow Partner (mock)',
    };
}

/**
 * POST /api/transactions/:id/payment
 * body: { method }
 * Buyer funds an ACCEPTED transaction. Moves Payment -> FUNDS_SECURED and
 * Transaction -> PAYMENT_SECURED together.
 */
const fundTransaction = async (req, res) => {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return fail(res, 404, 'Transaction not found.');

    const businessId = req.user.business?.id;
    const role = roleOnTransaction(transaction, businessId);
    if (role !== 'buyer') return fail(res, 403, 'Only the buyer can fund this transaction.');

    const { allowed, reason } = canTransition(transaction.status, 'PAYMENT_SECURED', 'buyer');
    if (!allowed) return fail(res, 400, reason);

    const escrowResult = await callEscrowPartner(transaction);
    const amount = Number(transaction.unitPrice) * transaction.quantity;

    const payment = await prisma.$transaction(async (tx) => {
        const newPayment = await tx.payment.create({
            data: {
                transactionId: transaction.id,
                amount,
                currency: transaction.currency,
                method: req.body.method || 'bank_transfer',
                provider: escrowResult.provider,
                escrowReference: escrowResult.escrowReference,
                status: 'FUNDS_SECURED',
                fundedAt: new Date(),
            },
        });

        await tx.transaction.update({ where: { id: transaction.id }, data: { status: 'PAYMENT_SECURED' } });

        await tx.timelineEvent.create({
            data: {
                transactionId: transaction.id,
                status: 'PAYMENT_SECURED',
                actorId: req.user.id,
                note: `Buyer funded via ${escrowResult.provider}.`,
            },
        });

        return newPayment;
    });

    return created(res, payment);
};

/**
 * POST /api/transactions/:id/payment/release
 * Admin/system releases escrowed funds to the seller once delivery is
 * confirmed. Also auto-completes the transaction, mirroring the PRD's
 * Payment Released -> Completed step.
 */
const releasePayment = async (req, res) => {
    if (req.user.role !== 'ADMIN') return fail(res, 403, 'Only an admin can release payment.');

    const transaction = await prisma.transaction.findUnique({
        where: { id: req.params.id },
        include: { payment: true },
    });
    if (!transaction) return fail(res, 404, 'Transaction not found.');
    if (!transaction.payment) return fail(res, 400, 'No payment has been funded for this transaction.');

    const { allowed, reason } = canTransition(transaction.status, 'PAYMENT_RELEASED', 'admin');
    if (!allowed) return fail(res, 400, reason);

    const result = await prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { transactionId: transaction.id },
            data: { status: 'RELEASED', releasedAt: new Date() },
        });

        await tx.transaction.update({ where: { id: transaction.id }, data: { status: 'PAYMENT_RELEASED' } });
        await tx.timelineEvent.create({
            data: { transactionId: transaction.id, status: 'PAYMENT_RELEASED', actorId: req.user.id },
        });

        const completed = await tx.transaction.update({
            where: { id: transaction.id },
            data: { status: 'COMPLETED' },
        });
        await tx.timelineEvent.create({
            data: { transactionId: transaction.id, status: 'COMPLETED', actorId: req.user.id },
        });

        await tx.business.update({ where: { id: completed.buyerId }, data: { completedTradesCount: { increment: 1 } } });
        await tx.business.update({ where: { id: completed.sellerId }, data: { completedTradesCount: { increment: 1 } } });

        return completed;
    });

    return ok(res, result);
};

module.exports = { fundTransaction, releasePayment };
