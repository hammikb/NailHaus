'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from './CartProvider';

interface ProductForCart {
  id: string;
  name: string;
  price: number;
  emoji: string;
  bgColor: string;
  vendorId: string;
  vendorName?: string;
  vendorEmoji?: string;
  vendorBgColor?: string;
  sizes?: string;
  sizeInventory?: Record<string, number>;
  stock: number;
  availability?: string;
}

export function AddToCartSection({ product }: { product: ProductForCart }) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState('');
  const [added, setAdded] = useState(false);

  const sizeList = product.sizes
    ? product.sizes.split(/[,;]/).map(s => s.trim()).filter(Boolean)
    : [];
  const hasSizes = sizeList.length > 0;

  const selectedStock =
    selectedSize && product.sizeInventory
      ? product.sizeInventory[selectedSize] ?? null
      : null;

  const isMTO = product.availability === 'made_to_order';
  const isOos =
    !isMTO &&
    (hasSizes && selectedSize
      ? selectedStock !== null ? selectedStock === 0 : product.stock === 0
      : product.stock === 0);

  function handleAdd() {
    if (hasSizes && !selectedSize) {
      alert('Please select a size first');
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

  return (
    <>
      {hasSizes && (
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 10,
          }}>
            Select size {hasSizes && !selectedSize && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>*</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sizeList.map(size => {
              const inv = product.sizeInventory?.[size];
              const oos = !isMTO && inv !== undefined && inv === 0;
              const low = !oos && !isMTO && inv !== undefined && inv > 0 && inv <= 3;
              const selected = selectedSize === size;
              return (
                <button
                  key={size}
                  disabled={oos}
                  onClick={() => setSelectedSize(selected ? '' : size)}
                  style={{
                    position: 'relative',
                    padding: '8px 18px',
                    borderRadius: 999,
                    border: selected ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                    background: selected ? 'var(--accent)' : 'white',
                    color: selected ? 'white' : 'var(--text)',
                    fontWeight: 700,
                    fontSize: '.9rem',
                    cursor: oos ? 'not-allowed' : 'pointer',
                    opacity: oos ? 0.35 : 1,
                    transition: 'all .15s',
                  }}
                >
                  {size}
                  {low && (
                    <span style={{
                      fontSize: '.6rem', position: 'absolute', top: -5, right: -5,
                      background: '#f59e0b', color: 'white', borderRadius: 999,
                      minWidth: 16, height: 16, display: 'grid', placeItems: 'center', padding: '0 3px',
                    }}>
                      {inv}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedSize && selectedStock !== null && selectedStock !== undefined && selectedStock > 0 && selectedStock <= 3 && (
            <p style={{ marginTop: 8, fontSize: '.82rem', color: '#a16207', fontWeight: 600 }}>
              ⚠️ Only {selectedStock} left in size {selectedSize}
            </p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          className="pill btn-primary"
          style={{ flex: 1, justifyContent: 'center', fontSize: '1rem', padding: '13px 24px', minWidth: 160 }}
          onClick={handleAdd}
          disabled={isOos}
        >
          {added ? '✓ Added to cart!' : isOos ? 'Out of stock' : '🛒 Add to cart'}
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
    </>
  );
}
