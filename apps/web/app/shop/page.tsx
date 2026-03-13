'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [shape, setShape] = useState('');
  const [style, setStyle] = useState('');
  const [occasion, setOccasion] = useState('');
  const [availability, setAvailability] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('popular');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((q: { search?: string; shape?: string; style?: string; occasion?: string; availability?: string; sort?: string; minPrice?: string; maxPrice?: string }) => {
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
    load({ sort });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilters(overrides: Record<string, string> = {}) {
    const q = { search, shape, style, occasion, availability, sort, minPrice, maxPrice, ...overrides };
    load(q);
  }

  function handleSearch(val: string) {
    setSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => applyFilters({ search: val }), 380);
  }

  function toggle(getter: string, setter: (v: string) => void, val: string, key: string) {
    const next = getter === val ? '' : val;
    setter(next);
    applyFilters({ [key]: next });
  }

  function setAndLoad(setter: (v: string) => void, val: string, key: string) {
    setter(val);
    applyFilters({ [key]: val });
  }

  const activeCount = [shape, style, occasion, availability, minPrice, maxPrice].filter(Boolean).length;

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">Shop</p>
            <h1 className="section-title">All <em>sets</em></h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {activeCount > 0 && (
              <button className="pill btn-ghost btn-sm" onClick={() => {
                setShape(''); setStyle(''); setOccasion(''); setAvailability(''); setSearch(''); setMinPrice(''); setMaxPrice('');
                load({ sort });
              }}>
                Clear {activeCount} filter{activeCount > 1 ? 's' : ''}
              </button>
            )}
            <span className="muted" style={{ fontSize: '.9rem' }}>
              {loading ? '...' : `${products.length} results`}
            </span>
          </div>
        </div>

        {/* Search + sort row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="filter-search-wrap" style={{ flex: 1, minWidth: 200 }}>
            <span className="filter-search-icon">🔍</span>
            <input
              className="filter-search"
              placeholder="Search sets, styles, shapes..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SORTS.map(s => (
              <button
                key={s.value}
                className={`filter-pill${sort === s.value ? ' active' : ''}`}
                style={{ padding: '8px 14px', fontSize: '.8rem' }}
                onClick={() => setAndLoad(setSort, s.value, 'sort')}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shape pills */}
        <div style={{ marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: '.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 10 }}>Shape</span>
          <div className="filter-bar" style={{ display: 'inline-flex', marginBottom: 0 }}>
            {SHAPES.map(s => (
              <button key={s} className={`filter-pill${shape === s ? ' active' : ''}`} onClick={() => toggle(shape, setShape, s, 'shape')}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Style pills */}
        <div style={{ marginBottom: 10 }}>
          <span className="muted" style={{ fontSize: '.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 10 }}>Style</span>
          <div className="filter-bar" style={{ display: 'inline-flex', marginBottom: 0 }}>
            {STYLES.map(s => (
              <button key={s} className={`filter-pill${style === s ? ' active' : ''}`} onClick={() => toggle(style, setStyle, s, 'style')}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Occasion + availability */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <span className="muted" style={{ fontSize: '.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 10 }}>Occasion</span>
            <div className="filter-bar" style={{ display: 'inline-flex', marginBottom: 0 }}>
              {OCCASIONS.map(o => (
                <button key={o} className={`filter-pill${occasion === o ? ' active' : ''}`} style={{ padding: '7px 14px', fontSize: '.8rem' }} onClick={() => toggle(occasion, setOccasion, o, 'occasion')}>
                  {o.charAt(0).toUpperCase() + o.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flexShrink: 0 }}>
            <span className="muted" style={{ fontSize: '.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 10 }}>Stock</span>
            <div className="filter-bar" style={{ display: 'inline-flex', marginBottom: 0 }}>
              <button className={`filter-pill${availability === 'in_stock' ? ' active' : ''}`} onClick={() => toggle(availability, setAvailability, 'in_stock', 'availability')}>In stock</button>
              <button className={`filter-pill${availability === 'made_to_order' ? ' active' : ''}`} onClick={() => toggle(availability, setAvailability, 'made_to_order', 'availability')}>Made to order</button>
            </div>
          </div>
        </div>

        {/* Price range */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <span style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Price</span>
          <input
            type="number"
            min="0"
            placeholder="Min $"
            value={minPrice}
            style={{ width: 80, padding: '6px 10px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '.85rem' }}
            onChange={e => { setMinPrice(e.target.value); applyFilters({ minPrice: e.target.value }); }}
          />
          <span className="muted" style={{ fontSize: '.85rem' }}>–</span>
          <input
            type="number"
            min="0"
            placeholder="Max $"
            value={maxPrice}
            style={{ width: 80, padding: '6px 10px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '.85rem' }}
            onChange={e => { setMaxPrice(e.target.value); applyFilters({ maxPrice: e.target.value }); }}
          />
          {(minPrice || maxPrice) && (
            <button
              className="pill btn-ghost btn-sm"
              onClick={() => { setMinPrice(''); setMaxPrice(''); applyFilters({ minPrice: '', maxPrice: '' }); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid product-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card" style={{ overflow: 'hidden' }}>
                <div className="shimmer" style={{ height: 190 }} />
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
          <div className="grid product-grid fade-in">
            {products.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </div>
    </main>
  );
}
