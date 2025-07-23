const UserCredentials = require('../models/UserCredentials');
const User = require('../models/User');

// Get user's platform credentials (without sensitive data)
const getUserCredentials = async (req, res) => {
  try {
    const userId = req.user.id;
    
    let credentials = await UserCredentials.findOne({ userId });
    
    if (!credentials) {
      // Create empty credentials document for new user
      credentials = new UserCredentials({
        userId,
        platforms: {
          linkedin: { enabled: false },
          twitter: { enabled: false }
        }
      });
      await credentials.save();
    }

    // Return only non-sensitive data
    const safeCredentials = {
      platforms: {
        linkedin: {
          enabled: credentials.platforms.linkedin.enabled,
          connected: !!credentials.platforms.linkedin.accessToken,
          profileName: credentials.platforms.linkedin.profileName,
          profileId: credentials.platforms.linkedin.profileId
        },
        twitter: {
          enabled: credentials.platforms.twitter.enabled,
          connected: !!credentials.platforms.twitter.accessToken,
          username: credentials.platforms.twitter.username,
          userId: credentials.platforms.twitter.userId
        }
      }
    };

    res.json({
      success: true,
      credentials: safeCredentials
    });
  } catch (error) {
    console.error('Error fetching user credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching credentials'
    });
  }
};

// Save LinkedIn credentials
const saveLinkedInCredentials = async (req, res) => {
  try {
    const userId = req.user.id;
    const { clientId, clientSecret, accessToken, refreshToken, expiresAt, profileId, profileName } = req.body;

    if (!clientId) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn Client ID is required'
      });
    }

    let credentials = await UserCredentials.findOne({ userId });
    
    if (!credentials) {
      credentials = new UserCredentials({ userId, platforms: { linkedin: {}, twitter: {} } });
    }

    // Update LinkedIn credentials
    credentials.platforms.linkedin = {
      enabled: true,
      clientId,
      clientSecret: clientSecret || '',
      accessToken: accessToken || '',
      refreshToken: refreshToken || '',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      profileId: profileId || '',
      profileName: profileName || ''
    };

    await credentials.save();

    res.json({
      success: true,
      message: 'LinkedIn credentials saved successfully',
      platform: 'linkedin'
    });
  } catch (error) {
    console.error('Error saving LinkedIn credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving LinkedIn credentials'
    });
  }
};

// Save Twitter credentials  
const saveTwitterCredentials = async (req, res) => {
  try {
    const userId = req.user.id;
    const { apiKey, apiSecret, accessToken, accessSecret, username, twitterUserId } = req.body;

    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
      return res.status(400).json({
        success: false,
        message: 'All Twitter API credentials are required (API Key, API Secret, Access Token, Access Secret)'
      });
    }

    let credentials = await UserCredentials.findOne({ userId });
    
    if (!credentials) {
      credentials = new UserCredentials({ userId, platforms: { linkedin: {}, twitter: {} } });
    }

    // Update Twitter credentials
    credentials.platforms.twitter = {
      enabled: true,
      apiKey,
      apiSecret,
      accessToken,
      accessSecret,
      username: username || '',
      userId: twitterUserId || ''
    };

    await credentials.save();

    res.json({
      success: true,
      message: 'Twitter credentials saved successfully',
      platform: 'twitter'
    });
  } catch (error) {
    console.error('Error saving Twitter credentials:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving Twitter credentials'
    });
  }
};

// Disable a platform
const disablePlatform = async (req, res) => {
  try {
    const userId = req.user.id;
    const { platform } = req.params;

    if (!['linkedin', 'twitter'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform'
      });
    }

    const credentials = await UserCredentials.findOne({ userId });
    
    if (credentials) {
      credentials.platforms[platform].enabled = false;
      // Optionally clear credentials
      if (platform === 'linkedin') {
        credentials.platforms.linkedin.accessToken = '';
        credentials.platforms.linkedin.refreshToken = '';
      } else if (platform === 'twitter') {
        credentials.platforms.twitter.accessToken = '';
        credentials.platforms.twitter.accessSecret = '';
      }
      
      await credentials.save();
    }

    res.json({
      success: true,
      message: `${platform} disabled successfully`
    });
  } catch (error) {
    console.error('Error disabling platform:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling platform'
    });
  }
};

module.exports = {
  getUserCredentials,
  saveLinkedInCredentials,
  saveTwitterCredentials,
  disablePlatform
};
