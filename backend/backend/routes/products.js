const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, optionalAuth } = require('../middleware');
const { sanitizeColor, sanitizeEnum, sanitizeInteger, sanitizeMoney, sanitizeTags, sanitizeText } = require('../utils');

const SHAPES = ['almond', 'coffin', 'stiletto', 'square', 'round'];
const STYLES = ['floral', 'minimal', 'glam', 'cute'];
const BADGES = ['hot', 'new', 'sale'];

function withVendor(product) {
  const vendor = db.get('vendors').find({ id: product.vendorId }).value();
  return {
    ...product,
    vendor: vendor ? { id: vendor.id, name: vendor.name, emoji: vendor.emoji, bgColor: vendor.bgColor } : null,
  };
}

function parseProductInput(body, current = null) {
  const name = body.name !== undefined ? sanitizeText(body.name, { max: 120 }) : current?.name;
  const description = body.description !== undefined ? sanitizeText(body.description, { max: 2000, multiline: true }) : current?.description;
  const price = body.price !== undefined ? sanitizeMoney(body.price, { min: 1, max: 10000, fallback: Number.NaN }) : current?.price;
  const originalPrice = body.originalPrice !== undefined && body.originalPrice !== ''
    ? sanitizeMoney(body.originalPrice, { min: 1, max: 10000, fallback: Number.NaN })
    : null;
  const stock = body.stock !== undefined ? sanitizeInteger(body.stock, { min: 0, max: 10000, fallback: Number.NaN }) : current?.stock;

  return {
    name,
    description,
    price,
    originalPrice,
    emoji: body.emoji !== undefined ? sanitizeText(body.emoji, { max: 16, fallback: current?.emoji || '💅' }) : current?.emoji,
    bgColor: body.bgColor !== undefined ? sanitizeColor(body.bgColor, current?.bgColor || '#fde8e8') : current?.bgColor,
    shape: body.shape !== undefined ? sanitizeEnum(body.shape, SHAPES, current?.shape || 'almond') : current?.shape,
    style: body.style !== undefined ? sanitizeEnum(body.style, STYLES, current?.style || 'minimal') : current?.style,
    badge: body.badge !== undefined ? (BADGES.includes(String(body.badge).toLowerCase()) ? String(body.badge).toLowerCase() : null) : current?.badge,
    stock,
    tags: body.tags !== undefined ? sanitizeTags(body.tags) : current?.tags,
    availability: body.availability !== undefined
      ? (body.availability === 'made_to_order' ? 'made_to_order' : 'in_stock')
      : (current?.availability || 'in_stock'),
    productionDays: body.productionDays !== undefined
      ? sanitizeInteger(body.productionDays, { min: 1, max: 60, fallback: 0 }) || null
      : (current?.productionDays || null),
    occasions: body.occasions !== undefined
      ? (Array.isArray(body.occasions) ? body.occasions : String(body.occasions).split(',').map(s=>s.trim())).filter(s => ['wedding','everyday','event','festival','work','party','holiday'].includes(s))
      : (current?.occasions || []),
    collectionId: body.collectionId !== undefined
      ? (body.collectionId || null)
      : (current?.collectionId || null),
    nailCount: body.nailCount !== undefined ? sanitizeInteger(body.nailCount, { min: 1, max: 50, fallback: null }) || null : (current?.nailCount || null),
    sizes: body.sizes !== undefined ? sanitizeText(body.sizes, { max: 120 }) : (current?.sizes || ''),
    finish: body.finish !== undefined ? sanitizeText(body.finish, { max: 80 }) : (current?.finish || ''),
    glueIncluded: body.glueIncluded !== undefined ? (body.glueIncluded === true || body.glueIncluded === 'true' ? true : body.glueIncluded === false || body.glueIncluded === 'false' ? false : null) : (current?.glueIncluded !== undefined ? current.glueIncluded : null),
    reusable: body.reusable !== undefined ? (body.reusable === 'yes' || body.reusable === true ? true : body.reusable === 'no' || body.reusable === false ? false : null) : (current?.reusable !== undefined ? current.reusable : null),
    wearTime: body.wearTime !== undefined ? sanitizeText(body.wearTime, { max: 80 }) : (current?.wearTime || ''),
  };
}

