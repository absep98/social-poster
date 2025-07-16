const express = require('express');
const router = express.Router();
const User = require('../models/User');
const {
  getAuthorizationUrl,
  exchangeCodeForAccessToken,
  postToLinkedIn,
  getUserInfo,  // Add this if you have it in your service
  isTokenValid,
  isTokenExpired
} = require('../services/LinkedInService');
const { protect } = require('../middleware/auth');

// Simple token storage (use database in production)
const tokenStore = new Map();

// Step 1: Redirect to LinkedIn
router.get('/login', (req, res) => {
  try {
    const url = getAuthorizationUrl();
    console.log('🔗 Redirecting to LinkedIn:', url);
    res.redirect(url);
  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate LinkedIn authorization URL',
      error: error.message
    });
  }
});

// Step 2: Callback after auth
router.get('/callback', async (req, res) => {
  console.log('↩️ Callback query:', req.query); 
  
  const { code, state, error, error_description } = req.query;
  
  // Handle OAuth errors first
  if (error) {
    console.error('❌ LinkedIn OAuth Error:', error, error_description);
    
    return res.status(400).json({
      success: false,
      error: error,
      description: error_description,
      message: 'LinkedIn authentication failed',
      troubleshooting: {
        unauthorized_scope_error: 'Check your LinkedIn app settings - some scopes may need approval',
        access_denied: 'User cancelled the authentication',
        invalid_request: 'Check your client ID and redirect URI'
      }
    });
  }
  
  if (!code) {
    return res.status(400).json({
      success: false,
      message: 'Authorization code is missing'
    });
  }

  try {
    // Exchange code for access token
    console.log('🔄 Exchanging code for access token...');
    const tokenData = await exchangeCodeForAccessToken(code);
    console.log('✅ Access token received');

    // Get user info (if available)
    let userInfo = null;
    try {
      if (getUserInfo) {
        userInfo = await getUserInfo(tokenData.accessToken);
        console.log('✅ User info retrieved:', userInfo);
      }
    } catch (userInfoError) {
      console.log('⚠️ Could not retrieve user info:', userInfoError.message);
    }

    // Find or create user and save LinkedIn token
    let user = null;
    if (userInfo && userInfo.email) {
      // Try to find existing user by email
      user = await User.findOne({ email: userInfo.email });
      
      if (!user) {
        // Create new user if not found
        user = await User.create({
          email: userInfo.email,
          linkedinToken: tokenData.accessToken,
          linkedinTokenExpiry: tokenData.expiryDate,
          linkedinPersonUrn: userInfo.fullUrn
        });
        console.log('✅ Created new user with LinkedIn token');
      } else {
        // Update existing user with LinkedIn token
        user.linkedinToken = tokenData.accessToken;
        user.linkedinTokenExpiry = tokenData.expiryDate;
        user.linkedinPersonUrn = userInfo.fullUrn;
        await user.save();
        console.log('✅ Updated existing user with LinkedIn token');
      }
    } else {
      console.log('⚠️ No email found in user info, cannot link to user account');
    }

    // Test posting (optional)
    try {
      await postToLinkedIn('✅ Successfully authenticated and posting via API!', tokenData.accessToken);
      console.log('✅ Test post successful');
    } catch (postError) {
      console.log('⚠️ Test post failed:', postError.message);
    }

    // Return success response
    res.json({
      success: true,
      message: 'LinkedIn authentication successful',
      userId: userInfo?.id || `user_${Date.now()}`,
      user: userInfo,
      token: tokenData.accessToken.substring(0, 10) + '...', // Show partial token for security
      expiresAt: tokenData.expiryDate,
      dbUser: user ? {
        id: user._id,
        email: user.email,
        hasLinkedinToken: !!user.linkedinToken,
        tokenExpiresAt: user.linkedinTokenExpiry
      } : null
    });

  } catch (err) {
    console.error('❌ Authentication failed:', err);
    
    // Handle specific error types
    if (err.response?.status === 400) {
      return res.status(400).json({
        success: false,
        message: 'Invalid authorization code or expired',
        error: err.response.data
      });
    }
    
    if (err.response?.status === 401) {
      return res.status(401).json({
        success: false,
        message: 'Invalid client credentials',
        error: 'Check your LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'LinkedIn authentication failed',
      error: err.message
    });
  }
});

// Get stored tokens (for debugging)
router.get('/tokens', (req, res) => {
  const tokens = Array.from(tokenStore.entries()).map(([userId, data]) => ({
    userId,
    hasToken: !!data.accessToken,
    userName: data.userInfo?.name || 'Unknown',
    createdAt: data.createdAt
  }));

  res.json({
    success: true,
    tokens,
    count: tokens.length
  });
});

// Check LinkedIn token status for authenticated user
router.get('/token-status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || !user.linkedinToken) {
      return res.json({
        success: true,
        hasToken: false,
        needsReauth: true,
        message: 'No LinkedIn token found',
        reAuthUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/auth/linkedin/login`
      });
    }

    // Check expiry date
    const expired = isTokenExpired(user.linkedinTokenExpiry);
    if (expired) {
      return res.json({
        success: true,
        hasToken: true,
        expired: true,
        needsReauth: true,
        message: 'LinkedIn token has expired',
        expiryDate: user.linkedinTokenExpiry,
        reAuthUrl: `${process.env.BASE_URL || 'http://localhost:5001'}/auth/linkedin/login`
      });
    }

    // Check validity with LinkedIn API
    const valid = await isTokenValid(user.linkedinToken);
    
    res.json({
      success: true,
      hasToken: true,
      expired: false,
      valid: valid,
      needsReauth: !valid,
      expiryDate: user.linkedinTokenExpiry,
      message: valid ? 'LinkedIn token is valid and ready to use' : 'LinkedIn token is invalid',
      reAuthUrl: valid ? null : `${process.env.BASE_URL || 'http://localhost:5001'}/auth/linkedin/login`
    });

  } catch (error) {
    console.error('Error checking token status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check token status',
      error: error.message
    });
  }
});

// Test endpoint to check auth URL
router.get('/test-auth', (req, res) => {
  try {
    const authUrl = getAuthorizationUrl();
    res.json({
      success: true,
      authUrl,
      message: 'Visit this URL to test LinkedIn authentication'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;