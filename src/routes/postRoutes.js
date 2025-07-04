const express = require('express');
const router = express.Router();
const { postToTwitterController, postToLinkedInController } = require('../controllers/postController');

router.post('/twitter', postToTwitterController);

router.post('/linkedin', postToLinkedInController);

module.exports = router;