const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();

const {
  TWITTER_API_KEY,
  TWITTER_API_SECRET,
  TWITTER_ACCESS_TOKEN,
  TWITTER_ACCESS_SECRET,
} = process.env;

// Validate credentials
if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
  throw new Error('Missing Twitter API credentials in .env file');
}

const client = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_SECRET,
});

const postToTwitter = async (text) => {
  try {
    console.log('Posting tweet with text:', text);
    console.log('Credentials:', {
      appKey: TWITTER_API_KEY,
      appSecret: '[REDACTED]',
      accessToken: TWITTER_ACCESS_TOKEN,
      accessSecret: '[REDACTED]',
    });
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