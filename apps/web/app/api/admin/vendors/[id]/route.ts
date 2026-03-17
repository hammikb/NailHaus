import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (typeof body.verified === 'boolean') updates.verified = body.verified;

  if (!Object.keys(updates).length) return err('Nothing to update');

  const { error } = await supabaseAdmin.from('vendors').update(updates).eq('id', id);
  if (error) return err(error.message, 500);

  return NextResponse.json({ success: true });
}
