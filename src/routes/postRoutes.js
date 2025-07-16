const express = require('express');
const router = express.Router();
const { postToTwitterController, postToLinkedInController } = require('../controllers/postController');
const { protect } = require('../middleware/auth');

router.post('/twitter', protect, postToTwitterController);
router.post('/linkedin', protect, postToLinkedInController);

module.exports = router;