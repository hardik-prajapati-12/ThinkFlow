// routes/stats.js — Admin dashboard overview statistics
const express  = require('express');
const router   = express.Router();
const Post     = require('../models/Post');
const Comment  = require('../models/Comment');
const User     = require('../models/User');
const Message  = require('../models/Message');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/overview', protect, adminOnly, async (req, res) => {
  try {
    const [
      publishedPosts, draftPosts,
      visibleComments, hiddenComments,
      totalUsers,
      unreadMessages,
      allPublished,
    ] = await Promise.all([
      Post.countDocuments({ status: 'published' }),
      Post.countDocuments({ status: 'draft' }),
      Comment.countDocuments({ isApproved: true }),
      Comment.countDocuments({ isApproved: false }),
      User.countDocuments(),
      Message.countDocuments({ isRead: false }),
      Post.find({ status: 'published' })
        .select('title slug views likes readTime createdAt')
        .sort({ views: -1 }),
    ]);

    const totalViews   = allPublished.reduce((s, p) => s + (p.views || 0), 0);
    const totalLikes   = allPublished.reduce((s, p) => s + (p.likes?.length || 0), 0);
    const avgViews     = publishedPosts > 0 ? Math.round(totalViews / publishedPosts) : 0;
    const avgReadTime  = allPublished.length > 0
      ? Math.round(allPublished.reduce((s, p) => s + (p.readTime || 1), 0) / allPublished.length)
      : 0;

    const topPosts = allPublished.slice(0, 5).map(p => ({
      _id:   p._id,
      title: p.title,
      slug:  p.slug,
      views: p.views,
      likes: p.likes?.length || 0,
    }));

    const recentPosts = await Post.find()
      .populate('author', 'username')
      .populate('category', 'name icon color')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title slug status views createdAt author category');

    const recentComments = await Comment.find()
      .populate('author', 'username')
      .populate('post', 'title slug')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      publishedPosts,
      draftPosts,
      totalViews,
      totalLikes,
      totalUsers,
      visibleComments,
      hiddenComments,
      unreadMessages,
      avgViews,
      avgReadTime,
      topPosts,
      recentPosts,
      recentComments,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;