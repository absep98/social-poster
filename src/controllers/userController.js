const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Register or login user
const authenticateUser = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find existing user or create new one
    let user = await User.findOne({ email });
    
    if (!user) {
      user = await User.create({ email });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        hasTwitterToken: !!user.twitterToken,
        hasLinkedinToken: !!user.linkedinToken,
      },
      token
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        hasTwitterToken: !!user.twitterToken,
        hasLinkedinToken: !!user.linkedinToken,
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user tokens
const updateUserTokens = async (req, res) => {
  try {
    const { platform, token } = req.body;
    const userId = req.user.id;

    const updateField = platform === 'twitter' ? 'twitterToken' : 'linkedinToken';
    
    const user = await User.findByIdAndUpdate(
      userId,
      { [updateField]: token },
      { new: true }
    ).select('-twitterToken -linkedinToken');

    res.json({
      success: true,
      message: `${platform} token updated successfully`,
      user: {
        id: user._id,
        email: user.email,
        hasTwitterToken: !!user.twitterToken,
        hasLinkedinToken: !!user.linkedinToken,
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  authenticateUser,
  getUserProfile,
  updateUserTokens
};
