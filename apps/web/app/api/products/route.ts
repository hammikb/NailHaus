import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, mapProduct, err } from '@/lib/route-helpers';

function parseSizes(value: unknown, fallback: string[] = []) {
  const parsed = String(value || '')
    .split(/[,;]/)
    .map((size) => size.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

function normalizeSizeInventory(value: unknown, sizes: string[]) {
  if (typeof value !== 'object' || value === null) return {};

  const source = value as Record<string, unknown>;
  return sizes.reduce<Record<string, number>>((acc, size) => {
    const parsed = parseInt(String(source[size] ?? '0'), 10);
    acc[size] = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    return acc;
  }, {});
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const shape = searchParams.get('shape');
  const style = searchParams.get('style');
  const search = searchParams.get('search');
  const vendorId = searchParams.get('vendorId');
  const sort = searchParams.get('sort') || 'popular';
  const availability = searchParams.get('availability');
  const occasion = searchParams.get('occasion');
  const collectionId = searchParams.get('collectionId');
  const badge = searchParams.get('badge');
  const limit = parseInt(searchParams.get('limit') || '0');
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');

  let query = supabaseAdmin.from('products').select('id, vendor_id, name, description, price, original_price, emoji, bg_color, shape, style, badge, stock, tags, availability, production_days, occasions, collection_id, nail_count, image_url, images, sizes, size_inventory, finish, glue_included, reusable, wear_time, hidden, rating, review_count, created_at, vendors!vendor_id(id, name, emoji, bg_color)').eq('hidden', false);

  if (shape) query = query.eq('shape', shape);
  if (style) query = query.eq('style', style);
  if (vendorId) query = query.eq('vendor_id', vendorId);
  if (badge) query = query.eq('badge', badge);
  if (collectionId) query = query.eq('collection_id', collectionId);
  if (availability === 'in_stock') query = query.neq('availability', 'made_to_order');
  if (availability === 'made_to_order') query = query.eq('availability', 'made_to_order');
  if (occasion) query = query.contains('occasions', [occasion]);
  if (search) {
    query = query.or(`name.ilike.%${search}%,style.ilike.%${search}%,shape.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (minPrice) query = query.gte('price', parseFloat(minPrice));
  if (maxPrice) query = query.lte('price', parseFloat(maxPrice));

  switch (sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break;
    case 'price_desc': query = query.order('price', { ascending: false }); break;
    case 'rating': query = query.order('rating', { ascending: false }); break;
    case 'newest': query = query.order('created_at', { ascending: false }); break;
    default: query = query.order('review_count', { ascending: false });
  }

  if (limit > 0) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return err(error.message, 500);

  return NextResponse.json((data || []).map((p: Record<string, unknown>) => {
    const vendor = p.vendors as Record<string, unknown> | null;
    return mapProduct(p, vendor);
  }));
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor) return err('Vendor profile required', 403);

  const body = await req.json().catch(() => ({}));
  const { name, price, stock } = body;
  if (!name || price == null || stock == null) return err('Name, price, and stock are required');
  const sizeInventoryKeys =
    typeof body.sizeInventory === 'object' && body.sizeInventory !== null
      ? Object.keys(body.sizeInventory as Record<string, unknown>).map((size) => size.trim()).filter(Boolean)
      : [];
  const sizes = parseSizes(body.sizes, sizeInventoryKeys);
  const sizeInventory = normalizeSizeInventory(body.sizeInventory, sizes);
  const hasSizeInventory = sizes.length > 0 && sizeInventoryKeys.length > 0;

  const product = {
    vendor_id: vendor.id,
    name: String(name).slice(0, 120),
    description: String(body.description || '').slice(0, 2000),
    price: parseFloat(price),
    original_price: body.originalPrice ? parseFloat(body.originalPrice) : null,
    emoji: String(body.emoji || '💅').slice(0, 16),
    bg_color: String(body.bgColor || '#fde8e8').slice(0, 20),
    shape: body.shape || 'almond',
    style: body.style || 'minimal',
    badge: body.badge || null,
    stock: hasSizeInventory
      ? Object.values(sizeInventory).reduce((sum, count) => sum + count, 0)
      : parseInt(stock),
    tags: Array.isArray(body.tags) ? body.tags : [],
    availability: body.availability || 'in_stock',
    production_days: body.productionDays ? parseInt(body.productionDays) : null,
    occasions: Array.isArray(body.occasions) ? body.occasions : [],
    collection_id: body.collectionId || null,
    nail_count: body.nailCount ? parseInt(body.nailCount) : null,
    sizes: sizes.join(', ').slice(0, 120),
    size_inventory: hasSizeInventory ? sizeInventory : {},
    finish: String(body.finish || '').slice(0, 80),
    glue_included: body.glueIncluded !== undefined ? Boolean(body.glueIncluded) : null,
    reusable: body.reusable !== undefined ? Boolean(body.reusable) : null,
    wear_time: String(body.wearTime || '').slice(0, 80),
  };

  const { data, error } = await supabaseAdmin.from('products').insert(product).select().single();
  if (error) return err(error.message, 500);

  const { data: vendorRow } = await supabaseAdmin.from('vendors').select('id, name, emoji, bg_color, total_products').eq('id', vendor.id).single();
  await supabaseAdmin.from('vendors').update({ total_products: (vendorRow?.total_products || 0) + 1 }).eq('id', vendor.id);
  return NextResponse.json(mapProduct(data, vendorRow), { status: 201 });
}
