const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '30d' });
};

// Register new user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please add all fields (name, email, password)' 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create user (password will be hashed automatically by pre-save middleware)
    const user = await User.create({ name, email, password });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        hasTwitterToken: !!user.twitterToken,
        hasLinkedinToken: !!user.linkedinToken,
      },
      token
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Check for user and include password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        hasTwitterToken: !!user.twitterToken,
        hasLinkedinToken: !!user.linkedinToken,
      },
      token
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Legacy authenticate user (for backward compatibility)
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
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        hasTwitterToken: !!user.twitterToken,
        hasLinkedinToken: !!user.linkedinToken,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
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
        name: user.name,
        email: user.email,
        hasTwitterToken: !!user.twitterToken,
        hasLinkedinToken: !!user.linkedinToken,
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  authenticateUser, // Keep for backward compatibility
  getUserProfile,
  updateUserTokens
};