router.get('/', optionalAuth, (req, res) => {
  const { shape, style, search, vendorId, sort, limit, badge } = req.query;
  let list = db.get('products').value();

  if (req.user?.role !== 'admin') list = list.filter(product => !product.hidden);

  if (shape && shape !== 'all') list = list.filter(product => product.shape === shape);
  if (style && style !== 'all') list = list.filter(product => product.style === style);
  if (vendorId) list = list.filter(product => product.vendorId === vendorId);
  if (badge) list = list.filter(product => product.badge === badge);
  const { availability } = req.query;
  if (availability === 'in_stock') list = list.filter(p => p.availability !== 'made_to_order');
  if (availability === 'made_to_order') list = list.filter(p => p.availability === 'made_to_order');
  const { occasion } = req.query;
  if (occasion && occasion !== 'all') list = list.filter(p => (p.occasions || []).includes(occasion));
  const { collectionId } = req.query;
  if (collectionId) list = list.filter(p => p.collectionId === collectionId);
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(product =>
      product.name.toLowerCase().includes(q) ||
      (product.tags || []).some(tag => tag.includes(q)) ||
      product.style.includes(q) ||
      product.shape.includes(q)
    );
  }

  switch (sort) {
    case 'price_asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price_desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    default:
      list.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  const maxResults = sanitizeInteger(limit, { min: 1, max: 100, fallback: 0 });
  if (maxResults) list = list.slice(0, maxResults);

  res.json(list.map(withVendor));
});

router.get('/:id', optionalAuth, (req, res) => {
  const product = db.get('products').find({ id: req.params.id }).value();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.hidden && req.user?.role !== 'admin') return res.status(404).json({ error: 'Product not found' });

  const reviews = db.get('reviews').filter({ productId: product.id }).value();
  const users = db.get('users').value();
  const reviewsWithUser = reviews.map(review => ({
    ...review,
    user: { name: users.find(user => user.id === review.userId)?.name || 'Anonymous' }
  }));

  return res.json({
    ...withVendor(product),
    reviews: reviewsWithUser.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  });
});

router.post('/', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const parsed = parseProductInput(req.body || {});
  if (!parsed.name || !Number.isFinite(parsed.price) || !Number.isFinite(parsed.stock)) {
    return res.status(400).json({ error: 'Name, valid price, and valid stock are required' });
  }

  const product = {
    id: uuidv4(),
    vendorId: vendor.id,
    name: parsed.name,
    description: parsed.description || '',
    price: parsed.price,
    originalPrice: Number.isFinite(parsed.originalPrice) ? parsed.originalPrice : null,
    emoji: parsed.emoji || '💅',
    bgColor: parsed.bgColor || '#fde8e8',
    shape: parsed.shape || 'almond',
    style: parsed.style || 'minimal',
    badge: parsed.badge || null,
    stock: parsed.stock,
    tags: parsed.tags || [],
    availability: parsed.availability || 'in_stock',
    productionDays: parsed.productionDays || null,
    occasions: parsed.occasions || [],
    collectionId: parsed.collectionId || null,
    nailCount: parsed.nailCount || null,
    sizes: parsed.sizes || '',
    finish: parsed.finish || '',
    glueIncluded: parsed.glueIncluded !== undefined ? parsed.glueIncluded : null,
    reusable: parsed.reusable !== undefined ? parsed.reusable : null,
    wearTime: parsed.wearTime || '',
    hidden: false,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date().toISOString()
  };

  db.get('products').push(product).write();
  db.get('vendors').find({ id: vendor.id }).update('totalProducts', count => (count || 0) + 1).write();
  return res.status(201).json(withVendor(product));
});

router.put('/:id', auth, (req, res) => {
  const product = db.get('products').find({ id: req.params.id }).value();
  if (!product) return res.status(404).json({ error: 'Not found' });

  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor || product.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  const parsed = parseProductInput(req.body || {}, product);
  if (!parsed.name || !Number.isFinite(parsed.price) || !Number.isFinite(parsed.stock)) {
    return res.status(400).json({ error: 'Name, valid price, and valid stock are required' });
  }

  db.get('products').find({ id: req.params.id }).assign({
    name: parsed.name,
    description: parsed.description || '',
    price: parsed.price,
    originalPrice: Number.isFinite(parsed.originalPrice) ? parsed.originalPrice : null,
    emoji: parsed.emoji || '💅',
    bgColor: parsed.bgColor || '#fde8e8',
    shape: parsed.shape || 'almond',
    style: parsed.style || 'minimal',
    badge: parsed.badge || null,
    stock: parsed.stock,
    tags: parsed.tags || [],
    availability: parsed.availability || 'in_stock',
    productionDays: parsed.productionDays || null,
    occasions: parsed.occasions || [],
    collectionId: parsed.collectionId || null,
    nailCount: parsed.nailCount || null,
    sizes: parsed.sizes || '',
    finish: parsed.finish || '',
    glueIncluded: parsed.glueIncluded !== undefined ? parsed.glueIncluded : null,
    reusable: parsed.reusable !== undefined ? parsed.reusable : null,
    wearTime: parsed.wearTime || '',
  }).write();

  return res.json(withVendor(db.get('products').find({ id: req.params.id }).value()));
});

