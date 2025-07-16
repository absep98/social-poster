const express = require('express');
const router = express.Router();
const { authenticateUser, getUserProfile, updateUserTokens } = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/auth', authenticateUser);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/tokens', protect, updateUserTokens);

module.exports = router;
