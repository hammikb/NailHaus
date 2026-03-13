const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');
const { deriveOrderStatus } = require('../order-status');
const {
  sanitizeColor,
  sanitizeInteger,
  sanitizeSocialLinks,
  sanitizeTags,
  sanitizeText,
  sanitizeUrlList,
  toPublicVendor,
} = require('../utils');

function sanitizeShippingProfile(body, existing = {}) {
  const shipFromInput = body.shipFrom && typeof body.shipFrom === 'object' ? body.shipFrom : existing.shipFrom || {};
  const parcelsInput = Array.isArray(body.parcels) ? body.parcels : (existing.parcels || []);
  const nextParcels = parcelsInput
    .map(parcel => ({
      id: sanitizeText(parcel.id, { max: 40 }),
      label: sanitizeText(parcel.label, { max: 80 }),
      length: sanitizeInteger(parcel.length, { min: 1, max: 48, fallback: 0 }),
      width: sanitizeInteger(parcel.width, { min: 1, max: 48, fallback: 0 }),
      height: sanitizeInteger(parcel.height, { min: 1, max: 48, fallback: 0 }),
      distance_unit: sanitizeText(parcel.distance_unit, { max: 10, fallback: 'in' }),
      weight: sanitizeInteger(parcel.weight, { min: 1, max: 640, fallback: 0 }),
      mass_unit: sanitizeText(parcel.mass_unit, { max: 10, fallback: 'oz' }),
    }))
    .filter(parcel => parcel.id && parcel.label && parcel.length && parcel.width && parcel.height && parcel.weight)
    .slice(0, 10);

  return {
    shipFrom: {
      name: sanitizeText(shipFromInput.name, { max: 80 }),
      company: sanitizeText(shipFromInput.company, { max: 80 }),
      street1: sanitizeText(shipFromInput.street1, { max: 120 }),
      street2: sanitizeText(shipFromInput.street2, { max: 120 }),
      city: sanitizeText(shipFromInput.city, { max: 80 }),
      state: sanitizeText(shipFromInput.state, { max: 30 }),
      zip: sanitizeText(shipFromInput.zip, { max: 20 }),
      country: sanitizeText(shipFromInput.country, { max: 2, fallback: 'US' }).toUpperCase(),
      phone: sanitizeText(shipFromInput.phone, { max: 30 }),
      email: sanitizeText(shipFromInput.email, { max: 120 }),
    },
    parcels: nextParcels,
    defaultParcelId: sanitizeText(body.defaultParcelId, { max: 40, fallback: existing.defaultParcelId || nextParcels[0]?.id || '' }),
    preferences: {
      carrier: sanitizeText(body.preferences?.carrier, { max: 40, fallback: existing.preferences?.carrier || '' }),
      servicelevel: sanitizeText(body.preferences?.servicelevel, { max: 80, fallback: existing.preferences?.servicelevel || '' }),
    }
  };
}

router.get('/', (_req, res) => {
  res.json(db.get('vendors').value().map(toPublicVendor));
});

router.get('/me/dashboard', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'no_vendor' });

  const products = db.get('products').filter({ vendorId: vendor.id }).value();
  const reviews = db.get('reviews').filter({ vendorId: vendor.id }).value();
  const shipments = db.get('shipments').filter({ vendorId: vendor.id }).value();
  const users = db.get('users').value();

  const orders = db.get('orders').value()
    .filter(order => order.items.some(item => item.vendorId === vendor.id))
    .map(order => ({ ...order, status: deriveOrderStatus(order) }));

  const totalRevenue = orders.reduce(
    (sum, order) => sum + order.items.filter(item => item.vendorId === vendor.id).reduce((subsum, item) => subsum + item.price * item.qty, 0),
    0
  );
  const avgRating = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : '-';

  const reviewsWithUser = reviews
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
    .map(review => ({
      ...review,
      user: { name: users.find(user => user.id === review.userId)?.name || 'Anonymous' },
      product: db.get('products').find({ id: review.productId }).value()
    }));

  const shippedOrderIds = new Set(shipments.map(shipment => `${shipment.orderId}:${shipment.vendorId}`));
  const productsAll = db.get('products').value();
  const vendorsAll = db.get('vendors').value();
  const fulfillmentQueue = orders
    .filter(order => !shippedOrderIds.has(`${order.id}:${vendor.id}`))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10)
    .map(order => ({
      ...order,
      items: order.items
        .filter(item => item.vendorId === vendor.id)
        .map(item => ({
          ...item,
          product: productsAll.find(product => product.id === item.productId) || null,
          vendor: vendorsAll.find(currentVendor => currentVendor.id === item.vendorId) || null
        }))
    }));

  const shippingStats = {
    openShipments: shipments.filter(shipment => shipment.status === 'pending').length,
    labelsPurchased: shipments.filter(shipment => shipment.status === 'label_purchased').length,
    shipped: shipments.filter(shipment => shipment.status === 'shipped').length,
    delivered: shipments.filter(shipment => shipment.status === 'delivered').length
  };

  const verificationRequest = db
    .get('vendorVerificationRequests')
    .find({ vendorId: vendor.id, status: 'pending' })
    .value() || null;

  return res.json({
    vendor,
    stats: {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      totalReviews: reviews.length,
      avgRating,
      ...shippingStats
    },
    products,
    recentReviews: reviewsWithUser,
    recentOrders: orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    fulfillmentQueue,
    recentShipments: shipments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    verificationRequest
  });
});

