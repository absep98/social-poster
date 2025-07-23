const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  authenticateUser, 
  getUserProfile, 
  updateUserTokens 
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', registerUser);     // POST /api/user/register
router.post('/login', loginUser);           // POST /api/user/login
router.post('/auth', authenticateUser);     // POST /api/user/auth (legacy)

// Protected routes
router.get('/profile', protect, getUserProfile);         // GET /api/user/profile
router.put('/tokens', protect, updateUserTokens);        // PUT /api/user/tokens

module.exports = router;
