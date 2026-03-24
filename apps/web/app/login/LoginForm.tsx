'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(event.currentTarget);
    try {
      const auth = await api.login({
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || ''),
      });
      signIn(auth);
      router.push(auth.user.role === 'vendor' ? '/dashboard/vendor' : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function signInWithOAuth(provider: 'google') {
    setOauthLoading(provider);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
      setOauthLoading(null);
    }
  }

  const busy = loading || !!oauthLoading;

  return (
    <div>
      {/* OAuth buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          className="oauth-btn"
          disabled={busy}
          onClick={() => signInWithOAuth('google')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {oauthLoading === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>

      </div>

      <div className="oauth-divider"><span>or sign in with email</span></div>

      <form className="form-grid" onSubmit={onSubmit}>
        <input className="input" type="email" name="email" placeholder="Email" required />
        <input className="input" type="password" name="password" placeholder="Password" required />
        {error ? <div className="error">{error}</div> : null}
        <button className="pill btn-primary" disabled={busy}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
