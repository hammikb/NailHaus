import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const orderTotal = parseFloat(req.nextUrl.searchParams.get('total') || '0');

  if (!code) return err('Code required', 400);

  const { data } = await supabaseAdmin
    .from('discount_codes')
    .select('*')
    .eq('active', true)
    .ilike('code', code)
    .single();

  if (!data) return err('Invalid or expired code', 404);

  const now = new Date();
  if (data.expires_at && new Date(data.expires_at) < now) {
    return err('This code has expired', 410);
  }
  if (data.max_uses !== null && data.uses >= data.max_uses) {
    return err('This code has reached its usage limit', 410);
  }
  if (orderTotal > 0 && data.min_order > 0 && orderTotal < data.min_order) {
    return NextResponse.json(
      { error: `Minimum order of $${data.min_order.toFixed(2)} required` },
      { status: 422 }
    );
  }

  const discount = data.type === 'percent'
    ? Math.min((data.value / 100) * orderTotal, orderTotal)
    : Math.min(data.value, orderTotal);

  return NextResponse.json({
    id: data.id,
    code: data.code,
    type: data.type,
    value: data.value,
    discount: parseFloat(discount.toFixed(2)),
    vendorId: data.vendor_id,
  });
}
