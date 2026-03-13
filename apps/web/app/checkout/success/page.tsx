'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';

export default function CheckoutSuccessPage() {
  const { clear } = useCart();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!cleared) {
      clear();
      setCleared(true);
    }
  }, [clear, cleared]);

  return (
    <main className="page-shell">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="panel" style={{ padding: 56, textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🎉</div>
          <h1 className="section-title" style={{ marginBottom: 10 }}>
            Order <em>confirmed!</em>
          </h1>
          <p className="subtle" style={{ lineHeight: 1.7, marginBottom: 8 }}>
            Payment received! Your vendors will be notified and will ship your order soon.
          </p>
          <p className="muted" style={{ fontSize: '.85rem', marginBottom: 28 }}>
            A confirmation email will be sent to you shortly.
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
