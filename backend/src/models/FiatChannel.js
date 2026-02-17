const mongoose = require('mongoose');

const fiatChannelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    currency: {
        type: String,
        required: true,
        uppercase: true,
        index: true
    },
    // HostFi channel details
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    reference: String,
    customId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ['STATIC', 'DYNAMIC', 'BANK_TRANSFER'],
        default: 'DYNAMIC'
    },
    method: {
        type: String,
        default: 'BANK_TRANSFER'
    },
    // Bank account details
    accountNumber: {
        type: String,
        required: true
    },
    accountName: {
        type: String,
        required: true
    },
    bankName: String,
    bankId: String,
    // Additional details
    countryCode: String,
    assetId: String,
    active: {
        type: Boolean,
        default: true
    },
    // Full HostFi response (for reference)
    hostfiResponse: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Compound index for user + currency (one channel per user per currency)
fiatChannelSchema.index({ userId: 1, currency: 1 }, { unique: true });

module.exports = mongoose.model('FiatChannel', fiatChannelSchema);
