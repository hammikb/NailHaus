'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';

const SHAPES = ['almond', 'coffin', 'stiletto', 'square', 'round'];
const STYLES = ['floral', 'minimal', 'glam', 'cute'];
const OCCASIONS = ['wedding', 'everyday', 'event', 'festival', 'work', 'party', 'holiday'];
const SORTS = [
  { value: 'popular', label: 'Popular' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
];
const MIN_VIEW_SIZE = 170;
const MAX_VIEW_SIZE = 320;
const DEFAULT_VIEW_SIZE = 230;

function clampViewSize(value: number) {
  return Math.min(MAX_VIEW_SIZE, Math.max(MIN_VIEW_SIZE, value));
}

function getViewSizeLabel(value: number) {
  if (value <= 200) return 'Compact';
  if (value >= 280) return 'Spacious';
  return 'Balanced';
}

/* ─── Dropdown component ──────────────────────────────── */
function FilterDropdown({
  name, label, active, open, onToggle, children,
}: {
  name: string;
  label: string;
  active: boolean;
  open: boolean;
  onToggle: (name: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fdd-wrap">
      <button
        className={`fdd-trigger${active ? ' fdd-active' : ''}${open ? ' fdd-open' : ''}`}
        onClick={() => onToggle(name)}
        aria-expanded={open}
      >
        {label}
        <span className="fdd-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="fdd-menu">{children}</div>}
    </div>
  );
}

/* ─── Skeleton ────────────────────────────────────────── */
const Skeleton = () => (
  <main className="page-shell">
    <div className="container">
      <div className="grid product-grid" style={{ marginTop: 32 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card" style={{ overflow: 'hidden' }}>
            <div className="shimmer" style={{ height: 210 }} />
            <div style={{ padding: '18px 20px' }}>
              <div className="shimmer" style={{ height: 14, marginBottom: 8, width: '60%' }} />
              <div className="shimmer" style={{ height: 18, marginBottom: 12 }} />
              <div className="shimmer" style={{ height: 12, width: '80%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </main>
);

export default function ShopPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '');
  const [shape, setShape] = useState(() => searchParams.get('shape') ?? '');
  const [style, setStyle] = useState(() => searchParams.get('style') ?? '');
  const [occasion, setOccasion] = useState(() => searchParams.get('occasion') ?? '');
  const [availability, setAvailability] = useState(() => searchParams.get('availability') ?? '');
  const [minPrice, setMinPrice] = useState(() => searchParams.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('maxPrice') ?? '');
  const [sort, setSort] = useState(() => searchParams.get('sort') ?? 'popular');
  const [viewSize, setViewSize] = useState(() => {
    const param = Number(searchParams.get('view'));
    return Number.isFinite(param) ? clampViewSize(param) : DEFAULT_VIEW_SIZE;
  });
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!(e.target as Element).closest('.fdd-wrap')) setOpenFilter(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggleDropdown(name: string) {
    setOpenFilter(f => f === name ? null : name);
  }

  function pushParams(overrides: Record<string, string> = {}) {
    const current = { search, shape, style, occasion, availability, sort, minPrice, maxPrice, view: String(viewSize) };
    const merged = { ...current, ...overrides };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === 'sort' && v === 'popular') && !(k === 'view' && Number(v) === DEFAULT_VIEW_SIZE)) params.set(k, v);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const load = useCallback((q: {
    search?: string; shape?: string; style?: string; occasion?: string;
    availability?: string; sort?: string; minPrice?: string; maxPrice?: string;
  }) => {
    setLoading(true);
    api.getProducts({
      search: q.search || undefined,
      shape: q.shape || undefined,
      style: q.style || undefined,
      occasion: q.occasion || undefined,
      availability: q.availability || undefined,
      sort: q.sort || 'popular',
      minPrice: q.minPrice || undefined,
      maxPrice: q.maxPrice || undefined,
    }).then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load({ search, shape, style, occasion, availability, sort, minPrice, maxPrice });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(overrides: Record<string, string> = {}) {
    const q = { search, shape, style, occasion, availability, sort, minPrice, maxPrice, ...overrides };
    load(q);
    pushParams(overrides);
  }

  function handleSearch(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilters({ search: val }), 380);
  }

  function handlePriceChange(key: 'minPrice' | 'maxPrice', val: string) {
    if (key === 'minPrice') setMinPrice(val);
    else setMaxPrice(val);
    if (priceTimer.current) clearTimeout(priceTimer.current);
    priceTimer.current = setTimeout(() => applyFilters({ [key]: val }), 500);
  }

  function pick(setter: (v: string) => void, current: string, val: string, key: string) {
    const next = current === val ? '' : val;
    setter(next);
    applyFilters({ [key]: next });
    setOpenFilter(null);
  }

  function clearAll() {
    setShape(''); setStyle(''); setOccasion(''); setAvailability('');
    setSearch(''); setMinPrice(''); setMaxPrice('');
    load({ sort });
    pushParams({ search: '', shape: '', style: '', occasion: '', availability: '', minPrice: '', maxPrice: '' });
  }

  const activeCount = [shape, style, occasion, availability, minPrice, maxPrice].filter(Boolean).length;
  const sortLabel = SORTS.find(s => s.value === sort)?.label ?? 'Popular';
  const viewLabel = getViewSizeLabel(viewSize);
  const productGridStyle = { gridTemplateColumns: `repeat(auto-fill, minmax(${viewSize}px, 1fr))` };
  const availLabel = availability === 'in_stock' ? 'In stock' : availability === 'made_to_order' ? 'MTO' : null;
  const priceActive = !!(minPrice || maxPrice);
  const priceLabel = priceActive
    ? `$${minPrice || '0'} – ${maxPrice ? '$' + maxPrice : '∞'}`
    : 'Price';

  function handleViewSizeChange(nextValue: number) {
    const next = clampViewSize(nextValue);
    setViewSize(next);
    pushParams({ view: String(next) });
  }

  return (
    <main className="page-shell">
      <div className="container">

        {/* Page header */}
        <div className="section-head" style={{ marginBottom: 20 }}>
          <div>
            <p className="eyebrow">Shop</p>
            <h1 className="section-title">All <em>sets</em></h1>
          </div>
          <span className="muted" style={{ fontSize: '.9rem' }}>
            {loading ? '…' : `${products.length} results`}
          </span>
        </div>

        {/* ── Compact filter bar ─────────────────────── */}
        <div className="shop-filter-bar">

          {/* Search */}
          <div className="filter-search-wrap shop-search">
            <span className="filter-search-icon">🔍</span>
            <input
              className="filter-search"
              placeholder="Search sets, styles, shapes…"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>

          {/* Shape */}
          <FilterDropdown name="shape" label={shape ? shape.charAt(0).toUpperCase() + shape.slice(1) : 'Shape'} active={!!shape} open={openFilter === 'shape'} onToggle={toggleDropdown}>
            <div className="fdd-options">
              {SHAPES.map(s => (
                <button key={s} className={`fdd-option${shape === s ? ' active' : ''}`} onClick={() => pick(setShape, shape, s, 'shape')}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Style */}
          <FilterDropdown name="style" label={style ? style.charAt(0).toUpperCase() + style.slice(1) : 'Style'} active={!!style} open={openFilter === 'style'} onToggle={toggleDropdown}>
            <div className="fdd-options">
              {STYLES.map(s => (
                <button key={s} className={`fdd-option${style === s ? ' active' : ''}`} onClick={() => pick(setStyle, style, s, 'style')}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Occasion */}
          <FilterDropdown name="occasion" label={occasion ? occasion.charAt(0).toUpperCase() + occasion.slice(1) : 'Occasion'} active={!!occasion} open={openFilter === 'occasion'} onToggle={toggleDropdown}>
            <div className="fdd-options">
              {OCCASIONS.map(o => (
                <button key={o} className={`fdd-option${occasion === o ? ' active' : ''}`} onClick={() => pick(setOccasion, occasion, o, 'occasion')}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Price */}
          <FilterDropdown name="price" label={priceLabel} active={priceActive} open={openFilter === 'price'} onToggle={toggleDropdown}>
            <p style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', margin: '0 0 10px' }}>Price range</p>
            <div className="fdd-price-row">
              <input type="number" min="0" placeholder="Min $" value={minPrice} className="fdd-price-input" onChange={e => handlePriceChange('minPrice', e.target.value)} />
              <span className="muted">–</span>
              <input type="number" min="0" placeholder="Max $" value={maxPrice} className="fdd-price-input" onChange={e => handlePriceChange('maxPrice', e.target.value)} />
            </div>
            {priceActive && (
              <button className="fdd-clear-btn" onClick={() => { setMinPrice(''); setMaxPrice(''); applyFilters({ minPrice: '', maxPrice: '' }); setOpenFilter(null); }}>
                Clear price
              </button>
            )}
          </FilterDropdown>

          {/* Availability */}
          <FilterDropdown name="availability" label={availLabel ?? 'Stock'} active={!!availability} open={openFilter === 'availability'} onToggle={toggleDropdown}>
            <div className="fdd-options">
              <button className={`fdd-option${availability === 'in_stock' ? ' active' : ''}`} onClick={() => pick(setAvailability, availability, 'in_stock', 'availability')}>In stock</button>
              <button className={`fdd-option${availability === 'made_to_order' ? ' active' : ''}`} onClick={() => pick(setAvailability, availability, 'made_to_order', 'availability')}>Made to order</button>
            </div>
          </FilterDropdown>

          {/* Sort */}
          <FilterDropdown name="sort" label={`${sortLabel}`} active={sort !== 'popular'} open={openFilter === 'sort'} onToggle={toggleDropdown}>
            <div className="fdd-options" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              {SORTS.map(s => (
                <button key={s.value} className={`fdd-option fdd-option-row${sort === s.value ? ' active' : ''}`}
                  onClick={() => { setSort(s.value); applyFilters({ sort: s.value }); setOpenFilter(null); }}>
                  {s.label}
                  {sort === s.value && <span style={{ marginLeft: 'auto' }}>✓</span>}
                </button>
              ))}
            </div>
          </FilterDropdown>

          {/* Clear */}
          {activeCount > 0 && (
            <button className="pill btn-ghost btn-sm" onClick={clearAll} style={{ flexShrink: 0 }}>
              ✕ Clear {activeCount}
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20, marginTop: -8 }}>
            {shape && <span className="active-chip">{shape} <button onClick={() => pick(setShape, shape, shape, 'shape')}>✕</button></span>}
            {style && <span className="active-chip">{style} <button onClick={() => pick(setStyle, style, style, 'style')}>✕</button></span>}
            {occasion && <span className="active-chip">{occasion} <button onClick={() => pick(setOccasion, occasion, occasion, 'occasion')}>✕</button></span>}
            {availability && <span className="active-chip">{availability === 'in_stock' ? 'In stock' : 'Made to order'} <button onClick={() => pick(setAvailability, availability, availability, 'availability')}>✕</button></span>}
            {priceActive && <span className="active-chip">${minPrice || '0'} – {maxPrice ? '$' + maxPrice : '∞'} <button onClick={() => { setMinPrice(''); setMaxPrice(''); applyFilters({ minPrice: '', maxPrice: '' }); }}>✕</button></span>}
          </div>
        )}

        <div
          className="panel"
          style={{
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 120 }}>
            <div style={{ fontWeight: 800, fontSize: '.9rem' }}>View size</div>
            <div className="muted" style={{ fontSize: '.78rem' }}>{viewLabel} layout</div>
          </div>
          <span className="muted" style={{ fontSize: '.78rem' }}>Small</span>
          <input
            type="range"
            min={MIN_VIEW_SIZE}
            max={MAX_VIEW_SIZE}
            step={10}
            value={viewSize}
            onChange={(e) => handleViewSizeChange(Number(e.target.value))}
            aria-label="Adjust product grid size"
            style={{ flex: '1 1 220px', accentColor: 'var(--accent)' }}
          />
          <span className="muted" style={{ fontSize: '.78rem' }}>Large</span>
          <span
            className="chip"
            style={{ minWidth: 68, justifyContent: 'center', fontVariantNumeric: 'tabular-nums' }}
          >
            {viewSize}px
          </span>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid product-grid" style={productGridStyle}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card" style={{ overflow: 'hidden' }}>
                <div className="shimmer" style={{ height: 210 }} />
                <div style={{ padding: '18px 20px' }}>
                  <div className="shimmer" style={{ height: 14, marginBottom: 8, width: '60%' }} />
                  <div className="shimmer" style={{ height: 18, marginBottom: 12 }} />
                  <div className="shimmer" style={{ height: 12, width: '80%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="panel empty-state">
            <span className="empty-icon">💅</span>
            <p>No products match your filters. Try adjusting or clearing them.</p>
          </div>
        ) : (
          <div className="grid product-grid fade-in" style={productGridStyle}>
            {products.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </div>
    </main>
  );
}
