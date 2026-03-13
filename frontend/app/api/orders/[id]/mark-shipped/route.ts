import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor) return err('Vendor profile required', 403);

  const { data: orderItem } = await supabaseAdmin.from('order_items').select('order_id').eq('order_id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!orderItem) return err('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const { trackingNumber, carrier } = body;

  const { data: shipment, error } = await supabaseAdmin.from('shipments').insert({
    order_id: id,
    vendor_id: vendor.id,
    status: 'shipped',
    shippo: { carrier: carrier || 'manual', trackingNumber: trackingNumber || '', labelUrl: null },
  }).select().single();

  if (error) return err(error.message, 500);
  await supabaseAdmin.from('orders').update({ status: 'shipped' }).eq('id', id);

  return NextResponse.json(shipment);
}
