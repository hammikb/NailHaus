import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
}

function getOrigin(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  return `${proto}://${host}`;
}

function getConnectRouteUrl(req: NextRequest, path: string, vendorId: string, accountId: string) {
  const url = new URL(path, getOrigin(req));
  url.searchParams.set('vendor_id', vendorId);
  url.searchParams.set('account_id', accountId);
  return url.toString();
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

  let onboardingComplete = vendor.stripe_onboarding_complete ?? false;
  if (vendor.stripe_account_id) {
    try {
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(vendor.stripe_account_id);
      const liveComplete = Boolean(account.details_submitted && account.payouts_enabled);

      if (liveComplete !== onboardingComplete) {
        onboardingComplete = liveComplete;
        await supabaseAdmin
          .from('vendors')
          .update({ stripe_onboarding_complete: liveComplete })
          .eq('id', vendor.id);
      }
    } catch {
      // Keep the stored status if Stripe is temporarily unavailable.
    }
  }

  return NextResponse.json({
    connected: !!vendor.stripe_account_id,
    onboardingComplete,
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
    refresh_url: getConnectRouteUrl(req, '/api/stripe/connect-refresh', vendor.id, accountId),
    return_url: getConnectRouteUrl(req, '/api/stripe/connect-return', vendor.id, accountId),
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}
