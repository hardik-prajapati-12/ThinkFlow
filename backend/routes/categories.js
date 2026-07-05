// routes/categories.js
const express  = require('express');
const router   = express.Router();
const Category = require('../models/Category');
const { protect, adminOnly } = require('../middleware/auth');

// ── GET /api/categories — All categories (public) ────────────
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── POST /api/categories — Create (admin only) ───────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }
    const exists = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (exists) return res.status(400).json({ message: 'A category with this name already exists.' });

    const category = await Category.create({ name: name.trim(), description, icon, color });
    res.status(201).json({ message: 'Category created!', category });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── PUT /api/categories/:id — Update (admin only) ────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, description, icon, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Category name is required.' });
    }

    // Check for duplicate name (excluding the current category)
    const duplicate = await Category.findOne({
      name: new RegExp(`^${name.trim()}$`, 'i'),
      _id: { $ne: req.params.id }
    });
    if (duplicate) return res.status(400).json({ message: 'Another category with this name already exists.' });

    const updated = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), description, icon, color },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Category not found.' });

    res.json({ message: 'Category updated successfully!', category: updated });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ── DELETE /api/categories/:id — Delete (admin only) ─────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found.' });
    res.json({ message: 'Category deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;