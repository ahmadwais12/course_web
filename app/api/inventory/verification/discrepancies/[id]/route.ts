import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { getDiscrepancy, updateDiscrepancy } from '@/lib/verification-store';

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const data = await getDiscrepancy(id, access.access.actor);
    const evidence = await Promise.all(
      data.evidence.map(async (file) => {
        const signed = await access.access.admin.storage.from(file.bucket).createSignedUrl(file.path, 60 * 60);
        if (signed.data?.signedUrl) return { ...file, url: signed.data.signedUrl };
        const { data: pub } = access.access.admin.storage.from(file.bucket).getPublicUrl(file.path);
        return { ...file, url: pub.publicUrl };
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
    return NextResponse.json(await updateDiscrepancy(id, await request.json(), access.access.actor));
  } catch (error) {
    return verificationError(error);
  }
}
