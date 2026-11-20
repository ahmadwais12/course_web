import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { saveEvidence } from '@/lib/verification-store';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']);

export async function POST(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const form = await request.formData();
    const file = form.get('file');
    const sessionId = String(form.get('session_id') ?? '');
    if (!sessionId) return NextResponse.json({ error: 'Session is required.' }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to upload.' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File must be 8MB or smaller.' }, { status: 400 });
    const type = file.type || 'application/octet-stream';
    if (!ALLOWED.has(type)) {
      return NextResponse.json({ error: 'Upload a photo (JPG, PNG, WEBP, HEIC) or a PDF.' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
    const path = `verification/${sessionId}/${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const admin = access.access.admin;

    let bucket = 'verification';
    let uploaded = await admin.storage.from(bucket).upload(path, bytes, { contentType: type, upsert: false });
    if (uploaded.error) {
      const created = await admin.storage.createBucket(bucket, { public: false });
      if (!created.error || /exists/i.test(created.error.message)) {
        uploaded = await admin.storage.from(bucket).upload(path, bytes, { contentType: type, upsert: false });
      }
    }
    if (uploaded.error) {
      bucket = 'branding';
      uploaded = await admin.storage.from(bucket).upload(path, bytes, { contentType: type, upsert: false });
    }
    if (uploaded.error) {
      return NextResponse.json({ error: uploaded.error.message }, { status: 500 });
    }

    const evidence = await saveEvidence(
      sessionId,
      {
        bucket,
        path,
        file_name: file.name,
        file_type: type,
        file_size: file.size,
      },
      access.access.actor,
      {
        verification_item_id: form.get('verification_item_id') ? String(form.get('verification_item_id')) : null,
        discrepancy_id: form.get('discrepancy_id') ? String(form.get('discrepancy_id')) : null,
      }
    );

    let url = '';
    if (bucket === 'verification') {
      const signed = await admin.storage.from(bucket).createSignedUrl(path, 60 * 60);
      url = signed.data?.signedUrl ?? '';
    }
    if (!url) {
      const { data } = admin.storage.from(bucket).getPublicUrl(path);
      url = data.publicUrl;
    }
    return NextResponse.json({ ...evidence, url }, { status: 201 });
  } catch (error) {
    return verificationError(error);
  }
}
