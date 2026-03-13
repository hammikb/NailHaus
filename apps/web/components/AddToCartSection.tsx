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

  return (
    <>
      {hasSizes && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: '.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              color: 'var(--muted)',
              marginBottom: 10,
            }}
          >
            Select size{' '}
            {!selectedSize && (
              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>*</span>
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
    </>
  );
}
