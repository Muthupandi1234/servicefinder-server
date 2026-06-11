const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (err) {
      return res.status(401).json({ message: 'Token invalid' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'No token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin only' });
};

const providerOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'provider' || req.user.role === 'admin')) return next();
  return res.status(403).json({ message: 'Provider only' });
};

module.exports = { protect, adminOnly, providerOnly };