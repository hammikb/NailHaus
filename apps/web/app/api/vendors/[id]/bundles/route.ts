import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, err } from '@/lib/route-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from('bundles')
    .select('*, bundle_items(product_id, products(id, name, price, emoji, bg_color, image_url))')
    .eq('vendor_id', id)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) return err(error.message, 500);
  return NextResponse.json(data || []);
}
