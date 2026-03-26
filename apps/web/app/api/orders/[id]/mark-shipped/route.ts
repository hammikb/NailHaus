import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';
import { sendShippedNotification } from '@/lib/email';

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

  // Notify the buyer
  const { data: order } = await supabaseAdmin.from('orders').select('user_id').eq('id', id).single();
  if (order?.user_id) {
    const { data: buyer } = await supabaseAdmin.from('profiles').select('name, email').eq('id', order.user_id).single();
    if (buyer?.email) {
      const { data: shippedItems } = await supabaseAdmin
        .from('order_items')
        .select('qty, size, products(name)')
        .eq('order_id', id)
        .eq('vendor_id', vendor.id);
      await sendShippedNotification({
        to: buyer.email,
        buyerName: buyer.name || 'there',
        orderId: id,
        trackingNumber: trackingNumber || undefined,
        carrier: carrier || undefined,
        items: (shippedItems || []).map((i) => ({
          name: (i.products as { name: string } | null)?.name || 'Product',
          qty: i.qty,
          size: (i as { size?: string }).size,
        })),
      });
    }
  }

  return NextResponse.json(shipment);
}
