'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export function SignupForm() {
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
      const auth = await api.register({
        name: String(formData.get('name') || ''),
        email: String(formData.get('email') || ''),
        password: String(formData.get('password') || ''),
      });
      signIn(auth);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <input className="input" type="text" name="name" placeholder="Full name" required />
      <input className="input" type="email" name="email" placeholder="Email" required />
      <input className="input" type="password" name="password" placeholder="Password" minLength={6} required />
      {error ? <div className="error">{error}</div> : null}
      <button className="pill btn-primary" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
    </form>
  );
}
