import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { discoveryAction, registerDiscovery } from '@/lib/verification-store';

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const body = (await request.json()) as { action?: string; note?: string };
    const action = String(body.action ?? '');
    if (action === 'register') {
      return NextResponse.json(await registerDiscovery(id, access.access.actor));
    }
    if (!['review', 'approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Unknown discovery action.' }, { status: 400 });
    }
    return NextResponse.json(
      await discoveryAction(id, action as 'review' | 'approve' | 'reject', access.access.actor, String(body.note ?? ''))
    );
  } catch (error) {
    return verificationError(error);
  }
}
