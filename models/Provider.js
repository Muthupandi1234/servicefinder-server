const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName:{ type: String, required: true },
  category:    { 
    type: String, 
    enum: ['Electrician','Plumber','Carpenter','Painter','AC Repair',
           'Cleaning','Mechanic','Mason','Tutor','Other'],
    required: true 
  },
  description: { type: String },
  phone:       { type: String, required: true },
  address:     { type: String, required: true },
  city:        { type: String, required: true },
  pincode:     { type: String, required: true },
  location: {
    type:        { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  images:      [{ type: String }], // S3 URLs
  isVerified:  { type: Boolean, default: false },
  isActive:    { type: Boolean, default: true },
  trustScore:  { type: Number, default: 50, min: 0, max: 100 },
  totalReviews:{ type: Number, default: 0 },
  avgRating:   { type: Number, default: 0 },
}, { timestamps: true });

// Geo index — location-based search ku
providerSchema.index({ location: '2dsphere' });
providerSchema.index({ city: 1, category: 1 });

module.exports = mongoose.model('Provider', providerSchema);