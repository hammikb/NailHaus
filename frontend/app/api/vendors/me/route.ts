import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, mapVendor, err } from '@/lib/route-helpers';

export async function PUT(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('*').eq('user_id', user.id).single();
  if (!vendor) return err('No vendor profile', 404);

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = String(body.name).slice(0, 80) || vendor.name;
  if (body.tagline !== undefined) updates.tagline = String(body.tagline).slice(0, 120);
  if (body.description !== undefined) updates.description = String(body.description).slice(0, 2000);
  if (body.emoji !== undefined) updates.emoji = String(body.emoji).slice(0, 16);
  if (body.bgColor !== undefined) updates.bg_color = String(body.bgColor).slice(0, 20);
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.socialLinks !== undefined) updates.social_links = body.socialLinks;
  if (body.announcement !== undefined) updates.announcement = String(body.announcement).slice(0, 240);

  const { data, error } = await supabaseAdmin.from('vendors').update(updates).eq('user_id', user.id).select().single();
  if (error) return err(error.message, 500);

  return NextResponse.json(mapVendor(data));
}
