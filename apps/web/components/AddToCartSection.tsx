'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { NailSizingGuide } from './NailSizingGuide';

const SIZE_PROFILE_KEY = 'nh_size_profile';

interface ProductForCart {
  id: string;
  name: string;
  price: number;
  emoji: string;
  bgColor: string;
  vendorId: string;
  vendorName?: string;
  sizes?: string;
  sizeInventory?: Record<string, number>;
  stock: number;
  availability?: string;
}

function parseSizes(sizes?: string) {
  return sizes
    ? sizes
        .split(/[,;]/)
        .map((size) => size.trim())
        .filter(Boolean)
    : [];
}

export function AddToCartSection({ product }: { product: ProductForCart }) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState('');
  const [added, setAdded] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [savedSize, setSavedSize] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIZE_PROFILE_KEY);
      if (stored) setSavedSize(stored);
    } catch {}
  }, []);

  function saveProfile(size: string) {
    try { localStorage.setItem(SIZE_PROFILE_KEY, size); } catch {}
    setSavedSize(size);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }

  const sizeList = parseSizes(product.sizes);
  const hasSizes = sizeList.length > 0;
  const totalStock =
    hasSizes && product.sizeInventory
      ? sizeList.reduce(
          (sum, size) =>
            sum + Math.max(0, Number(product.sizeInventory?.[size] ?? 0)),
          0
        )
      : product.stock;

  const selectedStock =
    selectedSize && product.sizeInventory
      ? product.sizeInventory[selectedSize] ?? null
      : null;

  const isMadeToOrder = product.availability === 'made_to_order';
  const isOutOfStock =
    !isMadeToOrder &&
    (hasSizes && selectedSize
      ? selectedStock !== null
        ? selectedStock === 0
        : totalStock === 0
      : totalStock === 0);
  const canAdd = !isOutOfStock && (!hasSizes || Boolean(selectedSize));

  function handleAdd() {
    if (hasSizes && !selectedSize) {
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
      vendorName: product.vendorName,
      size: selectedSize || undefined,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  async function handleWaitlist() {
    if (!waitlistEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(waitlistEmail)) return;
    setWaitlistStatus('loading');
    try {
      const res = await fetch(`/api/products/${product.id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail }),
      });
      setWaitlistStatus(res.ok ? 'done' : 'error');
    } catch {
      setWaitlistStatus('error');
    }
  }

  return (
    <>
      {hasSizes && <NailSizingGuide />}
      {hasSizes && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div
              style={{
                fontSize: '.74rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--muted)',
              }}
            >
              Select size{' '}
              {!selectedSize && (
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>*</span>
              )}
            </div>
            {savedSize && sizeList.includes(savedSize) && selectedSize !== savedSize && (
              <button
                type="button"
                onClick={() => setSelectedSize(savedSize)}
                style={{ fontSize: '.74rem', fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Use saved ({savedSize})
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sizeList.map((size) => {
              const inventory = product.sizeInventory?.[size];
              const isSizeOutOfStock =
                !isMadeToOrder && inventory !== undefined && inventory === 0;
              const isLowStock =
                !isSizeOutOfStock &&
                !isMadeToOrder &&
                inventory !== undefined &&
                inventory > 0 &&
                inventory <= 3;
              const isSelected = selectedSize === size;

              return (
                <button
                  key={size}
                  type="button"
                  disabled={isSizeOutOfStock}
                  onClick={() => setSelectedSize(isSelected ? '' : size)}
                  style={{
                    position: 'relative',
                    padding: '8px 18px',
                    borderRadius: 999,
                    border: isSelected
                      ? '2px solid var(--accent)'
                      : '1.5px solid var(--border)',
                    background: isSelected ? 'var(--accent)' : 'white',
                    color: isSelected ? 'white' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: '.9rem',
                    cursor: isSizeOutOfStock ? 'not-allowed' : 'pointer',
                    opacity: isSizeOutOfStock ? 0.35 : 1,
                    transition: 'all .15s',
                  }}
                >
                  {size}
                  {isLowStock && (
                    <span
                      style={{
                        fontSize: '.6rem',
                        position: 'absolute',
                        top: -5,
                        right: -5,
                        background: '#f59e0b',
                        color: 'white',
                        borderRadius: 999,
                        minWidth: 16,
                        height: 16,
                        display: 'grid',
                        placeItems: 'center',
                        padding: '0 3px',
                      }}
                    >
                      {inventory}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedSize &&
            selectedStock !== null &&
            selectedStock !== undefined &&
            selectedStock > 0 &&
            selectedStock <= 3 && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: '.82rem',
                  color: '#a16207',
                  fontWeight: 600,
                }}
              >
                Only {selectedStock} left in size {selectedSize}
              </p>
            )}
          {selectedSize && selectedSize !== savedSize && (
            <button
              type="button"
              onClick={() => saveProfile(selectedSize)}
              style={{ marginTop: 8, fontSize: '.76rem', fontWeight: 600, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {profileSaved ? '✓ Size saved!' : `💾 Save ${selectedSize} as my default size`}
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="pill btn-primary"
          style={{
            flex: 1,
            justifyContent: 'center',
            fontSize: '1rem',
            padding: '13px 24px',
            minWidth: 160,
          }}
          onClick={handleAdd}
          disabled={!canAdd}
        >
          {added
            ? 'Added to cart'
            : isOutOfStock
              ? 'Out of stock'
              : hasSizes && !selectedSize
                ? 'Select a size'
                : 'Add to cart'}
        </button>
        {product.vendorId && (
          <Link
            className="pill btn-ghost"
            href={`/vendors/${product.vendorId}`}
            style={{ flexShrink: 0 }}
          >
            Visit shop
          </Link>
        )}
      </div>

      {/* Back in stock notification */}
      {isOutOfStock && !isMadeToOrder && (
        <div style={{ marginTop: 14, padding: '14px 16px', background: '#fef9ff', borderRadius: 12, border: '1px solid #f0e0eb' }}>
          {waitlistStatus === 'done' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a', fontWeight: 700, fontSize: '.88rem' }}>
              <span>✓</span> We&apos;ll email you when this comes back in stock!
            </div>
          ) : (
            <>
              <div style={{ fontSize: '.82rem', fontWeight: 700, color: '#9a4a7a', marginBottom: 8 }}>
                🔔 Notify me when back in stock
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleWaitlist()}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '.85rem', minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={handleWaitlist}
                  disabled={waitlistStatus === 'loading'}
                  style={{ padding: '8px 16px', borderRadius: 10, background: '#c45990', color: '#fff', border: 'none', fontWeight: 700, fontSize: '.85rem', cursor: 'pointer', flexShrink: 0 }}
                >
                  {waitlistStatus === 'loading' ? '…' : 'Notify me'}
                </button>
              </div>
              {waitlistStatus === 'error' && (
                <div style={{ fontSize: '.78rem', color: 'var(--danger)', marginTop: 6 }}>Something went wrong. Please try again.</div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
