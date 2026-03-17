'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { authStorage } from '@/lib/api';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    async function complete() {
      // Supabase JS client handles the PKCE code exchange or hash-based token
      // automatically when getSession() is called after a redirect.
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setError('Authentication failed. Please try signing in again.');
        return;
      }

      try {
        const res = await fetch('/api/auth/oauth-complete', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Sign-in failed');
        }

        const user = await res.json();
        authStorage.save({ token: session.access_token, user });

        router.replace(user.role === 'vendor' ? '/dashboard/vendor' : '/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      }
    }

    complete();
  }, [router]);

  if (error) {
    return (
      <main className="auth-page">
        <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>😕</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 10 }}>Sign-in failed</h1>
          <p className="muted" style={{ marginBottom: 24 }}>{error}</p>
          <a href="/login" className="pill btn-primary">Back to sign in</a>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div style={{ maxWidth: 400, margin: '80px auto', padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>💅</div>
        <p style={{ fontWeight: 700, fontSize: '1rem' }}>Completing sign-in…</p>
        <p className="muted" style={{ fontSize: '.88rem', marginTop: 8 }}>Please wait a moment.</p>
      </div>
    </main>
  );
}
