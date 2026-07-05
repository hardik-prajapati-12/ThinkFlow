// backend/seed.js — Run once to populate sample data
// Usage: node seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const Post     = require('./models/Post');
const Category = require('./models/Category');
const Comment  = require('./models/Comment');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/blogdb';

const categories = [
  { name: 'Technology', description: 'The latest in tech, coding, and AI', icon: '💡', color: '#3B8BD4' },
  { name: 'Design',     description: 'UI/UX, branding, and creativity',     icon: '🎨', color: '#9B59B6' },
  { name: 'Lifestyle',  description: 'Wellness, habits, personal growth',   icon: '🌿', color: '#27AE60' },
  { name: 'Business',   description: 'Entrepreneurship and strategy',       icon: '📈', color: '#E67E22' },
  { name: 'Science',    description: 'Scientific breakthroughs & research', icon: '🔬', color: '#1ABC9C' },
];


async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅  Connected to MongoDB\n');

    // Clear everything
    await Promise.all([
      User.deleteMany({}),
      Post.deleteMany({}),
      Category.deleteMany({}),
      Comment.deleteMany({})
    ]);
    console.log('🗑  Cleared existing data');

    // ── Create Users ────────────────────────────────────────
    const admin = await User.create({
      username: 'alex', email: 'admin@inkdrop.com',
      password: 'admin123', role: 'admin',
      bio: 'Founder & Editor at InkDrop.'
    });

    const author = await User.create({
      username: 'samauthor', email: 'author@inkdrop.com',
      password: 'author123', role: 'author',
      bio: 'Tech writer and full-stack developer.'
    });

    const user = await User.create({
      username: 'hardik', email: 'user@inkdrop.com',
      password: 'user123', role: 'user',
      bio: 'Avid reader and tech enthusiast.'
    });

    console.log('\n👥  Users created:');
    // ── Create Categories ───────────────────────────────────
    const createdCats = {};
    for (const catData of categories) {
      const cat = await Category.create(catData);
      createdCats[cat.name] = cat;
      console.log(`📂  Category: ${cat.icon} ${cat.name}`);
    }

    // ── Create Posts ────────────────────────────────────────
    console.log('');
    for (const postData of samplePosts) {
      const { catName, authorRole, ...data } = postData;
      const postAuthor = authorRole === 'admin' ? admin : author;

      const post = await Post.create({
        ...data,
        author:   postAuthor._id,
        category: createdCats[catName]?._id,
        views:    Math.floor(Math.random() * 1200) + 50,
        likes:    [user._id],
      });

      // Add a comment on published posts
      if (post.status === 'published') {
        await Comment.create({
          content: 'Great article! This really helped me understand the topic better.',
          author: user._id,
          post:   post._id,
        });
      }

      const icon = authorRole === 'admin' ? '👑' : '✍';
      console.log(`📝  [${icon} ${postAuthor.username}] "${post.title.substring(0, 45)}..." [${post.status}]`);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌  Seed error:', err.message);
    process.exit(1);
  }
}

seed();
