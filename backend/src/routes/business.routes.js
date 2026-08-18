const express = require('express');
const router = express.Router();

const businessController = require('../controllers/business.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const asyncHandler = require('../utils/asyncHandler.util');

// Discovery is open to any authenticated business (screen #7).
router.get('/', requireAuth, asyncHandler(businessController.searchBusinesses));

router.get('/me', requireAuth, asyncHandler(businessController.getMyBusiness));
router.patch('/me', requireAuth, asyncHandler(businessController.updateMyBusiness));

router.post(
    '/me/documents',
    requireAuth,
    validateBody(['type', 'fileUrl', 'fileName']),
    asyncHandler(businessController.uploadVerificationDocument)
);

// Keep this LAST among GETs so it doesn't swallow '/me'.
router.get('/:id', requireAuth, asyncHandler(businessController.getBusinessById));

module.exports = router;
