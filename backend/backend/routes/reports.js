const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth } = require('../middleware');

router.post('/', auth, (req, res) => {
  const { targetType, targetId, reason, details } = req.body || {};
  if (!targetType || !targetId || !reason) return res.status(400).json({ error: 'targetType, targetId, and reason are required' });
  if (!['product', 'review', 'vendor'].includes(targetType)) return res.status(400).json({ error: 'Invalid targetType' });

  const report = {
    id: uuidv4(),
    reporterUserId: req.user.id,
    targetType,
    targetId,
    reason: String(reason).slice(0, 120),
    details: String(details || '').slice(0, 2000),
    status: 'open',
    adminNote: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.get('reports').push(report).write();
  res.status(201).json(report);
});

router.get('/my', auth, (req, res) => {
  const list = db.get('reports').filter({ reporterUserId: req.user.id }).value();
  res.json(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

module.exports = router;

