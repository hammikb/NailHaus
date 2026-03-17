import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, mapVendor, mapProduct, mapReview, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors')
    .select('id, name, tagline, description, emoji, bg_color, tags, verified, rating, total_sales, total_products, social_links, announcement, collections, created_at, banner_url')
    .eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);

  const [productsRes, reviewsRes, shipmentsRes, ordersRes, verificationRes] = await Promise.all([
    supabaseAdmin.from('products').select('id, vendor_id, name, description, price, original_price, emoji, bg_color, shape, style, badge, stock, tags, availability, production_days, occasions, collection_id, nail_count, image_url, images, sizes, size_inventory, finish, glue_included, reusable, wear_time, hidden, rating, review_count, created_at').eq('vendor_id', vendor.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('reviews').select('*, profiles!user_id(name), products!product_id(id, name)').eq('vendor_id', vendor.id).order('created_at', { ascending: false }),
    supabaseAdmin.from('shipments').select('id, vendor_id, order_id, status, created_at').eq('vendor_id', vendor.id),
    supabaseAdmin.from('order_items').select('*, orders!order_id(id, user_id, status, shipping_address, created_at)').eq('vendor_id', vendor.id),
    supabaseAdmin.from('vendor_verification_requests').select('*').eq('vendor_id', vendor.id).eq('status', 'pending').maybeSingle(),
  ]);

  const products = productsRes.data || [];
  const reviews = reviewsRes.data || [];
  const shipments = shipmentsRes.data || [];
  const orderItems = ordersRes.data || [];
  const verificationRequest = verificationRes.data || null;

  // Aggregate revenue from order items
  const totalRevenue = orderItems.reduce((sum: number, i: Record<string, unknown>) =>
    sum + Number(i.price) * Number(i.qty), 0);

  const avgRating = reviews.length
    ? (reviews.reduce((sum: number, r: Record<string, unknown>) => sum + Number(r.rating), 0) / reviews.length).toFixed(1)
    : '-';

  const shippingStats = {
    openShipments: shipments.filter((s: Record<string, unknown>) => s.status === 'pending').length,
    labelsPurchased: shipments.filter((s: Record<string, unknown>) => s.status === 'label_purchased').length,
    shipped: shipments.filter((s: Record<string, unknown>) => s.status === 'shipped').length,
    delivered: shipments.filter((s: Record<string, unknown>) => s.status === 'delivered').length,
  };

  // Build unique orders from order items for this vendor
  const orderMap = new Map<string, Record<string, unknown>>();
  for (const item of orderItems) {
    const order = item.orders as Record<string, unknown>;
    if (order && !orderMap.has(order.id as string)) orderMap.set(order.id as string, order);
  }
  const orders = Array.from(orderMap.values());

  // Fulfillment queue: orders not shipped by this vendor
  const shippedOrderIds = new Set(shipments.map((s: Record<string, unknown>) => s.order_id));
  const fulfillmentQueue = orders
    .filter(o => !shippedOrderIds.has(o.id))
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .slice(0, 10);

  const recentReviews = reviews.slice(0, 6).map((r: Record<string, unknown>) =>
    mapReview(r, r.profiles as { name: string } | null, r.products as { id: string; name: string } | null)
  );

  const recentOrders = orders
    .sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime())
    .slice(0, 5);

  const vendorMin = { id: vendor.id, name: vendor.name, emoji: vendor.emoji, bg_color: vendor.bg_color };

  return NextResponse.json({
    vendor: mapVendor(vendor),
    stats: {
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue,
      totalReviews: reviews.length,
      avgRating,
      ...shippingStats,
    },
    products: products.map((p: Record<string, unknown>) => mapProduct(p, vendorMin)),
    recentReviews,
    recentOrders,
    fulfillmentQueue,
    recentShipments: shipments.sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
    ).slice(0, 6),
    verificationRequest,
  });
}
