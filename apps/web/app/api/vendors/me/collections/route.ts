import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('collections').eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);

  return NextResponse.json(vendor.collections || []);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id, collections').eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) return err('Collection name is required');

  const collection = { id: randomUUID(), name, description: String(body.description || '').slice(0, 300), createdAt: new Date().toISOString() };
  const collections = [...(vendor.collections || []), collection];

  await supabaseAdmin.from('vendors').update({ collections }).eq('user_id', user.id);
  return NextResponse.json(collection, { status: 201 });
}
