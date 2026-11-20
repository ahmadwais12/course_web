import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { createHandover, handoverOverview, type HandoverFilters } from '@/lib/handover-store';

function filtersFrom(request: Request): HandoverFilters {
  const params = new URL(request.url).searchParams;
  const value = (key: string) => {
    const raw = params.get(key);
    return raw && raw.trim() ? raw.trim() : null;
  };
  return {
    status: value('status'),
    type: value('type'),
    project_id: value('project_id'),
    employee_id: value('employee_id'),
    department: value('department'),
    from: value('from'),
    to: value('to'),
    q: value('q'),
  };
}

export async function GET(request: Request) {
  try {
    const auth = await requireVerificationUser();
    if (!auth.ok) return auth.response;
    const data = await handoverOverview(auth.access.actor, filtersFrom(request));
    return NextResponse.json(data);
  } catch (error: unknown) {
    return verificationError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireVerificationUser();
    if (!auth.ok) return auth.response;
    const body = (await request.json()) as Record<string, unknown>;
    const row = await createHandover(body, auth.access.actor, Boolean(body.submit));
    return NextResponse.json(row, { status: 201 });
  } catch (error: unknown) {
    return verificationError(error);
  }
}
