const express = require('express');
const router = express.Router();
const { postToTwitterController } = require('../controllers/postController');

router.post('/post', postToTwitterController);

module.exports = router;