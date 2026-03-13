import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAuth, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').toLowerCase().trim();
  const password = String(body.password || '');

  if (!email || !password) return err('Email and password are required');

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data.session) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name, role, disabled')
    .eq('id', data.user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Account not found' }, { status: 401 });
  if (profile.disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 });

  return NextResponse.json({
    token: data.session.access_token,
    user: { id: data.user.id, name: profile.name, email: data.user.email, role: profile.role },
  });
}
