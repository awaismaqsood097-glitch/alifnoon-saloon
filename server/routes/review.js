const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Review = require('../models/Review');
const auth = require('../middleware/auth');

/**
 * ═══════════════════════════════════════════════════════
 *   PUBLIC: GET /api/reviews
 *   Get all APPROVED reviews (only approved shown on site)
 * ═══════════════════════════════════════════════════════
 */
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   PUBLIC: POST /api/reviews
 *   Submit a new review (needs admin approval)
 * ═══════════════════════════════════════════════════════
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().isLength({ max: 80 }),
    body('rating').isInt({ min: 1, max: 5 }),
    body('message').trim().notEmpty().isLength({ max: 600 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const review = new Review(req.body);
      await review.save();

      res.status(201).json({
        success: true,
        message: 'Thank you! Your review will appear after approval.'
      });
    } catch (err) {
      console.error('Submit review error:', err);
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: GET /api/reviews/all
 *   Get ALL reviews (approved + pending)
 * ═══════════════════════════════════════════════════════
 */
router.get('/all', auth, async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, count: reviews.length, reviews });
  } catch (err) {
    console.error('Get all reviews error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: PATCH /api/reviews/:id/approve
 *   Approve or unapprove a review
 * ═══════════════════════════════════════════════════════
 */
router.patch('/:id/approve', auth, async (req, res) => {
  try {
    const { approved } = req.body;

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { approved: !!approved },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, review });
  } catch (err) {
    console.error('Approve review error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * ═══════════════════════════════════════════════════════
 *   ADMIN: DELETE /api/reviews/:id
 * ═══════════════════════════════════════════════════════
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    res.json({ success: true, message: 'Review deleted' });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;