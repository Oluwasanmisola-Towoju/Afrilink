const express = require('express');
const router = express.Router();

const adminController = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

router.use(requireAuth, requireRole('ADMIN'));

router.get('/dashboard', asyncHandler(adminController.getDashboardStats));
router.get('/businesses', asyncHandler(adminController.listBusinesses));
router.patch(
    '/businesses/:id/verify',
    validateBody(['item', 'verified']),
    asyncHandler(adminController.verifyBusinessItem)
);

module.exports = router;
