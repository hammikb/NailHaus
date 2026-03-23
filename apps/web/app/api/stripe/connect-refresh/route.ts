import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripe redirects here when the account link expires or is invalid.
// We generate a fresh account link and redirect back to Stripe.
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
  const refreshUrl = new URL('/api/stripe/connect-refresh', origin);
  refreshUrl.searchParams.set('vendor_id', vendorId);
  refreshUrl.searchParams.set('account_id', accountId);

  const returnUrl = new URL('/api/stripe/connect-return', origin);
  returnUrl.searchParams.set('vendor_id', vendorId);
  returnUrl.searchParams.set('account_id', accountId);

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl.toString(),
    return_url: returnUrl.toString(),
    type: 'account_onboarding',
  });

  return NextResponse.redirect(accountLink.url);
}
