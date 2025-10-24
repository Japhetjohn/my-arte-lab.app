const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['creator', 'client'], required: true },
  profile: {
    name: String,
    location: String,
    category: { type: String, enum: ['photography', 'design'] },
    bio: String,
    portfolio: [{ url: String, description: String }],
    rates: [{ name: String, price: Number }],
  },
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }],
  },
  verified: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
