import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, mapReview, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || '');
  const rating = parseInt(body.rating);
  const title = String(body.title || '').slice(0, 120);
  const reviewBody = String(body.body || '').slice(0, 2000);

  if (!productId || !rating || !reviewBody) return err('Rating and review text are required');
  if (rating < 1 || rating > 5) return err('Rating must be between 1 and 5');

  const { data: product } = await supabaseAdmin.from('products').select('id, vendor_id, hidden').eq('id', productId).single();
  if (!product || product.hidden) return err('Product not found', 404);

  const { data: existingReview } = await supabaseAdmin.from('reviews').select('id').eq('product_id', productId).eq('user_id', user.id).maybeSingle();
  if (existingReview) return err('You have already reviewed this product');

  // Verify purchase
  const { data: purchase } = await supabaseAdmin.from('order_items').select('id, orders!order_id(user_id)').eq('product_id', productId).maybeSingle();
  const orderJoin = (purchase as Record<string, unknown> | null)?.orders;
  const purchaseOrder = Array.isArray(orderJoin) ? (orderJoin[0] as { user_id?: string } | undefined) : (orderJoin as { user_id?: string } | null);
  const hasPurchased = purchaseOrder?.user_id === user.id;
  if (!hasPurchased) return err('Only verified buyers can review this product', 403);

  const { data: review, error } = await supabaseAdmin.from('reviews').insert({
    user_id: user.id,
    product_id: productId,
    vendor_id: product.vendor_id,
    rating,
    title,
    body: reviewBody,
  }).select().single();

  if (error) return err(error.message, 500);

  // Recalculate product rating
  const { data: allReviews } = await supabaseAdmin.from('reviews').select('rating').eq('product_id', productId);
  if (allReviews) {
    const avg = allReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / allReviews.length;
    await supabaseAdmin.from('products').update({ rating: Math.round(avg * 10) / 10, review_count: allReviews.length }).eq('id', productId);
  }

  // Recalculate vendor rating
  const { data: vendorReviews } = await supabaseAdmin.from('reviews').select('rating').eq('vendor_id', product.vendor_id);
  if (vendorReviews) {
    const avg = vendorReviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / vendorReviews.length;
    await supabaseAdmin.from('vendors').update({ rating: Math.round(avg * 10) / 10 }).eq('id', product.vendor_id);
  }

  return NextResponse.json(mapReview(review, { name: user.name }), { status: 201 });
}
