/**
 * src/controllers/dispute.controller.js
 * Screen #14 — Dispute Case View.
 */

const { prisma } = require('../../config/dbHandler');
const { ok, created, fail } = require('../utils/apiResponse.util');
const { roleOnTransaction } = require('./transaction.controller');

/**
 * POST /api/transactions/:id/dispute
 * body: { reason }
 * Either party can raise a dispute any time after ACCEPTED and before COMPLETED.
 */
const raiseDispute = async (req, res) => {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return fail(res, 404, 'Transaction not found.');

    const businessId = req.user.business?.id;
    if (!roleOnTransaction(transaction, businessId)) {
        return fail(res, 403, 'You do not have access to this transaction.');
    }
    if (['COMPLETED', 'REJECTED', 'CANCELLED', 'DISPUTED'].includes(transaction.status)) {
        return fail(res, 400, `A dispute cannot be raised on a transaction in "${transaction.status}" status.`);
    }

    const dispute = await prisma.$transaction(async (tx) => {
        const newDispute = await tx.dispute.create({
            data: {
                transactionId: transaction.id,
                raisedById: req.user.id,
                reason: req.body.reason,
                evidenceChecklist: { shippingDocument: false, trackingInfo: false, communicationLog: false },
            },
        });

        await tx.transaction.update({ where: { id: transaction.id }, data: { status: 'DISPUTED' } });
        await tx.timelineEvent.create({
            data: { transactionId: transaction.id, status: 'DISPUTED', actorId: req.user.id, note: req.body.reason },
        });

        await tx.business.update({ where: { id: transaction.buyerId }, data: { disputesCount: { increment: 1 } } });
        await tx.business.update({ where: { id: transaction.sellerId }, data: { disputesCount: { increment: 1 } } });

        return newDispute;
    });

    return created(res, dispute);
};

/**
 * GET /api/disputes
 * Admin dashboard risk/dispute queue.
 */
const listDisputes = async (req, res) => {
    if (req.user.role !== 'ADMIN') return fail(res, 403, 'Admin only.');

    const disputes = await prisma.dispute.findMany({
        where: req.query.status ? { status: req.query.status } : undefined,
        include: {
            transaction: {
                include: {
                    buyer: { select: { companyName: true } },
                    seller: { select: { companyName: true } },
                },
            },
            raisedBy: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
    return ok(res, disputes);
};

/**
 * GET /api/disputes/:id
 * Full Dispute Case View detail — buyer/seller/amount, reason, evidence checklist.
 */
const getDisputeById = async (req, res) => {
    const dispute = await prisma.dispute.findUnique({
        where: { id: req.params.id },
        include: {
            transaction: {
                include: {
                    buyer: { select: { id: true, companyName: true } },
                    seller: { select: { id: true, companyName: true } },
                    payment: true,
                    documents: true,
                },
            },
            raisedBy: { select: { id: true, fullName: true } },
        },
    });
    if (!dispute) return fail(res, 404, 'Dispute not found.');

    const businessId = req.user.business?.id;
    const isParty = businessId && [dispute.transaction.buyerId, dispute.transaction.sellerId].includes(businessId);
    if (!isParty && req.user.role !== 'ADMIN') return fail(res, 403, 'You do not have access to this dispute.');

    return ok(res, dispute);
};

/**
 * PATCH /api/disputes/:id/evidence
 * body: { shippingDocument?, trackingInfo?, communicationLog? }
 * Toggles the evidence checklist shown on the case view.
 */
const updateEvidenceChecklist = async (req, res) => {
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id } });
    if (!dispute) return fail(res, 404, 'Dispute not found.');

    const merged = { ...(dispute.evidenceChecklist || {}), ...req.body };
    const updated = await prisma.dispute.update({
        where: { id: req.params.id },
        data: { evidenceChecklist: merged },
    });
    return ok(res, updated);
};

/**
 * POST /api/disputes/:id/resolve
 * body: { resolution: 'RELEASE' | 'REFUND' | 'REQUEST_EVIDENCE', adminNote? }
 * Admin decision actions: Release Funds / Refund Buyer / Request More Evidence.
 */
const resolveDispute = async (req, res) => {
    if (req.user.role !== 'ADMIN') return fail(res, 403, 'Admin only.');

    const { resolution, adminNote } = req.body;
    const dispute = await prisma.dispute.findUnique({ where: { id: req.params.id }, include: { transaction: true } });
    if (!dispute) return fail(res, 404, 'Dispute not found.');

    if (resolution === 'REQUEST_EVIDENCE') {
        const updated = await prisma.dispute.update({
            where: { id: req.params.id },
            data: { status: 'EVIDENCE_REQUESTED', adminNote },
        });
        return ok(res, updated);
    }

    if (!['RELEASE', 'REFUND'].includes(resolution)) {
        return fail(res, 400, 'resolution must be RELEASE, REFUND, or REQUEST_EVIDENCE.');
    }

    const result = await prisma.$transaction(async (tx) => {
        const disputeStatus = resolution === 'RELEASE' ? 'RESOLVED_RELEASE' : 'RESOLVED_REFUND';
        const transactionStatus = resolution === 'RELEASE' ? 'PAYMENT_RELEASED' : 'CANCELLED';

        const updatedDispute = await tx.dispute.update({
            where: { id: req.params.id },
            data: { status: disputeStatus, adminNote, resolvedById: req.user.id, resolvedAt: new Date() },
        });

        await tx.transaction.update({ where: { id: dispute.transactionId }, data: { status: transactionStatus } });
        await tx.timelineEvent.create({
            data: {
                transactionId: dispute.transactionId,
                status: transactionStatus,
                actorId: req.user.id,
                note: `Dispute resolved: ${resolution}. ${adminNote || ''}`.trim(),
            },
        });

        if (resolution === 'RELEASE' && dispute.transaction) {
            await tx.payment.update({
                where: { transactionId: dispute.transactionId },
                data: { status: 'RELEASED', releasedAt: new Date() },
            });
        }
        if (resolution === 'REFUND' && dispute.transaction) {
            await tx.payment.update({
                where: { transactionId: dispute.transactionId },
                data: { status: 'REFUNDED' },
            });
        }

        return updatedDispute;
    });

    return ok(res, result);
};

module.exports = { raiseDispute, listDisputes, getDisputeById, updateEvidenceChecklist, resolveDispute };
