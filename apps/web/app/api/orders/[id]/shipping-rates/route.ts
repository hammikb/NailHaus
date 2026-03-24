import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';
import { createEasyPostShipment, getPressOnNailParcel, getVendorQuoteFromShippingAddress } from '@/lib/shipping';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, ship_from_address')
    .eq('user_id', user.id)
    .single();
  if (!vendor) return err('Vendor profile required', 403);

  const fromAddress = vendor.ship_from_address as Record<string, string> | null;
  if (!fromAddress?.street1 || !fromAddress?.city || !fromAddress?.state || !fromAddress?.zip) {
    return err('Please set your ship-from address in your vendor profile first.', 422);
  }

  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('order_id, qty')
    .eq('order_id', id)
    .eq('vendor_id', vendor.id);
  if (!orderItems?.length) return err('Forbidden', 403);

  const { data: order } = await supabaseAdmin.from('orders').select('shipping_address').eq('id', id).single();
  if (!order) return err('Order not found', 404);

  const toAddr = order.shipping_address as Record<string, string>;
  if (!toAddr?.line1 || !toAddr?.city || !(toAddr?.postal_code || toAddr?.zip)) {
    return err('Order is missing a shipping address', 422);
  }

  const savedQuote = getVendorQuoteFromShippingAddress(order.shipping_address as Record<string, unknown>, vendor.id);
  const totalQty = orderItems.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const preset = savedQuote
    ? {
        id: savedQuote.parcelPreset as ReturnType<typeof getPressOnNailParcel>['id'],
        label: savedQuote.parcelPreset,
        length: Number(savedQuote.parcel.length),
        width: Number(savedQuote.parcel.width),
        height: Number(savedQuote.parcel.height),
        weightOz: Number(savedQuote.parcel.weight),
      }
    : getPressOnNailParcel(totalQty || 1);

  try {
    const shipment = await createEasyPostShipment({
      fromAddress,
      toAddress: {
        name: toAddr.name || 'Customer',
        line1: toAddr.line1,
        line2: toAddr.line2 || '',
        city: toAddr.city,
        state: toAddr.state || '',
        postal_code: toAddr.postal_code || toAddr.zip || '',
        country: toAddr.country || 'US',
      },
      parcel: preset,
    });

    const shipmentId = (shipment as { id?: string }).id as string;
    const rates = (((shipment as { rates?: Array<Record<string, unknown>> }).rates) || [])
      .filter((rate) => rate.rate)
      .map((rate) => ({
        rateId: rate.id as string,
        carrier: rate.carrier as string,
        service: rate.service as string,
        carrierCost: Number(rate.rate),
        price: Math.round((Number(rate.rate) + 1) * 100) / 100,
        deliveryDays: (rate.delivery_days as number | null) ?? null,
        deliveryDate: (rate.delivery_date as string | null) ?? null,
      }))
      .sort((a, b) => a.price - b.price);

    return NextResponse.json({ shipmentId, rates });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not get shipping rates';
    const status = message.includes('EASYPOST_API_KEY') ? 503 : 502;
    return err(status === 503 ? 'Shipping rate service not configured. Please contact support.' : message, status);
  }
}
