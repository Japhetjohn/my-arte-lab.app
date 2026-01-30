const mongoose = require('mongoose');
const { WEBHOOK_REPLAY_PROTECTION } = require('../utils/constants');

const webhookEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  provider: {
    type: String,
    required: true,
    enum: ['hostfi', 'other']
  },

  eventType: {
    type: String,
    required: true
  },

  processed: {
    type: Boolean,
    default: false,
    index: true
  },

  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  signature: {
    type: String,
    required: true
  },

  processedAt: {
    type: Date
  },

  processingError: {
    type: String
  },

  retryCount: {
    type: Number,
    default: 0
  },

  createdAt: {
    type: Date,
    default: Date.now,
    expires: WEBHOOK_REPLAY_PROTECTION.TTL_DAYS * 24 * 60 * 60,
    index: true
  }
}, {
  timestamps: true
});

webhookEventSchema.index({ eventId: 1, provider: 1 });
webhookEventSchema.index({ processed: 1, createdAt: -1 });
webhookEventSchema.index({ provider: 1, eventType: 1 });

webhookEventSchema.statics.isProcessed = async function(eventId, provider) {
  const event = await this.findOne({ eventId, provider });
  return event ? event.processed : false;
};

webhookEventSchema.statics.markProcessed = async function(eventId, provider, error = null) {
  return await this.findOneAndUpdate(
    { eventId, provider },
    {
      processed: !error,
      processedAt: new Date(),
      processingError: error
    },
    { new: true }
  );
};

webhookEventSchema.statics.recordWebhook = async function(data) {
  try {
    return await this.create({
      eventId: data.eventId,
      provider: data.provider,
      eventType: data.eventType,
      payload: data.payload,
      signature: data.signature,
      processed: false
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error('Duplicate webhook event detected');
    }
    throw error;
  }
};

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
