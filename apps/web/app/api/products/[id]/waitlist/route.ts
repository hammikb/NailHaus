import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: product } = await supabaseAdmin.from('products').select('id, stock, availability').eq('id', id).single();
  if (!product) return err('Product not found', 404);

  const { email } = await req.json().catch(() => ({}));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err('Valid email required');

  // Upsert to avoid duplicates
  const { error } = await supabaseAdmin
    .from('waitlists')
    .upsert({ product_id: id, email: email.toLowerCase().trim() }, { onConflict: 'product_id,email', ignoreDuplicates: true });

  if (error) return err(error.message, 500);

  return NextResponse.json({ ok: true });
}
