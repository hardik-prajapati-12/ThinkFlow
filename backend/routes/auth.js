// routes/auth.js
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ── Multer: Avatar Upload ────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `avatar-${req.user._id}-${Date.now()}${ext}`);
  }
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed.'));
  }
});

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(400).json({ message: 'User with this email or username already exists.' });
    const user = await User.create({ username, email, password });
    res.status(201).json({ message: 'Registration successful!', token: generateToken(user._id), user });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Please provide email and password.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });

    if (user.isActive === false) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact admin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password.' });

    res.json({ message: 'Login successful!', token: generateToken(user._id), user: user.toJSON() });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', protect, (req, res) => res.json({ user: req.user }));

// ── PUT /api/auth/profile — Update profile info ─────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { username, bio } = req.body;
    const updates = {};

    if (username && username.trim().length >= 3) {
      const existing = await User.findOne({ username: username.trim(), _id: { $ne: req.user._id } });
      if (existing) return res.status(400).json({ message: 'Username is already taken.' });
      updates.username = username.trim();
    }
    if (bio !== undefined) updates.bio = bio.trim();

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ message: 'Profile updated successfully!', user });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── POST /api/auth/avatar — Upload / change avatar ──────────
router.post('/avatar', protect, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided.' });

    // Delete the old avatar file if it was a local upload
    const existing = await User.findById(req.user._id);
    if (existing && existing.avatar && !existing.avatar.startsWith('http')) {
      const oldPath = path.join(__dirname, '..', existing.avatar.replace(/^\//, ''));
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch (_) { /* ignore */ }
      }
    }

    // Store path relative to server root (e.g. /uploads/avatars/avatar-xxx.jpg)
    const avatarPath = '/uploads/avatars/' + req.file.filename;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarPath },
      { new: true }
    );

    res.json({ message: 'Profile photo updated successfully!', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/auth/avatar — Remove avatar ──────────────────
router.delete('/avatar', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Delete local file if it exists
    if (user.avatar && !user.avatar.startsWith('http')) {
      const filePath = path.join(__dirname, '..', user.avatar.replace(/^\//, ''));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) { /* ignore */ }
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: '' },
      { new: true }
    );

    res.json({ message: 'Profile photo removed.', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/auth/change-password ────────────────────────────
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully!' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/auth/authors — Public: admins & authors ─────────
router.get('/authors', async (req, res) => {
  try {
    const authors = await User.find(
      { role: { $in: ['admin', 'author'] }, isActive: { $ne: false } },
      'username bio avatar role createdAt'
    ).sort({ role: 1, createdAt: 1 });
    res.json(authors);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─────────────────────────────────────────────────────────────
//  ADMIN — USER MANAGEMENT
// ─────────────────────────────────────────────────────────────

// ── GET /api/auth/users ──────────────────────────────────────
router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/auth/users/:id/role ─────────────────────────────
router.put('/users/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'author', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin, author, or user.' });
    }
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot change your own role.' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: `Role updated to ${role}.`, user });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── PUT /api/auth/users/:id/status ───────────────────────────
router.put('/users/:id/status', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot deactivate yourself.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    user.isActive = user.isActive === false ? true : false;
    await user.save();
    res.json({ message: user.isActive ? 'User activated.' : 'User deactivated.', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/auth/users/:id ───────────────────────────────
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete yourself.' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/auth/forgot-password ───────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Please provide your email address.' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.json({ message: 'If that email is registered, an OTP has been sent.' });
    }

    const otp = user.createOTP();
    user.passwordResetEmail = user.email;
    await user.save({ validateBeforeSave: false });

    try {
      const { sendOTPEmail } = require('../config/mailer');
      await sendOTPEmail({ to: user.email, toName: user.username, otp });
    } catch (mailErr) {
      user.passwordResetOtp     = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetEmail   = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('OTP email failed:', mailErr.message);
      return res.status(500).json({
        message: 'Could not send OTP email. Check EMAIL_USER and EMAIL_PASS in your .env file.',
        code: 'EMAIL_FAILED'
      });
    }

    res.json({ message: 'OTP sent to your email address.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/verify-otp ────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required.' });

    const crypto    = require('crypto');
    const hashedOtp = crypto.createHash('sha256').update(otp.trim()).digest('hex');

    const user = await User.findOne({
      email:                email.toLowerCase().trim(),
      passwordResetOtp:     hashedOtp,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired OTP. Please request a new one.',
        code: 'OTP_INVALID'
      });
    }

    const approvalToken = require('crypto').randomBytes(24).toString('hex');
    user.passwordResetOtp = require('crypto').createHash('sha256').update('APPROVED:' + approvalToken).digest('hex');
    await user.save({ validateBeforeSave: false });

    res.json({ message: 'OTP verified!', approvalToken });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/reset-password ────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, approvalToken, password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const crypto      = require('crypto');
    const hashedToken = crypto.createHash('sha256').update('APPROVED:' + approvalToken).digest('hex');

    const user = await User.findOne({
      email:                email.toLowerCase().trim(),
      passwordResetOtp:     hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        message: 'Session expired. Please start over.',
        code: 'TOKEN_INVALID'
      });
    }

    user.password             = password;
    user.passwordResetOtp     = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetEmail   = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully! You can now sign in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;