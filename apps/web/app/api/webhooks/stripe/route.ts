import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/route-helpers';
import { sendOrderConfirmation, sendVendorNewOrderNotification } from '@/lib/email';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (!orderId) return NextResponse.json({ received: true });

    const { data: existingOrder } = await supabaseAdmin
      .from('orders')
      .select('shipping_address')
      .eq('id', orderId)
      .single();

    // Mark order as confirmed and store shipping address
    const sessionAny = session as unknown as Record<string, unknown>;
    const shipping = (sessionAny.shipping_details || sessionAny.customer_details) as {
      name?: string;
      address?: {
        line1?: string;
        line2?: string;
        city?: string;
        state?: string;
        postal_code?: string;
        country?: string;
      };
    } | null;
    const preservedShippingAddress =
      existingOrder?.shipping_address && typeof existingOrder.shipping_address === 'object'
        ? (existingOrder.shipping_address as Record<string, unknown>)
        : {};
    await supabaseAdmin.from('orders').update({
      status: 'confirmed',
      stripe_payment_intent: session.payment_intent as string,
      shipping_address: shipping ? {
        ...preservedShippingAddress,
        name: shipping.name || preservedShippingAddress.name,
        line1: shipping.address?.line1 || preservedShippingAddress.line1,
        line2: shipping.address?.line2 || preservedShippingAddress.line2,
        city: shipping.address?.city || preservedShippingAddress.city,
        state: shipping.address?.state || preservedShippingAddress.state,
        postal_code: shipping.address?.postal_code || preservedShippingAddress.postal_code || preservedShippingAddress.zip,
        country: shipping.address?.country || preservedShippingAddress.country,
      } : preservedShippingAddress,
    }).eq('id', orderId);

    // Increment vendor sales counts and collect items for emails
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('vendor_id, qty, price, products(name), size')
      .eq('order_id', orderId);

    if (orderItems) {
      const byVendor: Record<string, number> = {};
      for (const i of orderItems) byVendor[i.vendor_id] = (byVendor[i.vendor_id] || 0) + 1;
      for (const [vendorId, count] of Object.entries(byVendor)) {
        const { data: v } = await supabaseAdmin.from('vendors').select('total_sales').eq('id', vendorId).single();
        if (v) await supabaseAdmin.from('vendors').update({ total_sales: (v.total_sales || 0) + count }).eq('id', vendorId);
      }

      // Send vendor notifications
      const vendorItemsMap: Record<string, Array<{ name: string; qty: number }>> = {};
      for (const i of orderItems) {
        const name = (i.products as unknown as { name: string } | null)?.name || 'Product';
        if (!vendorItemsMap[i.vendor_id]) vendorItemsMap[i.vendor_id] = [];
        vendorItemsMap[i.vendor_id].push({ name, qty: i.qty });
      }
      for (const [vendorId, items] of Object.entries(vendorItemsMap)) {
        const { data: vendorUser } = await supabaseAdmin
          .from('vendors')
          .select('name, user_id')
          .eq('id', vendorId)
          .single();
        if (vendorUser?.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('id', vendorUser.user_id)
            .single();
          if (profile?.email) {
            await sendVendorNewOrderNotification({
              to: profile.email,
              vendorName: vendorUser.name,
              orderId,
              items,
            });
          }
        }
      }
    }

    // Send buyer confirmation email (works for both signed-in users and guests)
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('user_id, total')
      .eq('id', orderId)
      .single();

    let buyerEmail: string | null = null;
    let buyerName = 'there';

    if (order?.user_id) {
      // Signed-in user — look up their profile
      const { data: buyerProfile } = await supabaseAdmin
        .from('profiles')
        .select('name, email')
        .eq('id', order.user_id)
        .single();
      buyerEmail = buyerProfile?.email ?? null;
      buyerName = buyerProfile?.name || 'there';
    } else {
      // Guest — use the email Stripe collected at checkout
      buyerEmail = session.customer_details?.email ?? session.customer_email ?? null;
      buyerName = session.customer_details?.name ?? 'there';
    }

    if (buyerEmail && orderItems) {
      await sendOrderConfirmation({
        to: buyerEmail,
        buyerName,
        orderId,
        total: order?.total ?? 0,
        items: orderItems.map((i) => ({
          name: (i.products as unknown as { name: string } | null)?.name || 'Product',
          qty: i.qty,
          price: i.price,
          size: (i as { size?: string }).size,
        })),
      });
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await supabaseAdmin.from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    }
  }

  return NextResponse.json({ received: true });
}
