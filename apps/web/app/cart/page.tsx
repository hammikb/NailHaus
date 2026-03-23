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
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; type: string; value: number } | null>(null);

  const discountedTotal = appliedPromo ? Math.max(0, total - appliedPromo.discount) : total;

  async function applyPromo() {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await fetch(`/api/discount-codes/validate?code=${encodeURIComponent(promoInput)}&total=${total}`);
      const data = await res.json();
      if (!res.ok) { setPromoError(data.error || 'Invalid code'); return; }
      setAppliedPromo({ code: data.code, discount: data.discount, type: data.type, value: data.value });
      setPromoInput('');
    } catch {
      setPromoError('Could not apply code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  }

  async function handleCheckout() {
    if (!items.length) return;
    setPlacing(true);
    setError('');
    try {
      const { url } = await api.createStripeSession(
        items.map((item) => ({ productId: item.productId, qty: item.qty, size: item.size }))
      );
      if (url) window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed. Please try again.');
      setPlacing(false);
    }
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
            <p className="muted" style={{ marginTop: 0, marginBottom: 20, fontSize: '.9rem' }}>
              Browse our nail sets and find something you love.
            </p>
            <Link href="/shop" className="pill btn-primary">Browse sets</Link>
          </div>
        ) : (
          <div className="two-col" style={{ gap: 28, alignItems: 'start' }}>
            <div className="list">
              {(() => {
                // Group items by vendor
                const groups = items.reduce<Record<string, { vendorName: string; vendorId: string; items: typeof items }>>((acc, item) => {
                  const key = item.vendorId || 'unknown';
                  if (!acc[key]) acc[key] = { vendorName: item.vendorName || 'Indie Artist', vendorId: item.vendorId, items: [] };
                  acc[key].items.push(item);
                  return acc;
                }, {});
                const vendorGroups = Object.values(groups);
                const isMultiVendor = vendorGroups.length > 1;

                return vendorGroups.map((group) => (
                  <div key={group.vendorId}>
                    {isMultiVendor && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 4px', marginBottom: 8,
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <span style={{ fontSize: '.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)' }}>
                          From
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{group.vendorName}</span>
                        <span className="muted" style={{ fontSize: '.78rem', marginLeft: 'auto' }}>
                          ${group.items.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {group.items.map((item) => {
                      const itemKey = `${item.productId}|${item.size || ''}`;
                      return (
                        <div key={itemKey} className="panel" style={{ padding: 20, marginBottom: 10 }}>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                            <div
                              style={{
                                width: 80,
                                height: 80,
                                borderRadius: 16,
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: '2.4rem',
                                background: item.bgColor,
                                flexShrink: 0,
                              }}
                            >
                              {item.emoji}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 800, marginBottom: 3 }}>{item.name}</div>
                              {!isMultiVendor && item.vendorName && (
                                <div className="muted" style={{ fontSize: '.82rem', marginBottom: 10 }}>
                                  {item.vendorName}
                                </div>
                              )}
                              {item.size && (
                                <div className="muted" style={{ fontSize: '.8rem', marginBottom: 10 }}>
                                  Size: {item.size}
                                </div>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                                <div className="qty-control">
                                  <button
                                    className="qty-btn"
                                    onClick={() => updateQty(item.productId, item.qty - 1, item.size)}
                                    disabled={item.qty <= 1}
                                  >
                                    -
                                  </button>
                                  <span className="qty-val">{item.qty}</span>
                                  <button
                                    className="qty-btn"
                                    onClick={() => updateQty(item.productId, item.qty + 1, item.size)}
                                  >
                                    +
                                  </button>
                                </div>
                                <span style={{ fontWeight: 800 }}>${(item.price * item.qty).toFixed(2)}</span>
                                <span className="muted" style={{ fontSize: '.82rem' }}>
                                  ${item.price.toFixed(2)} each
                                </span>
                              </div>
                            </div>
                            <button
                              className="pill btn-ghost btn-sm"
                              style={{ color: 'var(--danger)', flexShrink: 0 }}
                              onClick={() => removeItem(item.productId, item.size)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {isMultiVendor && <div style={{ marginBottom: 20 }} />}
                  </div>
                ));
              })()}
            </div>

            <div className="panel" style={{ padding: 28, position: 'sticky', top: 90 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 20px' }}>Order summary</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {items.map((item) => (
                  <div
                    key={`${item.productId}|${item.size || ''}`}
                    style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.88rem' }}
                  >
                    <span className="muted">{item.name} x {item.qty}</span>
                    <span style={{ fontWeight: 600 }}>${(item.price * item.qty).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <hr className="divider" />

              {/* Promo code */}
              {!appliedPromo ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Promo code"
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={e => e.key === 'Enter' && applyPromo()}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid var(--border)', fontSize: '.85rem', minWidth: 0 }}
                    />
                    <button
                      onClick={applyPromo}
                      disabled={promoLoading || !promoInput.trim()}
                      className="pill btn-ghost btn-sm"
                      style={{ flexShrink: 0 }}
                    >
                      {promoLoading ? '…' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <p style={{ fontSize: '.78rem', color: 'var(--danger)', margin: '6px 0 0' }}>{promoError}</p>}
                </div>
              ) : (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 12, border: '1px solid #86efac', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '.85rem', fontWeight: 700, color: 'var(--success)' }}>
                    🏷️ {appliedPromo.code} — {appliedPromo.type === 'percent' ? `${appliedPromo.value}% off` : `$${appliedPromo.value} off`}
                  </span>
                  <button onClick={() => setAppliedPromo(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '.8rem' }}>✕</button>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="muted" style={{ fontSize: '.9rem' }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>${total.toFixed(2)}</span>
              </div>
              {appliedPromo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '.9rem', color: 'var(--success)' }}>Discount</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>−${appliedPromo.discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="muted" style={{ fontSize: '.9rem' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>${discountedTotal.toFixed(2)}</span>
              </div>
              <p className="muted" style={{ fontSize: '.78rem', margin: '0 0 20px' }}>Shipping calculated by vendor</p>

              {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

              <button
                className="pill btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: 14 }}
                disabled={placing || !items.length}
                onClick={handleCheckout}
              >
                {placing ? 'Redirecting to checkout…' : `Checkout · $${discountedTotal.toFixed(2)}`}
              </button>

              {!user && (
                <p className="muted" style={{ fontSize: '.78rem', textAlign: 'center', marginTop: 10 }}>
                  Checking out as guest.{' '}
                  <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>{' '}
                  to track your orders.
                </p>
              )}

              <Link href="/shop" className="pill btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}>
                Continue shopping
              </Link>

              <div className="trust-grid" style={{ gridTemplateColumns: '1fr', gap: 8, marginTop: 20 }}>
                <div className="trust-card" style={{ padding: '10px 14px' }}>
                  <span className="trust-icon" style={{ fontSize: '1.2rem' }}>✅</span>
                  <div><div className="trust-title" style={{ fontSize: '.8rem' }}>Verified sellers</div></div>
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
