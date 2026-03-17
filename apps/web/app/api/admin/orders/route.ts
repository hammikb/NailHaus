import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status') || '';

  let q = db
    .from('orders')
    .select('id, user_id, total, status, created_at, profiles!user_id(name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) return err(error.message, 500);

  return NextResponse.json((data || []).map((o: Record<string, unknown>) => ({
    id: o.id,
    userId: o.user_id,
    buyerName: (o.profiles as { name: string } | null)?.name ?? 'Unknown',
    total: o.total,
    status: o.status,
    createdAt: o.created_at,
  })));
}
