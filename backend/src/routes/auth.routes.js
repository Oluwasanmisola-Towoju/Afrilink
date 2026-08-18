const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

router.post(
    '/register',
    validateBody(['fullName', 'email', 'password', 'companyName', 'country', 'industry', 'registrationNumber']),
    asyncHandler(authController.register)
);

router.post('/login', validateBody(['email', 'password']), asyncHandler(authController.login));

router.get('/me', requireAuth, asyncHandler(authController.me));

module.exports = router;
