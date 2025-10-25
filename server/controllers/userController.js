const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update profile fields
    if (req.body.profile) {
      user.profile = {
        ...user.profile,
        ...req.body.profile
      };
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      profile: updatedUser.profile,
      verified: updatedUser.verified,
      rating: updatedUser.rating,
      totalReviews: updatedUser.totalReviews
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get creator by ID (public profile)
// @route   GET /api/users/creator/:id
// @access  Public
const getCreatorById = async (req, res) => {
  try {
    const creator = await User.findById(req.params.id)
      .select('-password -wallet')
      .populate('reviews');

    if (!creator || creator.role !== 'creator') {
      return res.status(404).json({ message: 'Creator not found' });
    }

    res.json(creator);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all creators (for discovery page)
// @route   GET /api/users/creators
// @access  Public
const getCreators = async (req, res) => {
  try {
    const { location, category, minRating, maxPrice, search } = req.query;

    // Build query
    let query = { role: 'creator', verified: true };

    if (location) {
      query['profile.location'] = { $regex: location, $options: 'i' };
    }

    if (category) {
      query['profile.category'] = category;
    }

    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    if (search) {
      query.$or = [
        { 'profile.name': { $regex: search, $options: 'i' } },
        { 'profile.bio': { $regex: search, $options: 'i' } }
      ];
    }

    const creators = await User.find(query)
      .select('-password -wallet')
      .sort({ rating: -1, totalReviews: -1 });

    res.json(creators);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's wallet info
// @route   GET /api/users/wallet
// @access  Private
const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('wallet')
      .populate('wallet.transactions');

    res.json(user.wallet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Withdraw funds (mock implementation)
// @route   POST /api/users/wallet/withdraw
// @access  Private (Creators only)
const withdrawFunds = async (req, res) => {
  try {
    const { amount, method } = req.body;
    const user = await User.findById(req.user._id);

    if (user.role !== 'creator') {
      return res.status(403).json({ message: 'Only creators can withdraw funds' });
    }

    if (amount > user.wallet.balance) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Mock withdrawal - in production, integrate with real payment gateway
    user.wallet.balance -= amount;
    await user.save();

    res.json({
      message: 'Withdrawal successful',
      amount,
      method,
      newBalance: user.wallet.balance,
      mockWithdrawalId: `WITHDRAW_${Date.now()}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  updateProfile,
  getCreatorById,
  getCreators,
  getWallet,
  withdrawFunds
};
