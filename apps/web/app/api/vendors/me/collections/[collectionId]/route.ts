import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ collectionId: string }> }) {
  const { collectionId } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id, collections').eq('user_id', user.id).single();
  if (!vendor) return err('no_vendor', 404);

  const collections = (vendor.collections || []).filter((c: { id: string }) => c.id !== collectionId);
  await supabaseAdmin.from('vendors').update({ collections }).eq('user_id', user.id);
  await supabaseAdmin.from('products').update({ collection_id: null }).eq('vendor_id', vendor.id).eq('collection_id', collectionId);

  return NextResponse.json({ success: true });
}