// Get collections for logged-in vendor
router.get('/me/collections', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'no_vendor' });
  res.json(vendor.collections || []);
});

// Create a collection
router.post('/me/collections', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'no_vendor' });
  const name = sanitizeText(req.body?.name, { max: 80 });
  const description = sanitizeText(req.body?.description, { max: 300, multiline: true });
  if (!name) return res.status(400).json({ error: 'Collection name is required' });
  const collection = { id: uuidv4(), name, description: description || '', createdAt: new Date().toISOString() };
  const collections = [...(vendor.collections || []), collection];
  db.get('vendors').find({ userId: req.user.id }).assign({ collections }).write();
  res.status(201).json(collection);
});

// Delete a collection (products stay, they just lose collectionId)
router.delete('/me/collections/:collectionId', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'no_vendor' });
  const collections = (vendor.collections || []).filter(c => c.id !== req.params.collectionId);
  db.get('vendors').find({ userId: req.user.id }).assign({ collections }).write();
  // Clear collectionId from products in this collection
  db.get('products').filter({ vendorId: vendor.id, collectionId: req.params.collectionId }).each(p => {
    db.get('products').find({ id: p.id }).assign({ collectionId: null }).write();
  }).value();
  res.json({ success: true });
});

router.get('/me/shipping', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'No vendor profile' });
  return res.json(vendor.shippingProfile || null);
});

router.put('/me/shipping', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'No vendor profile' });

  const next = sanitizeShippingProfile(req.body || {}, vendor.shippingProfile || {});
  db.get('vendors').find({ userId: req.user.id }).assign({ shippingProfile: next }).write();
  return res.json(next);
});

router.post('/me/verification-request', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'No vendor profile' });
  if (vendor.verified) return res.status(400).json({ error: 'Vendor is already verified' });

  const existing = db.get('vendorVerificationRequests').find({ vendorId: vendor.id, status: 'pending' }).value();
  if (existing) return res.status(400).json({ error: 'A verification request is already pending' });

  const row = {
    id: uuidv4(),
    vendorId: vendor.id,
    userId: req.user.id,
    message: sanitizeText(req.body?.message, { max: 2000, multiline: true }),
    links: sanitizeUrlList(req.body?.links),
    status: 'pending',
    adminNote: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.get('vendorVerificationRequests').push(row).write();
  return res.status(201).json(row);
});

router.get('/me/verification-request', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'No vendor profile' });
  const row = db.get('vendorVerificationRequests').find({ vendorId: vendor.id, status: 'pending' }).value() || null;
  return res.json(row);
});

router.get('/:id', (req, res) => {
  const vendor = db.get('vendors').find({ id: req.params.id }).value();
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const products = db.get('products').filter({ vendorId: vendor.id }).value().filter(product => !product.hidden);
  const reviews = db.get('reviews').filter({ vendorId: vendor.id }).value();
  const users = db.get('users').value();
  const reviewsOut = reviews
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(review => ({
      ...review,
      user: { name: users.find(user => user.id === review.userId)?.name || 'Anonymous' },
      product: db.get('products').find({ id: review.productId }).value()
    }));

  return res.json({ ...toPublicVendor(vendor), products, reviews: reviewsOut });
});

router.post('/', auth, (req, res) => {
  if (db.get('vendors').find({ userId: req.user.id }).value()) {
    return res.status(400).json({ error: 'Vendor profile already exists' });
  }

  const name = sanitizeText(req.body?.name, { max: 80 });
  if (!name) return res.status(400).json({ error: 'Brand name is required' });

  const vendor = {
    id: uuidv4(),
    userId: req.user.id,
    name,
    tagline: sanitizeText(req.body?.tagline, { max: 120 }),
    description: sanitizeText(req.body?.description, { max: 2000, multiline: true }),
    emoji: sanitizeText(req.body?.emoji, { max: 16, fallback: '💅' }),
    bgColor: sanitizeColor(req.body?.bgColor, '#fde8e8'),
    tags: sanitizeTags(req.body?.tags),
    verified: false,
    rating: 0,
    totalSales: 0,
    totalProducts: 0,
    socialLinks: {},
    announcement: '',
    createdAt: new Date().toISOString()
  };

  db.get('vendors').push(vendor).write();
  db.get('users').find({ id: req.user.id }).assign({ role: 'vendor' }).write();
  return res.status(201).json(vendor);
});

