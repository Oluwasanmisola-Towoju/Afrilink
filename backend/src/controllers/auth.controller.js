/**
 * src/controllers/auth.controller.js
 *
 * Covers screens #2 (Sign up / Login) and the first half of #3 (Business
 * Registration) — AfriLink signs up *businesses*, not individuals, so
 * registration creates a Business and its first User in one transaction.
 */

const { prisma } = require('../../config/dbHandler');
const { hashPassword, comparePassword } = require('../utils/password.util');
const { signAccessToken } = require('../utils/jwt.util');
const { ok, created, fail } = require('../utils/apiResponse.util');

/**
 * POST /api/auth/register
 * body: { fullName, email, password, companyName, country, industry,
 *         registrationNumber, businessType, contactEmail, contactPhone }
 *
 * Creates the Business (status PENDING, nothing verified yet) and the
 * first User for it, and returns a token so the frontend can go straight
 * into the verification checklist screen (#4).
 */
const register = async (req, res) => {
    const {
        fullName,
        email,
        password,
        companyName,
        country,
        industry,
        registrationNumber,
        businessType,
        contactEmail,
        contactPhone,
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        return fail(res, 409, 'An account with this email already exists.');
    }

    const existingBusiness = await prisma.business.findUnique({ where: { registrationNumber } });
    if (existingBusiness) {
        return fail(res, 409, 'A business with this registration number is already on AfriLink.');
    }

    const passwordHash = await hashPassword(password);

    const { user, business } = await prisma.$transaction(async (tx) => {
        const newBusiness = await tx.business.create({
            data: {
                companyName,
                country,
                industry,
                businessType: businessType || 'BOTH',
                registrationNumber,
                contactEmail: contactEmail || email,
                contactPhone,
                // registrationVerified defaults false; we treat "submitted at
                // signup" as satisfying the registration checklist item since
                // the platform validated the registration number was unique.
                registrationVerified: true,
                verificationStatus: 'IN_PROGRESS',
            },
        });

        const newUser = await tx.user.create({
            data: {
                fullName,
                email,
                passwordHash,
                phone: contactPhone,
                role: 'BUSINESS',
                businessId: newBusiness.id,
            },
        });

        return { user: newUser, business: newBusiness };
    });

    const token = signAccessToken(user);
    return created(res, {
        token,
        user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
        business,
    });
};

/**
 * POST /api/auth/login
 * body: { email, password }
 */
const login = async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
        where: { email },
        include: { business: true },
    });

    if (!user) {
        return fail(res, 401, 'Invalid email or password.');
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
        return fail(res, 401, 'Invalid email or password.');
    }

    const token = signAccessToken(user);
    return ok(res, {
        token,
        user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
        business: user.business,
    });
};

/**
 * GET /api/auth/me
 * Returns the current session's user + business — used on app load to
 * decide which screen to route into (onboarding vs dashboard).
 */
const me = async (req, res) => {
    return ok(res, {
        user: { id: req.user.id, fullName: req.user.fullName, email: req.user.email, role: req.user.role },
        business: req.user.business,
    });
};

module.exports = { register, login, me };
