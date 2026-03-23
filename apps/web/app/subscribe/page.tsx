'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

interface Plan {
  id: string;
  name: string;
  description?: string;
  price_monthly: number;
  items_per_month: number;
  vendor_id: string;
  vendors?: { id: string; name: string; emoji: string };
}

export default function SubscribePage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/subscription-plans/public')
      .then(r => r.json())
      .then(data => Array.isArray(data) && setPlans(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function subscribe(planId: string) {
    if (!user) { window.location.href = '/login'; return; }
    setSubscribing(planId);
    setMessage('');
    try {
      const token = localStorage.getItem('nh_tok');
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) { setMessage(data.error || 'Could not subscribe.'); return; }
      if (data.url) { window.location.href = data.url; return; }
      setMessage('✓ Subscribed! You\'ll receive your box each month.');
    } catch {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setSubscribing(null);
    }
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 28 }}>
          <div>
            <p className="eyebrow">Monthly boxes</p>
            <h1 className="section-title">Nail <em>subscriptions</em></h1>
          </div>
        </div>

        <div style={{ maxWidth: 680, marginBottom: 32 }}>
          <p className="subtle">Subscribe to your favourite artists and get a curated nail set delivered every month. Cancel any time.</p>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="shimmer" style={{ height: 200, borderRadius: 20 }} />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="panel empty-state">
            <span className="empty-icon">📦</span>
            <p>No subscription boxes available yet.</p>
            <p className="muted" style={{ fontSize: '.88rem' }}>
              Are you a vendor?{' '}
              <Link href="/dashboard/vendor" style={{ color: 'var(--accent)', fontWeight: 700 }}>Create a plan</Link> in your dashboard.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {plans.map(plan => (
              <div key={plan.id} className="panel" style={{ padding: 28, display: 'flex', flexDirection: 'column' }}>
                {plan.vendors && (
                  <Link href={`/vendors/${plan.vendor_id}`} className="vendor-chip" style={{ marginBottom: 12 }}>
                    <span className="vendor-chip-avatar">{plan.vendors.emoji}</span>
                    {plan.vendors.name}
                  </Link>
                )}
                <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', fontWeight: 800 }}>{plan.name}</h2>
                {plan.description && (
                  <p className="muted" style={{ fontSize: '.88rem', margin: '0 0 16px', lineHeight: 1.6, flex: 1 }}>{plan.description}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: 900 }}>${plan.price_monthly.toFixed(2)}</span>
                  <span className="muted" style={{ fontSize: '.88rem' }}>/month</span>
                </div>
                <div className="chip" style={{ alignSelf: 'flex-start', marginBottom: 18 }}>
                  📦 {plan.items_per_month} set{plan.items_per_month !== 1 ? 's' : ''} per month
                </div>
                <button
                  className="pill btn-primary"
                  style={{ justifyContent: 'center' }}
                  disabled={subscribing === plan.id}
                  onClick={() => subscribe(plan.id)}
                >
                  {subscribing === plan.id ? 'Processing…' : 'Subscribe'}
                </button>
              </div>
            ))}
          </div>
        )}

        {message && (
          <div className={message.startsWith('✓') ? 'success' : 'error'} style={{ marginTop: 20, padding: '12px 16px', borderRadius: 12 }}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
