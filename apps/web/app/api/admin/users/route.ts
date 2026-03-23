import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') || '';
  const search = (searchParams.get('search') || '').trim().toLowerCase();
  const status = searchParams.get('status') || '';

  let query = supabaseAdmin
    .from('profiles')
    .select('id, name, role, disabled, created_at')
    .order('created_at', { ascending: false });

  if (role) query = query.eq('role', role);
  if (status === 'disabled') query = query.eq('disabled', true);
  if (status === 'active') query = query.eq('disabled', false);
  if (search) query = query.ilike('name', `%${search}%`);

  const { data: profiles, error } = await query.limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = profiles || [];
  const ids = rows.map((profile) => String(profile.id));

  const [authResult, vendorsResult] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ids.length
      ? supabaseAdmin
          .from('vendors')
          .select('id, user_id, name, verified, total_sales, total_products')
          .in('user_id', ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const authUsers = authResult.data?.users || [];
  const vendors = vendorsResult.data || [];

  const emailById = new Map(authUsers.map((authUser) => [authUser.id, authUser.email || '']));
  const vendorByUserId = new Map(
    vendors.map((vendor) => [
      String(vendor.user_id),
      {
        id: String(vendor.id),
        name: String(vendor.name || ''),
        verified: Boolean(vendor.verified),
        totalSales: Number(vendor.total_sales || 0),
        totalProducts: Number(vendor.total_products || 0),
      },
    ])
  );

  const merged = rows
    .map((profile) => {
      const id = String(profile.id);
      const vendor = vendorByUserId.get(id);
      return {
        id,
        name: String(profile.name || 'Unknown'),
        email: emailById.get(id) || '',
        role: String(profile.role || 'buyer'),
        disabled: Boolean(profile.disabled),
        created_at: String(profile.created_at || new Date().toISOString()),
        vendorId: vendor?.id || null,
        vendorName: vendor?.name || null,
        vendorVerified: vendor?.verified || false,
        totalProducts: vendor?.totalProducts || 0,
        totalSales: vendor?.totalSales || 0,
        hasVendorProfile: Boolean(vendor),
      };
    })
    .filter((profile) => {
      if (!search) return true;
      const haystack = `${profile.name} ${profile.email}`.toLowerCase();
      return haystack.includes(search);
    });

  return NextResponse.json(merged);
}
