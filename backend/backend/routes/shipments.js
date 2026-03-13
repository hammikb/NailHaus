const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');
const shippo = require('../shippo');

function getVendorByUserId(userId) {
  return db.get('vendors').find({ userId }).value() || null;
}

function parseCityStateZip(input) {
  const s = (input || '').trim();
  // Expected: "City, ST 12345" (zip optional)
  const m = s.match(/^(.+?),\s*([A-Za-z]{2})(?:\s+(\d{5}(?:-\d{4})?))?\s*$/);
  if (!m) return { city: s, state: '', zip: '' };
  return { city: m[1].trim(), state: m[2].toUpperCase(), zip: (m[3] || '').trim() };
}

function normalizeToAddress(order) {
  const a = order?.shippingAddress || {};
  const parsed = parseCityStateZip(a.city);
  return {
    name: a.name || '',
    street1: a.address || '',
    street2: '',
    city: parsed.city || '',
    state: parsed.state || '',
    zip: parsed.zip || '',
    country: 'US',
    phone: '',
    email: ''
  };
}

function enrichShipment(s) {
  const order = db.get('orders').find({ id: s.orderId }).value() || null;
  const products = db.get('products').value();
  const vendor = db.get('vendors').find({ id: s.vendorId }).value() || null;
  const buyer = db.get('users').find({ id: s.userId }).value() || null;
  const items = (s.itemRefs || []).map(ref => {
    const product = products.find(p => p.id === ref.productId) || null;
    return { ...ref, product };
  });

  return {
    ...s,
    order,
    vendor: vendor ? { id: vendor.id, name: vendor.name, emoji: vendor.emoji, bgColor: vendor.bgColor } : null,
    buyer: buyer ? { id: buyer.id, name: buyer.name, email: buyer.email } : null,
    items
  };
}

// GET /api/shipments/me (vendor shipments)
router.get('/me', auth, (req, res) => {
  const vendor = getVendorByUserId(req.user.id);
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const list = db
    .get('shipments')
    .filter({ vendorId: vendor.id })
    .value()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(enrichShipment);

  res.json(list);
});

// POST /api/shipments (create shipment draft)
router.post('/', auth, (req, res) => {
  const vendor = getVendorByUserId(req.user.id);
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const { orderId, itemRefs, toAddress, parcel } = req.body || {};
  if (!orderId) return res.status(400).json({ error: 'orderId is required' });

  const order = db.get('orders').find({ id: orderId }).value();
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const vendorItems = (order.items || []).filter(i => i.vendorId === vendor.id);
  if (!vendorItems.length) return res.status(403).json({ error: 'No items to fulfill for this vendor' });

  const requestedRefs = Array.isArray(itemRefs) && itemRefs.length
    ? itemRefs.map(r => ({ productId: r.productId, qty: parseInt(r.qty || 1) }))
    : vendorItems.map(i => ({ productId: i.productId, qty: i.qty }));

  const vendorProductIds = new Set(vendorItems.map(i => i.productId));
  for (const r of requestedRefs) {
    if (!vendorProductIds.has(r.productId)) return res.status(400).json({ error: 'Shipment items must belong to your vendor' });
    if (!r.qty || r.qty < 1) return res.status(400).json({ error: 'Invalid qty in itemRefs' });
  }

  const shipFrom = vendor.shippingProfile?.shipFrom || null;
  const to = toAddress || normalizeToAddress(order);
  const shipment = {
    id: uuidv4(),
    orderId: order.id,
    vendorId: vendor.id,
    userId: order.userId,
    itemRefs: requestedRefs,
    fromAddress: shipFrom,
    toAddress: to,
    parcel: parcel || { ...vendor.shippingProfile?.parcels?.find(p => p.id === vendor.shippingProfile?.defaultParcelId) } || null,
    status: 'pending',
    rates: [],
    shippo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    shippedAt: null,
    deliveredAt: null
  };

  db.get('shipments').push(shipment).write();
  res.status(201).json(enrichShipment(shipment));
});

