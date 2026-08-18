function ok(res, data, statusCode = 200, meta) {
    return res.status(statusCode).json({ success: true, data, ...(meta ? { meta } : {}) });
}

function created(res, data) {
    return ok(res, data, 201);
}

function fail(res, statusCode, message, details) {
    return res.status(statusCode).json({
        success: false,
        error: { message, ...(details ? { details } : {}) },
    });
}

module.exports = { ok, created, fail };