router.put('/me', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'No vendor profile' });

  const updates = {
    name: req.body?.name !== undefined ? sanitizeText(req.body.name, { max: 80, fallback: vendor.name }) : vendor.name,
    tagline: req.body?.tagline !== undefined ? sanitizeText(req.body.tagline, { max: 120 }) : vendor.tagline,
    description: req.body?.description !== undefined ? sanitizeText(req.body.description, { max: 2000, multiline: true }) : vendor.description,
    emoji: req.body?.emoji !== undefined ? sanitizeText(req.body.emoji, { max: 16, fallback: vendor.emoji || '💅' }) : vendor.emoji,
    bgColor: req.body?.bgColor !== undefined ? sanitizeColor(req.body.bgColor, vendor.bgColor || '#fde8e8') : vendor.bgColor,
    tags: req.body?.tags !== undefined ? sanitizeTags(req.body.tags) : vendor.tags,
    socialLinks: req.body?.socialLinks !== undefined ? sanitizeSocialLinks(req.body.socialLinks) : (vendor.socialLinks || {}),
    announcement: req.body?.announcement !== undefined ? sanitizeText(req.body.announcement, { max: 240, multiline: true }) : vendor.announcement,
  };

  db.get('vendors').find({ userId: req.user.id }).assign(updates).write();
  return res.json(db.get('vendors').find({ userId: req.user.id }).value());
});

router.get('/me/revenue-trend', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'no_vendor' });

  const orders = db.get('orders').value().filter(order => order.items.some(item => item.vendorId === vendor.id));
  const days = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const revenue = orders
      .filter(order => {
        const orderDay = new Date(order.createdAt);
        orderDay.setHours(0, 0, 0, 0);
        return orderDay.getTime() === day.getTime();
      })
      .reduce((sum, order) => sum + order.items.filter(item => item.vendorId === vendor.id).reduce((subsum, item) => subsum + item.price * item.qty, 0), 0);

    days.push({ label, rev: Math.round(revenue * 100) / 100 });
  }

  return res.json(days);
});

router.get('/me/payouts', auth, (req, res) => {
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(404).json({ error: 'no_vendor' });

  const feeRate = 0.08;
  const orders = db.get('orders').value().filter(order => order.items.some(item => item.vendorId === vendor.id));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const pendingOrders = orders.filter(order => new Date(order.createdAt) >= cutoff);
  const paidOrders = orders.filter(order => new Date(order.createdAt) < cutoff);
  const calcRevenue = list => list.reduce((sum, order) => sum + order.items.filter(item => item.vendorId === vendor.id).reduce((subsum, item) => subsum + item.price * item.qty, 0), 0);

  const pendingGross = calcRevenue(pendingOrders);
  const paidGross = calcRevenue(paidOrders);
  const nextPayoutDate = new Date();
  nextPayoutDate.setDate(nextPayoutDate.getDate() + (7 - new Date().getDay()));

  const byWeek = {};
  paidOrders.forEach(order => {
    const createdAt = new Date(order.createdAt);
    const week = new Date(createdAt);
    week.setDate(createdAt.getDate() - createdAt.getDay());
    week.setHours(0, 0, 0, 0);
    const key = week.toISOString();
    if (!byWeek[key]) {
      byWeek[key] = { weekOf: week.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), gross: 0, fee: 0, net: 0 };
    }
    const revenue = order.items.filter(item => item.vendorId === vendor.id).reduce((sum, item) => sum + item.price * item.qty, 0);
    byWeek[key].gross += revenue;
    byWeek[key].fee += revenue * feeRate;
    byWeek[key].net += revenue * (1 - feeRate);
  });

  const history = Object.values(byWeek)
    .sort((a, b) => new Date(b.weekOf) - new Date(a.weekOf))
    .slice(0, 8)
    .map(week => ({
      ...week,
      gross: +week.gross.toFixed(2),
      fee: +week.fee.toFixed(2),
      net: +week.net.toFixed(2)
    }));

  return res.json({
    pendingGross: +pendingGross.toFixed(2),
    pendingNet: +(pendingGross * (1 - feeRate)).toFixed(2),
    lifetimeNet: +(paidGross * (1 - feeRate)).toFixed(2),
    nextPayoutDate: nextPayoutDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    feeRate,
    history
  });
});

module.exports = router;
