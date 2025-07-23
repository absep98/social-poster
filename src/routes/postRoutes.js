const express = require('express');
const router = express.Router();
const { 
  postToTwitterController, 
  postToLinkedInController
} = require('../controllers/realPostController');
const { protect } = require('../middleware/auth');

// Social media publishing routes - using user's own credentials
router.post('/twitter', protect, postToTwitterController);
router.post('/linkedin', protect, postToLinkedInController);

module.exports = router;