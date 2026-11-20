import { NextResponse } from 'next/server';
import { requireVerificationUser, stringParam, verificationError } from '@/lib/verification-api';
import { REPORT_TYPES, verificationReport, type ReportType } from '@/lib/verification-store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const url = new URL(request.url);
    const requested = stringParam(url, 'type') ?? 'branch';
    const type = (REPORT_TYPES.some((row) => row.value === requested) ? requested : 'branch') as ReportType;
    return NextResponse.json(
      await verificationReport(access.access.actor, type, {
        campaign_id: stringParam(url, 'campaign_id'),
        branch: stringParam(url, 'branch'),
        country: stringParam(url, 'country'),
        department: stringParam(url, 'department'),
        category: stringParam(url, 'category'),
        officer_id: stringParam(url, 'officer_id'),
        result: stringParam(url, 'result'),
        status: stringParam(url, 'status'),
        from: stringParam(url, 'from'),
        to: stringParam(url, 'to'),
      })
    );
  } catch (error) {
    return verificationError(error);
  }
}
