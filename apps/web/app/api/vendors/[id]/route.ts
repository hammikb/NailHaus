// apps/web/app/api/vendors/[id]/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data: vendor, error } = await supabaseAdmin
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !vendor) {
    return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
  }

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('vendor_id', vendor.id)
    .eq('hidden', false)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    id: vendor.id,
    name: vendor.name,
    tagline: vendor.tagline,
    description: vendor.description,
    emoji: vendor.emoji,
    bgColor: vendor.bg_color,
    tags: vendor.tags || [],
    verified: vendor.verified,
    rating: vendor.rating,
    totalSales: vendor.total_sales,
    totalProducts: vendor.total_products,
    announcement: vendor.announcement,
    products: (products || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      originalPrice: p.original_price,
      emoji: p.emoji,
      bgColor: p.bg_color,
      badge: p.badge,
      rating: p.rating,
      reviewCount: p.review_count,
    })),
  });
}