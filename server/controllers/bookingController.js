const Booking = require('../models/Booking');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private (Client only)
const createBooking = async (req, res) => {
  try {
    const { creatorId, package, customBrief } = req.body;

    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can create bookings' });
    }

    // Check if creator exists
    const creator = await User.findById(creatorId);
    if (!creator || creator.role !== 'creator') {
      return res.status(404).json({ message: 'Creator not found' });
    }

    // Create booking
    const booking = await Booking.create({
      client: req.user._id,
      creator: creatorId,
      package,
      customBrief,
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Create transaction (mock escrow)
    const transaction = await Transaction.create({
      booking: booking._id,
      client: req.user._id,
      creator: creatorId,
      amount: package.price,
      status: 'escrowed',
      escrowedAt: new Date(),
      paymentDetails: {
        mockTransactionId: `MOCK_${Date.now()}`,
        mockWalletAddress: `WALLET_${Math.random().toString(36).substr(2, 9)}`
      }
    });

    // Update booking with transaction
    booking.transaction = transaction._id;
    booking.paymentStatus = 'escrowed';
    await booking.save();

    // Populate and return
    const populatedBooking = await Booking.findById(booking._id)
      .populate('client', 'email profile')
      .populate('creator', 'email profile rating')
      .populate('transaction');

    res.status(201).json(populatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's bookings
// @route   GET /api/bookings
// @access  Private
const getMyBookings = async (req, res) => {
  try {
    const query = req.user.role === 'creator'
      ? { creator: req.user._id }
      : { client: req.user._id };

    const bookings = await Booking.find(query)
      .populate('client', 'email profile')
      .populate('creator', 'email profile rating')
      .populate('transaction')
      .populate('review')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('client', 'email profile')
      .populate('creator', 'email profile rating')
      .populate('transaction')
      .populate('review');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user has access to this booking
    if (booking.client._id.toString() !== req.user._id.toString() &&
        booking.creator._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
const updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify user has permission to update
    const isCreator = booking.creator.toString() === req.user._id.toString();
    const isClient = booking.client.toString() === req.user._id.toString();

    if (!isCreator && !isClient) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Only creator can accept or mark as delivered
    if (['accepted', 'in_progress', 'delivered'].includes(status) && !isCreator) {
      return res.status(403).json({ message: 'Only creator can update to this status' });
    }

    booking.status = status;
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('client', 'email profile')
      .populate('creator', 'email profile rating')
      .populate('transaction');

    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark booking as completed and release payment
// @route   PUT /api/bookings/:id/complete
// @access  Private (Client only)
const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('transaction');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only client can mark as completed
    if (booking.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the client can complete the booking' });
    }

    if (booking.status !== 'delivered') {
      return res.status(400).json({ message: 'Booking must be delivered before completion' });
    }

    // Update booking
    booking.status = 'completed';
    booking.paymentStatus = 'released';
    await booking.save();

    // Release payment to creator (mock)
    const transaction = await Transaction.findById(booking.transaction._id);
    transaction.status = 'completed';
    transaction.releasedAt = new Date();
    await transaction.save();

    // Update creator's wallet
    const creator = await User.findById(booking.creator);
    creator.wallet.balance += transaction.creatorPayout;
    creator.wallet.transactions.push(transaction._id);
    await creator.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('client', 'email profile')
      .populate('creator', 'email profile rating')
      .populate('transaction');

    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add deliverables to booking
// @route   POST /api/bookings/:id/deliverables
// @access  Private (Creator only)
const addDeliverables = async (req, res) => {
  try {
    const { deliverables } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only creator can add deliverables
    if (booking.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the creator can add deliverables' });
    }

    booking.deliverables = deliverables;
    booking.status = 'delivered';
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('client', 'email profile')
      .populate('creator', 'email profile rating')
      .populate('transaction');

    res.json(updatedBooking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  completeBooking,
  addDeliverables
};
