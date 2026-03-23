import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/route-helpers';

// Stripe redirects here when the account link expires or is invalid.
// We generate a fresh account link and redirect back to Stripe.
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  // account_id param may be present in some Stripe versions; otherwise redirect to dashboard
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');

  if (!accountId) {
    return NextResponse.redirect(`${origin}/dashboard/vendor`);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/stripe/connect-refresh`,
    return_url: `${origin}/api/stripe/connect-return`,
    type: 'account_onboarding',
  });

  return NextResponse.redirect(accountLink.url);
}
