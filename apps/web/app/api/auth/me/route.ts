import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireAuth, supabaseAdmin, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const authErr = requireAuth(user);
  if (authErr) return authErr;

  return NextResponse.json({ id: user!.id, name: user!.name, email: user!.email, role: user!.role });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  const authErr = requireAuth(user);
  if (authErr) return authErr;

  const { name } = await req.json().catch(() => ({}));
  if (!name || typeof name !== 'string' || !name.trim()) return err('name is required');

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ name: name.trim() })
    .eq('id', user!.id);

  if (error) return err(error.message, 500);

  return NextResponse.json({ id: user!.id, name: name.trim(), email: user!.email, role: user!.role });
}
