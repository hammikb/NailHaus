import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser } from '@/lib/route-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {};
  if (body.disabled !== undefined) updates.disabled = Boolean(body.disabled);
  if (body.role && ['buyer', 'vendor', 'admin'].includes(body.role)) updates.role = body.role;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabaseAdmin.from('admin_audit').insert({
    admin_id: user.id,
    action: body.disabled !== undefined ? (body.disabled ? 'disable_user' : 'enable_user') : 'update_user_role',
    entity_type: 'profile',
    entity_id: id,
  });

  return NextResponse.json(data);
}
