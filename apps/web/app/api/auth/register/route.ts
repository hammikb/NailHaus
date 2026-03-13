import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuth, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 80);
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');

  if (!name || !email || !password) return err('All fields are required');
  if (password.length < 6) return err('Password must be at least 6 characters');

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message.includes('already')) return err('An account with this email already exists');
    return err(error.message);
  }

  const user = data.user;

  await supabaseAdmin.from('profiles').insert({ id: user.id, name, role: 'buyer' });

  // Sign in to get a token
  const { data: session, error: signInError } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (signInError || !session.session) return err('Registration succeeded but sign-in failed');

  return NextResponse.json(
    { token: session.session.access_token, user: { id: user.id, name, email, role: 'buyer' } },
    { status: 201 }
  );
}
