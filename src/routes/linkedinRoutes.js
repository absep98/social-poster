const express = require('express');
const router = express.Router();
const {
  getAuthorizationUrl,
  exchangeCodeForAccessToken,
  postToLinkedIn,
} = require('../services/LinkedInService');

// Step 1: Redirect to LinkedIn
router.get('/login', (req, res) => {
  const url = getAuthorizationUrl();
  res.redirect(url);
});

// Step 2: Callback after auth
router.get('/callback', async (req, res) => {
  console.log('↩️ Callback query:', req.query); 
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const token = await exchangeCodeForAccessToken(code);
    console.log('✅ Access token:', token);

    // Optional: Automatically post something
    await postToLinkedIn('✅ Successfully authenticated and posting via API!', token);

    res.send(`Success! Token: ${token}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('LinkedIn authentication failed');
  }
});

module.exports = router;
