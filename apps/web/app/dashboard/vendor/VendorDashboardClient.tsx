'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { ImportResult, PayoutSummary, Product, ShippingRate, VendorDashboard } from '@/lib/types';

type Tab = 'overview' | 'products' | 'analytics' | 'import' | 'payouts' | 'profile';
type AnalyticsRow = { productId: string; name: string; emoji: string; bgColor: string; imageUrl: string | null; orders: number; units: number; revenue: number };
type ImportMode = 'json' | 'csv' | 'etsy';

const SHAPES = ['almond', 'coffin', 'stiletto', 'square', 'round'];
const STYLES = ['floral', 'minimal', 'glam', 'cute'];
const BADGES = ['', 'hot', 'new', 'sale'];
const OCCASIONS = ['wedding', 'everyday', 'event', 'festival', 'work', 'party', 'holiday'];

const CSV_TEMPLATE = 'name,description,price,stock,shape,style,badge,availability,productionDays,tags,occasions,emoji,bgColor,originalPrice,nailCount,sizes,finish,glueIncluded,reusable,wearTime';
const CSV_EXAMPLE = '"Cherry Blossom Set","Hand-painted floral spring design",24.99,10,almond,floral,new,in_stock,,floral;cherry,wedding;everyday,🌸,#ffe4f0,29.99,24,"XS;S;M;L",glossy,true,yes,"2-3 weeks"';

/* ─── Helpers ───────────────────────────────────────── */

function parseSizes(value: string) {
  return value
    .split(/[,;\n]/)
    .map((size) => size.trim())
    .filter(Boolean);
}

function normalizeSizeInventoryInput(
  sizes: string[],
  inventory: Record<string, string> = {}
) {
  return sizes.reduce<Record<string, string>>((acc, size) => {
    acc[size] = inventory[size] ?? '';
    return acc;
  }, {});
}

function toSizeInventoryPayload(inventory: Record<string, string>) {
  return Object.entries(inventory).reduce<Record<string, number>>(
    (acc, [size, value]) => {
      const parsed = parseInt(value, 10);
      acc[size] = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      return acc;
    },
    {}
  );
}

function getEffectiveStock(product: {
  stock: number;
  sizes?: string;
  sizeInventory?: Record<string, number>;
}) {
  const sizes = parseSizes(product.sizes || '');
  if (!sizes.length || !product.sizeInventory) return product.stock;
  return sizes.reduce(
    (sum, size) => sum + Math.max(0, Number(product.sizeInventory?.[size] ?? 0)),
    0
  );
}

function emptyForm() {
  return {
    name: '', description: '', price: '', originalPrice: '', stock: '',
    shape: 'almond', style: 'minimal', badge: '', availability: 'in_stock',
    productionDays: '', tags: '', occasions: [] as string[],
    emoji: '💅', bgColor: '#fde8e8',
    nailCount: '', sizes: '', sizeInventory: {} as Record<string, string>,
    finish: '', glueIncluded: '', reusable: '', wearTime: '',
  };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if (line[i] === ',' && !inQ) { result.push(current); current = ''; }
    else { current += line[i]; }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (values[i] || '').trim().replace(/^"|"$/g, ''); });
    return obj;
  });
}

function csvRowToProduct(row: Record<string, string>): Record<string, unknown> {
  return {
    name: row.name || '', description: row.description || '',
    price: parseFloat(row.price) || 0, stock: parseInt(row.stock) || 0,
    shape: row.shape || 'almond', style: row.style || 'minimal',
    badge: row.badge || null, availability: row.availability || 'in_stock',
    productionDays: row.productionDays ? parseInt(row.productionDays) : null,
    tags: row.tags ? row.tags.split(';').map(s => s.trim()).filter(Boolean) : [],
    occasions: row.occasions ? row.occasions.split(';').map(s => s.trim()).filter(Boolean) : [],
    emoji: row.emoji || '💅', bgColor: row.bgColor || '#fde8e8',
    originalPrice: row.originalPrice ? parseFloat(row.originalPrice) : null,
    nailCount: row.nailCount ? parseInt(row.nailCount) : null,
    sizes: row.sizes || '', finish: row.finish || '',
    glueIncluded: row.glueIncluded === 'true' ? true : row.glueIncluded === 'false' ? false : null,
    reusable: row.reusable === 'yes' ? true : row.reusable === 'no' ? false : null,
    wearTime: row.wearTime || '',
  };
}

/* ─── Etsy CSV parser ────────────────────────────────── */
function detectShape(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('coffin') || t.includes('ballerina')) return 'coffin';
  if (t.includes('stiletto') || t.includes('pointed')) return 'stiletto';
  if (t.includes('square')) return 'square';
  if (t.includes('round') || t.includes('oval')) return 'round';
  if (t.includes('almond')) return 'almond';
  return 'almond';
}
function detectStyle(text: string): string {
  const t = text.toLowerCase();
  if (/floral|flower|botanical|bloom|rose|cherry blossom|daisy/.test(t)) return 'floral';
  if (/glam|glitter|sparkle|rhinestone|bling|chrome|metallic|gold|crystal/.test(t)) return 'glam';
  if (/cute|kawaii|pastel|sweet|bow|bunny|kitty/.test(t)) return 'cute';
  return 'minimal';
}
function etsyRowToProduct(row: Record<string, string>): Record<string, unknown> {
  const title = row['TITLE'] || row['title'] || '';
  const description = row['DESCRIPTION'] || row['description'] || '';
  const rawTags = row['TAGS'] || row['tags'] || '';
  const tagList = rawTags.split(/[,;]/).map(t => t.trim()).filter(Boolean);
  const combined = `${title} ${description} ${rawTags}`.toLowerCase();
  const price = parseFloat(row['PRICE'] || row['price'] || '0') || 0;
  const qty = parseInt(row['QUANTITY'] || row['quantity'] || row['STOCK'] || '10') || 10;

  // Variation → sizes (Etsy VARIATION1_VALUES or similar)
  const sizesRaw = row['VARIATION1_VALUES'] || row['variation1_values'] || '';
  const sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(Boolean).join(', ') : '';

  return {
    name: title || 'Untitled',
    description,
    price,
    originalPrice: null,
    stock: qty,
    shape: detectShape(combined),
    style: detectStyle(combined),
    badge: null,
    availability: 'in_stock',
    productionDays: null,
    tags: tagList,
    occasions: [],
    emoji: '💅',
    bgColor: '#fde8e8',
    nailCount: null,
    sizes,
    sizeInventory: {},
    finish: '',
    glueIncluded: null,
    reusable: null,
    wearTime: '',
  };
}

function formToPayload(f: ReturnType<typeof emptyForm>): Record<string, unknown> {
  const sizeList = parseSizes(f.sizes);
  const sizeInventory = toSizeInventoryPayload(
    normalizeSizeInventoryInput(sizeList, f.sizeInventory)
  );
  const hasPerSizeInventory = sizeList.length > 0;

  return {
    name: f.name, description: f.description,
    price: parseFloat(f.price) || 0, originalPrice: f.originalPrice ? parseFloat(f.originalPrice) : null,
    stock: hasPerSizeInventory
      ? Object.values(sizeInventory).reduce((sum, count) => sum + count, 0)
      : parseInt(f.stock) || 0,
    shape: f.shape, style: f.style,
    badge: f.badge || null, availability: f.availability,
    productionDays: f.productionDays ? parseInt(f.productionDays) : null,
    tags: f.tags.split(',').map(s => s.trim()).filter(Boolean),
    occasions: f.occasions, emoji: f.emoji, bgColor: f.bgColor,
    nailCount: f.nailCount ? parseInt(f.nailCount) : null,
    sizes: sizeList.join(', '), sizeInventory, finish: f.finish,
    glueIncluded: f.glueIncluded === 'true' ? true : f.glueIncluded === 'false' ? false : null,
    reusable: f.reusable === 'yes' ? true : f.reusable === 'no' ? false : null,
    wearTime: f.wearTime,
  };
}

