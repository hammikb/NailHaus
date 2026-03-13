import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*, order_items(*, products!product_id(id, name, emoji, bg_color), vendors!vendor_id(id, name, emoji, bg_color))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json(orders || []);
}
