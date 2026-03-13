const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');
const { sanitizeText, sanitizeInteger, sanitizeMoney, sanitizeEnum } = require('../utils');

// Ensure discounts collection exists
function ensureDiscounts() {
  if (!db.get('discounts').value()) {
    db.set('discounts', []).write();
  }
}

// POST /api/discounts — vendor creates a discount code
router.post('/', auth, (req, res) => {
  ensureDiscounts();
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const { code, type, value, maxUses, expiresAt } = req.body || {};

  // Validate code: alphanumeric 3-20 chars
  const rawCode = sanitizeText(code, { max: 20 }) || '';
  if (!/^[A-Z0-9]{3,20}$/i.test(rawCode)) {
    return res.status(400).json({ error: 'Code must be 3-20 alphanumeric characters' });
  }
  const upperCode = rawCode.toUpperCase();

  const validTypes = ['percent', 'fixed'];
  const discountType = sanitizeEnum(type, validTypes, null);
  if (!discountType) return res.status(400).json({ error: 'Type must be percent or fixed' });

  const discountValue = sanitizeMoney(value, { min: 0.01, max: 100000, fallback: null });
  if (!discountValue) return res.status(400).json({ error: 'Value must be greater than 0' });

  const uses = sanitizeInteger(maxUses, { min: 1, max: 500, fallback: null });
  if (!uses) return res.status(400).json({ error: 'maxUses must be 1-500' });

  // Check for duplicate code
  const existing = db.get('discounts').find(d => d.code === upperCode).value();
  if (existing) return res.status(409).json({ error: 'Discount code already exists' });

  let expiry = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (!isNaN(d.getTime())) expiry = d.toISOString();
  }

  const discount = {
    id: uuidv4(),
    vendorId: vendor.id,
    code: upperCode,
    type: discountType,
    value: discountValue,
    maxUses: uses,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
    expiresAt: expiry
  };

  db.get('discounts').push(discount).write();
  return res.status(201).json(discount);
});

// POST /api/discounts/apply — apply a discount at checkout
router.post('/apply', auth, (req, res) => {
  ensureDiscounts();
  const { code, cartTotal } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Code is required' });

  const upperCode = String(code).toUpperCase();
  const discount = db.get('discounts').find(d => d.code === upperCode).value();

  if (!discount) return res.status(404).json({ error: 'Discount code not found' });
  if (!discount.active) return res.status(400).json({ error: 'This discount code is inactive' });
  if (discount.usedCount >= discount.maxUses) return res.status(400).json({ error: 'This discount code has reached its usage limit' });
  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
    return res.status(400).json({ error: 'This discount code has expired' });
  }

  const total = parseFloat(cartTotal) || 0;
  let savings = 0;
  if (discount.type === 'percent') {
    savings = Math.min(total * (discount.value / 100), total);
  } else {
    savings = Math.min(discount.value, total);
  }
  savings = Math.round(savings * 100) / 100;

  return res.json({
    discountId: discount.id,
    code: discount.code,
    type: discount.type,
    value: discount.value,
    savings
  });
});

// GET /api/discounts/me — list vendor's discount codes
router.get('/me', auth, (req, res) => {
  ensureDiscounts();
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const codes = db.get('discounts').filter({ vendorId: vendor.id }).value();
  return res.json(codes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// DELETE /api/discounts/:id — deactivate a code
router.delete('/:id', auth, (req, res) => {
  ensureDiscounts();
  const vendor = db.get('vendors').find({ userId: req.user.id }).value();
  if (!vendor) return res.status(403).json({ error: 'Vendor profile required' });

  const discount = db.get('discounts').find({ id: req.params.id }).value();
  if (!discount) return res.status(404).json({ error: 'Not found' });
  if (discount.vendorId !== vendor.id) return res.status(403).json({ error: 'Forbidden' });

  db.get('discounts').find({ id: req.params.id }).assign({ active: false }).write();
  return res.json({ success: true });
});

module.exports = router;
