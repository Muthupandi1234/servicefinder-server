const gemini   = require('../config/gemini');
const Review   = require('../models/Review');
const Provider = require('../models/Provider');

// ─── Helper ───
const askGemini = async (prompt) => {
  const result = await gemini.generateContent(prompt);
  return result.response.text();
};

// ─── Trust Score Recalculate ───
const recalculateTrustScore = async (providerId) => {
  const reviews = await Review.find({ providerId, isFake: false });
  if (!reviews.length) return;
  const avgRating  = reviews.reduce((s,r) => s + r.rating, 0) / reviews.length;
  const avgTrust   = reviews.reduce((s,r) => s + r.trustContribution, 0) / reviews.length;
  const posRatio   = reviews.filter(r => r.sentiment==='positive').length / reviews.length;
  const trustScore = Math.round((avgRating/5)*40 + (avgTrust/10)*40 + posRatio*20);
  await Provider.findByIdAndUpdate(providerId, {
    trustScore,
    totalReviews: reviews.length,
    avgRating: Math.round(avgRating * 10) / 10,
  });
};

// ─── 1. Fake Review Detection ───
exports.analyzeReview = async (req, res) => {
  const { reviewText, rating, userId, providerId } = req.body;
  const prompt = `Analyze this service review for fake detection and sentiment.
Review: "${reviewText}"
Star Rating: ${rating}/5
Reply ONLY in valid JSON (no extra text, no markdown):
{"sentiment":"positive","isFake":false,"fakeReason":null,"trustContribution":7}`;
  try {
    const text = await askGemini(prompt);
    let aiResult = {sentiment:'neutral',isFake:false,fakeReason:null,trustContribution:5};
    try {
      const clean = text.replace(/```json|```/g,'').trim();
      aiResult = JSON.parse(clean);
    } catch(_){}
    const review = await Review.create({
      userId, providerId, reviewText, rating,
      ...aiResult, aiProcessed:true,
    });
    await recalculateTrustScore(providerId);
    res.status(201).json({success:true, review, aiAnalysis:aiResult});
  } catch(err) {
    res.status(500).json({message:err.message});
  }
};

// ─── 2. User Smart Tip ───
exports.getUserTip = async (req, res) => {
  const { userName } = req.body;
  try {
    const text = await askGemini(
      `Give a short 1-sentence smart tip for a user named ${userName} looking for local services in India. No quotes.`
    );
    res.json({tip: text.trim()});
  } catch(err) {
    res.json({tip:'Always check Trust Score before hiring!'});
  }
};

// ─── 3. Provider AI Insight ───
exports.getProviderInsight = async (req, res) => {
  const {businessName,category,trustScore,avgRating,totalReviews} = req.body;
  try {
    const text = await askGemini(
      `Business advisor. 1-2 sentence insight for: ${businessName}, ${category}, Trust:${trustScore}/100, Rating:${avgRating}/5, Reviews:${totalReviews}. Motivating. No quotes.`
    );
    res.json({insight: text.trim()});
  } catch(err) {
    res.json({insight:'Keep responding to customers promptly!'});
  }
};

// ─── 4. Smart Recommendations ───
exports.getRecommendations = async (req, res) => {
  const {city, category} = req.body;
  try {
    const providers = await Provider.find({
      city: {$regex: new RegExp(city||'','i')},
      isActive:true,
    }).sort({trustScore:-1}).limit(10);

    if (!providers.length) return res.json({recommendations:[], providers:[]});

    const prompt = `You are a service recommendation AI for India.
User is in ${city||'India'}, looking for ${category||'any service'}.
Available providers: ${providers.map(p=>`${p.businessName}(${p.category},trust:${p.trustScore},rating:${p.avgRating})`).join(', ')}
Return top 3 as JSON array only (no markdown):
[{"name":"...","reason":"1 sentence why","matchScore":85,"category":"..."}]`;

    const text = await askGemini(prompt);
    let recs = [];
    try {
      const clean = text.replace(/```json|```/g,'').trim();
      recs = JSON.parse(clean);
    } catch(_){}
    res.json({recommendations:recs, providers});
  } catch(err) {
    res.status(500).json({message:err.message});
  }
};

