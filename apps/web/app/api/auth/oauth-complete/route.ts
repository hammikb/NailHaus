import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/route-helpers';

/**
 * Called by the /auth/callback page after a successful OAuth sign-in.
 * Gets or creates the user's profile row (new OAuth users won't have one yet),
 * then returns the user object that gets stored in localStorage.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Try to fetch existing profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name, role, disabled')
    .eq('id', user.id)
    .single();

  if (profile?.disabled) return NextResponse.json({ error: 'Account disabled' }, { status: 403 });

  if (profile) {
    return NextResponse.json({ id: user.id, name: profile.name, email: user.email, role: profile.role });
  }

  // New OAuth user — create their profile
  const rawName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User';

  const { data: newProfile, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert({ id: user.id, name: rawName, role: 'buyer' })
    .select('name, role, disabled')
    .single();

  if (insertError || !newProfile) {
    return NextResponse.json({ error: 'Could not create profile' }, { status: 500 });
  }

  return NextResponse.json({ id: user.id, name: newProfile.name, email: user.email, role: newProfile.role });
}
