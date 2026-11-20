import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { saveVerificationSettings, verificationSettings } from '@/lib/verification-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    return NextResponse.json(await verificationSettings());
  } catch (error) {
    return verificationError(error);
  }
}

export async function PUT(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  if (!access.access.actor.manager) {
    return NextResponse.json({ error: 'Head office access required' }, { status: 403 });
  }
  try {
    return NextResponse.json(await saveVerificationSettings(await request.json()));
  } catch (error) {
    return verificationError(error);
  }
}