// ─── 5. Price Estimator ───
exports.getPriceEstimate = async (req, res) => {
  const {category, city, description} = req.body;
  try {
    const prompt = `Pricing expert for home services in India.
Service: ${category}
City: ${city||'Tamil Nadu'}
Description: ${description||'standard service'}
Return JSON only (no markdown):
{"min":500,"max":1500,"currency":"INR","breakdown":[{"item":"Basic service","min":300,"max":500}],"note":"1 tip"}`;
    const text = await askGemini(prompt);
    let estimate = null;
    try {
      const clean = text.replace(/```json|```/g,'').trim();
      estimate = JSON.parse(clean);
    } catch(_){}
    res.json({estimate});
  } catch(err) {
    res.status(500).json({message:err.message});
  }
};

// ─── 6. Review Summary ───
exports.getReviewSummary = async (req, res) => {
  const {providerId} = req.body;
  try {
    const reviews = await Review.find({providerId, isFake:false}).limit(30);
    if (reviews.length < 3) return res.json({summary:null, message:'Not enough reviews'});
    const texts = reviews.map(r=>`"${r.reviewText}"`).join(', ');
    const prompt = `Summarize these reviews in 3 bullet points.
Reviews: ${texts}
Return JSON only (no markdown):
{"points":[{"type":"positive","text":"..."},{"type":"positive","text":"..."},{"type":"concern","text":"..."}],"overallSentiment":"positive"}`;
    const text = await askGemini(prompt);
    let summary = null;
    try {
      const clean = text.replace(/```json|```/g,'').trim();
      summary = JSON.parse(clean);
    } catch(_){}
    res.json({summary, totalReviews:reviews.length});
  } catch(err) {
    res.status(500).json({message:err.message});
  }
};

// ─── 7. Fraud Alert ───
exports.checkFraud = async (req, res) => {
  const {providerId} = req.body;
  try {
    const reviews = await Review.find({providerId})
      .sort({createdAt:-1}).limit(20)
      .populate('userId','name email');
    const alerts = [];
    const userCount = {};
    reviews.forEach(r => {
      const uid = r.userId?._id?.toString();
      if(uid) userCount[uid] = (userCount[uid]||0)+1;
    });
    Object.entries(userCount).forEach(([uid,count]) => {
      if(count > 1) alerts.push({type:'warning',message:`User submitted ${count} reviews`});
    });
    for(let i=0; i<reviews.length-1; i++) {
      const diff = Math.abs(new Date(reviews[i].createdAt)-new Date(reviews[i+1].createdAt));
      if(diff < 5*60*1000) {
        alerts.push({type:'danger',message:'Multiple reviews within 5 minutes!'});
        break;
      }
    }
    const fakeCount = reviews.filter(r=>r.isFake).length;
    if(fakeCount > 2) alerts.push({type:'danger',message:`${fakeCount} AI-detected fake reviews`});
    res.json({alerts, fakeCount, totalChecked:reviews.length});
  } catch(err) {
    res.status(500).json({message:err.message});
  }
};

// ─── 8. AI Chat ───
exports.aiChat = async (req, res) => {
  const {message} = req.body;
  try {
    const providers = await Provider.find({isActive:true})
      .sort({trustScore:-1}).limit(15);
    const providerList = providers.map(p=>
      `${p.businessName}(${p.category},${p.city},trust:${p.trustScore})`
    ).join(', ');
    const prompt = `You are ServiceFinder AI for India.
Available service providers: ${providerList}
User question: ${message}
Answer helpfully in 2-3 sentences. Recommend specific providers when relevant. Be friendly.`;
    const text = await askGemini(prompt);
    res.json({reply: text.trim()});
  } catch(err) {
    res.status(500).json({message:'AI temporarily unavailable'});
  }
};