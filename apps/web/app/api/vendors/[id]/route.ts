import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, mapVendor, mapProduct, mapReview, err } from '@/lib/route-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: vendor, error } = await supabaseAdmin.from('vendors').select('*').eq('id', id).single();
  if (error || !vendor) return err('Vendor not found', 404);

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('vendor_id', id)
    .eq('hidden', false)
    .order('created_at', { ascending: false });

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('*, profiles!user_id(name), products!product_id(id, name)')
    .eq('vendor_id', id)
    .order('created_at', { ascending: false });

  const vendorMin = { id: vendor.id, name: vendor.name, emoji: vendor.emoji, bg_color: vendor.bg_color };

  const reviewsMapped = (reviews || []).map((r: Record<string, unknown>) => {
    const profile = r.profiles as { name: string } | null;
    const product = r.products as { id: string; name: string } | null;
    return mapReview(r, profile, product);
  });

  return NextResponse.json({
    ...mapVendor(vendor),
    products: (products || []).map((p: Record<string, unknown>) => mapProduct(p, vendorMin)),
    reviews: reviewsMapped,
  });
}
