'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { EMPTY_SAVED_SHIPPING_ADDRESS, clearSavedShippingAddress, readSavedShippingAddress, saveShippingAddress, type SavedShippingAddress } from '@/lib/buyer-preferences';

export default function ProfilePage() {
  const { user, loading, updateUser } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [shippingAddress, setShippingAddress] = useState<SavedShippingAddress>(EMPTY_SAVED_SHIPPING_ADDRESS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shippingSaved, setShippingSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    if (user) setName(user.name);
    const savedAddress = readSavedShippingAddress();
    if (savedAddress) setShippingAddress(savedAddress);
  }, [user, loading, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setSaved(false); setError('');
    try {
      const updated = await api.updateProfile({ name: name.trim() });
      updateUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function updateShippingField(field: keyof SavedShippingAddress, value: string) {
    setShippingAddress((current) => ({ ...current, [field]: value }));
    setShippingSaved(false);
  }

  function handleSaveShippingAddress(e: React.FormEvent) {
    e.preventDefault();
    saveShippingAddress(shippingAddress);
    setShippingSaved(true);
    window.setTimeout(() => setShippingSaved(false), 2200);
  }

  function handleClearShippingAddress() {
    clearSavedShippingAddress();
    setShippingAddress(EMPTY_SAVED_SHIPPING_ADDRESS);
    setShippingSaved(false);
  }

  if (loading || !user) {
    return (
      <main className="page-shell">
        <div className="container">
          <div className="shimmer" style={{ height: 32, width: 220, borderRadius: 10 }} />
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="section-head" style={{ marginBottom: 28 }}>
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="section-title">My <em>profile</em></h1>
          </div>
        </div>

        {/* Quick links */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 32 }}>
          <Link href="/orders" className="pill btn-ghost btn-sm">📦 My orders</Link>
          <Link href="/wishlist" className="pill btn-ghost btn-sm">❤️ Wishlist</Link>
          {user.role === 'vendor' && (
            <Link href="/dashboard/vendor" className="pill btn-ghost btn-sm">🎨 Vendor dashboard</Link>
          )}
        </div>

        {/* Account info */}
        <div className="panel" style={{ padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 20px' }}>Account details</h2>

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Email
            </span>
            <div style={{ padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface-2)', fontSize: '.9rem', color: 'var(--muted)' }}>
              {user.email}
            </div>
            <p className="muted" style={{ fontSize: '.78rem', marginTop: 5 }}>Email cannot be changed here.</p>
          </div>

          <div style={{ marginBottom: 8 }}>
            <span style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
              Account type
            </span>
            <span className="chip" style={{ textTransform: 'capitalize' }}>{user.role}</span>
          </div>
        </div>

        <div className="panel" style={{ padding: 28, marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 20px' }}>Default shipping address</h2>

          <form onSubmit={handleSaveShippingAddress}>
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                className="input"
                value={shippingAddress.name}
                onChange={(e) => updateShippingField('name', e.target.value)}
                placeholder="Full name"
              />
              <input
                className="input"
                value={shippingAddress.line1}
                onChange={(e) => updateShippingField('line1', e.target.value)}
                placeholder="Street address"
              />
              <input
                className="input"
                value={shippingAddress.line2}
                onChange={(e) => updateShippingField('line2', e.target.value)}
                placeholder="Apt / suite (optional)"
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
                <input
                  className="input"
                  value={shippingAddress.city}
                  onChange={(e) => updateShippingField('city', e.target.value)}
                  placeholder="City"
                />
                <input
                  className="input"
                  value={shippingAddress.state}
                  onChange={(e) => updateShippingField('state', e.target.value)}
                  placeholder="State"
                  maxLength={3}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10 }}>
                <input
                  className="input"
                  value={shippingAddress.postal_code}
                  onChange={(e) => updateShippingField('postal_code', e.target.value)}
                  placeholder="ZIP code"
                />
                <select
                  className="input"
                  value={shippingAddress.country}
                  onChange={(e) => updateShippingField('country', e.target.value)}
                >
                  <option value="US">US</option>
                  <option value="CA">CA</option>
                  <option value="GB">UK</option>
                  <option value="AU">AU</option>
                </select>
              </div>
            </div>

            {shippingSaved && (
              <div className="alert alert-success" style={{ marginTop: 12 }}>
                ✓ Default address saved
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <button type="submit" className="pill btn-primary">
                Save address
              </button>
              <button type="button" className="pill btn-ghost btn-sm" onClick={handleClearShippingAddress}>
                Clear saved
              </button>
            </div>
            <p className="muted" style={{ fontSize: '.78rem', marginTop: 10, marginBottom: 0 }}>
              This default address is stored on this device and pre-fills checkout.
            </p>
          </form>
        </div>

        {/* Edit display name */}
        <div className="panel" style={{ padding: 28 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 20px' }}>Display name</h2>

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '.74rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your display name"
                style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid var(--border)', background: '#fafafa', fontSize: '.9rem', boxSizing: 'border-box' }}
              />
            </div>

            {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}

            {saved && (
              <div className="alert alert-success" style={{ marginBottom: 12 }}>
                ✓ Name updated successfully
              </div>
            )}

            <button
              type="submit"
              className="pill btn-primary"
              disabled={saving || !name.trim() || name.trim() === user.name}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
