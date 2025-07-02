const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: { type: String, required: true },
  platforms: [String], // e.g., ["twitter", "linkedin"]
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledFor: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'posted', 'failed'],
    default: 'pending'
  },
  platformStatus: {
    twitter: { type: String, enum: ['success', 'failed', 'skipped'] },
    linkedin: { type: String, enum: ['success', 'failed', 'skipped'] }
  }
}, { timestamps: true });

module.exports = mongoose.model('socialPost', postSchema);
