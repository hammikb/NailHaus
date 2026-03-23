import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/route-helpers';

// Stripe redirects here after the vendor completes (or skips) onboarding.
// The vendor/account id is passed through the account link URLs so we only
// update the account that actually completed onboarding.
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');
  const vendorId = searchParams.get('vendor_id');

  if (!accountId || !vendorId) {
    return NextResponse.redirect(`${origin}/dashboard/vendor`);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });
  const account = await stripe.accounts.retrieve(accountId);
  const onboardingComplete = Boolean(account.details_submitted && account.payouts_enabled);

  await supabaseAdmin
    .from('vendors')
    .update({ stripe_onboarding_complete: onboardingComplete })
    .eq('id', vendorId)
    .eq('stripe_account_id', accountId);

  if (!onboardingComplete) {
    return NextResponse.redirect(`${origin}/dashboard/vendor?stripe=incomplete`);
  }

  return NextResponse.redirect(`${origin}/dashboard/vendor?stripe=connected`);
}
