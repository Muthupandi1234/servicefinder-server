const express  = require('express')
const router   = express.Router()
const Provider = require('../models/Provider')
const Review   = require('../models/Review')
const User     = require('../models/User')
const { protect, adminOnly } = require('../middleware/authMiddleware')

// Stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  const [users, providers, reviews, fakeReviews] = await Promise.all([
    User.countDocuments(),
    Provider.countDocuments(),
    Review.countDocuments(),
    Review.countDocuments({ isFake: true }),
  ])
  res.json({ users, providers, reviews, fakeReviews })
})

// All providers
router.get('/providers', protect, adminOnly, async (req, res) => {
  const providers = await Provider.find().sort({ createdAt: -1 })
  res.json(providers)
})

// Verify / Reject
router.put('/provider/:id', protect, adminOnly, async (req, res) => {
  const { action } = req.body
  await Provider.findByIdAndUpdate(req.params.id, {
    isVerified: action === 'verify',
    isActive:   action === 'verify',
  })
  res.json({ success: true })
})

module.exports = router