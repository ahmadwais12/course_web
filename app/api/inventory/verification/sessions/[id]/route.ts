import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { getSession, sessionAction } from '@/lib/verification-store';

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const data = await getSession(id, access.access.actor);
    const evidence = await Promise.all(
      data.evidence.map(async (file) => {
        let url = '';
        const signed = await access.access.admin.storage.from(file.bucket).createSignedUrl(file.path, 60 * 60);
        if (signed.data?.signedUrl) {
          url = signed.data.signedUrl;
        } else {
          const { data: pub } = access.access.admin.storage.from(file.bucket).getPublicUrl(file.path);
          url = pub.publicUrl;
        }
        return { ...file, url };
      })
    );
    return NextResponse.json({ ...data, evidence });
  } catch (error) {
    return verificationError(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: string; note?: string };
    const action = String(body.action ?? '') as 'start' | 'submit' | 'approve' | 'reject' | 'cancel';
    if (!['start', 'submit', 'approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Unknown session action.' }, { status: 400 });
    }
    return NextResponse.json(await sessionAction(id, action, access.access.actor, String(body.note ?? '')));
  } catch (error) {
    return verificationError(error);
  }
}
