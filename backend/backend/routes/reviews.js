const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');
const { sanitizeInteger, sanitizeText } = require('../utils');

function enrichReview(review) {
  const user = db.get('users').find({ id: review.userId }).value();
  const product = db.get('products').find({ id: review.productId }).value();
  return { ...review, user: { name: user?.name || 'Anonymous' }, product: product || null };
}

function userHasPurchasedProduct(userId, productId) {
  return db.get('orders').value().some(order =>
    order.userId === userId &&
    Array.isArray(order.items) &&
    order.items.some(item => item.productId === productId)
  );
}

router.get('/product/:productId', (req, res) => {
  const reviews = db.get('reviews').filter({ productId: req.params.productId }).value();
  res.json(reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(enrichReview));
});

router.get('/vendor/:vendorId', (req, res) => {
  const reviews = db.get('reviews').filter({ vendorId: req.params.vendorId }).value();
  res.json(reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(enrichReview));
});

router.get('/recent', (req, res) => {
  const limit = sanitizeInteger(req.query.limit, { min: 1, max: 20, fallback: 6 });
  const all = db.get('reviews').value().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  res.json(all.map(enrichReview));
});

router.post('/', auth, (req, res) => {
  const productId = sanitizeText(req.body?.productId, { max: 40 });
  const rating = sanitizeInteger(req.body?.rating, { min: 1, max: 5, fallback: 0 });
  const title = sanitizeText(req.body?.title, { max: 120 });
  const body = sanitizeText(req.body?.body, { max: 2000, multiline: true });

  const photo = req.body?.photo && typeof req.body.photo === 'string' && req.body.photo.startsWith('data:image/')
    ? req.body.photo.slice(0, 300000) // max ~300KB base64
    : null;

  if (!productId || !rating || !body) return res.status(400).json({ error: 'Rating and review text are required' });

  const product = db.get('products').find({ id: productId }).value();
  if (!product || product.hidden) return res.status(404).json({ error: 'Product not found' });
  if (db.get('reviews').find({ productId, userId: req.user.id }).value()) {
    return res.status(400).json({ error: 'You have already reviewed this product' });
  }
  if (!userHasPurchasedProduct(req.user.id, productId)) {
    return res.status(403).json({ error: 'Only verified buyers can review this product' });
  }

  const review = {
    id: uuidv4(),
    userId: req.user.id,
    productId,
    vendorId: product.vendorId,
    rating,
    title,
    body,
    helpful: 0,
    photo: photo || null,
    createdAt: new Date().toISOString()
  };

  db.get('reviews').push(review).write();

  const allReviews = db.get('reviews').filter({ productId }).value();
  const avg = allReviews.reduce((sum, current) => sum + current.rating, 0) / allReviews.length;
  db.get('products').find({ id: productId }).assign({ rating: Math.round(avg * 10) / 10, reviewCount: allReviews.length }).write();

  const vendorReviews = db.get('reviews').filter({ vendorId: product.vendorId }).value();
  const vendorAvg = vendorReviews.reduce((sum, current) => sum + current.rating, 0) / vendorReviews.length;
  db.get('vendors').find({ id: product.vendorId }).assign({ rating: Math.round(vendorAvg * 10) / 10 }).write();

  return res.status(201).json(enrichReview(review));
});

router.post('/:id/helpful', (req, res) => {
  const review = db.get('reviews').find({ id: req.params.id }).value();
  if (!review) return res.status(404).json({ error: 'Review not found' });
  db.get('reviews').find({ id: req.params.id }).update('helpful', count => (count || 0) + 1).write();
  return res.json({ helpful: (review.helpful || 0) + 1 });
});

router.post('/:id/reply', auth, (req, res) => {
  const review = db.get('reviews').find({ id: req.params.id }).value();
  if (!review) return res.status(404).json({ error: 'Review not found' });

  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor || review.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  const reply = sanitizeText(req.body?.reply, { max: 1200, multiline: true });
  if (!reply) return res.status(400).json({ error: 'Reply text is required' });

  db.get('reviews').find({ id: req.params.id }).assign({ vendorReply: reply, vendorReplyAt: new Date().toISOString() }).write();
  return res.json(db.get('reviews').find({ id: req.params.id }).value());
});

module.exports = router;
