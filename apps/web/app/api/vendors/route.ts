import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, mapVendor, err } from '@/lib/route-helpers';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('vendors')
    .select('id, name, tagline, description, emoji, bg_color, tags, verified, rating, total_sales, total_products, social_links, announcement, collections, created_at, banner_url')
    .order('total_sales', { ascending: false });

  if (error) return err(error.message, 500);
  return NextResponse.json((data || []).map(mapVendor));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (existing) return err('Vendor profile already exists');

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) return err('Brand name is required');

  const vendor = {
    user_id: user.id,
    name,
    tagline: String(body.tagline || '').slice(0, 120),
    description: String(body.description || '').slice(0, 2000),
    emoji: String(body.emoji || '💅').slice(0, 16),
    bg_color: String(body.bgColor || '#fde8e8').slice(0, 20),
    tags: Array.isArray(body.tags) ? body.tags : [],
  };

  const { data, error } = await supabaseAdmin.from('vendors').insert(vendor).select().single();
  if (error) return err(error.message, 500);

  // Upgrade user role to vendor
  await supabaseAdmin.from('profiles').update({ role: 'vendor' }).eq('id', user.id);

  return NextResponse.json(mapVendor(data), { status: 201 });
}