function productToForm(p: Product): ReturnType<typeof emptyForm> {
  const sizeList = parseSizes(p.sizes || '');
  return {
    name: p.name, description: p.description || '',
    price: String(p.price), originalPrice: p.originalPrice ? String(p.originalPrice) : '',
    stock: String(p.stock), shape: p.shape, style: p.style,
    badge: p.badge || '', availability: p.availability || 'in_stock',
    productionDays: p.productionDays ? String(p.productionDays) : '',
    tags: (p.tags || []).join(', '), occasions: p.occasions || [],
    emoji: p.emoji, bgColor: p.bgColor,
    nailCount: p.nailCount ? String(p.nailCount) : '', sizes: p.sizes || '',
    sizeInventory: normalizeSizeInventoryInput(
      sizeList,
      Object.fromEntries(
        sizeList.map((size) => [size, String(p.sizeInventory?.[size] ?? '')])
      )
    ),
    finish: p.finish || '',
    glueIncluded: p.glueIncluded === true ? 'true' : p.glueIncluded === false ? 'false' : '',
    reusable: p.reusable === true ? 'yes' : p.reusable === false ? 'no' : '',
    wearTime: p.wearTime || '',
  };
}

/* ─── Sparkline Chart ────────────────────────────────── */
function SparklineChart({ data }: { data: { label: string; rev: number }[] }) {
  if (!data.length) return null;
  const maxRev = Math.max(...data.map(d => d.rev), 1);
  const W = 100; const H = 52;
  const pad = 2;
  const pts = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2);
    const y = H - pad - (d.rev / maxRev) * (H - pad * 2);
    return { x, y, ...d };
  });
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `${pts[0].x},${H - pad} ${polyline} ${pts[pts.length - 1].x},${H - pad}`;
  const totalRev = data.reduce((s, d) => s + d.rev, 0);
  const avgRev = totalRev / data.length;
  const avgY = H - pad - (avgRev / maxRev) * (H - pad * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="sparkline" style={{ height: 80 }}>
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1={pad} y1={avgY} x2={W - pad} y2={avgY} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,2" />
        <polygon points={area} className="sparkline-area" />
        <polyline points={polyline} className="sparkline-line" />
        {pts.filter((_, i) => i % Math.ceil(pts.length / 6) === 0).map((p, i) => (
          <g key={i}>
            <line x1={p.x} y1={H - pad} x2={p.x} y2={H} stroke="var(--border)" strokeWidth="0.5" />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* ─── Field helpers ──────────────────────────────────── */
const FL: React.CSSProperties = { fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', display: 'block', marginBottom: 5 };
const FI: React.CSSProperties = { width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fafafa', fontSize: '.9rem', boxSizing: 'border-box', transition: 'border-color .15s' };
const FG: React.CSSProperties = { marginBottom: 13 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={FG}><label style={FL}>{label}</label>{children}</div>;
}

/* ─── Main Component ─────────────────────────────────── */
export function VendorDashboardClient() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [data, setData] = useState<VendorDashboard | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState('');

  // Revenue trend
  const [trend, setTrend] = useState<{ label: string; rev: number }[]>([]);

  // Product form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [imageActionLoading, setImageActionLoading] = useState<string | null>(null); // url being acted on

  // Import
  const [importMode, setImportMode] = useState<ImportMode>('json');
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  // Etsy import
  const [etsyRows, setEtsyRows] = useState<Record<string, unknown>[]>([]);
  const [etsyParseError, setEtsyParseError] = useState('');

  // Payouts
  const [payouts, setPayouts] = useState<PayoutSummary | null>(null);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsRow[] | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Shipping
  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [shippingShipmentId, setShippingShipmentId] = useState('');
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [buyingLabel, setBuyingLabel] = useState(false);
  const [labelResult, setLabelResult] = useState<{ orderId: string; trackingNumber: string; labelUrl: string; carrier: string } | null>(null);

  // Profile edit
  const [profileForm, setProfileForm] = useState({ name: '', tagline: '', description: '', emoji: '', bgColor: '', announcement: '', instagram: '', tiktok: '', pinterest: '', website: '', shipName: '', shipStreet1: '', shipStreet2: '', shipCity: '', shipState: '', shipZip: '', shipCountry: 'US' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState('');

  const loadDashboard = useCallback(() => {
    api.vendorDashboard().then(d => {
      setData(d); setProducts(d.products);
      const v = d.vendor;
      const addr = (v as { shipFromAddress?: Record<string, string> | null }).shipFromAddress;
      setProfileForm({
        name: v.name || '', tagline: v.tagline || '', description: v.description || '',
        emoji: v.emoji || '💅', bgColor: v.bgColor || '#fde8e8',
        announcement: v.announcement || '',
        instagram: v.socialLinks?.instagram || '', tiktok: v.socialLinks?.tiktok || '',
        pinterest: v.socialLinks?.pinterest || '', website: v.socialLinks?.website || '',
        shipName: addr?.name || '', shipStreet1: addr?.street1 || '', shipStreet2: addr?.street2 || '',
        shipCity: addr?.city || '', shipState: addr?.state || '', shipZip: addr?.zip || '',
        shipCountry: addr?.country || 'US',
      });
      setBannerUrl(v.bannerUrl || null);
    }).catch(err => setError(err.message));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    loadDashboard();
    api.getRevenueTrend().then(setTrend).catch(() => {});
  }, [user, loading, router, loadDashboard]);

  const loadPayouts = useCallback(() => {
    if (payouts) return;
    setPayoutsLoading(true);
    api.getPayouts().then(setPayouts).catch(() => {}).finally(() => setPayoutsLoading(false));
  }, [payouts]);

  useEffect(() => { if (tab === 'payouts') loadPayouts(); }, [tab, loadPayouts]);

  const loadAnalytics = useCallback(() => {
    if (analytics) return;
    setAnalyticsLoading(true);
    api.getAnalytics().then(setAnalytics).catch(() => setAnalytics([])).finally(() => setAnalyticsLoading(false));
  }, [analytics]);

  useEffect(() => { if (tab === 'analytics') loadAnalytics(); }, [tab, loadAnalytics]);

  /* Product CRUD */
  function startAdd() { setEditingId(null); setForm(emptyForm()); setFormError(''); setCurrentImageUrl(null); setProductImages([]); setImageUploadError(''); setShowForm(true); }
  function startEdit(p: Product) { setEditingId(p.id); setForm(productToForm(p)); setFormError(''); setCurrentImageUrl(p.imageUrl || null); setProductImages((p as Product & { images?: string[] }).images || []); setImageUploadError(''); setShowForm(true); }
  function cancelForm() { setShowForm(false); setEditingId(null); setFormError(''); setCurrentImageUrl(null); setProductImages([]); setImageUploadError(''); }
  function setField(k: string, v: string) {
    setForm(f => {
      if (k === 'sizes') {
        const nextSizes = parseSizes(v);
        return {
          ...f,
          sizes: v,
          sizeInventory: normalizeSizeInventoryInput(nextSizes, f.sizeInventory),
        };
      }
      return { ...f, [k]: v };
    });
  }
  function setSizeInventoryField(size: string, value: string) {
    if (!/^\d*$/.test(value)) return;
    setForm(f => ({
      ...f,
      sizeInventory: { ...f.sizeInventory, [size]: value },
    }));
  }
  function toggleOcc(o: string) { setForm(f => ({ ...f, occasions: f.occasions.includes(o) ? f.occasions.filter(x => x !== o) : [...f.occasions, o] })); }

  async function saveProduct() {
    setFormSaving(true); setFormError('');
    try {
      const payload = formToPayload(form);
      if (editingId) {
        const updated = await api.updateProduct(editingId, payload);
        setProducts(ps => ps.map(p => p.id === editingId ? updated : p));
        cancelForm();
      } else {
        const created = await api.createProduct(payload);
        setProducts(ps => [created, ...ps]);
        // Switch to edit mode so vendor can upload a photo
        setEditingId(created.id);
        setCurrentImageUrl(created.imageUrl || null);
        setImageUploadError('');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally { setFormSaving(false); }
  }

  async function uploadImage(file: File, setPrimary = false) {
    if (!editingId) return;
    setImageUploading(true); setImageUploadError('');
    try {
      const token = localStorage.getItem('nh_tok');
      const fd = new FormData();
      fd.append('file', file);
      if (setPrimary) fd.append('primary', 'true');
      const res = await fetch(`/api/products/${editingId}/image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      if (json.images) {
        setProductImages(json.images);
      }
      if (setPrimary || productImages.length === 0) {
        setCurrentImageUrl(json.imageUrl);
        setProducts(ps => ps.map(p => p.id === editingId ? { ...p, imageUrl: json.imageUrl } : p));
      }
    } catch (err: unknown) {
      setImageUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setImageUploading(false); }
  }

  async function setPrimaryImage(url: string) {
    if (!editingId) return;
    setImageActionLoading(url);
    try {
      const token = localStorage.getItem('nh_tok');
      const res = await fetch(`/api/products/${editingId}/images/primary`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('Failed');
      setCurrentImageUrl(url);
      setProducts(ps => ps.map(p => p.id === editingId ? { ...p, imageUrl: url } : p));
    } catch { /* ignore */ } finally { setImageActionLoading(null); }
  }

  async function deleteImage(url: string) {
    if (!editingId) return;
    setImageActionLoading(url);
    try {
      const token = localStorage.getItem('nh_tok');
      const res = await fetch(`/api/products/${editingId}/images/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed');
      setProductImages(json.images || []);
      setCurrentImageUrl(json.imageUrl || null);
      setProducts(ps => ps.map(p => p.id === editingId ? { ...p, imageUrl: json.imageUrl || null } : p));
    } catch { /* ignore */ } finally { setImageActionLoading(null); }
  }

  async function deleteProduct(id: string) {
    try {
      await api.deleteProduct(id);
      setProducts(ps => ps.filter(p => p.id !== id));
      setDeleteConfirm(null);
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Delete failed'); }
  }

  /* Import */
  async function runImport() {
    setImporting(true); setImportError(''); setImportResult(null);
    try {
      let parsed: Record<string, unknown>[];
      if (importMode === 'json') {
        parsed = JSON.parse(importText);
        if (!Array.isArray(parsed)) throw new Error('Expected a JSON array');
      } else {
        const rows = parseCSV(importText);
        if (!rows.length) throw new Error('No rows found');
        parsed = rows.map(csvRowToProduct);
      }
      const result = await api.importProducts(parsed);
      setImportResult(result);
      api.vendorDashboard().then(d => { setData(d); setProducts(d.products); }).catch(() => {});
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally { setImporting(false); }
  }

  function downloadCSV() {
    const blob = new Blob([[CSV_TEMPLATE, CSV_EXAMPLE].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nailhaus-import-template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => setImportText(String(ev.target?.result || ''));
    reader.readAsText(f);
  }

  function handleEtsyFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setEtsyParseError(''); setEtsyRows([]);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = String(ev.target?.result || '');
        const parsed = parseCSV(text);
        if (!parsed.length) throw new Error('No rows found — make sure the file has a header row.');
        const rows = parsed.map(etsyRowToProduct);
        setEtsyRows(rows);
      } catch (err) {
        setEtsyParseError(err instanceof Error ? err.message : 'Could not parse CSV');
      }
    };
    reader.readAsText(f);
  }

  async function runEtsyImport() {
    if (!etsyRows.length) return;
    setImporting(true); setImportError(''); setImportResult(null);
    try {
      const result = await api.importProducts(etsyRows);
      setImportResult(result);
      setEtsyRows([]);
      api.vendorDashboard().then(d => { setData(d); setProducts(d.products); }).catch(() => {});
    } catch (err: unknown) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally { setImporting(false); }
  }

  /* Banner image upload */
  async function uploadBanner(file: File) {
    setBannerUploading(true); setBannerUploadError('');
    try {
      const token = localStorage.getItem('nh_tok');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/vendors/me/image', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setBannerUrl(json.bannerUrl);
    } catch (err: unknown) {
      setBannerUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setBannerUploading(false); }
  }

  /* Profile save */
  async function saveProfile() {
    setProfileSaving(true); setProfileError(''); setProfileSaved(false);
    try {
      await api.updateVendorProfile({
        name: profileForm.name, tagline: profileForm.tagline,
        description: profileForm.description, emoji: profileForm.emoji,
        bgColor: profileForm.bgColor, announcement: profileForm.announcement,
        socialLinks: { instagram: profileForm.instagram, tiktok: profileForm.tiktok, pinterest: profileForm.pinterest, website: profileForm.website },
        shipFromAddress: {
          name: profileForm.shipName, street1: profileForm.shipStreet1, street2: profileForm.shipStreet2,
          city: profileForm.shipCity, state: profileForm.shipState, zip: profileForm.shipZip, country: profileForm.shipCountry || 'US',
        },
      });
      setProfileSaved(true);
      loadDashboard();
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: unknown) {
      setProfileError(err instanceof Error ? err.message : 'Save failed');
    } finally { setProfileSaving(false); }
  }

  /* Shipping */
  async function fetchShippingRates(orderId: string) {
    setShippingOrderId(orderId);
    setShippingRates([]);
    setSelectedRate(null);
    setShippingError('');
    setShippingLoading(true);
    try {
      const { shipmentId, rates } = await api.getShippingRates(orderId);
      setShippingShipmentId(shipmentId);
      setShippingRates(rates);
    } catch (e: unknown) {
      setShippingError(e instanceof Error ? e.message : 'Could not fetch rates');
    } finally {
      setShippingLoading(false);
    }
  }

  async function buyLabel() {
    if (!shippingOrderId || !selectedRate) return;
    setBuyingLabel(true);
    setShippingError('');
    try {
      const result = await api.purchaseLabel(shippingOrderId, { shipmentId: shippingShipmentId, rateId: selectedRate.rateId, carrierCost: selectedRate.carrierCost });
      setLabelResult({ orderId: shippingOrderId, trackingNumber: result.trackingNumber, labelUrl: result.labelUrl, carrier: result.carrier });
      setShippingOrderId(null);
      setShippingRates([]);
      setSelectedRate(null);
      loadDashboard();
    } catch (e: unknown) {
      setShippingError(e instanceof Error ? e.message : 'Failed to purchase label');
    } finally {
      setBuyingLabel(false);
    }
  }

  /* Loading / error states */
  if (loading || (!data && !error)) {
    return (
      <div className="container page-shell">
        <div className="panel" style={{ padding: 32 }}>
          <div className="shimmer" style={{ height: 28, width: 240, marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[...Array(4)].map((_, i) => <div key={i} className="shimmer" style={{ height: 88 }} />)}
          </div>
        </div>
      </div>
    );
  }
  if (error) return <div className="container page-shell"><div className="error" style={{ marginTop: 24 }}>{error}</div></div>;
  if (!data) return null;

  const stats = data.stats;
  const formSizes = parseSizes(form.sizes);
  const formSizeInventory = normalizeSizeInventoryInput(formSizes, form.sizeInventory);
  const formTotalStock = Object.values(toSizeInventoryPayload(formSizeInventory)).reduce((sum, count) => sum + count, 0);
  const lowStockProducts = products.filter(p => {
    const stock = getEffectiveStock(p);
    return stock > 0 && stock <= 3 && p.availability !== 'made_to_order';
  });
  const outOfStockProducts = products.filter(p => getEffectiveStock(p) === 0 && p.availability !== 'made_to_order');
  const filteredProducts = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || (p.tags || []).some(t => t.includes(productSearch.toLowerCase())))
    : products;

  return (
    <div className="container page-shell">
      {/* Header */}
      <div className="section-head" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Vendor dashboard</p>
          <h1 className="section-title">{data.vendor.name} <em>overview</em></h1>
        </div>
        {data.vendor.verified && <span className="verified-badge" style={{ fontSize: '.8rem', padding: '6px 14px' }}>✓ Verified vendor</span>}
      </div>

      {/* Low stock alerts */}
      {(outOfStockProducts.length > 0 || lowStockProducts.length > 0) && (
        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {outOfStockProducts.length > 0 && (
            <div className="alert alert-danger">
              <span>🚫</span>
              <span><strong>{outOfStockProducts.length} product{outOfStockProducts.length > 1 ? 's' : ''} out of stock:</strong> {outOfStockProducts.slice(0, 3).map(p => p.name).join(', ')}{outOfStockProducts.length > 3 ? '...' : ''}</span>
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="alert alert-warn">
              <span>⚠️</span>
              <span><strong>{lowStockProducts.length} product{lowStockProducts.length > 1 ? 's' : ''} running low:</strong> {lowStockProducts.map(p => `${p.name} (${getEffectiveStock(p)} left)`).slice(0, 3).join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Label purchased success */}
      {labelResult && (
        <div className="alert alert-success fade-in" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <strong>📦 Label purchased!</strong> Order #{labelResult.orderId.slice(0, 8)} — {labelResult.carrier} tracking: <strong>{labelResult.trackingNumber}</strong>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a href={labelResult.labelUrl} target="_blank" rel="noreferrer" className="pill btn-primary btn-sm">🖨️ Print label</a>
            <button className="pill btn-ghost btn-sm" onClick={() => setLabelResult(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Tab nav */}
      <div className="tab-nav">
        {(['overview', 'products', 'analytics', 'import', 'payouts', 'profile'] as Tab[]).map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? '📊 Overview' :
             t === 'products' ? `💅 Products (${products.length})` :
             t === 'analytics' ? '📈 Analytics' :
             t === 'import' ? '📥 Import' :
             t === 'payouts' ? '💰 Payouts' : '✏️ Profile'}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ══════════════════════════════ */}
      {tab === 'overview' && (
        <div className="fade-in">
          <div className="dashboard-grid">
            <div className="card kpi"><span className="kpi-icon">💅</span><strong>{stats.totalProducts}</strong><span className="kpi-label">Products</span></div>
            <div className="card kpi"><span className="kpi-icon">📦</span><strong>{stats.totalOrders}</strong><span className="kpi-label">Orders</span></div>
            <div className="card kpi kpi-accent"><strong>${stats.totalRevenue.toFixed(2)}</strong><span className="kpi-label">Revenue</span></div>
            <div className="card kpi"><span className="kpi-icon">⭐</span><strong>{stats.avgRating}</strong><span className="kpi-label">Avg rating</span></div>
            <div className="card kpi"><span className="kpi-icon">💬</span><strong>{stats.totalReviews}</strong><span className="kpi-label">Reviews</span></div>
            <div className="card kpi"><span className="kpi-icon">🚚</span><strong>{stats.openShipments}</strong><span className="kpi-label">Open shipments</span></div>
          </div>

          {/* Revenue trend */}
          {trend.length > 0 && (
            <div className="panel" style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p className="eyebrow" style={{ marginBottom: 4 }}>Revenue trend</p>
                  <div className="section-title" style={{ fontSize: '1.3rem' }}>Last <em>30 days</em></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>${trend.reduce((s, d) => s + d.rev, 0).toFixed(2)}</div>
                  <div className="muted" style={{ fontSize: '.78rem' }}>Total</div>
                </div>
              </div>
              <SparklineChart data={trend} />
            </div>
          )}

          {/* Fulfillment queue */}
          {data.fulfillmentQueue.length > 0 && (
            <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>🚀 Fulfillment <em>queue</em></h2>
                <span className="avail-pill avail-out">{data.fulfillmentQueue.length} pending</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'grid', gap: 10 }}>
                {data.fulfillmentQueue.map(order => (
                  <div key={order.id} className="list-item" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 3 }}>Order #{order.id.slice(0, 8)}</div>
                        <div className="muted" style={{ fontSize: '.83rem' }}>
                          {(order.items || []).map((item, i) => <span key={i}>{item.qty}× {item.product?.name || 'Product'}{i < (order.items || []).length - 1 ? ', ' : ''}</span>)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span className="muted" style={{ fontSize: '.82rem' }}>{new Date(order.createdAt).toLocaleDateString()}</span>
                        <button
                          className="pill btn-primary btn-sm"
                          onClick={() => fetchShippingRates(order.id)}
                          disabled={shippingLoading && shippingOrderId === order.id}
                        >
                          {shippingLoading && shippingOrderId === order.id ? 'Loading…' : '📦 Get rates'}
                        </button>
                      </div>
                    </div>

                    {/* Shipping rate selector for this order */}
                    {shippingOrderId === order.id && (
                      <div className="panel fade-in" style={{ marginTop: 12, padding: 16, background: 'var(--surface-2)' }}>
                        {shippingError && <div className="error" style={{ marginBottom: 10 }}>{shippingError}</div>}
                        {shippingLoading && <div className="muted" style={{ fontSize: '.88rem' }}>Fetching rates…</div>}
                        {!shippingLoading && shippingRates.length > 0 && (
                          <>
                            <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 10 }}>Choose a shipping rate:</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                              {shippingRates.map(rate => (
                                <label key={rate.rateId} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${selectedRate?.rateId === rate.rateId ? 'var(--accent)' : 'var(--border)'}`, background: selectedRate?.rateId === rate.rateId ? 'var(--accent-soft)' : 'var(--surface)' }}>
                                  <input type="radio" name={`rate-${order.id}`} checked={selectedRate?.rateId === rate.rateId} onChange={() => setSelectedRate(rate)} />
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 700 }}>{rate.carrier} {rate.service}</span>
                                    {rate.deliveryDays != null && <span className="muted" style={{ fontSize: '.8rem', marginLeft: 8 }}>{rate.deliveryDays} day{rate.deliveryDays !== 1 ? 's' : ''}</span>}
                                  </div>
                                  <span style={{ fontWeight: 800 }}>${rate.price.toFixed(2)}</span>
                                  <span className="muted" style={{ fontSize: '.72rem' }}>(carrier: ${rate.carrierCost.toFixed(2)} + $1.00)</span>
                                </label>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button className="pill btn-primary" onClick={buyLabel} disabled={!selectedRate || buyingLabel}>
                                {buyingLabel ? 'Purchasing…' : `Buy label · $${(selectedRate?.price ?? 0).toFixed(2)}`}
                              </button>
                              <button className="pill btn-ghost btn-sm" onClick={() => { setShippingOrderId(null); setShippingRates([]); setSelectedRate(null); setShippingError(''); }}>Cancel</button>
                            </div>
                          </>
                        )}
                        {!shippingLoading && shippingRates.length === 0 && !shippingError && (
                          <div className="muted" style={{ fontSize: '.88rem' }}>No rates available. Make sure your ship-from address is set in Profile.</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="two-col">
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>Recent <em>orders</em></h2>
              </div>
              <div style={{ padding: '12px 20px' }}>
                {data.recentOrders.length ? data.recentOrders.map(order => (
                  <div key={order.id} className="list-item" style={{ marginBottom: 8 }}>
                    <div className="between">
                      <strong>#{order.id.slice(0, 8)}</strong>
                      <span className="chip" style={{ fontSize: '.72rem' }}>{order.status}</span>
                    </div>
                    <div className="between" style={{ marginTop: 6 }}>
                      <span className="muted" style={{ fontSize: '.82rem' }}>{new Date(order.createdAt).toLocaleDateString()}</span>
                      <strong>${order.total?.toFixed(2) ?? '—'}</strong>
                    </div>
                  </div>
                )) : <div className="empty-state"><span className="empty-icon">📦</span><p>No orders yet.</p></div>}
              </div>
            </div>

            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
                <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>Recent <em>reviews</em></h2>
              </div>
              <div style={{ padding: '12px 20px' }}>
                {data.recentReviews.length ? data.recentReviews.map(review => (
                  <div key={review.id} className="list-item" style={{ marginBottom: 8 }}>
                    <div className="between">
                      <strong style={{ fontSize: '.9rem' }}>{review.user?.name || 'Anonymous'}</strong>
                      <span style={{ color: '#f59e0b' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                    </div>
                    {review.product && <div className="muted" style={{ fontSize: '.76rem', marginTop: 3 }}>{review.product.name}</div>}
                    <div className="subtle" style={{ marginTop: 5, fontSize: '.87rem', lineHeight: 1.5 }}>{review.body}</div>
                  </div>
                )) : <div className="empty-state"><span className="empty-icon">⭐</span><p>No reviews yet.</p></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PRODUCTS TAB ══════════════════════════════ */}
      {tab === 'products' && (
        <div className="fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <h2 className="section-title" style={{ fontSize: '1.4rem', margin: 0 }}>Your <em>products</em></h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {!showForm && <button className="pill btn-primary" onClick={startAdd}>+ Add product</button>}
            </div>
          </div>

          {/* Product form */}
          {showForm && (
            <div className="panel fade-in" style={{ padding: 28, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: '1.2rem' }}>{editingId ? '✏️ Edit product' : '✨ Add new product'}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="Name *">
                  <input style={FI} value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Cherry Blossom Set" />
                </Field>
                <Field label="Emoji">
                  <input style={{ ...FI, width: 80 }} value={form.emoji} onChange={e => setField('emoji', e.target.value)} />
                </Field>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Description">
                    <textarea style={{ ...FI, minHeight: 76, resize: 'vertical' }} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Describe this set..." />
                  </Field>
                </div>
                <Field label="Price * ($)">
                  <input style={FI} type="number" min="0.01" step="0.01" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="24.99" />
                </Field>
                <Field label="Compare-at price ($)">
                  <input style={FI} type="number" min="0.01" step="0.01" value={form.originalPrice} onChange={e => setField('originalPrice', e.target.value)} placeholder="29.99" />
                </Field>
                <Field label="Stock *">
                  <>
                    <input
                      style={FI}
                      type="number"
                      min="0"
                      value={formSizes.length > 0 ? String(formTotalStock) : form.stock}
                      onChange={e => setField('stock', e.target.value)}
                      placeholder="10"
                      disabled={formSizes.length > 0}
                    />
                    {formSizes.length > 0 && (
                      <div className="muted" style={{ fontSize: '.76rem', marginTop: 6 }}>
                        Total stock is calculated from the per-size inventory below.
                      </div>
                    )}
                  </>
                </Field>
                <Field label="Badge">
                  <select style={FI} value={form.badge} onChange={e => setField('badge', e.target.value)}>
                    {BADGES.map(b => <option key={b} value={b}>{b || 'None'}</option>)}
                  </select>
                </Field>
                <Field label="Shape">
                  <select style={FI} value={form.shape} onChange={e => setField('shape', e.target.value)}>
                    {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Style">
                  <select style={FI} value={form.style} onChange={e => setField('style', e.target.value)}>
                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Availability">
                  <select style={FI} value={form.availability} onChange={e => setField('availability', e.target.value)}>
                    <option value="in_stock">In stock</option>
                    <option value="made_to_order">Made to order</option>
                  </select>
                </Field>
                {form.availability === 'made_to_order' && (
                  <Field label="Production days">
                    <input style={FI} type="number" min="1" max="60" value={form.productionDays} onChange={e => setField('productionDays', e.target.value)} placeholder="7" />
                  </Field>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Tags (comma-separated)">
                    <input style={FI} value={form.tags} onChange={e => setField('tags', e.target.value)} placeholder="floral, spring, pink" />
                  </Field>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field label="Occasions">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
                      {OCCASIONS.map(o => (
                        <button key={o} type="button" onClick={() => toggleOcc(o)} className={`filter-pill${form.occasions.includes(o) ? ' active' : ''}`} style={{ padding: '6px 14px', fontSize: '.82rem' }}>{o}</button>
                      ))}
                    </div>
                  </Field>
                </div>
                <Field label="Background color">
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="color" value={form.bgColor} onChange={e => setField('bgColor', e.target.value)} style={{ height: 36, width: 48, border: 'none', cursor: 'pointer', borderRadius: 8, padding: 2 }} />
                    <input style={{ ...FI, flex: 1 }} value={form.bgColor} onChange={e => setField('bgColor', e.target.value)} />
                  </div>
                </Field>
                <Field label="Nail count">
                  <input style={FI} type="number" min="1" max="50" value={form.nailCount} onChange={e => setField('nailCount', e.target.value)} placeholder="24" />
                </Field>
                <Field label="Sizes">
                  <input style={FI} value={form.sizes} onChange={e => setField('sizes', e.target.value)} placeholder="XS, S, M, L, XL" />
                </Field>
                {formSizes.length > 0 && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Field label="Inventory by size">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                        {formSizes.map(size => (
                          <div key={size}>
                            <label style={{ ...FL, marginBottom: 6 }}>{size}</label>
                            <input
                              style={FI}
                              type="number"
                              min="0"
                              value={formSizeInventory[size] || ''}
                              onChange={e => setSizeInventoryField(size, e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    </Field>
                  </div>
                )}
                <Field label="Finish">
                  <input style={FI} value={form.finish} onChange={e => setField('finish', e.target.value)} placeholder="Glossy, matte, glitter..." />
                </Field>
                <Field label="Wear time">
                  <input style={FI} value={form.wearTime} onChange={e => setField('wearTime', e.target.value)} placeholder="2-3 weeks" />
                </Field>
                <Field label="Glue included?">
                  <select style={FI} value={form.glueIncluded} onChange={e => setField('glueIncluded', e.target.value)}>
                    <option value="">Not specified</option><option value="true">Yes</option><option value="false">No</option>
                  </select>
                </Field>
                <Field label="Reusable?">
                  <select style={FI} value={form.reusable} onChange={e => setField('reusable', e.target.value)}>
                    <option value="">Not specified</option><option value="yes">Yes</option><option value="no">No</option>
                  </select>
                </Field>
              </div>

              {/* Photos — only available once product has been saved (has an ID) */}
              {editingId ? (
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1.5px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <label style={FL}>Product photos ({productImages.length}/10)</label>
                    {productImages.length < 10 && (
                      <label style={{ cursor: 'pointer' }}>
                        <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--accent)', cursor: 'pointer', opacity: imageUploading ? 0.5 : 1 }}>
                          {imageUploading ? '⏳ Uploading...' : '+ Add photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: 'none' }}
                          disabled={imageUploading}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, productImages.length === 0); e.target.value = ''; }}
                        />
                      </label>
                    )}
                  </div>

                  {productImages.length === 0 ? (
                    <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: '24px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                      <div className="muted" style={{ fontSize: '.85rem', marginBottom: 12 }}>No photos yet</div>
                      <label style={{ cursor: 'pointer' }}>
                        <span className="pill btn-ghost btn-sm" style={{ pointerEvents: 'none' }}>
                          {imageUploading ? '⏳ Uploading...' : '📤 Upload first photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          style={{ display: 'none' }}
                          disabled={imageUploading}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, true); e.target.value = ''; }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 10 }}>
                      {productImages.map((url, i) => {
                        const isPrimary = url.split('?')[0] === (currentImageUrl || '').split('?')[0] || (i === 0 && !currentImageUrl);
                        const isActing = imageActionLoading === url;
                        return (
                          <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: isPrimary ? '2.5px solid var(--accent)' : '1.5px solid var(--border)', aspectRatio: '1', background: form.bgColor }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            {isPrimary && (
                              <div style={{ position: 'absolute', top: 4, left: 4, background: 'var(--accent)', color: '#fff', fontSize: '.65rem', fontWeight: 800, padding: '2px 6px', borderRadius: 6, letterSpacing: '.04em' }}>MAIN</div>
                            )}
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,.55)', display: 'flex', gap: 4, padding: '4px 5px' }}>
                              {!isPrimary && (
                                <button
                                  type="button"
                                  disabled={isActing}
                                  onClick={() => setPrimaryImage(url)}
                                  style={{ flex: 1, background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', fontSize: '.65rem', fontWeight: 700, borderRadius: 4, padding: '3px 0', cursor: 'pointer' }}
                                >
                                  {isActing ? '…' : 'Set main'}
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={isActing}
                                onClick={() => deleteImage(url)}
                                style={{ background: 'rgba(220,38,38,.7)', border: 'none', color: '#fff', fontSize: '.65rem', fontWeight: 700, borderRadius: 4, padding: '3px 6px', cursor: 'pointer' }}
                              >
                                {isActing ? '…' : '×'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="muted" style={{ fontSize: '.74rem', marginTop: 8 }}>JPG, PNG, WebP or GIF · max 5 MB · Up to 10 photos</div>
                  {imageUploadError && <div className="error" style={{ fontSize: '.82rem', marginTop: 6 }}>{imageUploadError}</div>}
                </div>
              ) : (
                <div className="muted" style={{ fontSize: '.78rem', marginTop: 16 }}>
                  Save the product first, then you can upload photos.
                </div>
              )}

              {formError && <div className="error" style={{ marginTop: 12 }}>{formError}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="pill btn-primary" onClick={saveProduct} disabled={formSaving}>{formSaving ? 'Saving...' : editingId ? 'Save changes' : 'Create product'}</button>
                <button className="pill btn-ghost" onClick={cancelForm}>Cancel</button>
              </div>
            </div>
          )}

          {/* Product search */}
          {products.length > 4 && (
            <div style={{ marginBottom: 14 }}>
              <input
                className="input"
                style={{ maxWidth: 320, borderRadius: 12 }}
                placeholder="Search your products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
              />
            </div>
          )}

          {filteredProducts.length === 0 ? (
            <div className="panel empty-state">
              <span className="empty-icon">💅</span>
              <p>{products.length === 0 ? 'No products yet. Add your first one or use Import.' : 'No products match your search.'}</p>
            </div>
          ) : (
            <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th><th>Price</th><th>Stock</th><th>Shape</th><th>Style</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(p => {
                    const effectiveStock = getEffectiveStock(p);
                    const sizeSummary = parseSizes(p.sizes || '')
                      .map(size => `${size}: ${p.sizeInventory?.[size] ?? 0}`)
                      .join(' · ');

                    return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: p.bgColor, display: 'grid', placeItems: 'center', fontSize: '1.3rem', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                            {p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrl} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : p.emoji}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{p.name}</div>
                            {p.badge && <span className={`badge-${p.badge}`} style={{ fontSize: '.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em' }}>{p.badge}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>${p.price}</strong>
                        {p.originalPrice && <span className="muted" style={{ marginLeft: 6, textDecoration: 'line-through', fontSize: '.82rem' }}>${p.originalPrice}</span>}
                      </td>
                      <td>
                        <span className={effectiveStock === 0 ? 'stock-out' : effectiveStock <= 3 ? 'stock-low' : 'stock-ok'}>{effectiveStock}</span>
                        {!!sizeSummary && (
                          <div className="muted" style={{ fontSize: '.72rem', marginTop: 4, lineHeight: 1.4 }}>
                            {sizeSummary}
                          </div>
                        )}
                        {effectiveStock > 0 && p.availability !== 'made_to_order' && (
                          <div className="progress-wrap" style={{ marginTop: 5, width: 60 }}>
                            <div className="progress-fill" style={{ width: `${Math.min(100, (effectiveStock / 20) * 100)}%`, background: effectiveStock <= 3 ? 'var(--warning)' : undefined }} />
                          </div>
                        )}
                      </td>
                      <td className="muted">{p.shape}</td>
                      <td className="muted">{p.style}</td>
                      <td>
                        <span className={`avail-pill ${p.availability === 'made_to_order' ? 'avail-made-to-order' : effectiveStock === 0 ? 'avail-out' : 'avail-in-stock'}`}>
                          {p.availability === 'made_to_order' ? 'MTO' : effectiveStock === 0 ? 'Out' : 'In stock'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="pill btn-ghost btn-sm" onClick={() => startEdit(p)}>Edit</button>
                          {deleteConfirm === p.id ? (
                            <span style={{ display: 'flex', gap: 4 }}>
                              <button className="pill btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>Confirm</button>
                              <button className="pill btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)}>×</button>
                            </span>
                          ) : (
                            <button className="pill btn-ghost btn-sm" style={{ color: 'var(--muted)' }} onClick={() => setDeleteConfirm(p.id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ ANALYTICS TAB ══════════════════════════════ */}
      {tab === 'analytics' && (
        <div className="fade-in">
          <div style={{ marginBottom: 20 }}>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Sales performance</p>
            <h2 className="section-title" style={{ fontSize: '1.4rem', margin: 0 }}>Product <em>analytics</em></h2>
          </div>

          {analyticsLoading ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="panel" style={{ padding: 18 }}>
                  <div className="shimmer" style={{ height: 20, width: '50%' }} />
                </div>
              ))}
            </div>
          ) : !analytics || analytics.length === 0 ? (
            <div className="panel empty-state">
              <span className="empty-icon">📈</span>
              <p>No sales data yet. Analytics will appear once you receive orders.</p>
            </div>
          ) : (
            <>
              {/* Summary KPIs */}
              <div className="dashboard-grid" style={{ marginBottom: 24 }}>
                <div className="card kpi">
                  <span className="kpi-icon">📦</span>
                  <strong>{analytics.reduce((s, r) => s + r.orders, 0)}</strong>
                  <span className="kpi-label">Total orders</span>
                </div>
                <div className="card kpi">
                  <span className="kpi-icon">💅</span>
                  <strong>{analytics.reduce((s, r) => s + r.units, 0)}</strong>
                  <span className="kpi-label">Units sold</span>
                </div>
                <div className="card kpi kpi-accent">
                  <strong>${analytics.reduce((s, r) => s + r.revenue, 0).toFixed(2)}</strong>
                  <span className="kpi-label">Total revenue</span>
                </div>
                <div className="card kpi">
                  <span className="kpi-icon">🏆</span>
                  <strong>{analytics[0]?.name?.split(' ').slice(0, 3).join(' ') || '—'}</strong>
                  <span className="kpi-label">Top product</span>
                </div>
              </div>

              {/* Per-product table */}
              <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Per-product breakdown</h3>
                  <span className="chip">{analytics.length} products</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
                        <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 800, fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Product</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Orders</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Units</th>
                        <th style={{ padding: '10px 20px', textAlign: 'right', fontWeight: 800, fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.map((row, i) => {
                        const maxRev = analytics[0].revenue || 1;
                        const barPct = Math.round((row.revenue / maxRev) * 100);
                        return (
                          <tr key={row.productId} style={{ borderBottom: i < analytics.length - 1 ? '1px solid var(--border-2)' : 'none' }}>
                            <td style={{ padding: '12px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: row.bgColor, display: 'grid', placeItems: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                  {row.emoji}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{row.name}</div>
                                  <div style={{ width: `${barPct}%`, minWidth: 4, height: 3, background: 'var(--accent)', borderRadius: 2, marginTop: 5, opacity: .6 }} />
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700 }}>{row.orders}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--muted)' }}>{row.units}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 800, color: 'var(--accent)' }}>${row.revenue.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ IMPORT TAB ════════════════════════════════ */}
      {tab === 'import' && (
        <div className="fade-in" style={{ maxWidth: 760 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 className="section-title" style={{ fontSize: '1.4rem' }}>Import your <em>entire show</em></h2>
            <p className="subtle">Upload your full catalog in one batch — up to 200 products. Use JSON, CSV, or import directly from Etsy.</p>
          </div>

          <div className="panel" style={{ padding: 28, marginBottom: 20 }}>
            <div className="tab-nav" style={{ marginBottom: 20 }}>
              <button className={`tab-btn${importMode === 'json' ? ' active' : ''}`} onClick={() => setImportMode('json')}>JSON</button>
              <button className={`tab-btn${importMode === 'csv' ? ' active' : ''}`} onClick={() => setImportMode('csv')}>CSV</button>
              <button className={`tab-btn${importMode === 'etsy' ? ' active' : ''}`} onClick={() => { setImportMode('etsy'); setEtsyRows([]); setEtsyParseError(''); setImportResult(null); }}>
                🛍️ Import from Etsy
              </button>
            </div>

            {importMode === 'json' ? (
              <div>
                <p className="muted" style={{ fontSize: '.875rem', marginBottom: 12 }}>
                  Paste a JSON array. Required fields: <code style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>name</code>, <code style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>price</code>, <code style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>stock</code>
                </p>
                <details style={{ marginBottom: 14 }}>
                  <summary style={{ cursor: 'pointer', fontSize: '.875rem', fontWeight: 700, color: 'var(--accent)' }}>View example JSON ↓</summary>
                  <pre style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 12, fontSize: '.76rem', overflow: 'auto', marginTop: 10, lineHeight: 1.6 }}>{JSON.stringify([{
                    name: "Cherry Blossom Set", description: "Hand-painted floral design",
                    price: 24.99, stock: 10, shape: "almond", style: "floral",
                    badge: "new", availability: "in_stock", tags: ["floral", "spring"],
                    occasions: ["wedding", "everyday"], emoji: "🌸", bgColor: "#ffe4f0",
                    nailCount: 24, sizes: "XS,S,M,L", finish: "glossy",
                    glueIncluded: true, reusable: true, wearTime: "2-3 weeks"
                  }], null, 2)}</pre>
                </details>
                <textarea style={{ ...FI, minHeight: 220, fontFamily: 'monospace', resize: 'vertical' }} value={importText} onChange={e => setImportText(e.target.value)} placeholder={'[\n  { "name": "My Set", "price": 24.99, "stock": 10 }\n]'} />
              </div>
            ) : (
              <div>
                <p className="muted" style={{ fontSize: '.875rem', marginBottom: 12 }}>
                  CSV with header row. Use semicolons <code style={{ background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>;</code> to separate multiple values in tags/occasions columns.
                </p>
                <div className="drop-zone" style={{ marginBottom: 14 }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setImportText(String(ev.target?.result || '')); r.readAsText(f); } }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Drop your CSV file here</div>
                  <div className="muted" style={{ fontSize: '.85rem', marginBottom: 14 }}>or use the buttons below</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="pill btn-ghost" onClick={downloadCSV}>⬇ Download template</button>
                    <label className="pill btn-ghost" style={{ cursor: 'pointer' }}>
                      📁 Choose file
                      <input type="file" accept=".csv,text/csv" onChange={handleCSVFile} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
                <textarea style={{ ...FI, minHeight: 180, fontFamily: 'monospace', fontSize: '.8rem', resize: 'vertical' }} value={importText} onChange={e => setImportText(e.target.value)} placeholder={`${CSV_TEMPLATE}\n${CSV_EXAMPLE}`} />
              </div>
            )}

            {importMode === 'etsy' && (
              <div>
                {/* Instructions */}
                <div className="panel" style={{ background: 'var(--info-bg)', border: '1px solid #bfdbfe', padding: '14px 18px', marginBottom: 20 }}>
                  <p style={{ fontWeight: 800, fontSize: '.88rem', marginBottom: 8, color: 'var(--info)' }}>How to export your Etsy listings:</p>
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: '.84rem', lineHeight: 1.8, color: 'var(--text-2)' }}>
                    <li>In Etsy, go to <strong>Shop Manager → Listings</strong></li>
                    <li>Click <strong>Options → Download data</strong> in the top-right</li>
                    <li>Choose <strong>All listings</strong> and click Export CSV</li>
                    <li>Upload that file below — we&apos;ll map your listings automatically</li>
                  </ol>
                </div>

                <div className="drop-zone" style={{ marginBottom: 16 }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) { setEtsyParseError(''); setEtsyRows([]); const r = new FileReader(); r.onload = ev => { try { const t = String(ev.target?.result || ''); const p = parseCSV(t); if (!p.length) throw new Error('No rows found'); setEtsyRows(p.map(etsyRowToProduct)); } catch (err) { setEtsyParseError(err instanceof Error ? err.message : 'Parse failed'); } }; r.readAsText(f); }
                  }}>
                  <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>🛍️</div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Drop your Etsy CSV here</div>
                  <div className="muted" style={{ fontSize: '.85rem', marginBottom: 14 }}>or choose a file</div>
                  <label className="pill btn-ghost" style={{ cursor: 'pointer' }}>
                    📁 Choose Etsy CSV
                    <input type="file" accept=".csv,text/csv" onChange={handleEtsyFile} style={{ display: 'none' }} />
                  </label>
                </div>

                {etsyParseError && <div className="error" style={{ marginBottom: 12 }}>{etsyParseError}</div>}

                {etsyRows.length > 0 && (
                  <div className="fade-in">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <p style={{ fontWeight: 700, fontSize: '.9rem', margin: 0 }}>
                        ✓ Parsed <strong style={{ color: 'var(--success)' }}>{etsyRows.length} listing{etsyRows.length !== 1 ? 's' : ''}</strong> — review before importing:
                      </p>
                      <button className="pill btn-ghost btn-sm" onClick={() => { setEtsyRows([]); setEtsyParseError(''); }}>✕ Clear</button>
                    </div>
                    <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 16 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-2)', position: 'sticky', top: 0 }}>
                            <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 800, fontSize: '.72rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Name</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, fontSize: '.72rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Price</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, fontSize: '.72rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Shape</th>
                            <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 800, fontSize: '.72rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Style</th>
                          </tr>
                        </thead>
                        <tbody>
                          {etsyRows.map((row, i) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--border-2)' }}>
                              <td style={{ padding: '8px 14px', fontWeight: 600 }}>{String(row.name).slice(0, 48)}{String(row.name).length > 48 ? '…' : ''}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right' }}>${Number(row.price).toFixed(2)}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'center', textTransform: 'capitalize' }}>{String(row.shape)}</td>
                              <td style={{ padding: '8px 14px', textAlign: 'center', textTransform: 'capitalize' }}>{String(row.style)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importError && <div className="error" style={{ marginBottom: 12 }}>{importError}</div>}

                {etsyRows.length > 0 && (
                  <button className="pill btn-primary" onClick={runEtsyImport} disabled={importing}>
                    {importing ? '⏳ Importing...' : `🚀 Import ${etsyRows.length} Etsy listing${etsyRows.length !== 1 ? 's' : ''}`}
                  </button>
                )}
              </div>
            )}

            {importMode !== 'etsy' && importError && <div className="error" style={{ marginTop: 12 }}>{importError}</div>}
            {importMode !== 'etsy' && (
              <button className="pill btn-primary" style={{ marginTop: 16 }} onClick={runImport} disabled={importing || !importText.trim()}>
                {importing ? '⏳ Importing...' : '🚀 Import products'}
              </button>
            )}
          </div>

          {importResult && (
            <div className="panel fade-in" style={{ padding: 28 }}>
              <h3 style={{ margin: '0 0 18px' }}>Import complete</h3>
              <div style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--success)' }}>{importResult.imported}</div>
                  <div className="muted" style={{ fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Imported</div>
                </div>
                {importResult.skipped > 0 && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--warning)' }}>{importResult.skipped}</div>
                    <div className="muted" style={{ fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Skipped</div>
                  </div>
                )}
              </div>
              {importResult.errors.map((e, i) => (
                <div key={i} className="alert alert-danger" style={{ marginBottom: 6 }}>
                  <strong>Row {e.row} — {e.name}:</strong> {e.error}
                </div>
              ))}
              {importResult.imported > 0 && (
                <button className="pill btn-primary" style={{ marginTop: 12 }} onClick={() => setTab('products')}>View products →</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ PAYOUTS TAB ═══════════════════════════════ */}
      {tab === 'payouts' && (
        <div className="fade-in" style={{ maxWidth: 680 }}>
          <h2 className="section-title" style={{ fontSize: '1.4rem', marginBottom: 22 }}>Earnings &amp; <em>payouts</em></h2>
          {payoutsLoading && (
            <div>
              {[...Array(3)].map((_, i) => <div key={i} className="shimmer" style={{ height: 88, marginBottom: 12 }} />)}
            </div>
          )}
          {payouts && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
                <div className="card kpi" style={{ background: 'linear-gradient(135deg,#fefce8,#fef9c3)', borderColor: '#fde68a' }}>
                  <strong style={{ color: 'var(--warning)' }}>${payouts.pendingNet.toFixed(2)}</strong>
                  <span className="kpi-label">Pending payout</span>
                  <span className="muted" style={{ fontSize: '.72rem', marginTop: 4 }}>Next: {payouts.nextPayoutDate}</span>
                </div>
                <div className="card kpi">
                  <strong>${payouts.lifetimeNet.toFixed(2)}</strong>
                  <span className="kpi-label">Lifetime earnings</span>
                </div>
                <div className="card kpi">
                  <strong>{Math.round(payouts.feeRate * 100)}%</strong>
                  <span className="kpi-label">Platform fee</span>
                  <span className="muted" style={{ fontSize: '.72rem' }}>Deducted from gross</span>
                </div>
              </div>

              {payouts.history.length > 0 ? (
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', fontWeight: 700 }}>Payout history</div>
                  <table className="data-table">
                    <thead><tr><th>Week of</th><th>Gross sales</th><th>Fee ({Math.round(payouts.feeRate * 100)}%)</th><th>Your earnings</th></tr></thead>
                    <tbody>
                      {payouts.history.map((week, i) => (
                        <tr key={i}>
                          <td>{week.weekOf}</td>
                          <td>${week.gross.toFixed(2)}</td>
                          <td style={{ color: 'var(--danger)' }}>-${week.fee.toFixed(2)}</td>
                          <td style={{ fontWeight: 800, color: 'var(--success)' }}>${week.net.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="panel empty-state"><span className="empty-icon">💰</span><p>No payout history yet.</p></div>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ PROFILE TAB ═══════════════════════════════ */}
      {tab === 'profile' && (
        <div className="fade-in" style={{ maxWidth: 680 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <h2 className="section-title" style={{ fontSize: '1.4rem', margin: 0 }}>Edit <em>profile</em></h2>
            {data.vendor.verified
              ? <span className="verified-badge">✓ Verified vendor</span>
              : <button className="pill btn-ghost btn-sm" onClick={() => { /* could link to verification */ }}>Request verification</button>}
          </div>

          {/* Live preview */}
          <div className="panel" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: profileForm.bgColor, display: 'grid', placeItems: 'center', fontSize: '2rem', flexShrink: 0, transition: 'all .2s', overflow: 'hidden' }}>
              {bannerUrl
                ? <img src={bannerUrl} alt="shop banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : profileForm.emoji}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{profileForm.name || 'Your shop name'}</div>
              <div className="muted" style={{ fontSize: '.88rem' }}>{profileForm.tagline || 'Your tagline'}</div>
            </div>
          </div>

          {/* Shop banner / logo upload */}
          <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
            <div className="muted" style={{ fontSize: '.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Shop photo / banner</div>
            {bannerUrl && (
              <div style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden', maxHeight: 160, background: '#f5f0f5' }}>
                <img src={bannerUrl} alt="shop banner" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <label style={{ display: 'inline-block', cursor: 'pointer' }}>
              <span className="pill btn-ghost btn-sm" style={{ pointerEvents: 'none' }}>
                {bannerUploading ? 'Uploading…' : bannerUrl ? '🔄 Replace photo' : '📷 Upload photo'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: 'none' }}
                disabled={bannerUploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadBanner(f); e.target.value = ''; }}
              />
            </label>
            {bannerUploadError && <div className="error" style={{ marginTop: 8, fontSize: '.85rem' }}>{bannerUploadError}</div>}
            <div className="muted" style={{ fontSize: '.75rem', marginTop: 8 }}>JPG, PNG, WebP or GIF · max 5 MB · Shown as your shop avatar and banner</div>
          </div>

          <div className="panel" style={{ padding: 28 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Shop name *">
                  <input style={FI} value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} />
                </Field>
              </div>
              <Field label="Emoji">
                <input style={{ ...FI, width: 80 }} value={profileForm.emoji} onChange={e => setProfileForm(f => ({ ...f, emoji: e.target.value }))} />
              </Field>
              <Field label="Brand color">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="color" value={profileForm.bgColor} onChange={e => setProfileForm(f => ({ ...f, bgColor: e.target.value }))} style={{ height: 36, width: 48, border: 'none', cursor: 'pointer', borderRadius: 8, padding: 2 }} />
                  <input style={{ ...FI, flex: 1 }} value={profileForm.bgColor} onChange={e => setProfileForm(f => ({ ...f, bgColor: e.target.value }))} />
                </div>
              </Field>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Tagline">
                  <input style={FI} value={profileForm.tagline} onChange={e => setProfileForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Your vibe in one line..." maxLength={120} />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="About your shop">
                  <textarea style={{ ...FI, minHeight: 100, resize: 'vertical' }} value={profileForm.description} onChange={e => setProfileForm(f => ({ ...f, description: e.target.value }))} placeholder="Tell customers who you are, your style, your process..." />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Shop announcement (shown at top of your page)">
                  <input style={FI} value={profileForm.announcement} onChange={e => setProfileForm(f => ({ ...f, announcement: e.target.value }))} placeholder="New collection dropping this weekend! 🌸" maxLength={240} />
                </Field>
              </div>
            </div>

            <hr className="divider" />
            <div className="muted" style={{ fontSize: '.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>Social links</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <Field label="📸 Instagram">
                <input style={FI} value={profileForm.instagram} onChange={e => setProfileForm(f => ({ ...f, instagram: e.target.value }))} placeholder="https://instagram.com/..." />
              </Field>
              <Field label="🎵 TikTok">
                <input style={FI} value={profileForm.tiktok} onChange={e => setProfileForm(f => ({ ...f, tiktok: e.target.value }))} placeholder="https://tiktok.com/@..." />
              </Field>
              <Field label="📌 Pinterest">
                <input style={FI} value={profileForm.pinterest} onChange={e => setProfileForm(f => ({ ...f, pinterest: e.target.value }))} placeholder="https://pinterest.com/..." />
              </Field>
              <Field label="🌐 Website">
                <input style={FI} value={profileForm.website} onChange={e => setProfileForm(f => ({ ...f, website: e.target.value }))} placeholder="https://yoursite.com" />
              </Field>
            </div>

            <hr className="divider" />
            <div className="muted" style={{ fontSize: '.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>📦 Ship-from address</div>
            <p className="muted" style={{ fontSize: '.8rem', margin: '0 0 14px' }}>Required to calculate and purchase shipping labels for your orders.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Full name / business name">
                  <input style={FI} value={profileForm.shipName} onChange={e => setProfileForm(f => ({ ...f, shipName: e.target.value }))} placeholder="Jane Doe" />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Street address">
                  <input style={FI} value={profileForm.shipStreet1} onChange={e => setProfileForm(f => ({ ...f, shipStreet1: e.target.value }))} placeholder="123 Main St" />
                </Field>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <Field label="Apt / suite (optional)">
                  <input style={FI} value={profileForm.shipStreet2} onChange={e => setProfileForm(f => ({ ...f, shipStreet2: e.target.value }))} placeholder="Apt 2B" />
                </Field>
              </div>
              <Field label="City">
                <input style={FI} value={profileForm.shipCity} onChange={e => setProfileForm(f => ({ ...f, shipCity: e.target.value }))} placeholder="New York" />
              </Field>
              <Field label="State">
                <input style={FI} value={profileForm.shipState} onChange={e => setProfileForm(f => ({ ...f, shipState: e.target.value }))} placeholder="NY" maxLength={3} />
              </Field>
              <Field label="ZIP / postal code">
                <input style={FI} value={profileForm.shipZip} onChange={e => setProfileForm(f => ({ ...f, shipZip: e.target.value }))} placeholder="10001" />
              </Field>
              <Field label="Country">
                <select style={FI} value={profileForm.shipCountry} onChange={e => setProfileForm(f => ({ ...f, shipCountry: e.target.value }))}>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </Field>
            </div>

            {profileError && <div className="error" style={{ marginTop: 12 }}>{profileError}</div>}
            {profileSaved && <div className="alert alert-success" style={{ marginTop: 12 }}>✓ Profile saved successfully!</div>}

            <button className="pill btn-primary" style={{ marginTop: 18 }} onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
