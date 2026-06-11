const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  date:        { type: String, required: true },
  time:        { type: String, required: true },
  description: { type: String, required: true },
  address:     { type: String, required: true },
  phone:       { type: String, required: true },
  status:      { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  rejectReason: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);