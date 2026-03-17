import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!vendor) return err('Vendor not found', 404);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabaseAdmin as any;

  // Per-product order counts and revenue from order_items
  const { data: items, error } = await db
    .from('order_items')
    .select('product_id, qty, price, products!product_id(id, name, emoji, bg_color, image_url)')
    .eq('vendor_id', vendor.id);

  if (error) return err(error.message, 500);

  // Aggregate by product
  const map = new Map<string, { productId: string; name: string; emoji: string; bgColor: string; imageUrl: string | null; orders: number; units: number; revenue: number }>();

  for (const item of (items || [])) {
    const pid = item.product_id as string;
    const product = (item.products as unknown) as { id: string; name: string; emoji: string; bg_color: string; image_url: string | null } | null;
    const existing = map.get(pid);
    if (existing) {
      existing.orders += 1;
      existing.units += Number(item.qty);
      existing.revenue += Number(item.price) * Number(item.qty);
    } else {
      map.set(pid, {
        productId: pid,
        name: product?.name ?? 'Unknown',
        emoji: product?.emoji ?? '💅',
        bgColor: product?.bg_color ?? '#fde8e8',
        imageUrl: product?.image_url ?? null,
        orders: 1,
        units: Number(item.qty),
        revenue: Number(item.price) * Number(item.qty),
      });
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json(rows);
}
