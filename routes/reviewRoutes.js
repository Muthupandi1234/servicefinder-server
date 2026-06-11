const express = require('express');
const router  = express.Router();
const { addReview, getReviews } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');
const Review = require('../models/Review');

router.post('/',           protect, addReview);
router.get('/my',          protect, async (req, res) => {
  try {
    const reviews = await Review.find({ userId: req.user._id })
      .populate('providerId', 'businessName category')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.get('/:providerId', getReviews);

module.exports = router;