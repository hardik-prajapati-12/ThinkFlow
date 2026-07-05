// middleware/auth.js
const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify JWT token ─────────────────────────────────────────
exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authorized. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user) {
      // Token references a deleted user — tell the frontend to log out
      return res.status(401).json({
        message: 'Session expired. Please log in again.',
        code: 'USER_NOT_FOUND'
      });
    }

    // ✅ FIX: treat undefined/null isActive as active (true)
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account deactivated. Contact admin.', code: 'ACCOUNT_DISABLED' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is invalid or expired.', code: 'TOKEN_INVALID' });
  }
};

// ── Admin only ───────────────────────────────────────────────
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  res.status(403).json({
    message: `Access denied. Admins only. Your role is: ${req.user?.role || 'unknown'}`,
    code: 'INSUFFICIENT_ROLE'
  });
};

// ── Author OR Admin ──────────────────────────────────────────
exports.authorOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'author')) return next();
  res.status(403).json({
    message: `Access denied. Authors and Admins only. Your role is: ${req.user?.role || 'unknown'}`,
    code: 'INSUFFICIENT_ROLE'
  });
};

// ── Ownership helpers ────────────────────────────────────────
exports.canManagePost = (post, user) => {
  return user.role === 'admin' || post.author.toString() === user._id.toString();
};

exports.canManageComment = async (comment, user) => {
  const Post = require('../models/Post');
  if (user.role === 'admin') return true;
  if (comment.author.toString() === user._id.toString()) return true;
  if (user.role === 'author') {
    const post = await Post.findById(comment.post);
    return post && post.author.toString() === user._id.toString();
  }
  return false;
};