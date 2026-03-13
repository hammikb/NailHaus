import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

function parseOne(raw: Record<string, unknown>, vendorId: string) {
  const name = String(raw.name || '').trim().slice(0, 120);
  const price = parseFloat(String(raw.price || '0'));
  const stock = parseInt(String(raw.stock ?? '0'));
  if (!name) throw new Error('name is required');
  if (!Number.isFinite(price) || price <= 0) throw new Error('valid price is required');
  if (!Number.isFinite(stock) || stock < 0) throw new Error('valid stock is required');

  return {
    vendor_id: vendorId,
    name,
    description: String(raw.description || '').slice(0, 2000),
    price,
    original_price: raw.originalPrice ? parseFloat(String(raw.originalPrice)) : null,
    emoji: String(raw.emoji || '💅').slice(0, 16),
    bg_color: String(raw.bgColor || '#fde8e8').slice(0, 20),
    shape: raw.shape || 'almond',
    style: raw.style || 'minimal',
    badge: raw.badge || null,
    stock,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    availability: raw.availability || 'in_stock',
    production_days: raw.productionDays ? parseInt(String(raw.productionDays)) : null,
    occasions: Array.isArray(raw.occasions) ? raw.occasions : [],
    nail_count: raw.nailCount ? parseInt(String(raw.nailCount)) : null,
    sizes: String(raw.sizes || '').slice(0, 120),
    finish: String(raw.finish || '').slice(0, 80),
    glue_included: raw.glueIncluded !== undefined ? Boolean(raw.glueIncluded) : null,
    reusable: raw.reusable !== undefined ? Boolean(raw.reusable) : null,
    wear_time: String(raw.wearTime || '').slice(0, 80),
  };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id, total_products').eq('user_id', user.id).single();
  if (!vendor) return err('Vendor profile required', 403);

  const body = await req.json().catch(() => ({}));
  const rawProducts = body.products;
  if (!Array.isArray(rawProducts) || rawProducts.length === 0) return err('products array is required');
  if (rawProducts.length > 200) return err('Maximum 200 products per import batch');

  const toInsert: Record<string, unknown>[] = [];
  const errors: { row: number; name: string; error: string }[] = [];

  rawProducts.forEach((raw, idx) => {
    try {
      toInsert.push(parseOne(raw as Record<string, unknown>, vendor.id));
    } catch (e) {
      errors.push({ row: idx + 1, name: String((raw as Record<string, unknown>).name || '(unnamed)'), error: (e as Error).message });
    }
  });

  let importedIds: string[] = [];
  if (toInsert.length > 0) {
    const { data } = await supabaseAdmin.from('products').insert(toInsert).select('id');
    importedIds = (data || []).map((r: { id: string }) => r.id);
    await supabaseAdmin.from('vendors').update({ total_products: (vendor.total_products || 0) + importedIds.length }).eq('id', vendor.id);
  }

  return NextResponse.json({ imported: importedIds.length, skipped: errors.length, errors, importedIds }, { status: 201 });
}
