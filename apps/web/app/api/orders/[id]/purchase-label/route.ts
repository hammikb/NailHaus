import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

const MARKUP = 1.00;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor) return err('Vendor profile required', 403);

  const { data: orderItem } = await supabaseAdmin.from('order_items').select('order_id').eq('order_id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!orderItem) return err('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const { shipmentId, rateId, carrierCost } = body as { shipmentId: string; rateId: string; carrierCost: number };
  if (!shipmentId || !rateId) return err('shipmentId and rateId required');

  const apiKey = process.env.EASYPOST_API_KEY;
  if (!apiKey) return err('Shipping service not configured', 503);

  // Buy the rate
  const buyRes = await fetch(`https://api.easypost.com/v2/shipments/${shipmentId}/buy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
    },
    body: JSON.stringify({ rate: { id: rateId } }),
  });

  if (!buyRes.ok) {
    const buyErr = await buyRes.json().catch(() => ({}));
    return err(buyErr?.error?.message || 'Failed to purchase label', 502);
  }

  const shipData = await buyRes.json();
  const trackingCode = shipData.tracking_code as string;
  const labelUrl = shipData.postage_label?.label_url as string;
  const carrier = shipData.selected_rate?.carrier as string;
  const totalCharged = Math.round((Number(carrierCost) + MARKUP) * 100) / 100;

  // Save shipment record
  const { data: shipment, error: shipErr } = await supabaseAdmin.from('shipments').insert({
    order_id: id,
    vendor_id: vendor.id,
    status: 'label_purchased',
    shippo: {
      carrier,
      trackingNumber: trackingCode,
      labelUrl,
      easypostShipmentId: shipmentId,
      easypostRateId: rateId,
      carrierCost: Number(carrierCost),
      totalCharged,
    },
  }).select().single();

  if (shipErr) return err(shipErr.message, 500);

  await supabaseAdmin.from('orders').update({ status: 'label_purchased' }).eq('id', id);

  return NextResponse.json({
    shipmentId: shipment.id,
    trackingNumber: trackingCode,
    labelUrl,
    carrier,
    totalCharged,
  });
}
