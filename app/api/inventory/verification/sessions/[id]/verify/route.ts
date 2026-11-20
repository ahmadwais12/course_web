import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { verifyItem } from '@/lib/verification-store';

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(await verifyItem(id, body, access.access.actor));
  } catch (error) {
    return verificationError(error);
  }
}
