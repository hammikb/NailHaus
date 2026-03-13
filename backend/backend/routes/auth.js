const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { auth, SECRET, COOKIE_NAME } = require('../middleware');
const { sanitizeEmail, sanitizeText } = require('../utils');

const safe = user => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const sign = user => jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, SECRET, { expiresIn: '7d' });
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

router.post('/register', (req, res) => {
  const name = sanitizeText(req.body?.name, { max: 80 });
  const email = sanitizeEmail(req.body?.email);
  const password = String(req.body?.password || '');

  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (db.get('users').find({ email }).value()) return res.status(400).json({ error: 'An account with this email already exists' });

  const user = {
    id: uuidv4(),
    name,
    email,
    password: bcrypt.hashSync(password, 10),
    role: 'buyer',
    createdAt: new Date().toISOString()
  };

  db.get('users').push(user).write();
  const token = sign(user);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  return res.status(201).json({ token, user: safe(user) });
});

router.post('/login', (req, res) => {
  const email = sanitizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const user = db.get('users').find({ email }).value();

  if (!user || !password || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (user.disabled) return res.status(403).json({ error: 'Account disabled' });

  const token = sign(user);
  res.cookie(COOKIE_NAME, token, cookieOptions);
  return res.json({ token, user: safe(user) });
});

router.get('/me', auth, (req, res) => {
  const user = db.get('users').find({ id: req.user.id }).value();
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(safe(user));
});

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOptions);
  return res.json({ success: true });
});

module.exports = router;
