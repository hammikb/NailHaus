'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { useCart } from './CartProvider';

interface QuickViewProps {
  productId: string;
  onClose: () => void;
}

function parseSizes(sizes?: string) {
  return sizes ? sizes.split(/[,;]/).map(s => s.trim()).filter(Boolean) : [];
}

export function QuickView({ productId, onClose }: QuickViewProps) {
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    api.getProduct(productId)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [productId]);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [close]);

  function handleAdd() {
    if (!product) return;
    const sizeList = parseSizes(product.sizes);
    if (sizeList.length > 0 && !selectedSize) {
      window.alert('Please select a size first');
      return;
    }
    addItem({
      productId: product.id,
      name: product.name + (selectedSize ? ` (${selectedSize})` : ''),
      price: product.price,
      emoji: product.emoji,
      bgColor: product.bgColor,
      vendorId: product.vendorId,
      vendorName: product.vendor?.name,
      size: selectedSize || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const sizeList = product ? parseSizes(product.sizes) : [];
  const salePct = product?.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 8000,
        background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 24,
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          style={{
            position: 'absolute', top: 16, right: 16, zIndex: 1,
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          ✕
        </button>

        {loading ? (
          <div style={{ padding: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="shimmer" style={{ height: 200, borderRadius: 16 }} />
            <div className="shimmer" style={{ height: 20, width: '60%' }} />
            <div className="shimmer" style={{ height: 16, width: '40%' }} />
          </div>
        ) : !product ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Could not load product.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
            {/* Image */}
            <div style={{
              background: product.bgColor || '#fde8e8',
              minHeight: 320,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '5rem', borderRadius: '24px 0 0 24px', overflow: 'hidden',
            }}>
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : product.emoji || '💅'}
            </div>

            {/* Info */}
            <div style={{ padding: '32px 28px 28px' }}>
              {product.vendor && (
                <div className="vendor-chip" style={{ marginBottom: 8 }}>
                  <span className="vendor-chip-avatar" style={{ background: product.vendor.bgColor }}>{product.vendor.emoji}</span>
                  {product.vendor.name}
                </div>
              )}

              <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 800, lineHeight: 1.25 }}>
                {product.name}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: '1.6rem', fontWeight: 900 }}>${product.price}</span>
                {product.originalPrice && <span className="price-strike">${product.originalPrice}</span>}
                {salePct && <span className="sale-pct">{salePct}% off</span>}
              </div>

              <p style={{ fontSize: '.88rem', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 16px' }}>
                {product.description?.slice(0, 180)}{(product.description?.length ?? 0) > 180 ? '…' : ''}
              </p>

              <div className="tags" style={{ margin: '0 0 16px' }}>
                <span className="tag">💅 {product.shape}</span>
                <span className="tag">🎨 {product.style}</span>
                {product.finish && <span className="tag">✨ {product.finish}</span>}
              </div>

              {/* Size picker */}
              {sizeList.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 8 }}>
                    Size {!selectedSize && <span style={{ color: 'var(--accent)' }}>*</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sizeList.map(size => {
                      const inv = product.sizeInventory?.[size];
                      const outOfStock = inv !== undefined && inv === 0;
                      return (
                        <button
                          key={size}
                          type="button"
                          disabled={outOfStock}
                          onClick={() => setSelectedSize(s => s === size ? '' : size)}
                          style={{
                            padding: '6px 14px', borderRadius: 999, fontWeight: 700, fontSize: '.85rem',
                            border: selectedSize === size ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                            background: selectedSize === size ? 'var(--accent)' : 'white',
                            color: selectedSize === size ? 'white' : 'var(--text)',
                            cursor: outOfStock ? 'not-allowed' : 'pointer',
                            opacity: outOfStock ? 0.35 : 1,
                          }}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="pill btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginBottom: 8, fontSize: '.95rem' }}
                onClick={handleAdd}
                disabled={sizeList.length > 0 && !selectedSize}
              >
                {added ? '✓ Added to cart' : sizeList.length > 0 && !selectedSize ? 'Select a size' : 'Add to cart'}
              </button>

              <Link
                href={`/products/${product.id}`}
                className="pill btn-ghost"
                style={{ width: '100%', justifyContent: 'center', fontSize: '.88rem' }}
                onClick={close}
              >
                View full details →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
