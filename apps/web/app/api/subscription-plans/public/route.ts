import { NextResponse } from 'next/server';
import { supabaseAdmin, err } from '@/lib/route-helpers';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('*, vendors!vendor_id(id, name, emoji)')
    .eq('active', true)
    .order('price_monthly', { ascending: true });

  if (error) return err(error.message, 500);
  return NextResponse.json(data || []);
}
