const { fail } = require('../utils/apiResponse.util');

function notFound(req, res) {
    return fail(res, 404, `No route matches ${req.method} ${req.originalUrl}`);
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
    console.error(err.stack || err);

    // Prisma known request errors (unique constraint, record not found, etc.)
    if (err.code === 'P2002') {
        return fail(res, 409, `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists.`);
    }
    if (err.code === 'P2025') {
        return fail(res, 404, 'The requested record was not found.');
    }

    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : err.message;
    return fail(res, statusCode, message);
}

module.exports = { notFound, errorHandler };