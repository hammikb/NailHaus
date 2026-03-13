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

  const formData = await req.formData();
  const file = (formData.get('file') ?? formData.get('image')) as File | null;
  if (!file) return err('No image file provided');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowed.includes(ext)) return err('Only JPG, PNG, WebP and GIF are allowed');
  if (file.size > 5 * 1024 * 1024) return err('Image must be under 5 MB');

  const setPrimary = formData.get('primary') === 'true';
  const existingImages: string[] = Array.isArray(product.images) ? product.images : [];
  const isFirst = existingImages.length === 0 && !product.image_url;

  const path = `products/${id}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) return err(uploadError.message, 500);

  const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(path);
  const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  const updatedImages = [...existingImages, newUrl];
  const updates: Record<string, unknown> = { images: updatedImages };

  if (setPrimary || isFirst) {
    updates.image_url = newUrl;
  }

  await supabaseAdmin.from('products').update(updates).eq('id', id);

  const imageUrl = (setPrimary || isFirst) ? newUrl : (product.image_url || newUrl);
  return NextResponse.json({ imageUrl, images: updatedImages });
}
