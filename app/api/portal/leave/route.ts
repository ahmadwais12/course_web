import { NextResponse } from 'next/server';
import { portalsForNav } from '@/lib/portals';
import { daysBetween, requirePortalUser, safeRow, safeRows } from '@/lib/portal-api';
import type {
  PortalHoliday,
  PortalLeaveData,
  PortalLeaveRequest,
  PortalProfile,
} from '@/lib/portal-types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ADMIN_ROLES = new Set(['ceo', 'super_admin', 'admin', 'branch_manager']);
const CATEGORIES = new Set(['full_day', 'half_day', 'hourly']);

type StudentRow = {
  id: string;
  full_name: string | null;
  student_code: string | null;
  class_id: string | null;
};

type StaffRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  department: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  department_id: string | null;
};

type ClassRow = { id: string; name: string | null };
type DeptRow = { id: string; name: string | null; head_id: string | null };

type HolidayRow = {
  id: string;
  name: string | null;
  date: string | null;
  description: string | null;
  is_recurring: boolean | null;
};

type LeaveTypeRow = {
  id: string;
  name: string | null;
  category: string | null;
};

type StudentLeaveRow = {
  id: string;
  student_id: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  status: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string | null;
};

type EmployeeLeaveRow = {
  id: string;
  employee_id: string | null;
  leave_type_id: string | null;
  leave_category: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  status: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string | null;
};

