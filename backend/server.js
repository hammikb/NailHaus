require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = new Set(
  [process.env.APP_ORIGIN || 'http://localhost:3000', `http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`].filter(Boolean)
);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
}));

app.use('/api/auth', require('./backend/routes/auth'));
app.use('/api/products', require('./backend/routes/products'));
app.use('/api/vendors', require('./backend/routes/vendors'));
app.use('/api/reviews', require('./backend/routes/reviews'));
app.use('/api/orders', require('./backend/routes/orders'));
app.use('/api/shipments', require('./backend/routes/shipments'));
app.use('/api/admin', require('./backend/routes/admin'));
app.use('/api/reports', require('./backend/routes/reports'));
app.use('/api/discounts', require('./backend/routes/discounts'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/{*path}', (_req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.use((err, _req, res, _next) => {
  if (err?.message === 'Origin not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  console.error(err);
  return res.status(err?.status || 500).json({ error: 'Server error' });
});

app.listen(PORT, () => console.log(`\nNailHaus -> http://localhost:${PORT}\n`));
module.exports = app;
