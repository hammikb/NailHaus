import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser } from '@/lib/route-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { status, adminNote } = body;

  if (!['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from('vendor_verification_requests')
    .update({ status, admin_note: adminNote || '', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, vendors!vendor_id(id)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === 'approved' && updated?.vendors?.id) {
    await supabaseAdmin.from('vendors').update({ verified: true }).eq('id', updated.vendors.id);
  }

  await supabaseAdmin.from('admin_audit').insert({
    admin_id: user.id,
    action: status === 'approved' ? 'verify_vendor' : 'reject_vendor',
    entity_type: 'vendor_verification_request',
    entity_id: id,
    note: adminNote || '',
  });

  return NextResponse.json(updated);
}
