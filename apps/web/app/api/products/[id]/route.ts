import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, mapProduct, mapReview, err } from '@/lib/route-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: product, error } = await supabaseAdmin
    .from('products')
    .select('*, vendors!vendor_id(id, name, emoji, bg_color)')
    .eq('id', id)
    .eq('hidden', false)
    .single();

  if (error || !product) return err('Product not found', 404);

  const { data: reviews } = await supabaseAdmin
    .from('reviews')
    .select('*, profiles!user_id(name)')
    .eq('product_id', id)
    .order('created_at', { ascending: false });

  const vendor = product.vendors as Record<string, unknown> | null;
  const reviewsMapped = (reviews || []).map((r: Record<string, unknown>) => {
    const profile = r.profiles as { name: string } | null;
    return mapReview(r, profile);
  });

  return NextResponse.json({ ...mapProduct(product, vendor), reviews: reviewsMapped });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: product } = await supabaseAdmin.from('products').select('vendor_id').eq('id', id).single();
  if (!product) return err('Not found', 404);

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor || product.vendor_id !== vendor.id) return err('Forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = String(body.name).slice(0, 120);
  if (body.description !== undefined) updates.description = String(body.description).slice(0, 2000);
  if (body.price !== undefined) updates.price = parseFloat(body.price);
  if (body.originalPrice !== undefined) updates.original_price = body.originalPrice ? parseFloat(body.originalPrice) : null;
  if (body.emoji !== undefined) updates.emoji = String(body.emoji).slice(0, 16);
  if (body.bgColor !== undefined) updates.bg_color = String(body.bgColor).slice(0, 20);
  if (body.shape !== undefined) updates.shape = body.shape;
  if (body.style !== undefined) updates.style = body.style;
  if (body.badge !== undefined) updates.badge = body.badge || null;
  if (body.stock !== undefined) updates.stock = parseInt(body.stock);
  if (body.tags !== undefined) updates.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.availability !== undefined) updates.availability = body.availability;
  if (body.productionDays !== undefined) updates.production_days = body.productionDays ? parseInt(body.productionDays) : null;
  if (body.occasions !== undefined) updates.occasions = Array.isArray(body.occasions) ? body.occasions : [];
  if (body.collectionId !== undefined) updates.collection_id = body.collectionId || null;
  if (body.nailCount !== undefined) updates.nail_count = body.nailCount ? parseInt(body.nailCount) : null;
  if (body.sizes !== undefined) updates.sizes = String(body.sizes).slice(0, 120);
  if (body.finish !== undefined) updates.finish = String(body.finish).slice(0, 80);
  if (body.glueIncluded !== undefined) updates.glue_included = body.glueIncluded !== null ? Boolean(body.glueIncluded) : null;
  if (body.reusable !== undefined) updates.reusable = body.reusable !== null ? Boolean(body.reusable) : null;
  if (body.wearTime !== undefined) updates.wear_time = String(body.wearTime).slice(0, 80);

  const { data: updated, error } = await supabaseAdmin.from('products').update(updates).eq('id', id).select('*, vendors!vendor_id(id, name, emoji, bg_color)').single();
  if (error) return err(error.message, 500);

  return NextResponse.json(mapProduct(updated, updated.vendors));
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(_req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: product } = await supabaseAdmin.from('products').select('vendor_id').eq('id', id).single();
  if (!product) return err('Not found', 404);

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id, total_products').eq('user_id', user.id).single();
  if (!vendor || product.vendor_id !== vendor.id) return err('Forbidden', 403);

  await supabaseAdmin.from('products').delete().eq('id', id);
  await supabaseAdmin.from('vendors').update({ total_products: Math.max((vendor.total_products || 1) - 1, 0) }).eq('id', vendor.id);

  return NextResponse.json({ success: true });
}
