const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, requireAdmin } = require('../middleware');

function audit({ adminUserId, action, entityType, entityId, before, after, note }) {
  const row = {
    id: uuidv4(),
    adminUserId,
    action,
    entityType,
    entityId: entityId || null,
    before: before ?? null,
    after: after ?? null,
    note: note || '',
    createdAt: new Date().toISOString()
  };
  db.get('adminAudit').push(row).write();
  return row;
}

function safeUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, disabled: !!u.disabled, createdAt: u.createdAt };
}

// One-time bootstrap: promote an existing user to admin
// Requires ADMIN_BOOTSTRAP_TOKEN and only works if there is currently no admin user and meta.adminBootstrappedAt is null.
router.post('/bootstrap/promote', auth, (req, res) => {
  const token = req.headers['x-admin-bootstrap-token'] || req.body?.token || '';
  const expected = process.env.ADMIN_BOOTSTRAP_TOKEN || '';
  if (!expected) return res.status(400).json({ error: 'Bootstrap not configured (missing ADMIN_BOOTSTRAP_TOKEN)' });
  if (!token || token !== expected) return res.status(403).json({ error: 'Invalid bootstrap token' });

  const meta = db.get('meta').value() || { adminBootstrappedAt: null };
  if (meta.adminBootstrappedAt) return res.status(400).json({ error: 'Bootstrap already used' });
  const existingAdmin = db.get('users').find({ role: 'admin' }).value();
  if (existingAdmin) return res.status(400).json({ error: 'An admin user already exists' });

  const { email, userId } = req.body || {};
  const user = userId
    ? db.get('users').find({ id: userId }).value()
    : db.get('users').find({ email: (email || '').toLowerCase().trim() }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const before = { ...safeUser(user) };
  db.get('users').find({ id: user.id }).assign({ role: 'admin', disabled: false }).write();
  const after = safeUser(db.get('users').find({ id: user.id }).value());

  db.set('meta', { ...(meta || {}), adminBootstrappedAt: new Date().toISOString() }).write();
  audit({ adminUserId: user.id, action: 'bootstrap_promote', entityType: 'user', entityId: user.id, before, after, note: 'Initial admin bootstrap' });

  res.json({ user: after });
});

// Everything below requires admin role
router.use(auth, requireAdmin);

router.get('/overview', (_req, res) => {
  const users = db.get('users').value();
  const vendors = db.get('vendors').value();
  const reports = db.get('reports').value();
  const verifs = db.get('vendorVerificationRequests').value();

  const openReports = reports.filter(r => r.status !== 'resolved').length;
  const pendingVerifs = verifs.filter(v => v.status === 'pending').length;

  res.json({
    kpis: {
      totalUsers: users.length,
      totalVendors: vendors.length,
      openReports,
      pendingVerifs
    },
    queues: {
      pendingVerificationRequests: verifs.filter(v => v.status === 'pending').slice(0, 10),
      openReports: reports.filter(r => r.status !== 'resolved').slice(0, 10)
    }
  });
});

router.get('/users', (req, res) => {
  const q = (req.query.search || '').toString().toLowerCase().trim();
  let users = db.get('users').value();
  if (q) users = users.filter(u => (u.email || '').toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q));
  users = users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(users.map(safeUser));
});

