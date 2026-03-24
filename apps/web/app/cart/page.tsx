'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { CheckoutShippingQuote } from '@/lib/types';

type ShippingForm = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const EMPTY_SHIPPING_FORM: ShippingForm = {
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
};

export default function CartPage() {
  const { items, count, total, removeItem, updateQty } = useCart();
  const { user } = useAuth();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [shippingForm, setShippingForm] = useState<ShippingForm>(EMPTY_SHIPPING_FORM);
  const [shippingQuote, setShippingQuote] = useState<CheckoutShippingQuote | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState('');

  const grandTotal = total + (shippingQuote?.totalPriceCharged || 0);

  function updateShippingField(field: keyof ShippingForm, value: string) {
    setShippingForm((current) => ({ ...current, [field]: value }));
    setShippingQuote(null);
    setShippingError('');
    setError('');
  }

  async function calculateShipping() {
    if (!items.length) return;
    setShippingLoading(true);
    setShippingError('');
    setError('');
    try {
      const response = await api.quoteCheckoutShipping(
        items.map((item) => ({ productId: item.productId, qty: item.qty, size: item.size })),
        shippingForm
      );
      setShippingForm((current) => ({ ...current, ...(response.shippingAddress as ShippingForm) }));
      setShippingQuote(response.quote);
    } catch (e) {
      setShippingQuote(null);
      setShippingError(e instanceof Error ? e.message : 'Could not calculate shipping.');
    } finally {
      setShippingLoading(false);
    }
  }

  async function handleCheckout() {
    if (!items.length) return;
    if (!shippingQuote) {
      setError('Calculate shipping before checkout.');
      return;
    }

    setPlacing(true);
    setError('');
    try {
      const { url } = await api.createStripeSession(
        items.map((item) => ({ productId: item.productId, qty: item.qty, size: item.size })),
        shippingForm
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 4px',
                        marginBottom: 8,
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

              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 10 }}>
                  Shipping address
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <input className="input" placeholder="Full name" value={shippingForm.name} onChange={(e) => updateShippingField('name', e.target.value)} />
                  <input className="input" placeholder="Street address" value={shippingForm.line1} onChange={(e) => updateShippingField('line1', e.target.value)} />
                  <input className="input" placeholder="Apt / suite (optional)" value={shippingForm.line2} onChange={(e) => updateShippingField('line2', e.target.value)} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
                    <input className="input" placeholder="City" value={shippingForm.city} onChange={(e) => updateShippingField('city', e.target.value)} />
                    <input className="input" placeholder="State" value={shippingForm.state} onChange={(e) => updateShippingField('state', e.target.value)} maxLength={3} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                    <input className="input" placeholder="ZIP code" value={shippingForm.postal_code} onChange={(e) => updateShippingField('postal_code', e.target.value)} />
                    <select className="input" value={shippingForm.country} onChange={(e) => updateShippingField('country', e.target.value)}>
                      <option value="US">US</option>
                      <option value="CA">CA</option>
                      <option value="GB">UK</option>
                      <option value="AU">AU</option>
                    </select>
                  </div>
                  <button
                    className="pill btn-ghost btn-sm"
                    style={{ justifyContent: 'center' }}
                    onClick={calculateShipping}
                    disabled={shippingLoading || !items.length}
                  >
                    {shippingLoading ? 'Calculating shipping…' : 'Calculate shipping'}
                  </button>
                </div>
                {shippingError && <p style={{ fontSize: '.78rem', color: 'var(--danger)', margin: '8px 0 0' }}>{shippingError}</p>}
                {shippingQuote && (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Standard shipping selected</div>
                    <div className="muted" style={{ fontSize: '.8rem', lineHeight: 1.5 }}>
                      {shippingQuote.vendors.map((quote) => (
                        <div key={quote.vendorId}>
                          {quote.vendorName}: {quote.carrier} {quote.service} · ${quote.priceCharged.toFixed(2)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="muted" style={{ fontSize: '.9rem' }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>${total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="muted" style={{ fontSize: '.9rem' }}>Shipping</span>
                <span style={{ fontWeight: 600 }}>
                  {shippingQuote ? `$${shippingQuote.totalPriceCharged.toFixed(2)}` : 'Calculate first'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="muted" style={{ fontSize: '.9rem' }}>Total</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>${grandTotal.toFixed(2)}</span>
              </div>
              <p className="muted" style={{ fontSize: '.78rem', margin: '0 0 20px' }}>
                Shipping is collected from the buyer now so each vendor can generate their own label later.
              </p>

              {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

              <button
                className="pill btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '1rem', padding: 14 }}
                disabled={placing || !items.length || !shippingQuote}
                onClick={handleCheckout}
              >
                {placing ? 'Redirecting to checkout…' : `Checkout · $${grandTotal.toFixed(2)}`}
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
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
