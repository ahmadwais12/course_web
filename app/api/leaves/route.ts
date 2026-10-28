import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const ADMIN_ROLES = new Set(['ceo', 'super_admin', 'admin', 'branch_manager']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

type StudentRow = {
  id: string;
  full_name: string | null;
  student_code: string | null;
  profile_id: string | null;
  class_id: string | null;
};

type StaffRow = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  profile_id: string | null;
  department: string | null;
};

type TeacherRow = {
  id: string;
  full_name: string | null;
  profile_id: string | null;
  department_id: string | null;
};

type ClassRow = { id: string; name: string | null; teacher_id: string | null };
type DeptRow = { id: string; name: string | null; head_id: string | null };

type StudentLeaveRow = {
  id: string;
  student_id: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
};

type EmployeeLeaveRow = {
  id: string;
  employee_id: string | null;
  leave_category: string | null;
  start_date: string | null;
  end_date: string | null;
  reason: string | null;
  status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
};

function unique(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

function isDate(value: string) {
  return DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getUserRole(db: AdminClient, userId: string, metadataRole?: unknown) {
  const { data } = await db.from('users').select('role').eq('id', userId).maybeSingle();
  return String((data as { role?: string | null } | null)?.role || metadataRole || '');
}

function managerForDepartment(
  departments: DeptRow[],
  department: string | null | undefined,
  departmentId: string | null | undefined
) {
  if (department) {
    return (
      departments.find(
        (d) => (d.name ?? '').toLowerCase() === department.toLowerCase()
      ) ?? null
    );
  }
  if (departmentId) {
    return departments.find((d) => d.id === departmentId) ?? null;
  }
  return null;
}

async function isClassTeacher(db: AdminClient, studentId: string, userId: string) {
  const { data: student } = await db
    .from('students')
    .select('class_id')
    .eq('id', studentId)
    .maybeSingle();
  const classId = (student as { class_id?: string | null } | null)?.class_id;
  if (!classId) return false;

  const { data: cls } = await db
    .from('classes')
    .select('teacher_id')
    .eq('id', classId)
    .maybeSingle();
  const teacherId = (cls as { teacher_id?: string | null } | null)?.teacher_id;
  if (!teacherId) return false;

  const { data: teacher } = await db
    .from('teachers')
    .select('profile_id')
    .eq('id', teacherId)
    .maybeSingle();
  return (teacher as { profile_id?: string | null } | null)?.profile_id === userId;
}

async function isDepartmentManager(db: AdminClient, employeeId: string, userId: string) {
  const { data: staff } = await db
    .from('staff')
    .select('department')
    .eq('id', employeeId)
    .maybeSingle();
  let department = (staff as { department?: string | null } | null)?.department ?? null;
  let departmentId: string | null = null;

  if (!department) {
    const { data: teacher } = await db
      .from('teachers')
      .select('department_id')
      .eq('id', employeeId)
      .maybeSingle();
    departmentId =
      (teacher as { department_id?: string | null } | null)?.department_id ?? null;
  }

  const { data: deptRows } = await db.from('departments').select('id, name, head_id');
  const departments = (deptRows ?? []) as DeptRow[];
  const dept = managerForDepartment(departments, department, departmentId);
  if (!dept?.head_id) return false;

  const { data: head } = await db
    .from('staff')
    .select('profile_id')
    .eq('id', dept.head_id)
    .maybeSingle();
  const headProfileId = (head as { profile_id?: string | null } | null)?.profile_id;
  if (headProfileId) return headProfileId === userId;

  const { data: headUser } = await db
    .from('users')
    .select('id')
    .eq('id', dept.head_id)
    .maybeSingle();
  return Boolean(headUser) && (headUser as { id: string }).id === userId;
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createSupabaseAdminClient();
    const role = await getUserRole(db, user.id, user.user_metadata?.role);
    const isAdmin = ADMIN_ROLES.has(role);

    const [meStudentRes, meStaffRes, meTeacherRes, studentLeaveRes, employeeLeaveRes] =
      await Promise.all([
        db
          .from('students')
          .select('id, full_name, student_code, profile_id, class_id')
          .eq('profile_id', user.id)
          .limit(1),
        db
          .from('staff')
          .select('id, full_name, employee_code, profile_id, department')
          .eq('profile_id', user.id)
          .limit(1),
        db
          .from('teachers')
          .select('id, full_name, profile_id, department_id')
          .eq('profile_id', user.id)
          .limit(1),
        db
          .from('student_leaves')
          .select(
            'id, student_id, start_date, end_date, reason, status, approved_by, approved_at, rejection_reason, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(500),
        db
          .from('employee_leaves')
          .select(
            'id, employee_id, leave_category, start_date, end_date, reason, status, approved_by, approved_at, rejection_reason, created_at'
          )
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

    const meStudent = ((meStudentRes.data ?? []) as StudentRow[])[0] ?? null;
    const meStaff = ((meStaffRes.data ?? []) as StaffRow[])[0] ?? null;
    const meTeacher = ((meTeacherRes.data ?? []) as TeacherRow[])[0] ?? null;
    const studentLeaves = (studentLeaveRes.data ?? []) as StudentLeaveRow[];
    const employeeLeaves = (employeeLeaveRes.data ?? []) as EmployeeLeaveRow[];

    const studentIds = unique(studentLeaves.map((r) => r.student_id));
    const employeeIds = unique(employeeLeaves.map((r) => r.employee_id));

    const students = studentIds.length
      ? (((await db
          .from('students')
          .select('id, full_name, student_code, profile_id, class_id')
          .in('id', studentIds)).data ?? []) as StudentRow[])
      : [];
    const staff = employeeIds.length
      ? (((await db
          .from('staff')
          .select('id, full_name, employee_code, profile_id, department')
          .in('id', employeeIds)).data ?? []) as StaffRow[])
      : [];
    const teachers = employeeIds.length
      ? (((await db
          .from('teachers')
          .select('id, full_name, profile_id, department_id')
          .in('id', employeeIds)).data ?? []) as TeacherRow[])
      : [];
    const departments = (((await db.from('departments').select('id, name, head_id')).data ??
      []) as DeptRow[]);

    const classIds = unique(students.map((s) => s.class_id));
    const classes = classIds.length
      ? (((await db
          .from('classes')
          .select('id, name, teacher_id')
          .in('id', classIds)).data ?? []) as ClassRow[])
      : [];

    const classTeacherIds = unique(classes.map((c) => c.teacher_id));
    const classTeachers = classTeacherIds.length
      ? (((await db
          .from('teachers')
          .select('id, full_name, profile_id, department_id')
          .in('id', classTeacherIds)).data ?? []) as TeacherRow[])
      : [];

    const headIds = unique(
      employeeLeaves.map(
        (leave) =>
          managerForDepartment(
            departments,
            staff.find((s) => s.id === leave.employee_id)?.department,
            teachers.find((t) => t.id === leave.employee_id)?.department_id
          )?.head_id
      )
    );
    const heads = headIds.length
      ? (((await db
          .from('staff')
          .select('id, full_name, employee_code, profile_id, department')
          .in('id', headIds)).data ?? []) as StaffRow[])
      : [];
    const missingHeadIds = headIds.filter((id) => !heads.some((h) => h.id === id));
    const headUsers = missingHeadIds.length
      ? (((await db
          .from('users')
          .select('id, full_name')
          .in('id', missingHeadIds)).data ?? []) as { id: string; full_name: string | null }[])
      : [];

    const studentById = new Map(students.map((s) => [s.id, s]));
    const staffById = new Map(staff.map((s) => [s.id, s]));
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    for (const t of classTeachers) teacherById.set(t.id, t);
    const classById = new Map(classes.map((c) => [c.id, c]));
    const headById = new Map(
      heads.map((h) => [h.id, { profileId: h.profile_id, name: h.full_name }])
    );
    for (const u of headUsers) {
      headById.set(u.id, { profileId: u.id, name: u.full_name });
    }

    const items = [
      ...studentLeaves.map((leave) => {
        const student = leave.student_id ? studentById.get(leave.student_id) ?? null : null;
        const cls = student?.class_id ? classById.get(student.class_id) ?? null : null;
        const teacher = cls?.teacher_id ? teacherById.get(cls.teacher_id) ?? null : null;
        const approverProfileId = teacher?.profile_id ?? null;
        return {
          id: leave.id,
          requester_type: 'student' as const,
          requester_id: leave.student_id ?? '',
          requester_name: student?.full_name ?? '—',
          requester_code: student?.student_code ?? null,
          context: cls?.name ?? null,
          leave_type: 'Student leave',
          start_date: leave.start_date,
          end_date: leave.end_date,
          reason: leave.reason,
          status: leave.status ?? 'pending',
          rejection_reason: leave.rejection_reason,
          approver_name: teacher?.full_name ?? null,
          can_approve:
            (leave.status ?? 'pending') === 'pending' &&
            (isAdmin || (Boolean(approverProfileId) && approverProfileId === user.id)),
          created_at: leave.created_at,
        };
      }),
      ...employeeLeaves.map((leave) => {
        const employee = leave.employee_id ? staffById.get(leave.employee_id) : undefined;
        const teacher = leave.employee_id ? teacherById.get(leave.employee_id) : undefined;
        const dept = managerForDepartment(departments, employee?.department, teacher?.department_id);
        const head = dept?.head_id ? headById.get(dept.head_id) : undefined;
        return {
          id: leave.id,
          requester_type: 'employee' as const,
          requester_id: leave.employee_id ?? '',
          requester_name: employee?.full_name ?? teacher?.full_name ?? '—',
          requester_code: employee?.employee_code ?? null,
          context: dept?.name ?? employee?.department ?? null,
          leave_type: leave.leave_category || 'Leave',
          start_date: leave.start_date,
          end_date: leave.end_date,
          reason: leave.reason,
          status: leave.status ?? 'pending',
          rejection_reason: leave.rejection_reason,
          approver_name: head?.name ?? null,
          can_approve:
            (leave.status ?? 'pending') === 'pending' &&
            (isAdmin || head?.profileId === user.id),
          created_at: leave.created_at,
        };
      }),
    ].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));

    const ownEmployeeIds = new Set(unique([meStaff?.id, meTeacher?.id]));
    const visible = isAdmin
      ? items
      : items.filter(
          (item) =>
            (item.requester_type === 'student' && item.requester_id === meStudent?.id) ||
            (item.requester_type === 'employee' && ownEmployeeIds.has(item.requester_id)) ||
            item.can_approve
        );

    return NextResponse.json({
      me: {
        kind: meStudent ? 'student' : meStaff || meTeacher ? 'employee' : null,
        name: meStudent?.full_name ?? meStaff?.full_name ?? meTeacher?.full_name ?? null,
        role,
      },
      items: visible,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load leave requests';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      requesterType?: string;
      start_date?: string;
      end_date?: string;
      reason?: string;
      leave_type?: string;
    };

    const requesterType =
      body.requesterType === 'student'
        ? 'student'
        : body.requesterType === 'employee'
          ? 'employee'
          : null;
    const startDate = String(body.start_date ?? '').trim();
    const endDate = String(body.end_date ?? '').trim() || startDate;
    const reason = String(body.reason ?? '').trim();

    if (!requesterType) {
      return NextResponse.json({ error: 'Requester type is required' }, { status: 400 });
    }
    if (!isDate(startDate) || !isDate(endDate)) {
      return NextResponse.json({ error: 'Valid start and end dates are required' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be on or after the start date' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'A reason is required' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const now = new Date().toISOString();

    if (requesterType === 'student') {
      const { data } = await db
        .from('students')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1);
      const student = ((data ?? []) as { id: string }[])[0];
      if (!student) {
        return NextResponse.json(
          { error: 'No student record is linked to this account' },
          { status: 403 }
        );
      }

      const { error } = await db.from('student_leaves').insert({
        student_id: student.id,
        start_date: startDate,
        end_date: endDate,
        reason,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, routed_to: 'teacher' });
    }

    const [staffRes, teacherRes] = await Promise.all([
      db
        .from('staff')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1),
      db
        .from('teachers')
        .select('id')
        .eq('profile_id', user.id)
        .limit(1),
    ]);
    const employeeId =
      ((staffRes.data ?? []) as { id: string }[])[0]?.id ??
      ((teacherRes.data ?? []) as { id: string }[])[0]?.id;
    if (!employeeId) {
      return NextResponse.json(
        { error: 'No employee record is linked to this account' },
        { status: 403 }
      );
    }

    const { error } = await db.from('employee_leaves').insert({
      employee_id: employeeId,
      leave_category: String(body.leave_type ?? '').trim() || 'Leave',
      start_date: startDate,
      end_date: endDate,
      reason,
      status: 'pending',
      created_at: now,
      updated_at: now,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, routed_to: 'manager' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit leave request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as {
      id?: string;
      requesterType?: string;
      action?: string;
      rejection_reason?: string;
    };
    const id = String(body.id ?? '');
    const requesterType = body.requesterType === 'employee' ? 'employee' : 'student';
    const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null;

    if (!UUID_RE.test(id) || !action) {
      return NextResponse.json({ error: 'Invalid leave request' }, { status: 400 });
    }

    const db = createSupabaseAdminClient();
    const role = await getUserRole(db, user.id, user.user_metadata?.role);
    const isAdmin = ADMIN_ROLES.has(role);
    const now = new Date().toISOString();
    const patch =
      action === 'approve'
        ? { status: 'approved', approved_by: user.id, approved_at: now, rejection_reason: null }
        : {
            status: 'rejected',
            approved_by: user.id,
            approved_at: now,
            rejection_reason: String(body.rejection_reason ?? '').trim() || null,
          };

    if (requesterType === 'student') {
      const { data } = await db
        .from('student_leaves')
        .select('id, student_id, status')
        .eq('id', id)
        .maybeSingle();
      const leave = data as { id: string; student_id: string; status: string | null } | null;
      if (!leave) {
        return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
      }
      if ((leave.status ?? 'pending') !== 'pending') {
        return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 400 });
      }
      if (!isAdmin && !(await isClassTeacher(db, leave.student_id, user.id))) {
        return NextResponse.json(
          { error: 'Only the class teacher can review this request' },
          { status: 403 }
        );
      }

      const { error } = await db
        .from('student_leaves')
        .update({ ...patch, updated_at: now })
        .eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { data } = await db
      .from('employee_leaves')
      .select('id, employee_id, status')
      .eq('id', id)
      .maybeSingle();
    const leave = data as { id: string; employee_id: string; status: string | null } | null;
    if (!leave) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }
    if ((leave.status ?? 'pending') !== 'pending') {
      return NextResponse.json({ error: 'This request has already been reviewed' }, { status: 400 });
    }
    if (!isAdmin && !(await isDepartmentManager(db, leave.employee_id, user.id))) {
      return NextResponse.json(
        { error: 'Only the department manager can review this request' },
        { status: 403 }
      );
    }

    const { error } = await db
      .from('employee_leaves')
      .update({ ...patch, updated_at: now })
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to review leave request';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
