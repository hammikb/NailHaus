import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();

  // Auth is optional — guests can check out without an account
  const user = await getAuthUser(req);

  const body = await req.json().catch(() => ({}));
  const { items } = body as { items: { productId: string; qty: number; size?: string }[] };
  if (!items?.length) return err('No items provided');

  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  // Fetch all products
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const orderItems: { productId: string; vendorId: string; qty: number; price: number; size?: string; stripeAccountId?: string | null }[] = [];

  for (const item of items) {
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id, vendor_id, name, price, emoji, availability, vendors!vendor_id(stripe_account_id, stripe_onboarding_complete)')
      .eq('id', item.productId)
      .eq('hidden', false)
      .single();

    if (!product) return err(`Product not found: ${item.productId}`, 404);

    const qty = Math.max(1, item.qty || 1);
    const unitAmount = Math.round(Number(product.price) * 100);

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: 'usd',
        unit_amount: unitAmount,
        product_data: {
          name: item.size ? `${product.name} (${item.size})` : product.name,
          metadata: { productId: product.id, vendorId: product.vendor_id },
        },
      },
    });

    const vendor = product.vendors as { stripe_account_id: string | null; stripe_onboarding_complete: boolean } | null;
    orderItems.push({
      productId: product.id,
      vendorId: product.vendor_id,
      qty,
      price: Number(product.price),
      size: item.size,
      stripeAccountId: vendor?.stripe_onboarding_complete ? (vendor.stripe_account_id ?? null) : null,
    });
  }

  // Create a pending order — user_id is null for guests
  const total = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const { data: order, error: orderError } = await supabaseAdmin.from('orders').insert({
    user_id: user?.id ?? null,
    total: Math.round(total * 100) / 100,
    original_total: Math.round(total * 100) / 100,
    status: 'pending_payment',
    shipping_address: {},
  }).select().single();

  if (orderError || !order) return err('Failed to create order', 500);

  await supabaseAdmin.from('order_items').insert(
    orderItems.map(i => ({
      order_id: order.id,
      product_id: i.productId,
      vendor_id: i.vendorId,
      qty: i.qty,
      price: i.price,
    }))
  );

  // If all items belong to the same connected vendor, route funds via Stripe Connect.
  // Platform takes a 10% fee; vendor receives 90%.
  const PLATFORM_FEE_PCT = 0.10;
  const uniqueStripeAccounts = [...new Set(orderItems.map(i => i.stripeAccountId).filter(Boolean))];
  const singleConnectedVendor = uniqueStripeAccounts.length === 1 ? uniqueStripeAccounts[0] : null;
  const totalCents = Math.round(total * 100);
  const feeCents = singleConnectedVendor ? Math.round(totalCents * PLATFORM_FEE_PCT) : 0;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    // For guests Stripe will collect the email; for logged-in users prefill it
    ...(user?.email ? { customer_email: user.email } : {}),
    // Always create a Stripe customer so we reliably get customer_details in the webhook
    customer_creation: 'always',
    metadata: { orderId: order.id, userId: user?.id ?? '' },
    success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cart`,
    shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU'] },
    ...(singleConnectedVendor ? {
      payment_intent_data: {
        application_fee_amount: feeCents,
        transfer_data: { destination: singleConnectedVendor as string },
      },
    } : {}),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await supabaseAdmin.from('orders').update({ stripe_session_id: session.id }).eq('id', order.id);

  return NextResponse.json({ url: session.url });
}
