const axios = require('axios');
require('dotenv').config();

const postToLinkedIn = async (text) => {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  try {
    // Get user ID
    const me = await axios.get('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const urn = me.data.id;

    // Share text update
    const response = await axios.post(
      'https://api.linkedin.com/v2/ugcPosts',
      {
        author: `urn:li:person:${urn}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (err) {
    console.error("LinkedIn post failed:", err.response?.data || err.message);
    throw err;
  }
};

module.exports = { postToLinkedIn };
