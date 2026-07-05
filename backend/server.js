// =============================================
//   MEAN Stack Blog - Main Server (server.js)
// =============================================

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
require('dotenv').config();

const app = express();

// ── Middleware ──────────────────────────────
const allowedOrigins = [
  'http://localhost:4200',
  'https://think-flow-lac.vercel.app'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Database Connection ─────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/blogdb')
  .then(() => console.log('✅  MongoDB connected successfully'))
  .catch(err => console.error('❌  MongoDB connection error:', err));

// ── Routes ──────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/posts',      require('./routes/posts'));
app.use('/api/comments',   require('./routes/comments'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/messages',   require('./routes/messages'));   // ← contact messages
app.use('/api/stats',      require('./routes/stats'));      // ← admin overview stats
app.use('/api/stats',      require('./routes/stats'));       // ← admin overview
app.use('/api/settings',   require('./routes/settings'));

// ── Health Check ────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blog API is running 🚀' });
});

// ── 404 Handler ─────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// ── Global Error Handler ─────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// ── Start Server ─────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀  Server running on http://localhost:${PORT}`));


