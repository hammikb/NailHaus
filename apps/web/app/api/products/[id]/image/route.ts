import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Verify ownership
  const { data: product } = await supabaseAdmin.from('products').select('vendor_id').eq('id', id).single();
  if (!product) return err('Not found', 404);

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor || product.vendor_id !== vendor.id) return err('Forbidden', 403);

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return err('No image file provided');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowed.includes(ext)) return err('Only JPG, PNG, WebP and GIF are allowed');
  if (file.size > 5 * 1024 * 1024) return err('Image must be under 5 MB');

  const path = `products/${id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from('product-images')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return err(uploadError.message, 500);

  const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  await supabaseAdmin.from('products').update({ image_url: imageUrl }).eq('id', id);

  return NextResponse.json({ imageUrl });
}
