const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { catchAsync } = require('../utils/errorHandler');

/**
 * @route   GET /api/wallet
 * @desc    Get user wallet details and balance summary
 * @access  Private
 */
router.get('/', protect, catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select('wallet balance pendingBalance totalEarnings currency');

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Aggregate active escrow balance from bookings
  const Booking = require('../models/Booking');
  const activeBookings = await Booking.find({
    client: req.user._id,
    status: { $in: ['confirmed', 'in_progress', 'delivered'] },
    paymentStatus: 'paid'
  });
  const escrowBalance = activeBookings.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  // Incoming earnings for creators
  const creatorBookings = await Booking.find({
    creator: req.user._id,
    status: { $in: ['confirmed', 'in_progress', 'delivered'] },
    paymentStatus: 'paid'
  });
  const incomingEarnings = creatorBookings.reduce((sum, b) => sum + (parseFloat(b.creatorAmount || b.amount) || 0), 0);

  res.json({
    success: true,
    data: {
      wallet: {
        balance: user.balance || 0,
        usdcBalance: user.balance || 0,
        pendingBalance: user.pendingBalance || 0,
        escrowBalance,
        incomingEarnings,
        currency: user.currency || 'USDC'
      }
    }
  });
}));

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get user transaction history
 * @access  Private
 */
router.get('/transactions', protect, catchAsync(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const totalItems = await Transaction.countDocuments({ user: req.user._id });
  const transactions = await Transaction.getUserTransactions(req.user._id, limit, skip);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit) || 1,
        totalItems,
        itemsPerPage: limit
      }
    }
  });
}));

module.exports = router;
