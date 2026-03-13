import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, getAuthUser, err } from '@/lib/route-helpers';

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vendor } = await supabaseAdmin.from('vendors').select('id').eq('user_id', user.id).single();
  if (!vendor) return err('No vendor profile', 404);

  const formData = await req.formData();
  const file = (formData.get('file') ?? formData.get('image')) as File | null;
  if (!file) return err('No image file provided');

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
  if (!allowed.includes(ext)) return err('Only JPG, PNG, WebP and GIF are allowed');
  if (file.size > 5 * 1024 * 1024) return err('Image must be under 5 MB');

  const path = `vendors/${vendor.id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // Delete any existing files for this vendor (handles extension changes + clears CDN cache)
  const { data: existing } = await supabaseAdmin.storage.from('vendor-images').list('vendors', { search: vendor.id });
  if (existing?.length) {
    await supabaseAdmin.storage.from('vendor-images').remove(existing.map(f => `vendors/${f.name}`));
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from('vendor-images')
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return err(uploadError.message, 500);

  const { data: urlData } = supabaseAdmin.storage.from('vendor-images').getPublicUrl(path);
  const bannerUrl = `${urlData.publicUrl}?t=${Date.now()}`;

  await supabaseAdmin.from('vendors').update({ banner_url: bannerUrl }).eq('id', vendor.id);

  return NextResponse.json({ bannerUrl });
}
