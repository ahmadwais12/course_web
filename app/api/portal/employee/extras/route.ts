import { NextResponse } from 'next/server';
import { requirePortalUser, safeRow, safeRows } from '@/lib/portal-api';
import type { PortalEmployeeExtras } from '@/lib/portal-types';

type HolidayRow = {
  id: string;
  name: string;
  date: string;
  description: string | null;
  is_recurring: boolean | null;
};
type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  type: string | null;
  priority: string | null;
  audience: string | null;
  publish_date: string | null;
  expiry_date: string | null;
  is_pinned: boolean | null;
  attachment_url: string | null;
  attachment_name: string | null;
};
type ShiftRow = {
  shift_type: string | null;
  contract_type: string | null;
  contract_end_date: string | null;
  join_date: string | null;
};
type TicketRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  resolution_notes: string | null;
  created_at: string | null;
  resolved_at: string | null;
};

export async function GET() {
  const auth = await requirePortalUser((role) => role !== 'student');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;

  const holidaysQuery = admin
    .from('holidays')
    .select('id, name, date, description, is_recurring')
    .order('date', { ascending: true })
    .limit(80);
  const announcementsQuery = admin
    .from('announcements')
    .select('id, title, content, type, priority, audience, publish_date, expiry_date, is_pinned, attachment_url, attachment_name')
    .eq('status', 'published')
    .in('audience', ['all', 'staff', 'teachers'])
    .order('publish_date', { ascending: false })
    .limit(50);

  const [holidays, announcements, tickets, shift] = await Promise.all([
    safeRows<HolidayRow>(
      user.tenantId ? holidaysQuery.eq('tenant_id', user.tenantId) : holidaysQuery
    ),
    safeRows<AnnouncementRow>(
      user.tenantId ? announcementsQuery.eq('tenant_id', user.tenantId) : announcementsQuery
    ),
    safeRows<TicketRow>(
      admin
        .from('support_tickets')
        .select('id, title, description, category, priority, status, resolution_notes, created_at, resolved_at')
        .eq('reported_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
    ),
    safeRow<ShiftRow>(
      admin
        .from('staff')
        .select('shift_type, contract_type, contract_end_date, join_date')
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle()
    ),
  ]);

  const data: PortalEmployeeExtras = {
    holidays: holidays.map((row) => ({
      id: row.id,
      name: row.name,
      date: row.date,
      description: row.description,
      isRecurring: Boolean(row.is_recurring),
    })),
    announcements: announcements.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      priority: row.priority,
      audience: row.audience,
      publishDate: row.publish_date,
      expiryDate: row.expiry_date,
      isPinned: Boolean(row.is_pinned),
      attachmentUrl: row.attachment_url,
      attachmentName: row.attachment_name,
    })),
    requests: tickets.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      priority: row.priority,
      status: row.status,
      resolutionNotes: row.resolution_notes,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    })),
    shift: {
      shiftType: shift?.shift_type ?? null,
      contractType: shift?.contract_type ?? null,
      contractEndDate: shift?.contract_end_date ?? null,
      joinDate: shift?.join_date ?? null,
    },
  };

  return NextResponse.json(data);
}
