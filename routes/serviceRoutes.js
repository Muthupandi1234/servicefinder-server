const express  = require('express');
const router   = express.Router();
const {
  getServices, getServiceById, createService, updateService
} = require('../controllers/serviceController');
const { protect } = require('../middleware/authMiddleware');
const Provider = require('../models/Provider');

// All services
router.get('/', getServices);

// My provider profile
router.get('/my', protect, async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Real stats
router.get('/stats', async (req, res) => {
  try {
    const Review   = require('../models/Review');
    const User     = require('../models/User');
    const [providers, reviews, users] = await Promise.all([
      Provider.countDocuments({ isActive: true }),
      Review.countDocuments(),
      User.countDocuments(),
    ]);
    const fakeReviews = await Review.countDocuments({ isFake: true });
    const fakeRate = reviews > 0 ? Math.round((fakeReviews / reviews) * 100) : 98;

    res.json({ providers, reviews, users, fakeRate });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// City based search — case insensitive
router.get('/by-city', async (req, res) => {
  try {
    const { city } = req.query;
    const providers = await Provider.find({
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      isActive: true
    })
    .populate('userId', 'name')
    .sort({ trustScore: -1 });
    res.json(providers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// All cities with provider count
router.get('/cities', async (req, res) => {
  try {
    const cities = await Provider.aggregate([
      { $match: { isActive: true } },
      { $group: {
        _id: { $toLower: '$city' },
        city: { $first: '$city' },
        count: { $sum: 1 },
        avgTrust: { $avg: '$trustScore' },
        categories: { $addToSet: '$category' }
      }},
      { $sort: { count: -1 } }
    ]);
    res.json(cities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Single provider
router.get('/:id', getServiceById);

// Create provider
router.post('/', protect, createService);

// Update provider
router.put('/:id', protect, updateService);

module.exports = router;