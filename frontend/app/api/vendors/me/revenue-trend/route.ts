import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('price, qty, orders!order_id(created_at)')
    .eq('vendor_id', vendor.id);

  const days: { label: string; rev: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const label = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const rev = (items || []).reduce((sum: number, item: Record<string, unknown>) => {
      const orderDate = new Date((item.orders as { created_at: string })?.created_at || '');
      orderDate.setHours(0, 0, 0, 0);
      if (orderDate.getTime() === day.getTime()) {
        return sum + Number(item.price) * Number(item.qty);
      }
      return sum;
    }, 0);

    days.push({ label, rev: Math.round(rev * 100) / 100 });
  }

  return NextResponse.json(days);
}
