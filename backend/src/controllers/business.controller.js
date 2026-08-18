/**
 * src/controllers/business.controller.js
 *
 * Covers screens #4/#5 (verification), #7 (Business Network / Discovery),
 * #8 (Business Profile view).
 */

const { prisma } = require('../../config/dbHandler');
const { ok, created, fail } = require('../utils/apiResponse.util');

/** Recomputes the overall VerificationStatus badge from the 4 checklist items. */
function deriveVerificationStatus(business) {
    const { registrationVerified, taxIdVerified, directorVerified, bankAccountVerified } = business;
    if (registrationVerified && taxIdVerified && directorVerified && bankAccountVerified) {
        return 'VERIFIED';
    }
    const anyStarted = registrationVerified || taxIdVerified || directorVerified || bankAccountVerified;
    return anyStarted ? 'IN_PROGRESS' : 'PENDING';
}

/**
 * GET /api/businesses/me
 * Powers screens #4 and #5 — same endpoint, the frontend just renders the
 * "complete" version once verificationStatus === 'VERIFIED'.
 */
const getMyBusiness = async (req, res) => {
    if (!req.user.business) return fail(res, 404, 'No business profile on this account.');

    const business = await prisma.business.findUnique({
        where: { id: req.user.business.id },
        include: { documents: true },
    });
    return ok(res, business);
};

/**
 * PATCH /api/businesses/me
 * Editable onboarding fields (screen #3 continuing after signup, or later edits).
 */
const updateMyBusiness = async (req, res) => {
    const { companyName, country, industry, businessType, taxId, contactEmail, contactPhone } = req.body;

    const business = await prisma.business.update({
        where: { id: req.user.business.id },
        data: { companyName, country, industry, businessType, taxId, contactEmail, contactPhone },
    });
    return ok(res, business);
};

/**
 * POST /api/businesses/me/documents
 * body: { type, fileUrl, fileName }
 * Records a verification document (tax cert, director ID, bank statement)
 * against the checklist. Actual "verified" flag flips only when an admin
 * approves it (admin.controller.js) — this just moves the checklist item
 * into a submitted/pending state visually via the document existing.
 */
const uploadVerificationDocument = async (req, res) => {
    const { type, fileUrl, fileName } = req.body;

    const document = await prisma.document.create({
        data: {
            type,
            fileUrl,
            fileName,
            businessId: req.user.business.id,
            uploadedById: req.user.id,
        },
    });

    // Move the business out of PENDING the moment the first document lands,
    // so the frontend can show "verification in progress" immediately.
    if (req.user.business.verificationStatus === 'PENDING') {
        await prisma.business.update({
            where: { id: req.user.business.id },
            data: { verificationStatus: 'IN_PROGRESS' },
        });
    }

    return created(res, document);
};

/**
 * GET /api/businesses?q=&country=&industry=&businessType=&verifiedOnly=true
 * Screen #7 — Business Network / Discovery.
 */
const searchBusinesses = async (req, res) => {
    const { q, country, industry, businessType, verifiedOnly } = req.query;

    const where = {
        ...(q ? { companyName: { contains: q, mode: 'insensitive' } } : {}),
        ...(country ? { country } : {}),
        ...(industry ? { industry } : {}),
        ...(businessType ? { businessType } : {}),
        ...(verifiedOnly === 'true' ? { verificationStatus: 'VERIFIED' } : {}),
    };

    const businesses = await prisma.business.findMany({
        where,
        select: {
            id: true,
            companyName: true,
            country: true,
            industry: true,
            businessType: true,
            verificationStatus: true,
            completedTradesCount: true,
        },
        orderBy: { completedTradesCount: 'desc' },
        take: 50,
    });

    return ok(res, businesses);
};

/**
 * GET /api/businesses/:id
 * Screen #8 — single verified business detail / trade history summary.
 */
const getBusinessById = async (req, res) => {
    const business = await prisma.business.findUnique({
        where: { id: req.params.id },
        select: {
            id: true,
            companyName: true,
            country: true,
            industry: true,
            businessType: true,
            verificationStatus: true,
            completedTradesCount: true,
            disputesCount: true,
            createdAt: true, // "Member Since"
        },
    });

    if (!business) return fail(res, 404, 'Business not found.');
    return ok(res, business);
};

module.exports = {
    deriveVerificationStatus,
    getMyBusiness,
    updateMyBusiness,
    uploadVerificationDocument,
    searchBusinesses,
    getBusinessById,
};
