const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewText: { type: String, required: true, minlength: 3 }, // ← 10 → 3
  rating:     { type: Number, required: true, min: 1, max: 5 },
  sentiment:         { type: String, enum: ['positive','negative','neutral'], default: 'neutral' },
  isFake:            { type: Boolean, default: false },
  fakeReason:        { type: String, default: null },
  trustContribution: { type: Number, default: 5, min: 0, max: 10 },
  aiProcessed:       { type: Boolean, default: false },
}, { timestamps: true });

reviewSchema.index({ userId: 1, providerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);