const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  twitterToken: { type: String },
  linkedinToken: { type: String },
  linkedinTokenExpiry: { type: Date },
  linkedinPersonUrn: { type: String }, // Store the person URN for faster posting
}, { timestamps: true });

module.exports = mongoose.model('socialUser', userSchema);
