import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [
    { count: totalVendors },
    { count: verifiedVendors },
    { count: totalProducts },
    { count: totalOrders },
    { count: totalUsers },
    { count: totalNormalUsers },
    { count: totalAdmins },
    { count: disabledUsers },
    { count: pendingVerifications },
    { data: revenueRows },
    { data: recentUsersRows },
    { data: recentOrdersRows },
    { data: recentAdminActionsRows },
  ] = await Promise.all([
    supabaseAdmin.from('vendors').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('vendors').select('*', { count: 'exact', head: true }).eq('verified', true),
    supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('hidden', false),
    supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'buyer'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('disabled', true),
    supabaseAdmin.from('vendor_verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('orders').select('total'),
    supabaseAdmin.from('profiles').select('id, name, role, created_at').order('created_at', { ascending: false }).limit(6),
    supabaseAdmin.from('orders').select('id, total, status, created_at, profiles!user_id(name)').order('created_at', { ascending: false }).limit(6),
    supabaseAdmin.from('admin_audit').select('id, action, entity_type, entity_id, note, created_at').order('created_at', { ascending: false }).limit(8),
  ]);

  const totalRevenue = (revenueRows || []).reduce((sum: number, order: { total: string | number }) => sum + Number(order.total), 0);

  return NextResponse.json({
    totalVendors: totalVendors || 0,
    verifiedVendors: verifiedVendors || 0,
    unverifiedVendors: Math.max((totalVendors || 0) - (verifiedVendors || 0), 0),
    totalProducts: totalProducts || 0,
    totalOrders: totalOrders || 0,
    totalUsers: totalUsers || 0,
    totalNormalUsers: totalNormalUsers || 0,
    totalAdmins: totalAdmins || 0,
    disabledUsers: disabledUsers || 0,
    pendingVerifications: pendingVerifications || 0,
    totalRevenue,
    recentUsers: (recentUsersRows || []).map((profile: Record<string, unknown>) => ({
      id: String(profile.id),
      name: String(profile.name || 'Unknown'),
      role: String(profile.role || 'buyer'),
      createdAt: String(profile.created_at || new Date().toISOString()),
    })),
    recentOrders: (recentOrdersRows || []).map((order: Record<string, unknown>) => ({
      id: String(order.id),
      buyerName: ((order.profiles as { name?: string } | null)?.name || 'Guest'),
      total: Number(order.total || 0),
      status: String(order.status || 'unknown'),
      createdAt: String(order.created_at || new Date().toISOString()),
    })),
    recentAdminActions: (recentAdminActionsRows || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      action: String(row.action || 'update_user'),
      entityType: String(row.entity_type || 'record'),
      entityId: String(row.entity_id || ''),
      note: String(row.note || ''),
      createdAt: String(row.created_at || new Date().toISOString()),
    })),
  });
}
