'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';

export default function CartPage() {
  const { items, count, total, removeItem, updateQty, clear } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleCheckout() {
    if (!user) { router.push('/login'); return; }
    if (!items.length) return;

    setPlacing(true);
    setError('');
    try {
      await api.checkout(items.map(i => ({ productId: i.productId, qty: i.qty })));
      clear();
      setSuccess('Order placed successfully! 🎉');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  }

  if (success) {
    return (
      <main className="page-shell">
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="panel" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
            <h1 className="section-title" style={{ marginBottom: 10 }}>Order <em>confirmed!</em></h1>
            <p className="subtle" style={{ lineHeight: 1.7, marginBottom: 24 }}>
              Your order has been placed. You'll receive updates from your vendors soon.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/orders" className="pill btn-primary">View my orders</Link>
              <Link href="/shop" className="pill btn-ghost">Continue shopping</Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="breadcrumb">
          <Link href="/shop">Shop</Link>
          <span>/</span>
          <span>Cart</span>
        </div>

        <div className="section-head" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">Shopping cart</p>
            <h1 className="section-title">Your <em>cart</em></h1>
          </div>
          {count > 0 && (
            <span className="chip">{count} item{count !== 1 ? 's' : ''}</span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="panel empty-state">
            <span className="empty-icon">🛒</span>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Your cart is empty</p>
            <p className="muted" style={{ marginTop: 0, marginBottom: 20, fontSize: '.9rem' }}>Browse our nail sets and find something you love.</p>
            <Link href="/shop" className="pill btn-primary">Browse sets</Link>
          </div>
        ) : (
          <div className="two-col" style={{ gap: 28, alignItems: 'start' }}>
            {/* Items list */}
            <div className="list">
              {items.map(item => (
                <div key={item.productId} className="panel" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 80, height: 80, borderRadius: 16, display: 'grid', placeItems: 'center',
                      fontSize: '2.4rem', background: item.bgColor, flexShrink: 0,
                    }}>
                      {item.emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, marginBottom: 3 }}>{item.name}</div>
                      {item.vendorName && (
                        <div className="muted" style={{ fontSize: '.82rem', marginBottom: 10 }}>{item.vendorName}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <div className="qty-control">
                          <button className="qty-btn" onClick={() => updateQty(item.productId, item.qty - 1)} disabled={item.qty <= 1}>−</button>
                          <span className="qty-val">{item.qty}</span>
                          <button className="qty-btn" onClick={() => updateQty(item.productId, item.qty + 1)}>+</button>
                        </div>
                        <span style={{ fontWeight: 800 }}>${(item.price * item.qty).toFixed(2)}</span>
                        <span className="muted" style={{ fontSize: '.82rem' }}>${item.price.toFixed(2)} each</span>
                      </div>
                    </div>
                    <button
                      className="pill btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', flexShrink: 0 }}
                      onClick={() => removeItem(item.productId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="panel" style={{ padding: 28, position: 'sticky', top: 90 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px' }}>Order summary</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {items.map(item => (
                  <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem' }}>
                    <span className="muted">{item.name} × {item.qty}</span>
                    <span style={{ fontWeight: 600 }}>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <hr className="divider" />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="muted" style={{ fontSize: '.9rem' }}>Subtotal</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>${total.toFixed(2)}</span>
              </div>
              <p className="muted" style={{ fontSize: '.78rem', margin: '0 0 20px' }}>Shipping calculated by vendor</p>

              {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

              {!user && (
                <div className="alert alert-info" style={{ marginBottom: 14 }}>
                  <span>Please <Link href="/login" style={{ fontWeight: 700, color: 'var(--info)' }}>sign in</Link> to place your order.</span>
                </div>
              )}

              <button
                className="pill btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: 14 }}
                disabled={placing || !items.length}
                onClick={handleCheckout}
              >
                {placing ? 'Placing order...' : user ? `Place order · $${total.toFixed(2)}` : 'Sign in to checkout'}
              </button>

              <Link href="/shop" className="pill btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                Continue shopping
              </Link>

              <div className="trust-grid" style={{ gridTemplateColumns: '1fr', gap: 8, marginTop: 20 }}>
                <div className="trust-card" style={{ padding: '10px 14px' }}>
                  <span className="trust-icon" style={{ fontSize: '1.2rem' }}>🛡️</span>
                  <div><div className="trust-title" style={{ fontSize: '.8rem' }}>Buyer protection</div></div>
                </div>
                <div className="trust-card" style={{ padding: '10px 14px' }}>
                  <span className="trust-icon" style={{ fontSize: '1.2rem' }}>🔒</span>
                  <div><div className="trust-title" style={{ fontSize: '.8rem' }}>Secure checkout</div></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
