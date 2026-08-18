const prisma = require('../../config/dbHandler');
const { verifyAccessToken } = require('../utils/jwt.util');
const { fail } = require('../utils/apiResponse.util');

async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const [scheme, token] = header.split(' ');

        if (scheme !== 'Bearer' || !token) {
            return fail(res, 401, 'Unauthorized: No token provided');
        }

        const payload = verifyAccessToken(token);

        const user = await prisma.user.findUnique({
            where: { id: payload.sub},
            include: { business: true }
        });

        if (!user) {
            return fail(res, 401, 'Unauthorized: User not found');
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Authentication error:', err);
        return fail(res, 401, 'Unauthorized: Invalid or expired token');
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return fail(res, 403, 'Forbidden: Insufficient permissions');
        }
        next();
    };
}   

function requireVerifiedBusiness(req, res, next) {
    if (!req.user.business) {
        return fail(res, 403, 'No business is associated with this user');
    }
    if (req.user.business.verificationStatus !== 'VERIFIED') {
        return fail(res, 403, 'Business is not verified, business must be verified to perform this action');
    }
    next();
}

module.exports = { requireAuth, requireRole, requireVerifiedBusiness };