const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  analyzeReview,
  getUserTip,
  getProviderInsight,
  getRecommendations,
  getPriceEstimate,
  getReviewSummary,
  checkFraud,
  aiChat,
} = require('../controllers/aiController');

router.post('/analyze',          protect, analyzeReview);
router.post('/user-tip',         protect, getUserTip);
router.post('/provider-insight', protect, getProviderInsight);
router.post('/recommendations',  protect, getRecommendations);
router.post('/price-estimate',   getPriceEstimate);
router.post('/review-summary',   getReviewSummary);
router.post('/fraud-check',      protect, checkFraud);
router.post('/chat',             aiChat);

module.exports = router;