'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { QuickView } from './QuickView';

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

export function ProductCard({ product }: { product: Product }) {
  const isOutOfStock = product.stock === 0 && product.availability !== 'made_to_order';
  const isLowStock = !isOutOfStock && product.availability !== 'made_to_order' && product.stock > 0 && product.stock <= 4;
  const salePct = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;
  const [hovering, setHovering] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);

  return (
    <>
      <div
        className="card product-card"
        style={{ position: 'relative' }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <Link href={`/products/${product.id}`} style={{ display: 'contents' }}>
          <div className="product-thumb" style={{ background: product.bgColor, position: 'relative', overflow: 'hidden' }}>
            {product.badge ? (
              <span className={`badge badge-${product.badge}`}>{product.badge.toUpperCase()}</span>
            ) : isOutOfStock ? (
              <span className="badge" style={{ background: 'rgba(0,0,0,.48)', color: 'white', borderColor: 'transparent' }}>Sold out</span>
            ) : null}
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 100vw, 260px"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <span className="emoji-wrap" style={{ fontSize: '3.6rem', lineHeight: 1 }}>{product.emoji}</span>
            )}
          </div>

          <div className="card-body">
            {product.vendor && (
              <div className="vendor-chip">
                <span className="vendor-chip-avatar" style={{ background: product.vendor.bgColor }}>{product.vendor.emoji}</span>
                {product.vendor.name}
              </div>
            )}

            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6, lineHeight: 1.3 }}>{product.name}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {product.rating > 0 ? (
                <>
                  <Stars rating={product.rating} />
                  <span className="muted" style={{ fontSize: '.76rem' }}>({product.reviewCount})</span>
                </>
              ) : <span className="muted" style={{ fontSize: '.76rem' }}>No reviews yet</span>}
              <span className="muted" style={{ fontSize: '.76rem' }}>· {product.shape} · {product.style}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="price" style={{ fontSize: '1.1rem' }}>${product.price}</span>
                {product.originalPrice ? <span className="price-strike">${product.originalPrice}</span> : null}
                {salePct ? <span className="sale-pct">{salePct}%</span> : null}
              </div>
              {isOutOfStock ? (
                <span className="avail-pill avail-out">Out of stock</span>
              ) : isLowStock ? (
                <span className="avail-pill" style={{ background: '#fef9c3', color: '#a16207' }}>Only {product.stock} left</span>
              ) : product.availability === 'made_to_order' ? (
                <span className="avail-pill avail-made-to-order">{product.productionDays ? `~${product.productionDays}d` : 'MTO'}</span>
              ) : (
                <span className="avail-pill avail-in-stock">In stock</span>
              )}
            </div>
          </div>
        </Link>

        {/* Quick view button — appears on hover */}
        {hovering && (
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setQuickViewId(product.id); }}
            style={{
              position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,.95)', border: '1.5px solid var(--border)',
              borderRadius: 999, padding: '6px 16px', fontWeight: 700, fontSize: '.78rem',
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow)',
              color: 'var(--text)',
              transition: 'all .15s',
              zIndex: 2,
            }}
          >
            Quick view
          </button>
        )}
      </div>

      {quickViewId && (
        <QuickView productId={quickViewId} onClose={() => setQuickViewId(null)} />
      )}
    </>
  );
}
