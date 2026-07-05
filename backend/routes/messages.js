// routes/messages.js
const express     = require('express');
const router      = express.Router();
const Message     = require('../models/Message');
const { protect, adminOnly } = require('../middleware/auth');
const { sendReply }          = require('../config/mailer');

// ── POST /api/messages — Submit contact message (public) ─────
router.post('/', async (req, res) => {
  try {
    const { name, email, topic, message } = req.body;
    if (!name || !email || !topic || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (message.length < 10) {
      return res.status(400).json({ message: 'Message must be at least 10 characters.' });
    }
    const msg = await Message.create({ name, email, topic, message });
    res.status(201).json({ message: 'Message sent successfully!', id: msg._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/messages/:id/reply — Send reply email (admin) ──
router.post('/:id/reply', protect, adminOnly, async (req, res) => {
  try {
    const { subject, body } = req.body;

    if (!body || body.trim().length < 5) {
      return res.status(400).json({ message: 'Reply body is required (min 5 characters).' });
    }

    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });

    // Send via centralised mailer (handles TLS + auth)
    await sendReply({
      to:            msg.email,
      toName:        msg.name,
      subject:       subject || `Re: Your message to BlogSite`,
      body:          body.trim(),
      originalMsg:   msg.message,
      originalTopic: msg.topic,
    });

    // Mark as read and record reply timestamp
    msg.isRead    = true;
    msg.repliedAt = new Date();
    await msg.save();

    res.json({ message: `Reply sent to ${msg.email} successfully!` });
  } catch (err) {
    // Differentiate between config errors and runtime errors
    if (err.code === 'EAUTH' || err.responseCode === 535) {
      return res.status(500).json({
        message: 'Email authentication failed. Check EMAIL_USER and EMAIL_PASS in your .env file.',
        code: 'EMAIL_AUTH_FAILED'
      });
    }
    if (err.code === 'ECONNECTION' || err.code === 'ESOCKET') {
      return res.status(500).json({
        message: 'Could not connect to email server. Check EMAIL_HOST and EMAIL_PORT.',
        code: 'EMAIL_CONNECTION_FAILED'
      });
    }
    res.status(500).json({ message: `Failed to send email: ${err.message}` });
  }
});

// ── GET /api/messages — All messages (admin) ─────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const filter   = req.query.unread === 'true' ? { isRead: false } : {};
    const messages = await Message.find(filter).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/messages/stats ───────────────────────────────────
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const total   = await Message.countDocuments();
    const unread  = await Message.countDocuments({ isRead: false });
    const starred = await Message.countDocuments({ isStarred: true });
    res.json({ total, unread, starred });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/messages/:id/read — Toggle read ─────────────────
router.put('/:id/read', protect, adminOnly, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    msg.isRead = !msg.isRead;
    await msg.save();
    res.json({ message: msg.isRead ? 'Marked as read.' : 'Marked as unread.', isRead: msg.isRead });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── PUT /api/messages/:id/star — Toggle star ─────────────────
router.put('/:id/star', protect, adminOnly, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    msg.isStarred = !msg.isStarred;
    await msg.save();
    res.json({ message: msg.isStarred ? 'Starred.' : 'Unstarred.', isStarred: msg.isStarred });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/messages/:id ──────────────────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    res.json({ message: 'Message deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/messages — Delete all read messages ──────────
router.delete('/', protect, adminOnly, async (req, res) => {
  try {
    const result = await Message.deleteMany({ isRead: true });
    res.json({ message: `${result.deletedCount} read messages deleted.` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;