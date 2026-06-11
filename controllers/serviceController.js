const Provider = require('../models/Provider');
const Review   = require('../models/Review');

// @GET /api/services — Search with city + category filter
exports.getServices = async (req, res) => {
  const { city, category, search } = req.query
  let filter = { isActive: true }

  if (city)     filter.city     = { $regex: new RegExp(city, 'i') }  // ← fix
  if (category) filter.category = category
  if (search)   filter.businessName = { $regex: new RegExp(search, 'i') }

  try {
    const providers = await Provider.find(filter)
      .populate('userId', 'name email')
      .sort({ trustScore: -1 })
    res.json(providers)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
};

// @GET /api/services/:id — Single provider details
exports.getServiceById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('userId', 'name email phone');

    if (!provider) return res.status(404).json({ message: 'Provider not found' });

    const reviews = await Review.find({ 
      providerId: req.params.id, 
      isFake: false 
    }).populate('userId', 'name avatar');

    res.json({ provider, reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @POST /api/services — Register new provider
exports.createService = async (req, res) => {
  const { businessName, category, description, phone, address, city, pincode } = req.body;
  try {
    const provider = await Provider.create({
      userId: req.user._id,
      businessName, category, description,
      phone, address, city, pincode,
    });

    // Update user role to provider
    await require('../models/User').findByIdAndUpdate(
      req.user._id, { role: 'provider' }
    );

    res.status(201).json(provider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @PUT /api/services/:id — Update provider
exports.updateService = async (req, res) => {
  try {
    const provider = await Provider.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!provider) return res.status(404).json({ message: 'Not found or unauthorized' });
    res.json(provider);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};