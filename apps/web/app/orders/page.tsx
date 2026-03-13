'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  confirmed: { bg: 'var(--info-bg)', color: 'var(--info)', label: 'Confirmed' },
  shipped:   { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Shipped' },
  delivered: { bg: 'var(--success-bg)', color: 'var(--success)', label: 'Delivered' },
  cancelled: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: 'Cancelled' },
};

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (user) {
      api.getMyOrders()
        .then(setOrders)
        .catch(() => setOrders([]))
        .finally(() => setFetching(false));
    }
  }, [user, loading, router]);

  if (loading || fetching) {
    return (
      <main className="page-shell">
        <div className="container">
          <div className="list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="panel" style={{ padding: 24 }}>
                <div className="shimmer" style={{ height: 20, width: '40%', marginBottom: 12 }} />
                <div className="shimmer" style={{ height: 14, width: '70%' }} />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">Account</p>
            <h1 className="section-title">My <em>orders</em></h1>
          </div>
          <Link href="/shop" className="pill btn-ghost btn-sm">Continue shopping</Link>
        </div>

        {orders.length === 0 ? (
          <div className="panel empty-state">
            <span className="empty-icon">📦</span>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>No orders yet</p>
            <p className="muted" style={{ marginTop: 0, marginBottom: 20, fontSize: '.9rem' }}>
              Your orders will appear here after checkout.
            </p>
            <Link href="/shop" className="pill btn-primary">Browse sets</Link>
          </div>
        ) : (
          <div className="list">
            {orders.map(order => {
              const statusInfo = STATUS_STYLES[order.status] || STATUS_STYLES.confirmed;
              const items = order.order_items || [];
              return (
                <div key={order.id} className="panel" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 4 }}>
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                      <div className="muted" style={{ fontSize: '.82rem' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="chip" style={{ background: statusInfo.bg, color: statusInfo.color, borderColor: 'transparent' }}>
                        {statusInfo.label}
                      </span>
                      <span style={{ fontWeight: 900, fontSize: '1.1rem' }}>${Number(order.total).toFixed(2)}</span>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {items.map(item => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center',
                            fontSize: '1.2rem', background: item.products?.bg_color || '#fde8e8',
                          }}>
                            {item.products?.emoji || '💅'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.85rem' }}>{item.products?.name || 'Product'}</div>
                            <div className="muted" style={{ fontSize: '.74rem' }}>
                              {item.vendors?.name || ''} · Qty {item.qty} · ${Number(item.price).toFixed(2)} ea.
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
