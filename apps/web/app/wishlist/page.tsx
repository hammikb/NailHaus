'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }

    async function load() {
      try {
        const list = await api.getWishlist();
        if (!list.length) { setFetching(false); return; }

        // Fetch each product
        const results = await Promise.allSettled(
          list.map(({ productId }) => api.getProduct(productId))
        );
        setProducts(results
          .filter((r): r is PromiseFulfilledResult<Product> => r.status === 'fulfilled')
          .map(r => r.value)
        );
      } catch {}
      setFetching(false);
    }
    load();
  }, [user, loading, router]);

  return (
    <main className="page-shell">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 24 }}>
          <div>
            <p className="eyebrow">Saved items</p>
            <h1 className="section-title">Your <em>wishlist</em></h1>
          </div>
          {products.length > 0 && <span className="chip">{products.length} item{products.length !== 1 ? 's' : ''}</span>}
        </div>

        {fetching ? (
          <div className="grid product-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card product-card">
                <div className="shimmer product-thumb" />
                <div className="card-body">
                  <div className="shimmer" style={{ height: 12, width: '45%', borderRadius: 5, marginBottom: 10 }} />
                  <div className="shimmer" style={{ height: 16, width: '80%', borderRadius: 5, marginBottom: 14 }} />
                  <div className="shimmer" style={{ height: 22, width: '40%', borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="panel empty-state">
            <span className="empty-icon">🤍</span>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>Nothing saved yet</p>
            <p className="muted" style={{ marginTop: 0, marginBottom: 20, fontSize: '.9rem' }}>
              Tap the heart on any product to save it here.
            </p>
            <Link href="/shop" className="pill btn-primary">Browse sets</Link>
          </div>
        ) : (
          <div className="grid product-grid fade-in">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </main>
  );
}
