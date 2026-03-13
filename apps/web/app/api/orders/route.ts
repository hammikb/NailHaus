import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { items, shippingAddress } = body;
  if (!items?.length) return err('No items provided');

  let total = 0;
  const orderItems: { productId: string; vendorId: string; qty: number; price: number }[] = [];

  for (const item of items) {
    const { data: product } = await supabaseAdmin.from('products').select('id, vendor_id, price, stock, availability').eq('id', item.productId).single();
    if (!product) return err(`Product not found: ${item.productId}`);
    const qty = item.qty || 1;
    total += Number(product.price) * qty;
    orderItems.push({ productId: product.id, vendorId: product.vendor_id, qty, price: Number(product.price) });
  }

  const { data: order, error } = await supabaseAdmin.from('orders').insert({
    user_id: user.id,
    total: Math.round(total * 100) / 100,
    original_total: Math.round(total * 100) / 100,
    shipping_address: shippingAddress || {},
  }).select().single();

  if (error) return err(error.message, 500);

  // Insert order items
  await supabaseAdmin.from('order_items').insert(
    orderItems.map(i => ({ order_id: order.id, product_id: i.productId, vendor_id: i.vendorId, qty: i.qty, price: i.price }))
  );

  // Increment vendor sales
  const byVendor: Record<string, number> = {};
  for (const i of orderItems) byVendor[i.vendorId] = (byVendor[i.vendorId] || 0) + 1;
  for (const [vendorId] of Object.entries(byVendor)) {
    const { data: v } = await supabaseAdmin.from('vendors').select('total_sales').eq('id', vendorId).single();
    if (v) await supabaseAdmin.from('vendors').update({ total_sales: (v.total_sales || 0) + 1 }).eq('id', vendorId);
  }

  return NextResponse.json(order, { status: 201 });
}
