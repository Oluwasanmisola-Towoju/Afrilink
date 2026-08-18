const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || '7d';

function signAccessToken(user) {
    // Keep the payload small — the auth middleware re-fetches fresh user/
    // business data from the DB, this is just enough to identify the caller.
    return jwt.sign(
        { sub: user.id, role: user.role, businessId: user.businessId || null },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signAccessToken, verifyAccessToken };