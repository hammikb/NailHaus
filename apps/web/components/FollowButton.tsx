'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

const TOKEN_KEY = 'nh_tok';

function authFetch(path: string, method = 'GET') {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  return fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
}

export function FollowButton({ vendorId, style }: { vendorId: string; style?: React.CSSProperties }) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    authFetch(`/vendors/${vendorId}/follow`)
      .then(r => r.json())
      .then(data => { setFollowing(data.following); setChecked(true); })
      .catch(() => setChecked(true));
  }, [user, vendorId]);

  if (!user) return null;

  async function toggle() {
    if (loading) return;
    setLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      const res = await authFetch(`/vendors/${vendorId}/follow`, method);
      const data = await res.json();
      setFollowing(data.following);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  if (!checked) return null;

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`pill ${following ? 'btn-primary' : 'btn-ghost'}`}
      style={{ gap: 6, ...style }}
    >
      {following ? '♥ Following' : '♡ Follow'}
    </button>
  );
}
