// models/User.js
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String, required: [true, 'Username is required'],
    unique: true, trim: true, minlength: [3, 'Username must be at least 3 characters']
  },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role:     { type: String, enum: ['admin', 'author', 'user'], default: 'user' },
  avatar:   { type: String, default: '' },
  bio:      { type: String, default: '' },
  isActive: { type: Boolean, default: true },

  // ── Password Reset (OTP-based) ─────────────────────────────
  passwordResetOtp:     { type: String, default: null },   // hashed 6-digit OTP
  passwordResetExpires: { type: Date,   default: null },    // 10 min expiry
  passwordResetEmail:   { type: String, default: null },    // email OTP was sent to

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate 6-digit OTP (stores hashed, returns plain)
userSchema.methods.createOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // "123456"
  this.passwordResetOtp     = crypto.createHash('sha256').update(otp).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

// Remove sensitive fields from JSON output
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.passwordResetOtp;
  delete user.passwordResetExpires;
  delete user.passwordResetEmail;
  return user;
};

module.exports = mongoose.model('User', userSchema);