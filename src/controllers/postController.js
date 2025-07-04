const { postToTwitter } = require('../services/TwitterService');

const postToTwitterController = async (req, res) => {
  const { content } = req.body;

  // Input validation
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Content is required and must be a non-empty string' 
    });
  }

  try {
    const result = await postToTwitter(content);
    res.json({ success: true, platform: 'twitter', result });
  } catch (err) {
    console.error('Twitter controller error:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to post to Twitter',
      error: err.message 
    });
  }
};

module.exports = { postToTwitterController };