// POST /api/shipments/:id/rates (fetch rates)
router.post('/:id/rates', auth, async (req, res) => {
  const vendor = getVendorByUserId(req.user.id);
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const s = db.get('shipments').find({ id: req.params.id }).value();
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  if (s.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  try {
    const { shipment, rates } = await shippo.getRatesForShipment({
      fromAddress: s.fromAddress,
      toAddress: s.toAddress,
      parcel: req.body?.parcel || s.parcel
    });

    db.get('shipments').find({ id: s.id }).assign({
      parcel: req.body?.parcel || s.parcel,
      rates,
      shippo: { ...(s.shippo || null), shipmentId: shipment?.object_id || shipment?.id || null },
      updatedAt: new Date().toISOString()
    }).write();

    const out = db.get('shipments').find({ id: s.id }).value();
    res.json({ rates: out.rates || [] });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Could not fetch rates' });
  }
});

// PUT /api/shipments/:id (update draft fields)
router.put('/:id', auth, (req, res) => {
  const vendor = getVendorByUserId(req.user.id);
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const s = db.get('shipments').find({ id: req.params.id }).value();
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  if (s.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  const allowed = ['fromAddress', 'toAddress', 'parcel'];
  const updates = {};
  allowed.forEach(k => { if (req.body?.[k] !== undefined) updates[k] = req.body[k]; });
  updates.updatedAt = new Date().toISOString();

  db.get('shipments').find({ id: s.id }).assign(updates).write();
  res.json(enrichShipment(db.get('shipments').find({ id: s.id }).value()));
});

// POST /api/shipments/:id/label (purchase label)
router.post('/:id/label', auth, async (req, res) => {
  const vendor = getVendorByUserId(req.user.id);
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const s = db.get('shipments').find({ id: req.params.id }).value();
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  if (s.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  const { rateId } = req.body || {};
  if (!rateId) return res.status(400).json({ error: 'rateId is required' });

  try {
    const tx = await shippo.purchaseLabel({ rateId });

    const shippoMeta = {
      rateId,
      transactionId: tx.transactionId,
      trackingNumber: tx.trackingNumber,
      trackingUrlProvider: tx.trackingUrlProvider,
      labelUrl: tx.labelUrl,
      carrier: tx.carrier,
      servicelevel: tx.servicelevel,
      amount: tx.amount,
      currency: tx.currency
    };

    db.get('shipments').find({ id: s.id }).assign({
      status: 'label_purchased',
      shippo: { ...(s.shippo || null), ...shippoMeta },
      updatedAt: new Date().toISOString()
    }).write();

    res.json(enrichShipment(db.get('shipments').find({ id: s.id }).value()));
  } catch (e) {
    res.status(400).json({ error: e.message || 'Could not purchase label' });
  }
});

// POST /api/shipments/:id/mark-shipped (manual tracking/status)
router.post('/:id/mark-shipped', auth, (req, res) => {
  const vendor = getVendorByUserId(req.user.id);
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const s = db.get('shipments').find({ id: req.params.id }).value();
  if (!s) return res.status(404).json({ error: 'Shipment not found' });
  if (s.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  const { trackingNumber, carrier, servicelevel, trackingUrlProvider } = req.body || {};
  if (!trackingNumber) return res.status(400).json({ error: 'trackingNumber is required' });

  db.get('shipments').find({ id: s.id }).assign({
    status: 'shipped',
    shippo: {
      ...(s.shippo || null),
      trackingNumber,
      carrier: carrier || (s.shippo?.carrier || ''),
      servicelevel: servicelevel || (s.shippo?.servicelevel || ''),
      trackingUrlProvider: trackingUrlProvider || (s.shippo?.trackingUrlProvider || '')
    },
    shippedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).write();

  res.json(enrichShipment(db.get('shipments').find({ id: s.id }).value()));
});

module.exports = router;

