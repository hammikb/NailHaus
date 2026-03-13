const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');

function ensureCollection(name) {
  if (!db.get(name).value()) db.set(name, []).write();
}

router.get('/my', auth, (req, res) => {
  const orders = db.get('orders').filter({ userId: req.user.id }).value();
  const products = db.get('products').value();
  const vendors = db.get('vendors').value();
  const enriched = orders.map(o => ({
    ...o,
    items: o.items.map(i => ({
      ...i,
      product: products.find(p => p.id === i.productId) || null,
      vendor:  vendors.find(v => v.id === i.vendorId)   || null
    }))
  }));
  res.json(enriched.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

router.post('/', auth, (req, res) => {
  const { items, shippingAddress, discountId } = req.body;
  if (!items?.length) return res.status(400).json({ error: 'No items provided' });

  let total = 0;
  const orderItems = [];
  for (const item of items) {
    const product = db.get('products').find({ id: item.productId }).value();
    if (!product) return res.status(400).json({ error: `Product not found: ${item.productId}` });
    const qty = item.qty || 1;
    total += product.price * qty;
    orderItems.push({ productId: product.id, vendorId: product.vendorId, qty, price: product.price });
  }

  let discountSavings = 0;
  let appliedDiscountId = null;

  // Apply discount if provided
  if (discountId) {
    ensureCollection('discounts');
    const discount = db.get('discounts').find({ id: discountId }).value();
    if (discount && discount.active && discount.usedCount < discount.maxUses) {
      const notExpired = !discount.expiresAt || new Date(discount.expiresAt) > new Date();
      if (notExpired) {
        if (discount.type === 'percent') {
          discountSavings = Math.min(total * (discount.value / 100), total);
        } else {
          discountSavings = Math.min(discount.value, total);
        }
        discountSavings = Math.round(discountSavings * 100) / 100;
        // Increment usedCount
        db.get('discounts').find({ id: discountId }).update('usedCount', n => n + 1).write();
        appliedDiscountId = discountId;
      }
    }
  }

  const finalTotal = Math.max(0, Math.round((total - discountSavings) * 100) / 100);

  const order = {
    id: uuidv4(), userId: req.user.id, items: orderItems, total: finalTotal,
    originalTotal: total,
    discountId: appliedDiscountId || null,
    discountSavings: discountSavings || 0,
    status: 'confirmed', shippingAddress: shippingAddress || {},
    createdAt: new Date().toISOString()
  };
  db.get('orders').push(order).write();

  // Update vendor sales counts
  const byVendor = {};
  orderItems.forEach(i => { byVendor[i.vendorId] = (byVendor[i.vendorId] || 0) + 1; });
  Object.entries(byVendor).forEach(([vid]) => {
    db.get('vendors').find({ id: vid }).update('totalSales', n => n + 1).write();
  });

  res.status(201).json(order);
});

// PUT /api/orders/:id/mark-shipped — vendor marks an order as shipped without a full label
router.put('/:id/mark-shipped', auth, (req, res) => {
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });
  if (!order.items.some(i => i.vendorId === vendor.id)) return res.status(403).json({ error: 'Forbidden' });

  const { trackingNumber, carrier } = req.body || {};
  // Create a manual shipment record
  const shipment = {
    id: uuidv4(),
    orderId: order.id,
    vendorId: vendor.id,
    status: 'shipped',
    shippo: { carrier: carrier || 'manual', trackingNumber: trackingNumber || '', labelUrl: null },
    createdAt: new Date().toISOString()
  };
  db.get('shipments').push(shipment).write();
  db.get('orders').find({ id: order.id }).assign({ status: 'shipped' }).write();
  res.json(shipment);
});

// POST /api/orders/:id/dispute — open a dispute
router.post('/:id/dispute', auth, (req, res) => {
  ensureCollection('disputes');
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  // Check no existing open dispute
  const existing = db.get('disputes').find(d => d.orderId === req.params.id && d.status === 'open').value();
  if (existing) return res.status(409).json({ error: 'A dispute is already open for this order' });

  const { reason, details } = req.body || {};
  if (!reason) return res.status(400).json({ error: 'Reason is required' });

  const dispute = {
    id: uuidv4(),
    orderId: req.params.id,
    userId: req.user.id,
    reason: String(reason).slice(0, 200),
    details: String(details || '').slice(0, 2000),
    status: 'open',
    resolution: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.get('disputes').push(dispute).write();

  // Add to adminAudit for visibility
  db.get('adminAudit').push({
    id: uuidv4(),
    adminUserId: null,
    action: 'dispute_opened',
    entityType: 'order',
    entityId: req.params.id,
    before: null,
    after: dispute,
    note: `User ${req.user.id} opened dispute: ${reason}`,
    createdAt: new Date().toISOString()
  }).write();

  res.status(201).json(dispute);
});

// GET /api/orders/:id/dispute — get dispute for an order
router.get('/:id/dispute', auth, (req, res) => {
  ensureCollection('disputes');
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.userId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const dispute = db.get('disputes').find({ orderId: req.params.id }).value();
  if (!dispute) return res.status(404).json({ error: 'No dispute found' });
  res.json(dispute);
});

module.exports = router;