function categoryLabel(value: string | null | undefined) {
  if (!value) return 'Leave';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeCategory(value: string) {
  const normalized = value.trim().toLowerCase().replaceAll(' ', '_');
  if (CATEGORIES.has(normalized)) return normalized;
  if (normalized.includes('half')) return 'half_day';
  if (normalized.includes('hour')) return 'hourly';
  return 'full_day';
}

function isDate(value: string) {
  return ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function requestDays(start: string | null, end: string | null, category: string) {
  if (!start) return 0;
  const days = daysBetween(start, end || start);
  if (category === 'half_day') return Math.max(days * 0.5, 0.5);
  if (category === 'hourly') return 0;
  return days;
}

export async function GET() {
  try {
    const auth = await requirePortalUser((role) => portalsForNav(role).includes('leave'));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { admin, user } = auth;

    const [student, staff, teacher] = await Promise.all([
      safeRow<StudentRow>(
        admin
          .from('students')
          .select('id, full_name, student_code, class_id')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle()
      ),
      safeRow<StaffRow>(
        admin
          .from('staff')
          .select('id, full_name, employee_code, department')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle()
      ),
      safeRow<TeacherRow>(
        admin
          .from('teachers')
          .select('id, full_name, employee_code, department_id')
          .eq('profile_id', user.id)
          .limit(1)
          .maybeSingle()
      ),
    ]);

    const kind: PortalLeaveData['kind'] = student ? 'student' : staff || teacher ? 'employee' : null;

    const employeeIds = unique([user.id, staff?.id, teacher?.id]);

    const [studentLeaves, employeeLeaves, holidays, leaveTypeRows, classRow, departments] =
      await Promise.all([
        student
          ? safeRows<StudentLeaveRow>(
              admin
                .from('student_leaves')
                .select(
                  'id, student_id, start_date, end_date, reason, status, rejection_reason, approved_at, created_at'
                )
                .eq('student_id', student.id)
                .order('created_at', { ascending: false })
                .limit(200)
            )
          : Promise.resolve([]),
        employeeIds.length
          ? safeRows<EmployeeLeaveRow>(
              admin
                .from('employee_leaves')
                .select(
                  'id, employee_id, leave_type_id, leave_category, start_date, end_date, reason, status, rejection_reason, approved_at, created_at'
                )
                .in('employee_id', employeeIds)
                .order('created_at', { ascending: false })
                .limit(200)
            )
          : Promise.resolve([]),
        safeRows<HolidayRow>(
          user.tenantId
            ? admin
                .from('holidays')
                .select('id, name, date, description, is_recurring')
                .eq('tenant_id', user.tenantId)
                .order('date', { ascending: true })
                .limit(200)
            : admin
                .from('holidays')
                .select('id, name, date, description, is_recurring')
                .order('date', { ascending: true })
                .limit(200)
        ),
        safeRows<LeaveTypeRow>(
          user.tenantId
            ? admin
                .from('leave_types')
                .select('id, name, category')
                .eq('tenant_id', user.tenantId)
                .eq('is_active', true)
                .limit(100)
            : admin
                .from('leave_types')
                .select('id, name, category')
                .eq('is_active', true)
                .limit(100)
        ),
        student?.class_id
          ? safeRow<ClassRow>(
              admin.from('classes').select('id, name').eq('id', student.class_id).maybeSingle()
            )
          : Promise.resolve(null),
        safeRows<DeptRow>(admin.from('departments').select('id, name, head_id').limit(200)),
      ]);

    const typeNameById = new Map(
      leaveTypeRows.map((row) => [row.id, row.name ?? categoryLabel(row.category)])
    );

    const typeOptions = new Map<string, string>();
    for (const row of leaveTypeRows) {
      const category = row.category && CATEGORIES.has(row.category) ? row.category : 'full_day';
      if (!typeOptions.has(category)) {
        typeOptions.set(category, row.name ?? categoryLabel(category));
      }
    }
    for (const category of ['full_day', 'half_day', 'hourly']) {
      if (!typeOptions.has(category)) typeOptions.set(category, categoryLabel(category));
    }
    const leaveTypes = [...typeOptions.entries()].map(([value, label]) => ({ value, label }));

    const requests: PortalLeaveRequest[] = [
      ...studentLeaves.map((row) => ({
        id: row.id,
        kind: 'student' as const,
        leaveType: 'Student leave',
        category: 'full_day',
        startDate: row.start_date ?? '',
        endDate: row.end_date,
        days: requestDays(row.start_date, row.end_date, 'full_day'),
        reason: row.reason,
        status: row.status ?? 'pending',
        rejectionReason: row.rejection_reason,
        approvedAt: row.approved_at,
        createdAt: row.created_at,
      })),
      ...employeeLeaves.map((row) => {
        const category = row.leave_category ?? 'full_day';
        return {
          id: row.id,
          kind: 'employee' as const,
          leaveType:
            (row.leave_type_id ? typeNameById.get(row.leave_type_id) : null) ??
            categoryLabel(category),
          category,
          startDate: row.start_date ?? '',
          endDate: row.end_date,
          days: requestDays(row.start_date, row.end_date, category),
          reason: row.reason,
          status: row.status ?? 'pending',
          rejectionReason: row.rejection_reason,
          approvedAt: row.approved_at,
          createdAt: row.created_at,
        };
      }),
    ]
      .filter((row) => Boolean(row.startDate))
      .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')));

    const currentYear = new Date().getFullYear();
    const thisYear = requests.filter(
      (row) => Number(String(row.startDate).slice(0, 4)) === currentYear
    );
    const approvedDays = thisYear
      .filter((row) => row.status === 'approved')
      .reduce((sum, row) => sum + row.days, 0);
    const pendingDays = thisYear
      .filter((row) => (row.status ?? 'pending') === 'pending')
      .reduce((sum, row) => sum + row.days, 0);

    const isAdmin = ADMIN_ROLES.has(user.role);

    let managesStudents = false;
    if (teacher) {
      const classes = await safeRows<{ id: string }>(
        admin.from('classes').select('id').eq('teacher_id', teacher.id).limit(1)
      );
      managesStudents = classes.length > 0;
    }

    const headIds = unique([user.id, staff?.id]);
    const managesStaff = headIds.some((id) => departments.some((dept) => dept.head_id === id));

    const department = departments.find(
      (dept) => dept.id === teacher?.department_id || dept.name === staff?.department
    );

    const profile: PortalProfile = {
      id: user.id,
      name: user.name ?? staff?.full_name ?? teacher?.full_name ?? student?.full_name ?? '',
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      tenantId: user.tenantId,
    };

    const person = student
      ? {
          id: student.id,
          name: student.full_name,
          code: student.student_code,
          context: classRow?.name ?? null,
        }
      : staff || teacher
        ? {
            id: (staff ?? teacher)!.id,
            name: staff?.full_name ?? teacher?.full_name ?? user.name,
            code: staff?.employee_code ?? teacher?.employee_code ?? null,
            context: department?.name ?? staff?.department ?? null,
          }
        : null;

    const holidayList: PortalHoliday[] = holidays
      .filter((row) => Boolean(row.date))
      .map((row) => ({
        id: row.id,
        name: row.name ?? 'Holiday',
        date: row.date as string,
        description: row.description,
        isRecurring: Boolean(row.is_recurring),
      }));

    const payload: PortalLeaveData = {
      portal: 'leave',
      profile,
      kind,
      person,
      requests,
      summary: {
        pending: requests.filter((row) => (row.status ?? 'pending') === 'pending').length,
        approved: requests.filter((row) => row.status === 'approved').length,
        rejected: requests.filter((row) => row.status === 'rejected').length,
        total: requests.length,
        approvedDays,
        pendingDays,
      },
      holidays: holidayList,
      leaveTypes,
      canApprove: isAdmin || managesStudents || managesStaff,
    };

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load leave data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePortalUser((role) => portalsForNav(role).includes('leave'));
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { admin, user } = auth;

    let body: {
      startDate?: string;
      endDate?: string;
      category?: string;
      reason?: string;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const startDate = String(body.startDate ?? '').trim();
    const endDate = String(body.endDate ?? '').trim() || startDate;
    const reason = String(body.reason ?? '').trim();

    if (!isDate(startDate) || !isDate(endDate)) {
      return NextResponse.json({ error: 'Valid start and end dates are required' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'The end date cannot be before the start date' },
        { status: 400 }
      );
    }
    if (!reason) {
      return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
    }

    const student = await safeRow<{ id: string }>(
      admin.from('students').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
    );

    const now = new Date().toISOString();

    if (student) {
      const { data, error } = await admin
        .from('student_leaves')
        .insert({
          tenant_id: user.tenantId,
          student_id: student.id,
          start_date: startDate,
          end_date: endDate,
          reason,
          status: 'pending',
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        ok: true,
        id: (data as { id: string }).id,
        routed_to: 'class teacher',
      });
    }

    const [staff, teacher] = await Promise.all([
      safeRow<{ id: string }>(
        admin.from('staff').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
      ),
      safeRow<{ id: string }>(
        admin.from('teachers').select('id').eq('profile_id', user.id).limit(1).maybeSingle()
      ),
    ]);

    if (!staff && !teacher) {
      return NextResponse.json(
        { error: 'No student or employee record is linked to this account' },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from('employee_leaves')
      .insert({
        tenant_id: user.tenantId,
        employee_id: user.id,
        leave_category: normalizeCategory(String(body.category ?? '')),
        start_date: startDate,
        end_date: endDate,
        reason,
        status: 'pending',
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      ok: true,
      id: (data as { id: string }).id,
      routed_to: 'department manager',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit leave request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
