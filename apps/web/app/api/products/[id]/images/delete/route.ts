import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data: product } = await supabaseAdmin.from('products').select('vendor_id, image_url, images').eq('id', id).single();
  if (!product) return err('Not found', 404);

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor || product.vendor_id !== vendor.id) return err('Forbidden', 403);

  const { url } = await req.json().catch(() => ({}));
  if (!url) return err('url required');

  // Remove from images array
  const existingImages: string[] = Array.isArray(product.images) ? product.images : [];
  const updatedImages = existingImages.filter(u => u !== url);

  // Try to delete from storage — extract path after bucket name
  try {
    const match = url.match(/product-images\/(.+?)(\?|$)/);
    if (match?.[1]) {
      await supabaseAdmin.storage.from('product-images').remove([match[1]]);
    }
  } catch { /* ignore storage errors */ }

  const updates: Record<string, unknown> = { images: updatedImages };

  // If this was the primary image, set the next one as primary (or null)
  if (product.image_url === url || (product.image_url as string)?.split('?')[0] === url.split('?')[0]) {
    updates.image_url = updatedImages[0] || null;
  }

  await supabaseAdmin.from('products').update(updates).eq('id', id);

  return NextResponse.json({ images: updatedImages, imageUrl: updatedImages[0] || null });
}
