import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 8 * 1024 * 1024;

function extFromType(type: string) {
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Use a JPG, PNG, WEBP, or GIF image' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be 8MB or smaller' }, { status: 400 });
    }

    const path = `inventory/items/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extFromType(file.type)}`;
    const admin = createSupabaseAdminClient();
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from('branding').upload(path, bytes, {
      contentType: file.type,
      upsert: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data } = admin.storage.from('branding').getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (error) {
    return inventoryError(error);
  }
}
