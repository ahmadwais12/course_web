import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;

function extFromType(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

export async function POST(request: Request) {
  try {
    const auth = await createClient();
    const {
      data: { user },
    } = await auth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const kindRaw = String(form.get('kind') ?? 'logo').toLowerCase();
    const kind = kindRaw === 'cover' ? 'cover' : 'logo';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Use a JPG, PNG, WEBP, or GIF image' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be 8MB or smaller' }, { status: 400 });
    }

    const ext = extFromType(file.type);
    const path = `tenants/${kind}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const admin = createSupabaseAdminClient();
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await admin.storage.from('branding').upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = admin.storage.from('branding').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path, kind });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
