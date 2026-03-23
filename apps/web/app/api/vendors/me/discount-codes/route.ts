import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

async function getVendor(userId: string) {
  const { data } = await supabaseAdmin.from('vendors').select('id').eq('user_id', userId).single();
  return data;
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  const vendor = await getVendor(user.id);
  if (!vendor) return err('No vendor profile', 404);

  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false });

  if (error) return err(error.message, 500);
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  const vendor = await getVendor(user.id);
  if (!vendor) return err('No vendor profile', 404);

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || '').toUpperCase().trim().replace(/\s+/g, '');
  if (!code) return err('Code is required', 400);

  const type = body.type === 'fixed' ? 'fixed' : 'percent';
  const value = parseFloat(body.value);
  if (!value || value <= 0) return err('Value must be > 0', 400);
  if (type === 'percent' && value > 100) return err('Percent discount cannot exceed 100', 400);

  const { data, error } = await supabaseAdmin
    .from('discount_codes')
    .insert({
      vendor_id: vendor.id,
      code,
      type,
      value,
      min_order: parseFloat(body.minOrder) || 0,
      max_uses: body.maxUses ? parseInt(body.maxUses) : null,
      expires_at: body.expiresAt || null,
    })
    .select()
    .single();

  if (error) return err(error.code === '23505' ? 'Code already exists' : error.message, 400);
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  const vendor = await getVendor(user.id);
  if (!vendor) return err('No vendor profile', 404);

  const { id } = await req.json().catch(() => ({}));
  if (!id) return err('id required', 400);

  await supabaseAdmin.from('discount_codes').delete().eq('id', id).eq('vendor_id', vendor.id);
  return NextResponse.json({ success: true });
}
