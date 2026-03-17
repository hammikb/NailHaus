import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

const MARKUP = 1.00; // $1 over carrier cost

function getEasyPost() {
  const apiKey = process.env.EASYPOST_API_KEY;
  if (!apiKey) throw new Error('EASYPOST_API_KEY not configured');
  return apiKey;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id, ship_from_address').eq('user_id', user.id).single();
  if (!vendor) return err('Vendor profile required', 403);

  const fromAddress = vendor.ship_from_address as Record<string, string> | null;
  if (!fromAddress?.street1 || !fromAddress?.city || !fromAddress?.state || !fromAddress?.zip) {
    return err('Please set your ship-from address in your vendor profile first.', 422);
  }

  // Verify vendor has items in this order
  const { data: orderItem } = await supabaseAdmin.from('order_items').select('order_id').eq('order_id', id).eq('vendor_id', vendor.id).maybeSingle();
  if (!orderItem) return err('Forbidden', 403);

  const { data: order } = await supabaseAdmin.from('orders').select('shipping_address').eq('id', id).single();
  if (!order) return err('Order not found', 404);

  const toAddr = order.shipping_address as Record<string, string>;
  if (!toAddr?.line1 || !toAddr?.city) return err('Order is missing a shipping address', 422);

  let apiKey: string;
  try { apiKey = getEasyPost(); } catch {
    return err('Shipping rate service not configured. Please contact support.', 503);
  }

  // Create EasyPost shipment to get rates
  const epRes = await fetch('https://api.easypost.com/v2/shipments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
    },
    body: JSON.stringify({
      shipment: {
        from_address: {
          name: fromAddress.name || 'Vendor',
          street1: fromAddress.street1,
          street2: fromAddress.street2 || '',
          city: fromAddress.city,
          state: fromAddress.state,
          zip: fromAddress.zip,
          country: fromAddress.country || 'US',
        },
        to_address: {
          name: toAddr.name || 'Customer',
          street1: toAddr.line1,
          street2: toAddr.line2 || '',
          city: toAddr.city,
          state: toAddr.state || '',
          zip: toAddr.postal_code || '',
          country: toAddr.country || 'US',
        },
        parcel: {
          length: 9,
          width: 6,
          height: 2,
          weight: 6, // oz — adjust as needed
        },
      },
    }),
  });

  if (!epRes.ok) {
    const epErr = await epRes.json().catch(() => ({}));
    return err(epErr?.error?.message || 'Could not get shipping rates', 502);
  }

  const epData = await epRes.json();
  const shipmentId = epData.id as string;
  const rates = (epData.rates as Array<Record<string, unknown>>) || [];

  const formatted = rates
    .filter(r => r.rate)
    .map(r => ({
      rateId: r.id as string,
      carrier: r.carrier as string,
      service: r.service as string,
      carrierCost: Number(r.rate),
      price: Math.round((Number(r.rate) + MARKUP) * 100) / 100,
      deliveryDays: r.delivery_days as number | null,
      deliveryDate: r.delivery_date as string | null,
    }))
    .sort((a, b) => a.price - b.price);

  return NextResponse.json({ shipmentId, rates: formatted });
}
