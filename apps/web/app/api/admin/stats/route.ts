import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [
    { count: totalVendors },
    { count: totalProducts },
    { count: totalOrders },
    { count: totalUsers },
    { count: pendingVerifications },
    { data: revenueRows },
  ] = await Promise.all([
    supabaseAdmin.from('vendors').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('hidden', false),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('vendor_verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('orders').select('total'),
  ]);

  const totalRevenue = (revenueRows || []).reduce((s: number, o: { total: string }) => s + Number(o.total), 0);

  return NextResponse.json({
    totalVendors: totalVendors || 0,
    totalProducts: totalProducts || 0,
    totalOrders: totalOrders || 0,
    totalUsers: totalUsers || 0,
    pendingVerifications: pendingVerifications || 0,
    totalRevenue,
  });
}
