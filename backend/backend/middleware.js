const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('./db');

const COOKIE_NAME = 'nh_tok';
const envSecret = (process.env.JWT_SECRET || '').trim();

if (!envSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET is required in production');
}

const SECRET = envSecret || crypto.randomBytes(48).toString('hex');
if (!envSecret) {
  console.warn('[auth] JWT_SECRET is not set. Using an ephemeral development secret.');
}

function readToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  return req.cookies?.[COOKIE_NAME] || '';
}

function auth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.get('users').find({ id: payload.id }).value();
    if (!user || user.disabled) return res.status(401).json({ error: 'Authentication required' });
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET);
      const user = db.get('users').find({ id: payload.id }).value();
      if (user && !user.disabled) {
        req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
      }
    } catch {}
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

const requireAdmin = requireRole('admin');

module.exports = { auth, optionalAuth, requireRole, requireAdmin, SECRET, COOKIE_NAME };
