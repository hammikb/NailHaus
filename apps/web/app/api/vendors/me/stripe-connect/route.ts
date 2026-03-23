import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
}

function getReturnUrl(req: NextRequest, path: string) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}${path}`;
}

// GET — return connect status for the current vendor
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  if (user.role !== 'vendor') return err('Forbidden', 403);

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, stripe_account_id, stripe_onboarding_complete')
    .eq('user_id', user.id)
    .single();

  if (!vendor) return err('Vendor not found', 404);

  return NextResponse.json({
    connected: !!vendor.stripe_account_id,
    onboardingComplete: vendor.stripe_onboarding_complete ?? false,
    accountId: vendor.stripe_account_id ?? null,
  });
}

// POST — create or resume Stripe Connect Express onboarding
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);
  if (user.role !== 'vendor') return err('Forbidden', 403);

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id, stripe_account_id, stripe_onboarding_complete')
    .eq('user_id', user.id)
    .single();

  if (!vendor) return err('Vendor not found', 404);

  const stripe = getStripe();
  let accountId = vendor.stripe_account_id;

  // Create Express account if not yet created
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: { transfers: { requested: true } },
      metadata: { vendorId: vendor.id, userId: user.id },
    });
    accountId = account.id;

    await supabaseAdmin
      .from('vendors')
      .update({ stripe_account_id: accountId })
      .eq('id', vendor.id);
  }

  // Create account link for onboarding / re-onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: getReturnUrl(req, '/api/stripe/connect-refresh'),
    return_url: getReturnUrl(req, '/api/stripe/connect-return'),
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}