router.post('/users/:id/set-role', (req, res) => {
  const role = req.body?.role;
  if (!['buyer', 'vendor', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const user = db.get('users').find({ id: req.params.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const before = safeUser(user);
  db.get('users').find({ id: user.id }).assign({ role }).write();
  const after = safeUser(db.get('users').find({ id: user.id }).value());
  audit({ adminUserId: req.user.id, action: 'set_role', entityType: 'user', entityId: user.id, before, after, note: '' });
  res.json(after);
});

router.post('/users/:id/disable', (req, res) => {
  const user = db.get('users').find({ id: req.params.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const before = safeUser(user);
  db.get('users').find({ id: user.id }).assign({ disabled: true }).write();
  const after = safeUser(db.get('users').find({ id: user.id }).value());
  audit({ adminUserId: req.user.id, action: 'disable_user', entityType: 'user', entityId: user.id, before, after, note: req.body?.note || '' });
  res.json(after);
});

router.post('/users/:id/enable', (req, res) => {
  const user = db.get('users').find({ id: req.params.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });
  const before = safeUser(user);
  db.get('users').find({ id: user.id }).assign({ disabled: false }).write();
  const after = safeUser(db.get('users').find({ id: user.id }).value());
  audit({ adminUserId: req.user.id, action: 'enable_user', entityType: 'user', entityId: user.id, before, after, note: req.body?.note || '' });
  res.json(after);
});

router.get('/vendors', (req, res) => {
  const status = (req.query.status || '').toString();
  let vendors = db.get('vendors').value();
  if (status === 'verified') vendors = vendors.filter(v => v.verified);
  if (status === 'unverified') vendors = vendors.filter(v => !v.verified);
  res.json(vendors);
});

router.get('/verification-requests', (req, res) => {
  const status = (req.query.status || 'pending').toString();
  let list = db.get('vendorVerificationRequests').value();
  if (status) list = list.filter(r => r.status === status);
  list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const vendors = db.get('vendors').value();
  const users = db.get('users').value();
  res.json(list.map(r => ({
    ...r,
    vendor: vendors.find(v => v.id === r.vendorId) || null,
    user: { id: r.userId, name: users.find(u => u.id === r.userId)?.name || 'Unknown', email: users.find(u => u.id === r.userId)?.email || '' }
  })));
});

router.post('/verification-requests/:id/approve', (req, res) => {
  const row = db.get('vendorVerificationRequests').find({ id: req.params.id }).value();
  if (!row) return res.status(404).json({ error: 'Request not found' });
  const before = { ...row };

  db.get('vendorVerificationRequests').find({ id: row.id }).assign({
    status: 'approved',
    adminNote: req.body?.adminNote || '',
    updatedAt: new Date().toISOString()
  }).write();
  db.get('vendors').find({ id: row.vendorId }).assign({ verified: true }).write();

  const after = db.get('vendorVerificationRequests').find({ id: row.id }).value();
  audit({ adminUserId: req.user.id, action: 'approve_verification', entityType: 'vendorVerificationRequest', entityId: row.id, before, after, note: '' });
  res.json(after);
});

router.post('/verification-requests/:id/reject', (req, res) => {
  const row = db.get('vendorVerificationRequests').find({ id: req.params.id }).value();
  if (!row) return res.status(404).json({ error: 'Request not found' });
  const before = { ...row };

  db.get('vendorVerificationRequests').find({ id: row.id }).assign({
    status: 'rejected',
    adminNote: req.body?.adminNote || '',
    updatedAt: new Date().toISOString()
  }).write();

  const after = db.get('vendorVerificationRequests').find({ id: row.id }).value();
  audit({ adminUserId: req.user.id, action: 'reject_verification', entityType: 'vendorVerificationRequest', entityId: row.id, before, after, note: '' });
  res.json(after);
});

router.post('/vendors/:id/verify', (req, res) => {
  const vendor = db.get('vendors').find({ id: req.params.id }).value();
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const before = { ...vendor };
  db.get('vendors').find({ id: vendor.id }).assign({ verified: true }).write();
  const after = db.get('vendors').find({ id: vendor.id }).value();
  audit({ adminUserId: req.user.id, action: 'verify_vendor', entityType: 'vendor', entityId: vendor.id, before, after, note: req.body?.note || '' });
  res.json(after);
});

router.post('/vendors/:id/unverify', (req, res) => {
  const vendor = db.get('vendors').find({ id: req.params.id }).value();
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  const before = { ...vendor };
  db.get('vendors').find({ id: vendor.id }).assign({ verified: false }).write();
  const after = db.get('vendors').find({ id: vendor.id }).value();
  audit({ adminUserId: req.user.id, action: 'unverify_vendor', entityType: 'vendor', entityId: vendor.id, before, after, note: req.body?.note || '' });
  res.json(after);
});

router.get('/reports', (req, res) => {
  const status = (req.query.status || '').toString();
  let list = db.get('reports').value();
  if (status) list = list.filter(r => r.status === status);
  list = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(list);
});

router.post('/reports/:id/resolve', (req, res) => {
  const report = db.get('reports').find({ id: req.params.id }).value();
  if (!report) return res.status(404).json({ error: 'Report not found' });
  const before = { ...report };
  db.get('reports').find({ id: report.id }).assign({ status: 'resolved', adminNote: req.body?.adminNote || '', updatedAt: new Date().toISOString() }).write();
  const after = db.get('reports').find({ id: report.id }).value();
  audit({ adminUserId: req.user.id, action: 'resolve_report', entityType: 'report', entityId: report.id, before, after, note: '' });
  res.json(after);
});

router.get('/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '50'), 200);
  const rows = db.get('adminAudit').value().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
  res.json(rows);
});

// Disputes
router.get('/disputes', (req, res) => {
  const disputes = (db.get('disputes').value() || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const orders = db.get('orders').value();
  const users = db.get('users').value();
  res.json(disputes.map(d => ({
    ...d,
    order: orders.find(o => o.id === d.orderId) || null,
    user: (u => u ? { id: u.id, name: u.name, email: u.email } : null)(users.find(u => u.id === d.userId))
  })));
});

router.post('/disputes/:id/resolve', (req, res) => {
  if (!db.get('disputes').value()) return res.status(404).json({ error: 'Not found' });
  const dispute = db.get('disputes').find({ id: req.params.id }).value();
  if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
  const { resolution } = req.body || {};
  const now = new Date().toISOString();
  db.get('disputes').find({ id: req.params.id }).assign({
    status: 'resolved',
    resolution: String(resolution || '').slice(0, 2000),
    updatedAt: now
  }).write();
  audit({ adminUserId: req.user.id, action: 'resolve_dispute', entityType: 'dispute', entityId: req.params.id, before: dispute, after: db.get('disputes').find({ id: req.params.id }).value(), note: '' });
  res.json(db.get('disputes').find({ id: req.params.id }).value());
});

module.exports = router;

