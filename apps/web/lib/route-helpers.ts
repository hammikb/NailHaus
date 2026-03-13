import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name, role, disabled')
    .eq('id', user.id)
    .single();

  if (!profile || profile.disabled) return null;
  return { id: user.id, email: user.email!, name: profile.name, role: profile.role };
}

export function requireAuth(user: AuthUser | null): NextResponse | null {
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function mapVendorMin(v: Record<string, unknown>) {
  return {
    id: v.id,
    name: v.name,
    emoji: v.emoji,
    bgColor: v.bg_color,
  };
}

export function mapVendor(v: Record<string, unknown>) {
  return {
    id: v.id,
    name: v.name,
    tagline: v.tagline || '',
    description: v.description || '',
    emoji: v.emoji || '💅',
    bgColor: v.bg_color || '#fde8e8',
    tags: v.tags || [],
    verified: v.verified || false,
    rating: Number(v.rating) || 0,
    totalSales: v.total_sales || 0,
    totalProducts: v.total_products || 0,
    socialLinks: v.social_links || {},
    announcement: v.announcement || '',
    collections: v.collections || [],
    createdAt: v.created_at,
  };
}

export function mapProduct(p: Record<string, unknown>, vendor?: Record<string, unknown> | null) {
  return {
    id: p.id,
    vendorId: p.vendor_id,
    name: p.name,
    description: p.description || '',
    price: Number(p.price),
    originalPrice: p.original_price ? Number(p.original_price) : null,
    emoji: p.emoji || '💅',
    bgColor: p.bg_color || '#fde8e8',
    shape: p.shape || 'almond',
    style: p.style || 'minimal',
    badge: p.badge || null,
    stock: Number(p.stock) || 0,
    tags: p.tags || [],
    availability: p.availability || 'in_stock',
    productionDays: p.production_days || null,
    occasions: p.occasions || [],
    collectionId: p.collection_id || null,
    nailCount: p.nail_count || null,
    sizes: p.sizes || '',
    finish: p.finish || '',
    glueIncluded: p.glue_included !== undefined ? p.glue_included : null,
    reusable: p.reusable !== undefined ? p.reusable : null,
    wearTime: p.wear_time || '',
    hidden: p.hidden || false,
    rating: Number(p.rating) || 0,
    reviewCount: Number(p.review_count) || 0,
    createdAt: p.created_at,
    vendor: vendor ? mapVendorMin(vendor) : null,
  };
}

export function mapReview(
  r: Record<string, unknown>,
  user?: { name: string } | null,
  product?: { id: string; name: string } | null
) {
  return {
    id: r.id,
    userId: r.user_id,
    productId: r.product_id,
    vendorId: r.vendor_id,
    rating: r.rating,
    title: r.title || '',
    body: r.body,
    helpful: r.helpful || 0,
    photo: r.photo || null,
    vendorReply: r.vendor_reply || null,
    vendorReplyAt: r.vendor_reply_at || null,
    createdAt: r.created_at,
    user: { name: user?.name || 'Anonymous' },
    product: product || null,
  };
}
