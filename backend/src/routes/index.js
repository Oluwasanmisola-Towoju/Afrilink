/**
 * src/routes/index.js
 * Single mount point — server.js only needs `app.use('/api', require('./src/routes'))`.
 */

const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/businesses', require('./business.routes'));
router.use('/transactions', require('./transaction.routes'));
router.use('/disputes', require('./dispute.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
