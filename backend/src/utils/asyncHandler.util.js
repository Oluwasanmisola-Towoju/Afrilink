/**
 * src/utils/asyncHandler.util.js
 *
 * Wrap async route handlers so a rejected promise is forwarded to next(err)
 * instead of crashing the process / hanging the request. Keeps controllers
 * free of repetitive try/catch blocks.
 *
 *   router.post('/', asyncHandler(controller.createTransaction));
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
