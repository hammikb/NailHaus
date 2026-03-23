import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser } from '@/lib/route-helpers';

const DEFAULT_VENDOR_EMOJI = '\u{1F485}';
const DEFAULT_VENDOR_COLOR = '#fde8e8';

function getVendorName(name: string) {
  const cleanName = name.trim() || 'New Vendor';
  const suffix = cleanName.toLowerCase().endsWith('shop') ? '' : ' Shop';
  return `${cleanName}${suffix}`.slice(0, 80);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAuthUser(req);
  if (!admin || admin.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, role, disabled')
    .eq('id', id)
    .single();

  if (existingProfileError || !existingProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (existingProfile.id === admin.id && body.role && body.role !== 'admin') {
    return NextResponse.json({ error: 'You cannot remove your own admin access' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  const allowedRoles = ['buyer', 'vendor', 'admin'];

  if (body.disabled !== undefined) updates.disabled = Boolean(body.disabled);
  if (body.role && allowedRoles.includes(body.role)) updates.role = body.role;

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  let vendorCreated = false;
  if (updates.role === 'vendor') {
    const { data: existingVendor } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('user_id', id)
      .maybeSingle();

    if (!existingVendor) {
      const { error: vendorInsertError } = await supabaseAdmin.from('vendors').insert({
        user_id: id,
        name: getVendorName(String(existingProfile.name || 'Vendor')),
        tagline: '',
        description: '',
        emoji: DEFAULT_VENDOR_EMOJI,
        bg_color: DEFAULT_VENDOR_COLOR,
        tags: [],
      });

      if (vendorInsertError) {
        return NextResponse.json({ error: vendorInsertError.message }, { status: 500 });
      }

      vendorCreated = true;
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, name, verified, total_sales, total_products')
    .eq('user_id', id)
    .maybeSingle();

  const authResult = await supabaseAdmin.auth.admin.getUserById(id);
  const email = authResult.data.user?.email || '';

  const { data: updatedProfile, error: updatedProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id, name, role, disabled, created_at')
    .eq('id', id)
    .single();

  if (updatedProfileError || !updatedProfile) {
    return NextResponse.json({ error: 'Failed to load updated user' }, { status: 500 });
  }

  let action = 'update_user';
  if (body.disabled !== undefined) action = body.disabled ? 'disable_user' : 'enable_user';
  if (body.role && body.role !== existingProfile.role) {
    action =
      body.role === 'vendor' ? 'promote_to_vendor' :
      body.role === 'buyer' ? 'make_normal_user' :
      'promote_to_admin';
  }

  await supabaseAdmin.from('admin_audit').insert({
    admin_id: admin.id,
    action,
    entity_type: 'profile',
    entity_id: id,
    note: vendorCreated ? 'Vendor profile auto-created by admin role change' : '',
  });

  return NextResponse.json({
    id: String(updatedProfile.id),
    name: String(updatedProfile.name || 'Unknown'),
    email,
    role: String(updatedProfile.role || 'buyer'),
    disabled: Boolean(updatedProfile.disabled),
    created_at: String(updatedProfile.created_at || new Date().toISOString()),
    vendorId: vendor?.id ? String(vendor.id) : null,
    vendorName: vendor?.name ? String(vendor.name) : null,
    vendorVerified: Boolean(vendor?.verified),
    totalProducts: Number(vendor?.total_products || 0),
    totalSales: Number(vendor?.total_sales || 0),
    hasVendorProfile: Boolean(vendor),
  });
}
