// routes/posts.js
const express  = require('express');
const router   = express.Router();
const Post     = require('../models/Post');
const { protect, adminOnly, authorOrAdmin, canManagePost } = require('../middleware/auth');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const mongoose = require('mongoose');

// ── Multer config ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });


// ══════════════════════════════════════════════════════════════
//  HELPER: buildStrictSearchQuery
//
//  Priority order — first match wins:
//    1. Author username  → ONLY posts by that author
//    2. Tag             → ONLY posts that have that tag      ✅ MOVED UP
//    3. Category name   → ONLY posts in that category       ✅ MOVED DOWN
//    4. Title/excerpt   → fallback text search
//
//  WHY: "technology" matched the "Technology" category (old #2)
//  before it could match the #technology tag (old #3).
//  Posts tagged #technology but in a different category were
//  being missed. Tags are more specific than category names,
//  so they are checked first.
// ══════════════════════════════════════════════════════════════
async function buildStrictSearchQuery(search) {
  const regex = new RegExp(search, 'i');

  // 1 ── Author username match
  const User = require('../models/User');
  const matchedAuthors = await User.find({ username: regex }).select('_id');
  if (matchedAuthors.length > 0) {
    return {
      matchType: 'author',
      query: { author: { $in: matchedAuthors.map(u => u._id) } }
    };
  }

  // 2 ── Tag match (partial, case-insensitive) ✅ NOW PRIORITY 2
  //      Returns ALL posts that contain this tag, regardless of category.
  const tagMatch = await Post.findOne({ tags: { $in: [regex] }, status: 'published' });
  if (tagMatch) {
    return {
      matchType: 'tag',
      query: { tags: { $in: [regex] } }
    };
  }

  // 3 ── Category name match ✅ NOW PRIORITY 3
  //      Only reached if search term is NOT a tag on any published post.
  const Category = require('../models/Category');
  const matchedCats = await Category.find({ name: regex }).select('_id');
  if (matchedCats.length > 0) {
    return {
      matchType: 'category',
      query: { category: { $in: matchedCats.map(c => c._id) } }
    };
  }

  // 4 ── Fallback: title / excerpt
  return {
    matchType: 'title',
    query: {
      $or: [
        { title:   { $regex: regex } },
        { excerpt: { $regex: regex } }
      ]
    }
  };
}


// ══════════════════════════════════════════════════════════════
// GET /api/posts — public posts with smart search
// ══════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = parseInt(req.query.limit) || 6;
    const skip   = (page - 1) * limit;
    const search   = (req.query.search   || '').trim();
    const category = (req.query.category || '').trim();
    const tag      = (req.query.tag      || '').trim();

    // No search → fast simple query
    if (!search) {
      const query = { status: 'published' };
      if (category) query.category = new mongoose.Types.ObjectId(category);
      if (tag)      query.tags = { $in: [new RegExp('^' + tag + '$', 'i')] };

      const total = await Post.countDocuments(query);
      const posts = await Post.find(query)
        .populate('author', 'username avatar')
        .populate('category', 'name color slug icon')
        .sort({ createdAt: -1 })
        .skip(skip).limit(limit);

      return res.json({ posts, totalPages: Math.ceil(total / limit), currentPage: page, total, matchType: '' });
    }

    // With search → strict single-dimension query
    const { matchType, query: searchQuery } = await buildStrictSearchQuery(search);

    let finalQuery;
    if (searchQuery.$or) {
      finalQuery = { status: 'published', $and: [{ $or: searchQuery.$or }] };
      if (category) finalQuery.category = new mongoose.Types.ObjectId(category);
      if (tag)      finalQuery.tags = { $in: [new RegExp('^' + tag + '$', 'i')] };
    } else {
      finalQuery = { status: 'published', ...searchQuery };
      if (category) finalQuery.category = new mongoose.Types.ObjectId(category);
      if (tag)      finalQuery.tags = { $in: [new RegExp('^' + tag + '$', 'i')] };
    }

    const total = await Post.countDocuments(finalQuery);
    const posts = await Post.find(finalQuery)
      .populate('author', 'username avatar')
      .populate('category', 'name color slug icon')
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit);

    res.json({ posts, totalPages: Math.ceil(total / limit), currentPage: page, total, matchType });

  } catch (err) {
    console.error('GET /posts error:', err);
    res.status(500).json({ message: err.message });
  }
});

router.get('/stats', async (req, res) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyReaders = await Post.aggregate([
    { $match: { createdAt: { $gte: startOfMonth } } },
    { $group: { _id: null, total: { $sum: '$views' } } }
  ]);

  res.json({ monthlyReaders: monthlyReaders[0]?.total || 0 });
});
// ── GET /api/posts/featured ───────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .populate('author', 'username avatar')
      .populate('category', 'name color slug icon')
      .sort({ views: -1, createdAt: -1 }).limit(3);
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/admin/all ──────────────────────────────────
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('author', 'username role')
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/my-posts ───────────────────────────────────
router.get('/my-posts', protect, authorOrAdmin, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('author', 'username role avatar')
      .populate('category', 'name color icon')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/posts/:slug ──────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
      .populate('author', 'username avatar bio')
      .populate('category', 'name color slug icon');
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    post.views += 1;
    await post.save();
    res.json(post);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/posts ───────────────────────────────────────────
router.post('/', protect, authorOrAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, content, excerpt, category, tags, status } = req.body;
    const coverImage = req.file ? `/uploads/${req.file.filename}` : '';
    const post = await Post.create({
      title, content, excerpt, category,
      tags: tags ? JSON.parse(tags) : [],
      status: status || 'draft',
      coverImage,
      author: req.user._id
    });
    await post.populate('author', 'username avatar');
    await post.populate('category', 'name color slug icon');
    res.status(201).json({ message: 'Post created!', post });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── PUT /api/posts/:id ────────────────────────────────────────
router.put('/:id', protect, authorOrAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (!canManagePost(post, req.user))
      return res.status(403).json({ message: 'You can only edit your own posts.' });

    const { title, content, excerpt, category, tags, status } = req.body;
    const update = { title, content, excerpt, category, status,
      tags: tags ? JSON.parse(tags) : [] };
    if (req.file) update.coverImage = `/uploads/${req.file.filename}`;
    if (req.body.removeCoverImage === 'true') update.coverImage = '';

    const updated = await Post.findByIdAndUpdate(req.params.id, update,
      { new: true, runValidators: true })
      .populate('author', 'username avatar')
      .populate('category', 'name color slug icon');
    res.json({ message: 'Post updated!', post: updated });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// ── DELETE /api/posts/:id ─────────────────────────────────────
router.delete('/:id', protect, authorOrAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    if (!canManagePost(post, req.user))
      return res.status(403).json({ message: 'You can only delete your own posts.' });
    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST /api/posts/:id/like ──────────────────────────────────
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found.' });
    const idx = post.likes.indexOf(req.user._id);
    if (idx === -1) post.likes.push(req.user._id);
    else post.likes.splice(idx, 1);
    await post.save();
    res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;