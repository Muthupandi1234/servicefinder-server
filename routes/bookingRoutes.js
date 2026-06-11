const express  = require('express');
const router   = express.Router();
const Booking  = require('../models/Booking');
const Provider = require('../models/Provider');
const { protect } = require('../middleware/authMiddleware');

// User — Book a service
router.post('/', protect, async (req, res) => {
  try {
    const { providerId, date, time, description, address, phone } = req.body;

    const booking = await Booking.create({
      userId: req.user._id,
      providerId, date, time,
      description, address, phone,
    });

    const populated = await Booking.findById(booking._id)
      .populate('providerId', 'businessName category city phone')
      .populate('userId', 'name email phone');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// User — My bookings
router.get('/my', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .populate('providerId', 'businessName category city phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Provider — Get my bookings
router.get('/provider', protect, async (req, res) => {
  try {
    const provider = await Provider.findOne({ userId: req.user._id });
    if (!provider) return res.json([]);

    const bookings = await Booking.find({ providerId: provider._id })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Provider — Update booking status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, rejectReason } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status, rejectReason: rejectReason || '' },
      { new: true }
    ).populate('userId', 'name email phone')
     .populate('providerId', 'businessName category');

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;