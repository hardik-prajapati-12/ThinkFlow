const mongoose = require('mongoose');

const socialLinkSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Social link label is required'],
    trim: true,
    maxlength: 40
  },
  icon: {
    type: String,
    required: [true, 'Social link icon is required'],
    trim: true,
    maxlength: 50
  },
  url: {
    type: String,
    trim: true,
    maxlength: 300
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const siteSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    unique: true,
    default: 'site'
  },
  socialLinks: {
    type: [socialLinkSchema],
    default: [
      { label: 'Twitter / X', icon: 'X', url: 'https://twitter.com', isActive: true },
      { label: 'LinkedIn', icon: 'in', url: 'https://linkedin.com', isActive: true },
      { label: 'GitHub', icon: 'GH', url: 'https://github.com', isActive: true },
      { label: 'Contact Us', icon: '@', url: '/contact', isActive: true }
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteSetting', siteSettingSchema);
