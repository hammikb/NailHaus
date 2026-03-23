import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

// GET — list current user's subscriptions
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('*, subscription_plans(id, name, description, price_monthly, items_per_month, vendor_id, vendors!vendor_id(id, name, emoji))')
    .eq('user_id', user.id)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  return NextResponse.json(data || []);
}

// POST — subscribe to a plan (creates Stripe checkout if stripe_price_id set, else simple record)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);

  const body = await req.json().catch(() => ({}));
  const planId = body.planId;
  if (!planId) return err('planId required', 400);

  const { data: plan } = await supabaseAdmin
    .from('subscription_plans')
    .select('*, vendors!vendor_id(id, name)')
    .eq('id', planId)
    .eq('active', true)
    .single();

  if (!plan) return err('Plan not found', 404);

  // Check not already subscribed
  const { data: existing } = await supabaseAdmin
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) return err('Already subscribed to this plan', 409);

  // If plan has a Stripe price ID, create a Stripe Checkout session
  if (plan.stripe_price_id) {
    const stripe = (await import('stripe')).default;
    const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-01-27.acacia' });

    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      metadata: { planId, userId: user.id },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/orders?subscribed=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/subscribe`,
    });

    return NextResponse.json({ url: session.url });
  }

  // Otherwise create a simple subscription record (for testing without Stripe)
  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: sub, error } = await supabaseAdmin
    .from('subscriptions')
    .insert({ user_id: user.id, plan_id: planId, current_period_end: periodEnd.toISOString() })
    .select()
    .single();

  if (error) return err(error.message, 500);
  return NextResponse.json(sub, { status: 201 });
}

// DELETE — cancel subscription
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);

  const { id } = await req.json().catch(() => ({}));
  if (!id) return err('id required', 400);

  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('user_id', user.id);

  return NextResponse.json({ success: true });
}