router.delete('/:id', auth, (req, res) => {
  const product = db.get('products').find({ id: req.params.id }).value();
  if (!product) return res.status(404).json({ error: 'Not found' });

  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor || product.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  db.get('products').remove({ id: req.params.id }).write();
  db.get('vendors').find({ id: vendor.id }).update('totalProducts', count => Math.max((count || 1) - 1, 0)).write();
  return res.json({ success: true });
});

// POST /api/products/import — bulk import products for the authenticated vendor
router.post('/import', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const rawProducts = req.body?.products;
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
    return res.status(400).json({ error: 'products array is required' });
  }
  if (rawProducts.length > 200) {
    return res.status(400).json({ error: 'Maximum 200 products per import batch' });
  }

  const imported = [];
  const errors = [];

  rawProducts.forEach((raw, idx) => {
    try {
      const parsed = parseProductInput(raw || {});
      if (!parsed.name) throw new Error('name is required');
      if (!Number.isFinite(parsed.price) || parsed.price <= 0) throw new Error('valid price is required');
      if (!Number.isFinite(parsed.stock) || parsed.stock < 0) throw new Error('valid stock is required');

      const product = {
        id: uuidv4(),
        vendorId: vendor.id,
        name: parsed.name,
        description: parsed.description || '',
        price: parsed.price,
        originalPrice: Number.isFinite(parsed.originalPrice) ? parsed.originalPrice : null,
        emoji: parsed.emoji || '💅',
        bgColor: parsed.bgColor || '#fde8e8',
        shape: parsed.shape || 'almond',
        style: parsed.style || 'minimal',
        badge: parsed.badge || null,
        stock: parsed.stock,
        tags: parsed.tags || [],
        availability: parsed.availability || 'in_stock',
        productionDays: parsed.productionDays || null,
        occasions: parsed.occasions || [],
        collectionId: parsed.collectionId || null,
        nailCount: parsed.nailCount || null,
        sizes: parsed.sizes || '',
        finish: parsed.finish || '',
        glueIncluded: parsed.glueIncluded !== undefined ? parsed.glueIncluded : null,
        reusable: parsed.reusable !== undefined ? parsed.reusable : null,
        wearTime: parsed.wearTime || '',
        hidden: false,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
      };

      db.get('products').push(product).write();
      imported.push(product.id);
    } catch (err) {
      errors.push({ row: idx + 1, name: raw?.name || '(unnamed)', error: err.message });
    }
  });

  db.get('vendors').find({ id: vendor.id }).update('totalProducts', count => (count || 0) + imported.length).write();

  return res.status(201).json({
    imported: imported.length,
    skipped: errors.length,
    errors,
    importedIds: imported,
  });
});

// Ensure restockAlerts collection
function ensureRestockAlerts() {
  if (!db.get('restockAlerts').value()) db.set('restockAlerts', []).write();
}

// POST /api/products/:id/notify — register for restock notification
router.post('/:id/notify', auth, (req, res) => {
  ensureRestockAlerts();
  const product = db.get('products').find({ id: req.params.id }).value();
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.stock > 0 && product.availability !== 'made_to_order') {
    return res.status(400).json({ error: 'Product is in stock' });
  }

  const existing = db.get('restockAlerts').find({ productId: req.params.id, userId: req.user.id }).value();
  if (existing) return res.status(409).json({ error: 'Already subscribed to restock alerts for this product' });

  const alert = { id: uuidv4(), productId: req.params.id, userId: req.user.id, createdAt: new Date().toISOString() };
  db.get('restockAlerts').push(alert).write();
  return res.status(201).json(alert);
});

// DELETE /api/products/:id/notify — remove restock alert
router.delete('/:id/notify', auth, (req, res) => {
  ensureRestockAlerts();
  const existing = db.get('restockAlerts').find({ productId: req.params.id, userId: req.user.id }).value();
  if (!existing) return res.status(404).json({ error: 'Not subscribed' });
  db.get('restockAlerts').remove({ productId: req.params.id, userId: req.user.id }).write();
  return res.json({ success: true });
});

// GET /api/products/:id/notify — check subscription status
router.get('/:id/notify', auth, (req, res) => {
  ensureRestockAlerts();
  const existing = db.get('restockAlerts').find({ productId: req.params.id, userId: req.user.id }).value();
  return res.json({ subscribed: !!existing });
});

module.exports = router;
