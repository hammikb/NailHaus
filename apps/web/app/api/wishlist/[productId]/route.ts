import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { productId } = await params;

  const { error } = await supabaseAdmin
    .from('wishlists')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', productId);

  if (error) return err(error.message, 500);

  return NextResponse.json({ success: true });
}
