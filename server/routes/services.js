const express = require('express');
const router = express.Router();

/**
 * ═══════════════════════════════════════════════════════
 *   SERVICES CATALOG
 * ═══════════════════════════════════════════════════════
 *   Ye hardcoded list hai — koi database nahi chahiye.
 *   Naye services add karne ke liye yahan add karein.
 * ═══════════════════════════════════════════════════════
 */
const SERVICES = [
  {
    id: 'haircut',
    name: 'Haircut & Styling',
    price: 'Rs. 1,500+',
    priceNum: 1500,
    duration: '45 min',
    category: 'hair',
    desc: 'Precision cuts, blow-dry & styling by expert stylists.'
  },
  {
    id: 'coloring',
    name: 'Hair Coloring',
    price: 'Rs. 5,000+',
    priceNum: 5000,
    duration: '120 min',
    category: 'hair',
    desc: 'Global color, highlights, balayage & ombre.'
  },
  {
    id: 'treatment',
    name: 'Hair Treatment',
    price: 'Rs. 3,500+',
    priceNum: 3500,
    duration: '60 min',
    category: 'hair',
    desc: 'Keratin, protein, hair spa & deep conditioning.'
  },
  {
    id: 'bridal',
    name: 'Bridal Makeup',
    price: 'Rs. 25,000+',
    priceNum: 25000,
    duration: '180 min',
    category: 'bridal',
    desc: 'Signature bridal look with HD makeup & draping.'
  },
  {
    id: 'party',
    name: 'Party Makeup',
    price: 'Rs. 6,000+',
    priceNum: 6000,
    duration: '90 min',
    category: 'makeup',
    desc: 'Glamorous party looks for every occasion.'
  },
  {
    id: 'facial',
    name: 'Facial & Skincare',
    price: 'Rs. 2,500+',
    priceNum: 2500,
    duration: '60 min',
    category: 'skin',
    desc: 'Whitening, hydra, gold & anti-aging facials.'
  },
  {
    id: 'mani',
    name: 'Manicure & Pedicure',
    price: 'Rs. 2,000+',
    priceNum: 2000,
    duration: '75 min',
    category: 'nails',
    desc: 'Spa mani-pedi with premium polish & nail art.'
  },
  {
    id: 'waxing',
    name: 'Waxing & Threading',
    price: 'Rs. 500+',
    priceNum: 500,
    duration: '30 min',
    category: 'skin',
    desc: 'Full body waxing & precise threading.'
  },
  {
    id: 'mehndi',
    name: 'Mehndi Design',
    price: 'Rs. 2,000+',
    priceNum: 2000,
    duration: '90 min',
    category: 'bridal',
    desc: 'Intricate bridal & party mehndi designs.'
  },
  {
    id: 'package',
    name: 'Full Bridal Package',
    price: 'Rs. 60,000+',
    priceNum: 60000,
    duration: 'Full Day',
    category: 'bridal',
    desc: 'Complete bridal transformation with pre & post care.'
  }
];

/**
 * ═══════════════════════════════════════════════════════
 *   GET /api/services
 *   Return all services
 * ═══════════════════════════════════════════════════════
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    count: SERVICES.length,
    services: SERVICES
  });
});

/**
 * ═══════════════════════════════════════════════════════
 *   GET /api/services/:id
 *   Return a single service by ID
 * ═══════════════════════════════════════════════════════
 */
router.get('/:id', (req, res) => {
  const service = SERVICES.find((s) => s.id === req.params.id);
  if (!service) {
    return res.status(404).json({
      success: false,
      message: 'Service not found'
    });
  }
  res.json({ success: true, service });
});

module.exports = router;