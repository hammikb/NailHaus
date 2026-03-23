'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';

interface BundleProduct {
  id: string; name: string; price: number;
  emoji: string; bg_color: string; image_url: string | null;
}

interface Bundle {
  id: string; name: string; description?: string;
  discount_pct: number;
  bundle_items: Array<{ product_id: string; products: BundleProduct }>;
}

export function BundleSection({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const { addItem } = useCart();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}/bundles`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setBundles(data))
      .catch(() => {});
  }, [vendorId]);

  if (!bundles.length) return null;

  function addBundleToCart(bundle: Bundle) {
    bundle.bundle_items.forEach(({ products: p }) => {
      addItem({
        productId: p.id,
        name: p.name,
        price: bundle.discount_pct > 0
          ? parseFloat((p.price * (1 - bundle.discount_pct / 100)).toFixed(2))
          : p.price,
        emoji: p.emoji,
        bgColor: p.bg_color,
        vendorId,
        vendorName,
      });
    });
    setAdded(bundle.id);
    setTimeout(() => setAdded(null), 2500);
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <p className="eyebrow">Save more</p>
          <h2 className="section-title">Bundle <em>sets</em></h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {bundles.map(bundle => {
          const products = bundle.bundle_items.map(i => i.products);
          const originalTotal = products.reduce((s, p) => s + p.price, 0);
          const discountedTotal = bundle.discount_pct > 0
            ? originalTotal * (1 - bundle.discount_pct / 100)
            : originalTotal;

          return (
            <div key={bundle.id} className="panel" style={{ padding: 24 }}>
              {bundle.discount_pct > 0 && (
                <span className="sale-pct" style={{ marginBottom: 12, display: 'inline-block' }}>
                  {bundle.discount_pct}% off bundle
                </span>
              )}
              <h3 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.05rem' }}>{bundle.name}</h3>
              {bundle.description && (
                <p className="muted" style={{ fontSize: '.85rem', margin: '0 0 16px' }}>{bundle.description}</p>
              )}

              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {products.map(p => (
                  <Link key={p.id} href={`/products/${p.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 12,
                      background: p.bg_color || '#fde8e8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.6rem', overflow: 'hidden', border: '1px solid var(--border)',
                    }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : p.emoji}
                    </div>
                    <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--muted)', maxWidth: 56, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </span>
                  </Link>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <span style={{ fontWeight: 900, fontSize: '1.2rem' }}>${discountedTotal.toFixed(2)}</span>
                  {bundle.discount_pct > 0 && (
                    <span className="price-strike" style={{ marginLeft: 8 }}>${originalTotal.toFixed(2)}</span>
                  )}
                </div>
                <button
                  className="pill btn-primary btn-sm"
                  onClick={() => addBundleToCart(bundle)}
                >
                  {added === bundle.id ? '✓ Added!' : 'Add bundle to cart'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
