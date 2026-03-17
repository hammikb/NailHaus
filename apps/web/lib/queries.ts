/**
 * Server-side query functions for use in Server Components.
 * These call Supabase directly — no HTTP roundtrip through the API routes.
 * Keep these import-only in server components (never in 'use client' files).
 */
import { supabaseAdmin, mapProduct, mapVendor } from './route-helpers';
import type { Product, VendorSummary } from './types';

// Column lists — explicit instead of *, so Postgres only transfers what we need.
const PRODUCT_COLS = [
  'id', 'vendor_id', 'name', 'description', 'price', 'original_price',
  'emoji', 'bg_color', 'shape', 'style', 'badge', 'stock', 'tags',
  'availability', 'production_days', 'occasions', 'collection_id', 'nail_count',
  'image_url', 'images', 'sizes', 'size_inventory', 'finish',
  'glue_included', 'reusable', 'wear_time', 'hidden', 'rating', 'review_count', 'created_at',
].join(', ');

const VENDOR_LISTING_COLS = [
  'id', 'name', 'tagline', 'emoji', 'bg_color',
  'verified', 'rating', 'total_sales', 'total_products', 'banner_url',
].join(', ');

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  const { data } = await supabaseAdmin
    .from('products')
    .select(`${PRODUCT_COLS}, vendors!vendor_id(id, name, emoji, bg_color)`)
    .eq('hidden', false)
    .order('review_count', { ascending: false })
    .limit(limit);

  return (data || []).map((p: Record<string, unknown>) => {
    const vendor = p.vendors as Record<string, unknown> | null;
    return mapProduct(p, vendor) as unknown as Product;
  });
}

export async function getTopVendors(limit = 12): Promise<VendorSummary[]> {
  const { data } = await supabaseAdmin
    .from('vendors')
    .select(VENDOR_LISTING_COLS)
    .order('total_sales', { ascending: false })
    .limit(limit);

  return (data || []).map(v => mapVendor(v as Record<string, unknown>) as unknown as VendorSummary);
}
