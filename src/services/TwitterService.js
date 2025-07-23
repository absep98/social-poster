const { TwitterApi } = require('twitter-api-v2');

const postToTwitter = async (text, credentials) => {
  try {
    // Validate credentials
    if (!credentials.apiKey || !credentials.apiSecret || !credentials.accessToken || !credentials.accessSecret) {
      throw new Error('Missing Twitter API credentials');
    }

    const client = new TwitterApi({
      appKey: credentials.apiKey,
      appSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessSecret: credentials.accessSecret,
    });

    console.log('Posting tweet with text:', text);
    console.log('Using user-provided credentials');
    
    const response = await client.v2.tweet(text);
    console.log('Tweet posted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Twitter post failed:', error.data || error.message);
    console.error('Full Error:', JSON.stringify(error, null, 2));
    throw error;
  }
};

module.exports = { postToTwitter };