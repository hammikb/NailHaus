'use client';

import Link from 'next/link';
import { useCart } from './CartProvider';

export function CartDrawer() {
  const { items, count, total, open, setOpen, removeItem, updateQty } = useCart();

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="cart-backdrop" onClick={() => setOpen(false)} />

      {/* Drawer */}
      <div className="cart-drawer">
        <div className="cart-drawer-header">
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Your cart</span>
            {count > 0 && (
              <span className="cart-drawer-count">{count} item{count !== 1 ? 's' : ''}</span>
            )}
          </div>
          <button className="cart-drawer-close" onClick={() => setOpen(false)} aria-label="Close cart">✕</button>
        </div>

        {items.length === 0 ? (
          <div className="cart-empty">
            <span style={{ fontSize: '3rem', opacity: 0.4 }}>🛒</span>
            <p style={{ margin: '12px 0 4px', fontWeight: 700 }}>Your cart is empty</p>
            <p className="muted" style={{ fontSize: '.88rem', margin: 0 }}>Add some nail sets to get started!</p>
            <Link href="/shop" className="pill btn-primary btn-sm" style={{ marginTop: 20 }} onClick={() => setOpen(false)}>
              Browse sets
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => {
                const key = `${item.productId}|${item.size || ''}`;
                return (
                  <div key={key} className="cart-item">
                    <div className="cart-item-thumb" style={{ background: item.bgColor }}>
                      {item.emoji}
                    </div>
                    <div className="cart-item-info">
                      <div style={{ fontWeight: 700, fontSize: '.9rem', lineHeight: 1.3, marginBottom: 2 }}>{item.name}</div>
                      {item.vendorName && (
                        <div className="muted" style={{ fontSize: '.76rem', marginBottom: 6 }}>{item.vendorName}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => updateQty(item.productId, item.qty - 1, item.size)} disabled={item.qty <= 1}>−</button>
                          <span className="qty-val">{item.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.productId, item.qty + 1, item.size)}>+</button>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '.95rem' }}>${(item.price * item.qty).toFixed(2)}</span>
                      </div>
                    </div>
                    <button
                      className="cart-item-remove"
                      onClick={() => removeItem(item.productId, item.size)}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-total-row">
                <span className="muted" style={{ fontSize: '.88rem' }}>Subtotal</span>
                <span style={{ fontWeight: 900, fontSize: '1.2rem' }}>${total.toFixed(2)}</span>
              </div>
              <p className="muted" style={{ fontSize: '.78rem', margin: '4px 0 16px' }}>Shipping calculated at checkout</p>
              <Link
                href="/cart"
                className="pill btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: '13px' }}
                onClick={() => setOpen(false)}
              >
                Checkout → ${total.toFixed(2)}
              </Link>
              <button
                className="pill btn-ghost btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                onClick={() => setOpen(false)}
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
