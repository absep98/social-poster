const { postToTwitter } = require('../services/TwitterService');
const { postToLinkedIn } = require('../services/LinkedInService');
const { post } = require('needle');

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

const postToLinkedInController = async (req, res) => {
  const { content } = req.body;

  try {
    const result = await postToLinkedIn(content);
    res.json({ success: true, platform: 'linkedin', result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to post to LinkedIn' });
  }
};

module.exports = { postToTwitterController, postToLinkedInController };
