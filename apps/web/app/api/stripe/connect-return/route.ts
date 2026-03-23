import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/route-helpers';

// Stripe redirects here after the vendor completes (or skips) onboarding.
// We verify the account's charges_enabled to determine if onboarding is truly complete.
export async function GET(req: NextRequest) {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;

  // account_id isn't passed back by Stripe in the return URL — we need to
  // match by looking for vendors whose onboarding is not yet complete.
  // The safer approach: let the vendor dashboard re-poll GET /api/vendors/me/stripe-connect
  // and check via Stripe API. For now we mark tentatively and let the dashboard verify.

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' });

  // Find all vendors with a stripe_account_id but not yet marked complete
  const { data: vendors } = await supabaseAdmin
    .from('vendors')
    .select('id, stripe_account_id')
    .not('stripe_account_id', 'is', null)
    .eq('stripe_onboarding_complete', false);

  if (vendors) {
    for (const vendor of vendors) {
      const account = await stripe.accounts.retrieve(vendor.stripe_account_id as string);
      if (account.charges_enabled) {
        await supabaseAdmin
          .from('vendors')
          .update({ stripe_onboarding_complete: true })
          .eq('id', vendor.id);
      }
    }
  }

  return NextResponse.redirect(`${origin}/dashboard/vendor?stripe=connected`);
}
