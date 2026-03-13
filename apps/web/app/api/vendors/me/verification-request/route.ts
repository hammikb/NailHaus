import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);

  const { data } = await supabaseAdmin.from('vendor_verification_requests').select('*').eq('vendor_id', vendor.id).eq('status', 'pending').maybeSingle();
  return NextResponse.json(data || null);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id, verified').eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);
  if (vendor.verified) return err('Vendor is already verified');

  const { data: existing } = await supabaseAdmin.from('vendor_verification_requests').select('id').eq('vendor_id', vendor.id).eq('status', 'pending').maybeSingle();
  if (existing) return err('A verification request is already pending');

  const body = await req.json().catch(() => ({}));
  const { data, error } = await supabaseAdmin.from('vendor_verification_requests').insert({
    vendor_id: vendor.id,
    user_id: user.id,
    message: String(body.message || '').slice(0, 2000),
    links: Array.isArray(body.links) ? body.links.slice(0, 10) : [],
  }).select().single();

  if (error) return err(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
