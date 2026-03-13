const COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function collapseWhitespace(value, multiline) {
  const normalized = String(value ?? '').replace(/\r\n?/g, '\n');
  if (multiline) {
    return normalized
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function sanitizeText(value, { max = 250, multiline = false, fallback = '' } = {}) {
  if (value === undefined || value === null) return fallback;
  const cleaned = collapseWhitespace(value, multiline)
    .replace(/[<>`]/g, '')
    .slice(0, max);
  return cleaned || fallback;
}

function sanitizeEmail(value) {
  const email = sanitizeText(value, { max: 254 }).toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '';
  return email;
}

function sanitizeColor(value, fallback = '#fde8e8') {
  const color = sanitizeText(value, { max: 7 }).toLowerCase();
  return COLOR_RE.test(color) ? color : fallback;
}

function sanitizeEnum(value, allowed, fallback) {
  const out = sanitizeText(value, { max: 50 }).toLowerCase();
  return allowed.includes(out) ? out : fallback;
}

function sanitizeTags(value, { maxItems = 8, maxLength = 24 } = {}) {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

  return [...new Set(list.map(item => sanitizeText(item, { max: maxLength }).toLowerCase()).filter(Boolean))].slice(0, maxItems);
}

function sanitizeInteger(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function sanitizeMoney(value, { min = 0, max = 100000, fallback = 0 } = {}) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed * 100) / 100));
}

function sanitizeUrl(value) {
  const url = sanitizeText(value, { max: 300 });
  if (!url) return '';
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function sanitizeUrlList(value, { maxItems = 6 } = {}) {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

  return [...new Set(list.map(sanitizeUrl).filter(Boolean))].slice(0, maxItems);
}

function sanitizeSocialLinks(value) {
  if (!value || typeof value !== 'object') return {};
  const next = {};
  for (const key of ['instagram', 'tiktok', 'website']) {
    const sanitized = sanitizeUrl(value[key]);
    if (sanitized) next[key] = sanitized;
  }
  return next;
}

function sanitizeAddress(value) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    name: sanitizeText(input.name, { max: 80 }),
    address: sanitizeText(input.address, { max: 120 }),
    city: sanitizeText(input.city, { max: 120 }),
  };
}

function toPublicVendor(vendor) {
  return {
    id: vendor.id,
    userId: vendor.userId,
    name: vendor.name,
    tagline: vendor.tagline || '',
    description: vendor.description || '',
    emoji: vendor.emoji || '',
    bgColor: vendor.bgColor || '#fde8e8',
    tags: Array.isArray(vendor.tags) ? vendor.tags : [],
    verified: !!vendor.verified,
    rating: Number(vendor.rating || 0),
    totalSales: Number(vendor.totalSales || 0),
    totalProducts: Number(vendor.totalProducts || 0),
    socialLinks: vendor.socialLinks || {},
    announcement: vendor.announcement || '',
    collections: Array.isArray(vendor.collections) ? vendor.collections : [],
    createdAt: vendor.createdAt
  };
}

module.exports = {
  sanitizeAddress,
  sanitizeColor,
  sanitizeEmail,
  sanitizeEnum,
  sanitizeInteger,
  sanitizeMoney,
  sanitizeSocialLinks,
  sanitizeTags,
  sanitizeText,
  sanitizeUrl,
  sanitizeUrlList,
  toPublicVendor,
};
