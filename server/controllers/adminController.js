const User = require('../models/User');
const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Verify/Unverify a user
// @route   PUT /api/admin/users/:id/verify
// @access  Private (Admin only)
const verifyUser = async (req, res) => {
  try {
    const { verified } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.verified = verified;
    await user.save();

    res.json({ message: `User ${verified ? 'verified' : 'unverified'} successfully`, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Suspend/Unsuspend a user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all transactions
// @route   GET /api/admin/transactions
// @access  Private (Admin only)
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('client', 'email profile.name')
      .populate('creator', 'email profile.name')
      .populate('booking')
      .sort({ createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get analytics dashboard data
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
const getAnalytics = async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();
    const totalCreators = await User.countDocuments({ role: 'creator' });
    const totalClients = await User.countDocuments({ role: 'client' });
    const verifiedCreators = await User.countDocuments({ role: 'creator', verified: true });

    // Total bookings
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });

    // Total transactions
    const totalTransactions = await Transaction.countDocuments();
    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalPlatformFees: { $sum: '$platformFee' },
          totalCreatorPayouts: { $sum: '$creatorPayout' }
        }
      }
    ]);

    const stats = transactionStats[0] || { totalAmount: 0, totalPlatformFees: 0, totalCreatorPayouts: 0 };

    res.json({
      users: {
        total: totalUsers,
        creators: totalCreators,
        clients: totalClients,
        verifiedCreators
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        pending: pendingBookings
      },
      transactions: {
        total: totalTransactions,
        totalAmount: stats.totalAmount,
        platformRevenue: stats.totalPlatformFees,
        creatorPayouts: stats.totalCreatorPayouts
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private (Admin only)
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('client', 'email profile')
      .populate('creator', 'email profile')
      .populate('transaction')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getAllUsers,
  verifyUser,
  deleteUser,
  getAllTransactions,
  getAnalytics,
  getAllBookings
};
