import { toISODate } from '@/lib/ai/period';
import {
  PERIOD_PARAMS,
  countBy,
  dayEnd,
  dayStart,
  fetchRows,
  labelTenants,
  periodFrom,
  scopeInfo,
  scoped,
  tenantNameMap,
  type ToolDefinition,
} from '@/lib/ai/tools/common';
import { loadNewStudents } from '@/lib/ai/tools/metrics';

const NO_APPLICATIONS_NOTE =
  'Admission applications are not tracked per organization yet (Admissions → Applications is a planned module), so pending applications cannot be counted for your organization.';

const getAdmissionStatistics: ToolDefinition = {
  name: 'get_admission_statistics',
  module: 'admissions',
  description:
    'Students admitted (student records created) and class enrollments created in the period, by status and branch.',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    const period = periodFrom(args);
    const [{ rows: students, truncated }, { rows: enrollments }] = await Promise.all([
      loadNewStudents(db, ctx, period),
      fetchRows<{ status: string | null }>(
        scoped(db.from('student_enrollments').select('status'), ctx)
          .gte('created_at', dayStart(period.from))
          .lte('created_at', dayEnd(period.to))
          .limit(10000)
      ),
    ]);
    const names = await tenantNameMap(db, ctx, students.map((s) => s.tenant_id || ''));
    return {
      data: {
        students_admitted: students.length,
        admitted_by_status: countBy(students, (s) => s.status),
        admitted_by_branch: labelTenants(countBy(students, (s) => s.tenant_id), names),
        enrollments_created: enrollments.length,
        enrollments_by_status: countBy(enrollments, (e) => e.status),
        truncated,
      },
      scope: scopeInfo(ctx, period, { basis: 'Admitted = student record created within the period.' }),
      links: [
        { label: 'Students', href: '/students' },
        { label: 'Admission', href: '/students/create' },
      ],
      notes: ctx.isPlatformScope ? [] : [NO_APPLICATIONS_NOTE],
    };
  },
};

const getPendingAdmissions: ToolDefinition = {
  name: 'get_pending_admissions',
  module: 'admissions',
  description:
    'Pending admission enquiries that need attention (status New, Contacted, or Visited) and overdue follow-ups.',
  parameters: { type: 'object', properties: {} },
  async execute(_args, ctx, db) {
    // `leads` has no tenant_id column, so it can only be read at platform scope.
    if (!ctx.isPlatformScope) {
      return {
        data: { available: false },
        scope: scopeInfo(ctx),
        links: [{ label: 'Students', href: '/students' }],
        notes: [NO_APPLICATIONS_NOTE],
      };
    }
    const { rows } = await fetchRows<{
      name: string;
      interested_program: string | null;
      status: string | null;
      follow_up_date: string | null;
    }>(
      db
        .from('leads')
        .select('name, interested_program, status, follow_up_date')
        .in('status', ['New', 'Contacted', 'Visited'])
        .order('follow_up_date', { ascending: true })
        .limit(2000),
      2000
    );
    const today = toISODate(new Date());
    const overdue = rows.filter((r) => r.follow_up_date && r.follow_up_date < today);
    return {
      data: {
        pending_enquiries: rows.length,
        by_status: countBy(rows, (r) => r.status),
        overdue_follow_ups: overdue.length,
        needing_attention: overdue.slice(0, 10).map((r) => ({
          name: r.name,
          program: r.interested_program,
          status: r.status,
          follow_up_date: r.follow_up_date,
        })),
      },
      scope: scopeInfo(ctx, undefined, { source: 'Admission enquiries (leads), platform-wide' }),
      notes: ['Leads are not linked to an organization, so this view is platform-wide.'],
    };
  },
};

export const admissionsTools: ToolDefinition[] = [getAdmissionStatistics, getPendingAdmissions];
