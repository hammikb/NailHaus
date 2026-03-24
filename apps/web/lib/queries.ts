/**
 * Server-side query functions for use in Server Components.
 * These call Supabase directly — no HTTP roundtrip through the API routes.
 * Keep these import-only in server components (never in 'use client' files).
 */
import { supabaseAdmin, mapProduct, mapReview, mapVendor } from './route-helpers';
import type { Product, Review, VendorSummary } from './types';

// Cast to any before .select() so Supabase's compile-time string parser
// doesn't choke on long explicit column lists — we apply our own mappers anyway.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function getPopularProducts(limit = 8): Promise<Product[]> {
  const { data } = await db
    .from('products')
    .select('id, vendor_id, name, description, price, original_price, emoji, bg_color, shape, style, badge, stock, tags, availability, production_days, occasions, collection_id, nail_count, image_url, images, sizes, size_inventory, finish, glue_included, reusable, wear_time, hidden, rating, review_count, created_at, vendors!vendor_id(id, name, emoji, bg_color)')
    .eq('hidden', false)
    .order('review_count', { ascending: false })
    .limit(limit);

  return ((data as Record<string, unknown>[]) || []).map((p) => {
    const vendor = p.vendors as Record<string, unknown> | null;
    return mapProduct(p, vendor) as unknown as Product;
  });
}

export async function getNewArrivals(limit = 8): Promise<Product[]> {
  const { data } = await db
    .from('products')
    .select('id, vendor_id, name, description, price, original_price, emoji, bg_color, shape, style, badge, stock, tags, availability, production_days, occasions, collection_id, nail_count, image_url, images, sizes, size_inventory, finish, glue_included, reusable, wear_time, hidden, rating, review_count, created_at, vendors!vendor_id(id, name, emoji, bg_color)')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  return ((data as Record<string, unknown>[]) || []).map((p) => {
    const vendor = p.vendors as Record<string, unknown> | null;
    return mapProduct(p, vendor) as unknown as Product;
  });
}

export interface EditorialLook {
  id: string;
  title: string;
  subtitle?: string;
  emoji: string;
  products: Product[];
}

export async function getEditorialLooks(): Promise<EditorialLook[]> {
  const { data } = await db
    .from('editorial_looks')
    .select('id, title, subtitle, emoji, editorial_look_items(sort_order, products(id, vendor_id, name, description, price, original_price, emoji, bg_color, shape, style, badge, stock, tags, availability, production_days, occasions, collection_id, nail_count, image_url, images, sizes, size_inventory, finish, glue_included, reusable, wear_time, hidden, rating, review_count, created_at, vendors!vendor_id(id, name, emoji, bg_color)))')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(4);

  return ((data as Record<string, unknown>[]) || []).map(look => ({
    id: look.id as string,
    title: look.title as string,
    subtitle: look.subtitle as string | undefined,
    emoji: look.emoji as string,
    products: ((look.editorial_look_items as Record<string, unknown>[]) || [])
      .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
      .map(item => {
        const p = item.products as Record<string, unknown>;
        const vendor = p?.vendors as Record<string, unknown> | null;
        return mapProduct(p, vendor) as unknown as Product;
      })
      .filter(Boolean),
  }));
}

export async function getTopVendors(limit = 12): Promise<VendorSummary[]> {
  const { data } = await db
    .from('vendors')
    .select('id, name, tagline, emoji, bg_color, verified, rating, total_sales, total_products, banner_url')
    .order('total_sales', { ascending: false })
    .limit(limit);

  return ((data as Record<string, unknown>[]) || []).map(
    (v) => mapVendor(v) as unknown as VendorSummary
  );
}

export interface HomePageStats {
  verifiedVendors: number;
  liveSets: number;
  customerReviews: number;
}

export async function getHomePageStats(): Promise<HomePageStats> {
  const [{ count: verifiedVendors }, { count: liveSets }, { count: customerReviews }] = await Promise.all([
    db.from('vendors').select('id', { count: 'exact', head: true }).eq('verified', true),
    db.from('products').select('id', { count: 'exact', head: true }).eq('hidden', false),
    db.from('reviews').select('id', { count: 'exact', head: true }),
  ]);

  return {
    verifiedVendors: verifiedVendors || 0,
    liveSets: liveSets || 0,
    customerReviews: customerReviews || 0,
  };
}

export async function getHomePageReviews(limit = 3): Promise<Review[]> {
  const { data } = await db
    .from('reviews')
    .select('*, profiles!user_id(name), products!product_id(id, name, hidden)')
    .order('created_at', { ascending: false })
    .limit(Math.max(limit * 3, 9));

  return ((data as Record<string, unknown>[]) || [])
    .filter((reviewRow) => {
      const body = String(reviewRow.body || '').trim();
      const product = reviewRow.products as { hidden?: boolean } | null;
      return body.length > 0 && !product?.hidden;
    })
    .slice(0, limit)
    .map((reviewRow) => {
      const profile = reviewRow.profiles as { name: string } | null;
      const product = reviewRow.products as { id: string; name: string } | null;
      return mapReview(reviewRow, profile, product);
    }) as unknown as Review[];
}
