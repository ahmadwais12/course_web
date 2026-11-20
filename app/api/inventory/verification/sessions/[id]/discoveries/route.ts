import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { createDiscovery } from '@/lib/verification-store';

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    return NextResponse.json(await createDiscovery(id, await request.json(), access.access.actor), {
      status: 201,
    });
  } catch (error) {
    return verificationError(error);
  }
}
