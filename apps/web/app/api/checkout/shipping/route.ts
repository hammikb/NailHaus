import { NextRequest, NextResponse } from 'next/server';
import { buildCheckoutShippingQuote, loadShippingVendorsForCheckout, normalizeShippingAddress } from '@/lib/shipping';
import { err } from '@/lib/route-helpers';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return err('No items provided');

  const shippingAddress = normalizeShippingAddress(body.shippingAddress);

  try {
    const vendors = await loadShippingVendorsForCheckout(
      items.map((item: { productId: string; qty?: number }) => ({
        productId: String(item.productId || ''),
        qty: Math.max(1, Number(item.qty || 1)),
      }))
    );
    const quote = await buildCheckoutShippingQuote(vendors, shippingAddress);
    return NextResponse.json({ shippingAddress, quote });
  } catch (error) {
    return err(error instanceof Error ? error.message : 'Could not calculate shipping', 422);
  }
}
