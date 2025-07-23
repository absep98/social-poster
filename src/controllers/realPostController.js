const { postToLinkedIn } = require('../services/LinkedInService');
const { postToTwitter } = require('../services/TwitterService');
const UserCredentials = require('../models/UserCredentials');
const Post = require('../models/Post');
const crypto = require('crypto');

// Post to Twitter using user's credentials
const postToTwitterController = async (req, res) => {
  try {
    const { content, postId } = req.body;
    const userId = req.user.id;

    // Input validation
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is required and must be a non-empty string' 
      });
    }

    // Get user's credentials
    const userCredentials = await UserCredentials.findOne({ userId });
    if (!userCredentials || !userCredentials.platforms.twitter.enabled) {
      return res.status(400).json({
        success: false,
        message: 'Twitter not configured. Please add your Twitter API credentials first.'
      });
    }

    // Decrypt credentials
    const twitterCreds = userCredentials.getDecryptedCredentials().twitter;
    
    if (!twitterCreds.apiKey || !twitterCreds.apiSecret || !twitterCreds.accessToken || !twitterCreds.accessSecret) {
      return res.status(400).json({
        success: false,
        message: 'Incomplete Twitter credentials. Please reconfigure your Twitter API access.'
      });
    }

    console.log('Posting to Twitter with user credentials...');

    // Use the Twitter service instead of direct client creation
    const tweet = await postToTwitter(content, {
      apiKey: twitterCreds.apiKey,
      apiSecret: twitterCreds.apiSecret,
      accessToken: twitterCreds.accessToken,
      accessSecret: twitterCreds.accessSecret
    });
    
    console.log('Twitter post successful:', tweet);

    // Update post status if postId provided (for pending posts)
    if (postId) {
      await Post.findByIdAndUpdate(postId, {
        status: 'posted',
        'platformStatus.twitter': 'success',
        'platformData.twitter': {
          tweetId: tweet.id,
          postedAt: new Date()
        }
      });
    } else {
      // Create new post record
      await Post.create({
        content,
        platforms: ['twitter'],
        user: userId,
        status: 'posted',
        platformStatus: {
          twitter: 'success'
        },
        platformData: {
          twitter: {
            tweetId: tweet.id,
            postedAt: new Date()
          }
        }
      });
    }

    res.json({ 
      success: true, 
      platform: 'twitter',
      message: 'Posted to Twitter successfully!',
      tweetId: tweet.id
    });

  } catch (error) {
    console.error('Twitter posting error:', error);

    // Update post status to failed if postId provided
    if (req.body.postId) {
      await Post.findByIdAndUpdate(req.body.postId, {
        status: 'failed',
        'platformStatus.twitter': 'failed',
        error: error.message
      });
    }

    // Handle specific Twitter API errors
    if (error.code === 403) {
      return res.status(403).json({
        success: false,
        message: 'Twitter API access denied. Please check your credentials and permissions.'
      });
    }

    if (error.code === 401) {
      return res.status(401).json({
        success: false,
        message: 'Twitter authentication failed. Please reconfigure your API credentials.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to post to Twitter: ' + error.message
    });
  }
};

// Post to LinkedIn using user's credentials
const postToLinkedInController = async (req, res) => {
  try {
    const { content, postId } = req.body;
    const userId = req.user.id;

    // Input validation
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is required and must be a non-empty string' 
      });
    }

    // Get user's credentials
    const userCredentials = await UserCredentials.findOne({ userId });
    if (!userCredentials || !userCredentials.platforms.linkedin.enabled) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn not configured. Please connect your LinkedIn account first.'
      });
    }

    // Decrypt credentials
    const linkedinCreds = userCredentials.getDecryptedCredentials().linkedin;
    
    if (!linkedinCreds.accessToken) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn access token missing. Please reconnect your LinkedIn account.'
      });
    }

    // Check if token is expired
    if (linkedinCreds.expiresAt && new Date() > new Date(linkedinCreds.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn access token has expired. Please reconnect your LinkedIn account.'
      });
    }

    console.log('Posting to LinkedIn with user credentials...');

    // Use the LinkedIn service instead of direct axios call
    const result = await postToLinkedIn(
      content, 
      linkedinCreds.accessToken, 
      linkedinCreds.profileId
    );

    console.log('LinkedIn post successful:', result);

    // Update post status if postId provided
    if (postId) {
      await Post.findByIdAndUpdate(postId, {
        status: 'posted',
        'platformStatus.linkedin': 'success',
        'platformData.linkedin': {
          postId: result.id,
          postedAt: new Date()
        }
      });
    } else {
      // Create new post record
      await Post.create({
        content,
        platforms: ['linkedin'],
        user: userId,
        status: 'posted',
        platformStatus: {
          linkedin: 'success'
        },
        platformData: {
          linkedin: {
            postId: result.id,
            postedAt: new Date()
          }
        }
      });
    }

    res.json({ 
      success: true, 
      platform: 'linkedin',
      message: 'Posted to LinkedIn successfully!',
      postId: result.id
    });

  } catch (error) {
    console.error('LinkedIn posting error:', error);

    // Update post status to failed if postId provided
    if (req.body.postId) {
      await Post.findByIdAndUpdate(req.body.postId, {
        status: 'failed',
        'platformStatus.linkedin': 'failed',
        error: error.response?.data?.message || error.message
      });
    }

    // Handle specific LinkedIn API errors
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'LinkedIn authentication failed. Please reconnect your LinkedIn account.'
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        message: 'LinkedIn API access denied. Please check your permissions.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to post to LinkedIn: ' + (error.response?.data?.message || error.message)
    });
  }
};

module.exports = {
  postToTwitterController,
  postToLinkedInController
};
