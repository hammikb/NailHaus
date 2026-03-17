import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from('wishlist')
    .select('product_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return err(error.message, 500);

  return NextResponse.json((data || []).map(row => ({ productId: row.product_id })));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { productId } = await req.json().catch(() => ({}));
  if (!productId) return err('productId required');

  const { error } = await supabaseAdmin
    .from('wishlist')
    .upsert({ user_id: user.id, product_id: productId }, { onConflict: 'user_id,product_id' });

  if (error) return err(error.message, 500);

  return NextResponse.json({ productId });
}
