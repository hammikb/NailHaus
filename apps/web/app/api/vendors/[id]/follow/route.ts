import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

// GET — check if current user follows this vendor
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ following: false });

  const { data } = await supabaseAdmin
    .from('vendor_follows')
    .select('id')
    .eq('user_id', user.id)
    .eq('vendor_id', id)
    .maybeSingle();

  return NextResponse.json({ following: !!data });
}

// POST — follow
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('id', id).single();
  if (!vendor) return err('Vendor not found', 404);

  await supabaseAdmin
    .from('vendor_follows')
    .upsert({ user_id: user.id, vendor_id: id }, { onConflict: 'user_id,vendor_id' });

  return NextResponse.json({ following: true });
}

// DELETE — unfollow
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);

  await supabaseAdmin
    .from('vendor_follows')
    .delete()
    .eq('user_id', user.id)
    .eq('vendor_id', id);

  return NextResponse.json({ following: false });
}
