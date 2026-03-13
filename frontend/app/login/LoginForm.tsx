'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <input className="input" type="email" name="email" placeholder="Email" required />
      <input className="input" type="password" name="password" placeholder="Password" required />
      {error ? <div className="error">{error}</div> : null}
      <button className="pill btn-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
    </form>
  );
}
