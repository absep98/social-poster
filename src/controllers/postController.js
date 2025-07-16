const { postToTwitter } = require('../services/TwitterService');
const { postToLinkedIn, isTokenValid, isTokenExpired } = require('../services/LinkedInService');
const Post = require('../models/Post');

const postToTwitterController = async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;

  // Input validation
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Content is required and must be a non-empty string' 
    });
  }

  try {
    // Get user's Twitter token
    const twitterToken = req.user.twitterToken;
    if (!twitterToken) {
      return res.status(400).json({
        success: false,
        message: 'Twitter token not found. Please connect your Twitter account first.'
      });
    }

    // Post to Twitter
    const result = await postToTwitter(content);
    
    // Save post to database
    const post = await Post.create({
      content,
      platforms: ['twitter'],
      user: userId,
      status: 'posted',
      platformStatus: {
        twitter: 'success'
      }
    });

    res.json({ 
      success: true, 
      platform: 'twitter', 
      result,
      post: post._id
    });
  } catch (err) {
    console.error('Twitter controller error:', err);
    
    // Save failed post to database
    await Post.create({
      content,
      platforms: ['twitter'],
      user: userId,
      status: 'failed',
      platformStatus: {
        twitter: 'failed'
      }
    });

    res.status(500).json({ 
      success: false, 
      message: 'Failed to post to Twitter',
      error: err.message 
    });
  }
};

const postToLinkedInController = async (req, res) => {
  const { content } = req.body;
  const userId = req.user.id;

  // Input validation
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ 
      success: false, 
      message: 'Content is required and must be a non-empty string' 
    });
  }

  try {
    // Get user's LinkedIn token
    const linkedinToken = req.user.linkedinToken;
    const tokenExpiry = req.user.linkedinTokenExpiry;
    
    if (!linkedinToken) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn token not found. Please connect your LinkedIn account first.',
        needsReauth: true,
        reAuthUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/auth/linkedin/login`
      });
    }

    // Check if token is expired
    if (isTokenExpired(tokenExpiry)) {
      return res.status(401).json({
        success: false,
        message: 'LinkedIn token has expired. Please re-authenticate.',
        needsReauth: true,
        reAuthUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/auth/linkedin/login`
      });
    }

    // Validate token with LinkedIn API
    const isValid = await isTokenValid(linkedinToken);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'LinkedIn token is invalid. Please re-authenticate.',
        needsReauth: true,
        reAuthUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/auth/linkedin/login`
      });
    }

    // Post to LinkedIn
    const result = await postToLinkedIn(content, linkedinToken);
    
    // Save post to database
    const post = await Post.create({
      content,
      platforms: ['linkedin'],
      user: userId,
      status: 'posted',
      platformStatus: {
        linkedin: 'success'
      }
    });

    res.json({ 
      success: true, 
      platform: 'linkedin', 
      result,
      post: post._id
    });
  } catch (err) {
    console.error('LinkedIn controller error:', err);
    
    // Save failed post to database
    await Post.create({
      content,
      platforms: ['linkedin'],
      user: userId,
      status: 'failed',
      platformStatus: {
        linkedin: 'failed'
      }
    });

    res.status(500).json({ 
      success: false, 
      message: 'Failed to post to LinkedIn',
      error: err.message 
    });
  }
};

module.exports = { postToTwitterController, postToLinkedInController };
