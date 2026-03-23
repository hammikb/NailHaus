import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return err('Unauthorized', 401);

  const { data: vendor } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!vendor) return err('No vendor profile', 404);

  // Get all product IDs for this vendor
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('id, name, emoji, bg_color, price, image_url')
    .eq('vendor_id', vendor.id)
    .eq('hidden', false);

  if (!products || products.length === 0) {
    return NextResponse.json({ wishlistInsights: [], waitlistInsights: [] });
  }

  const productIds = products.map((p: { id: string }) => p.id);

  // Wishlist counts per product
  const { data: wishlistRows } = await supabaseAdmin
    .from('wishlists')
    .select('product_id')
    .in('product_id', productIds);

  // Waitlist counts per product
  const { data: waitlistRows } = await supabaseAdmin
    .from('waitlists')
    .select('product_id')
    .in('product_id', productIds);

  const wishlistCounts: Record<string, number> = {};
  for (const row of (wishlistRows || [])) {
    wishlistCounts[row.product_id] = (wishlistCounts[row.product_id] || 0) + 1;
  }

  const waitlistCounts: Record<string, number> = {};
  for (const row of (waitlistRows || [])) {
    waitlistCounts[row.product_id] = (waitlistCounts[row.product_id] || 0) + 1;
  }

  const productMap = Object.fromEntries(products.map((p: Record<string, unknown>) => [p.id, p]));

  const wishlistInsights = Object.entries(wishlistCounts)
    .map(([id, count]) => ({ ...productMap[id], wishlistCount: count }))
    .sort((a, b) => b.wishlistCount - a.wishlistCount)
    .slice(0, 10);

  const waitlistInsights = Object.entries(waitlistCounts)
    .map(([id, count]) => ({ ...productMap[id], waitlistCount: count }))
    .sort((a, b) => b.waitlistCount - a.waitlistCount)
    .slice(0, 10);

  return NextResponse.json({ wishlistInsights, waitlistInsights });
}
