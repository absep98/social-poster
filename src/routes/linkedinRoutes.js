const express = require('express');
const router = express.Router();
const {
  getAuthorizationUrl,
  exchangeCodeForAccessToken,
  postToLinkedIn,
  getUserInfo  // Add this if you have it in your service
} = require('../services/LinkedInService');

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
    const token = await exchangeCodeForAccessToken(code);
    console.log('✅ Access token received');

    // Get user info (if available)
    let userInfo = null;
    try {
      if (getUserInfo) {
        userInfo = await getUserInfo(token);
        console.log('✅ User info retrieved:', userInfo);
      }
    } catch (userInfoError) {
      console.log('⚠️ Could not retrieve user info:', userInfoError.message);
    }

    // Store token temporarily (use proper storage in production)
    const userId = userInfo?.id || `user_${Date.now()}`;
    tokenStore.set(userId, {
      accessToken: token,
      userInfo: userInfo,
      createdAt: new Date()
    });

    // Test posting (optional)
    try {
      await postToLinkedIn('✅ Successfully authenticated and posting via API!', token);
      console.log('✅ Test post successful');
    } catch (postError) {
      console.log('⚠️ Test post failed:', postError.message);
    }

    // Return success response
    res.json({
      success: true,
      message: 'LinkedIn authentication successful',
      userId: userId,
      user: userInfo,
      token: token.substring(0, 10) + '...' // Show partial token for security
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