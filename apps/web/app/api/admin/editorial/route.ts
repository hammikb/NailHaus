import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

async function requireAdmin(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return null;
  const { data } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin' ? user : null;
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('editorial_looks')
    .select('*, editorial_look_items(sort_order, products(id, name, price, emoji, bg_color, image_url, vendor_id, vendors!vendor_id(id,name,emoji,bg_color)))')
    .eq('active', true)
    .order('sort_order', { ascending: true });

  if (error) return err(error.message, 500);
  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return err('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  if (!title) return err('Title required', 400);

  const { data: look, error } = await supabaseAdmin
    .from('editorial_looks')
    .insert({ title, subtitle: body.subtitle || null, emoji: body.emoji || '💅', sort_order: body.sortOrder || 0 })
    .select().single();

  if (error) return err(error.message, 500);

  if (Array.isArray(body.productIds) && body.productIds.length > 0) {
    await supabaseAdmin.from('editorial_look_items').insert(
      body.productIds.map((pid: string, i: number) => ({ look_id: look.id, product_id: pid, sort_order: i }))
    );
  }

  return NextResponse.json(look, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return err('Forbidden', 403);

  const { id } = await req.json().catch(() => ({}));
  if (!id) return err('id required', 400);

  await supabaseAdmin.from('editorial_looks').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
