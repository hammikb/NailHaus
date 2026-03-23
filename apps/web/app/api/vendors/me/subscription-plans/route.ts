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

  const { data } = await supabaseAdmin
    .from('subscription_plans')
    .select('*')
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  const vendor = await getVendor(user.id);
  if (!vendor) return err('No vendor profile', 404);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  if (!name) return err('Name required', 400);
  const price = parseFloat(body.priceMonthly);
  if (!price || price <= 0) return err('Price must be > 0', 400);

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .insert({
      vendor_id: vendor.id,
      name,
      description: body.description || null,
      price_monthly: price,
      items_per_month: parseInt(body.itemsPerMonth) || 1,
      stripe_price_id: body.stripePriceId || null,
    })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  const vendor = await getVendor(user.id);
  if (!vendor) return err('No vendor profile', 404);

  const { id } = await req.json().catch(() => ({}));
  if (!id) return err('id required', 400);

  await supabaseAdmin.from('subscription_plans').update({ active: false }).eq('id', id).eq('vendor_id', vendor.id);
  return NextResponse.json({ success: true });
}
