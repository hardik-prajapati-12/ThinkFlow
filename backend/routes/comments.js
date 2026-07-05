// routes/comments.js
const express = require('express');
const router  = express.Router();
const Comment = require('../models/Comment');
const Post    = require('../models/Post');
const { protect, adminOnly, authorOrAdmin, canManageComment } = require('../middleware/auth');

// ── GET /api/comments/manage — Dashboard: all manageable comments ──
// Admin  → ALL comments across the site (with post & author info)
// Author → Only comments on their own posts
router.get('/manage', protect, authorOrAdmin, async (req, res) => {
  try {
    let comments;

    if (req.user.role === 'admin') {
      // Admin: every comment on the platform
      comments = await Comment.find()
        .populate('author', 'username avatar role')
        .populate({ path: 'post', select: 'title slug author', populate: { path: 'author', select: 'username' } })
        .sort({ createdAt: -1 });
    } else {
      // Author: find all posts owned by this author, then get their comments
      const myPosts = await Post.find({ author: req.user._id }).select('_id');
      const postIds = myPosts.map(p => p._id);

      comments = await Comment.find({ post: { $in: postIds } })
        .populate('author', 'username avatar role')
        .populate({ path: 'post', select: 'title slug author', populate: { path: 'author', select: 'username' } })
        .sort({ createdAt: -1 });
    }

    res.json(comments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/comments/manage/stats — Comment stats ──────────
router.get('/manage/stats', protect, authorOrAdmin, async (req, res) => {
  try {
    let baseFilter = {};

    if (req.user.role === 'author') {
      const myPosts = await Post.find({ author: req.user._id }).select('_id');
      baseFilter = { post: { $in: myPosts.map(p => p._id) } };
    }

    const total   = await Comment.countDocuments(baseFilter);
    const visible = await Comment.countDocuments({ ...baseFilter, isApproved: true });
    const hidden  = await Comment.countDocuments({ ...baseFilter, isApproved: false });

    res.json({ total, visible, hidden });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/comments/:postId — All approved comments (public) ──
router.get('/:postId', async (req, res) => {
  try {
    // Prevent this route matching 'manage' or 'manage/stats'
    if (req.params.postId === 'manage') return res.status(400).json({ message: 'Invalid postId.' });

    const comments = await Comment.find({ post: req.params.postId, isApproved: true })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/comments/post/:postId/all ───────────────────────
router.get('/post/:postId/all', protect, authorOrAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found.' });

    if (req.user.role === 'author' && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized.' });
    }

    const comments = await Comment.find({ post: req.params.postId })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/comments ───────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { content, postId } = req.body;
    const comment = await Comment.create({ content, post: postId, author: req.user._id });
    await comment.populate('author', 'username avatar');
    res.status(201).json({ message: 'Comment added!', comment });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── PUT /api/comments/:id/hide — Toggle hide/show ────────────
router.put('/:id/hide', protect, authorOrAdmin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    const allowed = await canManageComment(comment, req.user);
    if (!allowed) return res.status(403).json({ message: 'Not authorized to manage this comment.' });

    comment.isApproved = !comment.isApproved;
    await comment.save();

    res.json({
      message:    comment.isApproved ? 'Comment is now visible.' : 'Comment hidden.',
      isApproved: comment.isApproved
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── DELETE /api/comments/:id ─────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found.' });

    if (comment.author.toString() === req.user._id.toString()) {
      await Comment.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Comment deleted.' });
    }
    if (req.user.role === 'admin') {
      await Comment.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Comment deleted.' });
    }
    if (req.user.role === 'author') {
      const post = await Post.findById(comment.post);
      if (post && post.author.toString() === req.user._id.toString()) {
        await Comment.findByIdAndDelete(req.params.id);
        return res.json({ message: 'Comment deleted.' });
      }
    }
    return res.status(403).json({ message: 'Not authorized.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;