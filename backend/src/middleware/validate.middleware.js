const { fail } = require('../utils/apiResponse.util');

function validateBody(requiredFields = []) {
    return (req, res, next) => {
        const missing = requiredFields.filter(
            (field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
        );
        if (missing.length > 0) {
            return fail(res, 400, 'Missing required field(s).', { missing });
        }
        next();
    };
}

module.exports = { validateBody };