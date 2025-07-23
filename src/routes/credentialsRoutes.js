const express = require('express');
const router = express.Router();
const {
  getUserCredentials,
  saveLinkedInCredentials,
  saveTwitterCredentials,
  disablePlatform
} = require('../controllers/credentialsController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Get user's platform credentials
router.get('/', getUserCredentials);

// Save platform credentials
router.post('/linkedin', saveLinkedInCredentials);
router.post('/twitter', saveTwitterCredentials);

// Disable platform
router.delete('/:platform', disablePlatform);

module.exports = router;
