import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';
  const hiddenFilter = url.searchParams.get('hidden') || '';

  let q = db
    .from('products')
    .select('id, name, emoji, bg_color, price, hidden, availability, review_count, rating, created_at, vendor_id, vendors!vendor_id(id, name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (search) q = q.ilike('name', `%${search}%`);
  if (hiddenFilter === 'true') q = q.eq('hidden', true);
  if (hiddenFilter === 'false') q = q.eq('hidden', false);

  const { data, error } = await q;
  if (error) return err(error.message, 500);

  return NextResponse.json((data || []).map((p: Record<string, unknown>) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    bgColor: p.bg_color,
    price: p.price,
    hidden: p.hidden,
    availability: p.availability,
    reviewCount: p.review_count,
    rating: p.rating,
    createdAt: p.created_at,
    vendorId: p.vendor_id,
    vendorName: (p.vendors as { name: string } | null)?.name ?? null,
  })));
}
