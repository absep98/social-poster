const express = require('express');
const router = express.Router();
const { 
  getAllPosts,
  createPost,
  updatePost,
  deletePost
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

// CRUD routes for posts management
router.get('/', getAllPosts);           // GET /api/posts
router.post('/', createPost);           // POST /api/posts  
router.put('/:id', updatePost);         // PUT /api/posts/:id
router.delete('/:id', deletePost);      // DELETE /api/posts/:id

module.exports = router;
