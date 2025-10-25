const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  package: {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: String
  },
  customBrief: String,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'escrowed', 'released', 'refunded'],
    default: 'pending'
  },
  deliveryDate: Date,
  deliverables: [{
    url: String,
    description: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  },
  review: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
