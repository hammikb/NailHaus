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

  const { data: bundles, error } = await supabaseAdmin
    .from('bundles')
    .select('*, bundle_items(product_id, products(id, name, price, emoji, bg_color, image_url))')
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false });

  if (error) return err(error.message, 500);
  return NextResponse.json(bundles);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  const vendor = await getVendor(user.id);
  if (!vendor) return err('No vendor profile', 404);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return err('Name required', 400);

  const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
  if (productIds.length < 2) return err('A bundle needs at least 2 products', 400);

  const { data: bundle, error } = await supabaseAdmin
    .from('bundles')
    .insert({
      vendor_id: vendor.id,
      name,
      description: body.description || null,
      discount_pct: parseFloat(body.discountPct) || 0,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);

  await supabaseAdmin.from('bundle_items').insert(
    productIds.map((pid: string) => ({ bundle_id: bundle.id, product_id: pid }))
  );

  return NextResponse.json(bundle, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  const vendor = await getVendor(user.id);
  if (!vendor) return err('No vendor profile', 404);

  const { id } = await req.json().catch(() => ({}));
  if (!id) return err('id required', 400);

  await supabaseAdmin.from('bundles').delete().eq('id', id).eq('vendor_id', vendor.id);
  return NextResponse.json({ success: true });
}
