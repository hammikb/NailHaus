import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

const FEE_RATE = 0.08;

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);

  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select('price, qty, orders!order_id(created_at)')
    .eq('vendor_id', vendor.id);

  const allItems = (items || []).map((i: Record<string, unknown>) => ({
    revenue: Number(i.price) * Number(i.qty),
    createdAt: (i.orders as { created_at: string })?.created_at,
  }));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const pendingItems = allItems.filter(i => new Date(i.createdAt) >= cutoff);
  const paidItems = allItems.filter(i => new Date(i.createdAt) < cutoff);

  const pendingGross = pendingItems.reduce((s, i) => s + i.revenue, 0);
  const paidGross = paidItems.reduce((s, i) => s + i.revenue, 0);

  const nextPayoutDate = new Date();
  nextPayoutDate.setDate(nextPayoutDate.getDate() + (7 - new Date().getDay()));

  // Group paid items by week
  const byWeek: Record<string, { weekOf: string; gross: number; fee: number; net: number }> = {};
  for (const item of paidItems) {
    const d = new Date(item.createdAt);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    if (!byWeek[key]) {
      byWeek[key] = { weekOf: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), gross: 0, fee: 0, net: 0 };
    }
    byWeek[key].gross += item.revenue;
    byWeek[key].fee += item.revenue * FEE_RATE;
    byWeek[key].net += item.revenue * (1 - FEE_RATE);
  }

  const history = Object.values(byWeek)
    .sort((a, b) => new Date(b.weekOf).getTime() - new Date(a.weekOf).getTime())
    .slice(0, 8)
    .map(w => ({ ...w, gross: +w.gross.toFixed(2), fee: +w.fee.toFixed(2), net: +w.net.toFixed(2) }));

  return NextResponse.json({
    pendingGross: +pendingGross.toFixed(2),
    pendingNet: +(pendingGross * (1 - FEE_RATE)).toFixed(2),
    lifetimeNet: +(paidGross * (1 - FEE_RATE)).toFixed(2),
    nextPayoutDate: nextPayoutDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
    feeRate: FEE_RATE,
    history,
  });
}
