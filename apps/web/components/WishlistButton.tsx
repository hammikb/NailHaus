'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { api } from '@/lib/api';

interface Props {
  productId: string;
  style?: React.CSSProperties;
}

export function WishlistButton({ productId, style }: Props) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getWishlist()
      .then(list => setSaved(list.some(i => i.productId === productId)))
      .catch(() => {});
  }, [user, productId]);

  if (!user) return null;

  async function toggle() {
    setLoading(true);
    try {
      if (saved) {
        await api.removeFromWishlist(productId);
        setSaved(false);
      } else {
        await api.addToWishlist(productId);
        setSaved(true);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      style={{
        background: 'none',
        border: '1.5px solid var(--border)',
        borderRadius: 999,
        padding: '10px 16px',
        cursor: 'pointer',
        fontSize: '1.1rem',
        lineHeight: 1,
        transition: 'all .15s',
        color: saved ? '#e11d48' : 'var(--muted)',
        flexShrink: 0,
        ...style,
      }}
      title={saved ? 'Saved to wishlist' : 'Save to wishlist'}
    >
      {saved ? '❤️' : '🤍'}
    </button>
  );
}
