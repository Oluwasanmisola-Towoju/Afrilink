/**
 * src/controllers/admin.controller.js
 * Screen #17 — Admin Dashboard, plus the verification-approval actions that
 * feed the "Business Verification" checklist on the business-facing side.
 */

const { prisma } = require('../../config/dbHandler');
const { ok, fail } = require('../utils/apiResponse.util');
const { deriveVerificationStatus } = require('./business.controller');

/**
 * GET /api/admin/businesses?status=PENDING
 * Backs the "businesses pending / verified / flagged" counts and table.
 */
const listBusinesses = async (req, res) => {
    const businesses = await prisma.business.findMany({
        where: req.query.status ? { verificationStatus: req.query.status } : undefined,
        orderBy: { createdAt: 'desc' },
    });
    return ok(res, businesses);
};

/**
 * PATCH /api/admin/businesses/:id/verify
 * body: { item: 'registration' | 'taxId' | 'director' | 'bankAccount', verified: boolean }
 * Toggles one checklist item; overall verificationStatus is re-derived so
 * the business flips to VERIFIED the moment all four are true.
 */
const verifyBusinessItem = async (req, res) => {
    const { item, verified } = req.body;

    const fieldMap = {
        registration: 'registrationVerified',
        taxId: 'taxIdVerified',
        director: 'directorVerified',
        bankAccount: 'bankAccountVerified',
    };
    const field = fieldMap[item];
    if (!field) return fail(res, 400, `item must be one of: ${Object.keys(fieldMap).join(', ')}`);

    const existing = await prisma.business.findUnique({ where: { id: req.params.id } });
    if (!existing) return fail(res, 404, 'Business not found.');

    const patched = { ...existing, [field]: Boolean(verified) };
    const verificationStatus = deriveVerificationStatus(patched);

    const business = await prisma.business.update({
        where: { id: req.params.id },
        data: { [field]: Boolean(verified), verificationStatus },
    });

    return ok(res, business);
};

/**
 * GET /api/admin/dashboard
 * Screen #17 stat panels: business counts, transaction counts, risk alerts.
 */
const getDashboardStats = async (req, res) => {
    const [businessCounts, transactionCounts, openDisputes] = await Promise.all([
        prisma.business.groupBy({ by: ['verificationStatus'], _count: true }),
        prisma.transaction.groupBy({ by: ['status'], _count: true }),
        prisma.dispute.findMany({
            where: { status: { in: ['OPEN', 'EVIDENCE_REQUESTED'] } },
            include: {
                transaction: {
                    select: {
                        id: true,
                        buyer: { select: { companyName: true } },
                        seller: { select: { companyName: true } },
                    },
                },
            },
            take: 20,
            orderBy: { createdAt: 'desc' },
        }),
    ]);

    const toCountMap = (rows, keyField) =>
        rows.reduce((acc, row) => ({ ...acc, [row[keyField]]: row._count }), {});

    return ok(res, {
        businesses: toCountMap(businessCounts, 'verificationStatus'),
        transactions: toCountMap(transactionCounts, 'status'),
        riskAlerts: openDisputes, // MVP: dispute queue doubles as the risk-alerts panel
    });
};

module.exports = { listBusinesses, verifyBusinessItem, getDashboardStats };
