const mongoose = require('mongoose');
const crypto = require('crypto');

const userCredentialsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true // One credential document per user
  },
  platforms: {
    linkedin: {
      enabled: { type: Boolean, default: false },
      accessToken: { type: String },
      refreshToken: { type: String },
      expiresAt: { type: Date },
      // For LinkedIn OAuth flow
      clientId: { type: String },
      clientSecret: { type: String },
      // User profile info
      profileId: { type: String },
      profileName: { type: String }
    },
    twitter: {
      enabled: { type: Boolean, default: false },
      // For Twitter API v2
      apiKey: { type: String },
      apiSecret: { type: String },
      accessToken: { type: String },
      accessSecret: { type: String },
      // User profile info
      username: { type: String },
      userId: { type: String }
    }
  }
}, {
  timestamps: true
});

// Encrypt sensitive fields before saving
userCredentialsSchema.pre('save', function(next) {
  if (this.isModified('platforms')) {
    // Simple encryption for demo - in production use proper encryption
    const encryptText = (text) => {
      if (!text) return text;
      const cipher = crypto.createCipher('aes192', process.env.JWT_SECRET || 'default-secret');
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    };

    // Encrypt LinkedIn credentials
    if (this.platforms.linkedin.accessToken) {
      this.platforms.linkedin.accessToken = encryptText(this.platforms.linkedin.accessToken);
    }
    if (this.platforms.linkedin.refreshToken) {
      this.platforms.linkedin.refreshToken = encryptText(this.platforms.linkedin.refreshToken);
    }
    if (this.platforms.linkedin.clientSecret) {
      this.platforms.linkedin.clientSecret = encryptText(this.platforms.linkedin.clientSecret);
    }

    // Encrypt Twitter credentials
    if (this.platforms.twitter.apiSecret) {
      this.platforms.twitter.apiSecret = encryptText(this.platforms.twitter.apiSecret);
    }
    if (this.platforms.twitter.accessToken) {
      this.platforms.twitter.accessToken = encryptText(this.platforms.twitter.accessToken);
    }
    if (this.platforms.twitter.accessSecret) {
      this.platforms.twitter.accessSecret = encryptText(this.platforms.twitter.accessSecret);
    }
  }
  next();
});

// Method to decrypt credentials when needed
userCredentialsSchema.methods.getDecryptedCredentials = function() {
  const decryptText = (text) => {
    if (!text) return text;
    try {
      const decipher = crypto.createDecipher('aes192', process.env.JWT_SECRET || 'default-secret');
      let decrypted = decipher.update(text, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  };

  return {
    linkedin: {
      ...this.platforms.linkedin.toObject(),
      accessToken: decryptText(this.platforms.linkedin.accessToken),
      refreshToken: decryptText(this.platforms.linkedin.refreshToken),
      clientSecret: decryptText(this.platforms.linkedin.clientSecret)
    },
    twitter: {
      ...this.platforms.twitter.toObject(),
      apiSecret: decryptText(this.platforms.twitter.apiSecret),
      accessToken: decryptText(this.platforms.twitter.accessToken),
      accessSecret: decryptText(this.platforms.twitter.accessSecret)
    }
  };
};

module.exports = mongoose.model('UserCredentials', userCredentialsSchema);
