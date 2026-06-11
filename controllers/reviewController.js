const Review   = require('../models/Review');
const Provider = require('../models/Provider');
const gemini   = require('../config/gemini');

// Trust Score recalculate
const recalculateTrustScore = async (providerId) => {
  const reviews = await Review.find({ providerId, isFake: false });
  if (!reviews.length) return;
  const avgRating  = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const avgTrust   = reviews.reduce((s, r) => s + r.trustContribution, 0) / reviews.length;
  const posRatio   = reviews.filter(r => r.sentiment === 'positive').length / reviews.length;
  const trustScore = Math.round((avgRating/5)*40 + (avgTrust/10)*40 + posRatio*20);
  await Provider.findByIdAndUpdate(providerId, {
    trustScore,
    totalReviews: reviews.length,
    avgRating: Math.round(avgRating * 10) / 10,
  });
};

// @POST /api/reviews
exports.addReview = async (req, res) => {
  const { providerId, reviewText, rating } = req.body;
  try {
    // Duplicate check
    const exists = await Review.findOne({ userId: req.user._id, providerId });
    if (exists) return res.status(400).json({ message: 'Already reviewed this provider' });

    // Gemini AI Analysis
    const prompt = `Analyze this service review for fake detection and sentiment.
Review: "${reviewText}"
Star Rating: ${rating}/5
Reply ONLY in valid JSON (no markdown, no extra text):
{"sentiment":"positive","isFake":false,"fakeReason":null,"trustContribution":7}`;

    let aiResult = {
      sentiment:'neutral', isFake:false,
      fakeReason:null, trustContribution:5
    };

    try {
      const result = await gemini.generateContent(prompt);
      const text   = result.response.text();
      const clean  = text.replace(/```json|```/g,'').trim();
      aiResult = JSON.parse(clean);
    } catch(_) {
      console.log('AI parse error — using defaults');
    }

    const review = await Review.create({
      userId:     req.user._id,
      providerId,
      reviewText,
      rating,
      ...aiResult,
      aiProcessed: true,
    });

    await recalculateTrustScore(providerId);

    res.status(201).json({ success:true, review, aiAnalysis:aiResult });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
};

// @GET /api/reviews/:providerId
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      providerId: req.params.providerId,
      isFake: false,
    }).populate('userId', 'name avatar').sort({ createdAt: -1 });
    res.json(reviews);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
};