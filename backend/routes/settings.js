const express = require('express');
const router = express.Router();
const SiteSetting = require('../models/SiteSetting');
const { protect, adminOnly } = require('../middleware/auth');

const DEFAULT_SOCIAL_LINKS = [
  { label: 'Twitter / X', icon: 'X', url: 'https://twitter.com', isActive: true },
  { label: 'LinkedIn', icon: 'in', url: 'https://linkedin.com', isActive: true },
  { label: 'GitHub', icon: 'GH', url: 'https://github.com', isActive: true },
  { label: 'Contact Us', icon: '@', url: '/contact', isActive: true }
];

function isAllowedUrl(url) {
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(url);
}

async function getOrCreateSettings() {
  let settings = await SiteSetting.findOne({ key: 'site' });
  if (!settings) {
    settings = await SiteSetting.create({ key: 'site', socialLinks: DEFAULT_SOCIAL_LINKS });
  }
  return settings;
}

router.get('/social-links', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings.socialLinks);
  } catch (error) {
    res.status(500).json({ message: 'Could not load social links.' });
  }
});

router.put('/social-links', protect, adminOnly, async (req, res) => {
  try {
    const socialLinks = Array.isArray(req.body.socialLinks) ? req.body.socialLinks : [];

    if (socialLinks.length === 0) {
      return res.status(400).json({ message: 'At least one social link is required.' });
    }

    if (socialLinks.length > 10) {
      return res.status(400).json({ message: 'You can manage up to 10 social links.' });
    }

    const cleanedLinks = socialLinks.map(link => ({
      label: String(link.label || '').trim(),
      icon: String(link.icon || '').trim(),
      url: String(link.url || '').trim(),
      isActive: link.isActive !== false
    }));

    const invalidLink = cleanedLinks.find(link =>
      !link.label || !link.icon || (link.url && !isAllowedUrl(link.url))
    );

    if (invalidLink) {
      return res.status(400).json({
        message: 'Each social link needs a label, icon, and valid URL.'
      });
    }

    const settings = await getOrCreateSettings();
    settings.socialLinks = cleanedLinks;
    await settings.save();

    res.json({
      message: 'Social links updated successfully.',
      socialLinks: settings.socialLinks
    });
  } catch (error) {
    res.status(500).json({ message: 'Could not update social links.' });
  }
});

module.exports = router;

