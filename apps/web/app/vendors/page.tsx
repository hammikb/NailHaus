'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VendorCard } from '@/components/VendorCard';
import { api } from '@/lib/api';
import { VendorSummary } from '@/lib/types';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<VendorSummary[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getVendors().then(v => {
      setVendors(v);
      setFiltered(v);
    }).catch(() => {
      setVendors([]);
      setFiltered([]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(val: string) {
    setSearch(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const q = val.toLowerCase().trim();
      setFiltered(q ? vendors.filter(v =>
        v.name.toLowerCase().includes(q) ||
        (v.tagline || '').toLowerCase().includes(q)
      ) : vendors);
    }, 280);
  }

  const verifiedCount = vendors.filter(v => v.verified).length;

  return (
    <main className="page-shell">
      <div className="container">
        {/* Header */}
        <div className="section-head" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">Artists</p>
            <h1 className="section-title">Browse <em>vendors</em></h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {verifiedCount > 0 && (
              <span className="verified-badge" style={{ fontSize: '.78rem' }}>✓ {verifiedCount} verified</span>
            )}
            <span className="muted" style={{ fontSize: '.9rem' }}>
              {loading ? '...' : `${filtered.length} storefronts`}
            </span>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 28 }}>
          <div className="filter-search-wrap" style={{ maxWidth: 440 }}>
            <span className="filter-search-icon">🔍</span>
            <input
              className="filter-search"
              placeholder="Search artists by name or style..."
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid vendor-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                  <div className="shimmer" style={{ width: 56, height: 56, borderRadius: 18, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="shimmer" style={{ height: 14, marginBottom: 8, width: '55%' }} />
                    <div className="shimmer" style={{ height: 12, width: '80%' }} />
                  </div>
                </div>
                <div className="shimmer" style={{ height: 12, width: '40%', marginBottom: 16 }} />
                <div className="shimmer" style={{ height: 36, borderRadius: 999 }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="panel empty-state">
            <span className="empty-icon">💅</span>
            <p>{search ? 'No artists match your search.' : 'No vendors found.'}</p>
            {search && (
              <button className="pill btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => handleSearch('')}>
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="grid vendor-grid fade-in">
            {filtered.map(vendor => <VendorCard key={vendor.id} vendor={vendor} />)}
          </div>
        )}
      </div>
    </main>
  );
}
