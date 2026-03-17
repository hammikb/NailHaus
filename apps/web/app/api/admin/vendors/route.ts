import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const verifiedFilter = url.searchParams.get('verified') || '';

  let q = db
    .from('vendors')
    .select('id, name, emoji, bg_color, verified, total_sales, total_products, rating, created_at, user_id')
    .order('total_sales', { ascending: false })
    .limit(200);

  if (search) q = q.ilike('name', `%${search}%`);
  if (verifiedFilter === 'true') q = q.eq('verified', true);
  if (verifiedFilter === 'false') q = q.eq('verified', false);

  const { data, error } = await q;
  if (error) return err(error.message, 500);

  return NextResponse.json((data || []).map((v: Record<string, unknown>) => ({
    id: v.id,
    name: v.name,
    emoji: v.emoji,
    bgColor: v.bg_color,
    verified: v.verified,
    totalSales: v.total_sales,
    totalProducts: v.total_products,
    rating: v.rating,
    createdAt: v.created_at,
    userId: v.user_id,
  })));
}
