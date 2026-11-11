import { NextResponse } from 'next/server';
import {
  attendanceSummary,
  daysBetween,
  jsonDocuments,
  monthlyAttendance,
  num,
  requirePortalUser,
  safeRow,
  safeRows,
  str,
  type AttendanceRow,
} from '@/lib/portal-api';
import type {
  PortalEmployeeData,
  PortalEmployeeRecord,
  PortalExpense,
  PortalPayslip,
  PortalTimetableSlot,
} from '@/lib/portal-types';

type StaffRow = {
  id: string;
  employee_code: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  role: string | null;
  join_date: string | null;
  contract_type: string | null;
  contract_end_date: string | null;
  status: string | null;
  photo_url: string | null;
  documents: unknown;
  bank_name: string | null;
  bank_account_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  assigned_tasks: unknown;
  performance_rating: number | null;
  last_evaluation_date: string | null;
};

type TeacherRow = {
  id: string;
  employee_code: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  department_id: string | null;
  qualification: string | null;
  specialization: string | null;
  join_date: string | null;
  contract_type: string | null;
  contract_end_date: string | null;
  status: string | null;
  photo_url: string | null;
  documents: unknown;
  bank_name: string | null;
  bank_account_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  performance_rating: number | null;
  last_evaluation_date: string | null;
  next_evaluation_date: string | null;
};

type DepartmentRow = { id: string; name: string | null };
type LeaveRow = {
  id: string;
  employee_id: string | null;
  leave_category: string | null;
  start_date: string;
  end_date: string | null;
  reason: string | null;
  status: string | null;
  rejection_reason: string | null;
  approved_at: string | null;
  created_at: string | null;
};
type SalaryRow = {
  id: string;
  month: number;
  year: number;
  basic_salary: number | null;
  allowances: unknown;
  deductions: unknown;
  bonus: number | null;
  overtime_pay: number | null;
  gross_salary: number | null;
  net_salary: number | null;
  status: string | null;
  payment_date: string | null;
  payment_method: string | null;
  payslip_url: string | null;
};
type TimetableRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_id: string | null;
  teacher_id: string | null;
  room_id: string | null;
  class_id: string | null;
};
type SubjectRow = { id: string; name: string };
type ClassRow = { id: string; name: string | null };
type RoomRow = { id: string; name: string };
type ExpenseRow = {
  id: string;
  category: string;
  subcategory: string | null;
  amount: number | null;
  expense_date: string | null;
  description: string | null;
  vendor: string | null;
  status: string | null;
  notes: string | null;
};

function normalizeTasks(value: unknown): PortalEmployeeData['tasks'] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return { id: `task-${index}`, title: entry, detail: null, status: null };
      }
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const title = str(row.title) || str(row.name) || str(row.task);
      if (!title) return null;
      return {
        id: str(row.id) || `task-${index}`,
        title,
        detail: str(row.description) || str(row.detail),
        status: str(row.status),
      };
    })
    .filter((task): task is PortalEmployeeData['tasks'][number] => Boolean(task));
}

export async function GET() {
  const auth = await requirePortalUser((role) => role !== 'student');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { admin, user } = auth;
  const profile = {
    id: user.id,
    name: user.name || user.email || 'Employee',
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    tenantId: user.tenantId,
  };

  const [staff, teacher] = await Promise.all([
    safeRow<StaffRow>(
      admin
        .from('staff')
        .select(
          'id, employee_code, full_name, email, phone, department, designation, role, join_date, contract_type, contract_end_date, status, photo_url, documents, bank_name, bank_account_number, emergency_contact_name, emergency_contact_phone, address, assigned_tasks, performance_rating, last_evaluation_date'
        )
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle()
    ),
    safeRow<TeacherRow>(
      admin
        .from('teachers')
        .select(
          'id, employee_code, full_name, email, phone, department_id, qualification, specialization, join_date, contract_type, contract_end_date, status, photo_url, documents, bank_name, bank_account_number, emergency_contact_name, emergency_contact_phone, address, performance_rating, last_evaluation_date, next_evaluation_date'
        )
        .eq('profile_id', user.id)
        .limit(1)
        .maybeSingle()
    ),
  ]);

  const department = teacher?.department_id
    ? await safeRow<DepartmentRow>(
        admin.from('departments').select('id, name').eq('id', teacher.department_id).maybeSingle()
      )
    : null;

  const preferTeacher = user.role === 'teacher' && Boolean(teacher);
  const record: PortalEmployeeRecord | null = preferTeacher && teacher
    ? {
        kind: 'teacher',
        id: teacher.id,
        employeeCode: teacher.employee_code || '—',
        fullName: teacher.full_name || profile.name,
        email: teacher.email,
        phone: teacher.phone,
        department: department?.name ?? null,
        designation: 'Teacher',
        joinDate: teacher.join_date,
        contractType: teacher.contract_type,
        contractEndDate: teacher.contract_end_date,
        status: teacher.status,
        photoUrl: teacher.photo_url || profile.avatarUrl,
        qualification: teacher.qualification,
        specialization: teacher.specialization,
        bankName: teacher.bank_name,
        bankAccountNumber: teacher.bank_account_number,
        emergencyContactName: teacher.emergency_contact_name,
        emergencyContactPhone: teacher.emergency_contact_phone,
        address: teacher.address,
      }
    : staff
      ? {
          kind: 'staff',
          id: staff.id,
          employeeCode: staff.employee_code || '—',
          fullName: staff.full_name || profile.name,
          email: staff.email,
          phone: staff.phone,
          department: staff.department,
          designation: staff.designation || staff.role || null,
          joinDate: staff.join_date,
          contractType: staff.contract_type,
          contractEndDate: staff.contract_end_date,
          status: staff.status,
          photoUrl: staff.photo_url || profile.avatarUrl,
          qualification: null,
          specialization: null,
          bankName: staff.bank_name,
          bankAccountNumber: staff.bank_account_number,
          emergencyContactName: staff.emergency_contact_name,
          emergencyContactPhone: staff.emergency_contact_phone,
          address: staff.address,
        }
      : teacher
        ? {
            kind: 'teacher',
            id: teacher.id,
            employeeCode: teacher.employee_code || '—',
            fullName: teacher.full_name || profile.name,
            email: teacher.email,
            phone: teacher.phone,
            department: department?.name ?? null,
            designation: 'Teacher',
            joinDate: teacher.join_date,
            contractType: teacher.contract_type,
            contractEndDate: teacher.contract_end_date,
            status: teacher.status,
            photoUrl: teacher.photo_url || profile.avatarUrl,
            qualification: teacher.qualification,
            specialization: teacher.specialization,
            bankName: teacher.bank_name,
            bankAccountNumber: teacher.bank_account_number,
            emergencyContactName: teacher.emergency_contact_name,
            emergencyContactPhone: teacher.emergency_contact_phone,
            address: teacher.address,
          }
        : null;

  if (!record) {
    const empty: PortalEmployeeData = {
      portal: 'employee',
      profile,
      employee: null,
      attendance: { summary: attendanceSummary([]), recent: [], monthly: [] },
      leaves: [],
      leaveBalance: { takenDays: 0, pendingDays: 0, approvedThisYear: 0 },
      payslips: [],
      expenses: [],
      performance: {
        rating: null,
        lastEvaluationDate: null,
        nextEvaluationDate: null,
        attendancePercentage: 0,
        leaveDaysTaken: 0,
        openTasks: 0,
      },
      documents: [],
      tasks: [],
      schedule: [],
    };
    return NextResponse.json(empty);
  }

  const scopeIds = [...new Set([user.id, staff?.id, teacher?.id].filter((value): value is string => Boolean(value)))];
  const personTypes = [...new Set([record.kind, staff ? 'staff' : null, teacher ? 'teacher' : null].filter((value): value is string => Boolean(value)))];

  const [attendanceRows, leaveRows, salaryRows, timetableRows, expenseRows] = await Promise.all([
    safeRows<AttendanceRow>(
      admin
        .from('attendance')
        .select('id, person_id, date, status, check_in_time, check_out_time, late_minutes, remarks')
        .in('person_type', personTypes)
        .in('person_id', scopeIds)
        .order('date', { ascending: false })
        .limit(400)
    ),
    safeRows<LeaveRow>(
      admin
        .from('employee_leaves')
        .select('id, employee_id, leave_category, start_date, end_date, reason, status, rejection_reason, approved_at, created_at')
        .in('employee_id', scopeIds)
        .order('created_at', { ascending: false })
        .limit(100)
    ),
    safeRows<SalaryRow>(
      admin
        .from('salaries')
        .select('id, month, year, basic_salary, allowances, deductions, bonus, overtime_pay, gross_salary, net_salary, status, payment_date, payment_method, payslip_url')
        .in('employee_id', scopeIds)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(60)
    ),
    safeRows<TimetableRow>(
      admin
        .from('timetables')
        .select('id, day_of_week, start_time, end_time, subject_id, teacher_id, room_id, class_id')
        .in('teacher_id', scopeIds)
        .eq('is_active', true)
        .order('day_of_week')
        .limit(100)
    ),
    safeRows<ExpenseRow>(
      admin
        .from('expenses')
        .select('id, category, subcategory, amount, expense_date, description, vendor, status, notes')
        .eq('created_by', user.id)
        .order('expense_date', { ascending: false })
        .limit(60)
    ),
  ]);

  const subjectIds = [...new Set(
    timetableRows.map((row) => row.subject_id).filter((value): value is string => Boolean(value))
  )];
  const classIds = [...new Set(
    timetableRows.map((row) => row.class_id).filter((value): value is string => Boolean(value))
  )];
  const roomIds = [...new Set(
    timetableRows.map((row) => row.room_id).filter((value): value is string => Boolean(value))
  )];

  const [subjects, classes, rooms] = await Promise.all([
    subjectIds.length
      ? safeRows<SubjectRow>(admin.from('subjects').select('id, name').in('id', subjectIds))
      : Promise.resolve([]),
    classIds.length
      ? safeRows<ClassRow>(admin.from('classes').select('id, name').in('id', classIds))
      : Promise.resolve([]),
    roomIds.length
      ? safeRows<RoomRow>(admin.from('rooms').select('id, name').in('id', roomIds))
      : Promise.resolve([]),
  ]);

  const subjectById = new Map(subjects.map((row) => [row.id, row.name]));
  const classById = new Map(classes.map((row) => [row.id, row.name]));
  const roomById = new Map(rooms.map((row) => [row.id, row.name]));

  const schedule: PortalTimetableSlot[] = timetableRows.map((row) => ({
    id: row.id,
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time),
    endTime: String(row.end_time),
    subjectName: row.subject_id ? subjectById.get(row.subject_id) ?? null : null,
    className: row.class_id ? classById.get(row.class_id) ?? null : null,
    teacherName: profile.name,
    roomName: row.room_id ? roomById.get(row.room_id) ?? null : null,
  }));

  const payslips: PortalPayslip[] = salaryRows.map((row) => ({
    id: row.id,
    month: Number(row.month),
    year: Number(row.year),
    basicSalary: num(row.basic_salary),
    allowances:
      row.allowances && typeof row.allowances === 'object' && !Array.isArray(row.allowances)
        ? (row.allowances as Record<string, number>)
        : {},
    deductions:
      row.deductions && typeof row.deductions === 'object' && !Array.isArray(row.deductions)
        ? (row.deductions as Record<string, number>)
        : {},
    bonus: num(row.bonus),
    overtimePay: num(row.overtime_pay),
    grossSalary: num(row.gross_salary),
    netSalary: num(row.net_salary),
    status: row.status,
    paymentDate: row.payment_date,
    paymentMethod: row.payment_method,
    payslipUrl: row.payslip_url,
  }));

  const currentYear = new Date().getFullYear();
  const yearLeaves = leaveRows.filter(
    (row) => String(row.start_date).slice(0, 4) === String(currentYear)
  );
  const takenDays = yearLeaves
    .filter((row) => row.status === 'approved')
    .reduce((sum, row) => sum + daysBetween(row.start_date, row.end_date), 0);
  const pendingDays = yearLeaves
    .filter((row) => row.status === 'pending')
    .reduce((sum, row) => sum + daysBetween(row.start_date, row.end_date), 0);

  const documents = [
    ...jsonDocuments(staff?.documents),
    ...jsonDocuments(teacher?.documents),
  ];

  const tasks = normalizeTasks(staff?.assigned_tasks);
  const attendance = {
    summary: attendanceSummary(attendanceRows),
    recent: attendanceRows.slice(0, 60).map((row) => ({
      id: row.id,
      date: row.date,
      status: row.status,
      checkInTime: row.check_in_time,
      checkOutTime: row.check_out_time,
      lateMinutes: num(row.late_minutes),
      remarks: row.remarks,
    })),
    monthly: monthlyAttendance(attendanceRows),
  };
  const expenses: PortalExpense[] = expenseRows.map((row) => ({
    id: row.id,
    category: row.category,
    subcategory: row.subcategory,
    amount: num(row.amount),
    expenseDate: row.expense_date,
    description: row.description,
    vendor: row.vendor,
    status: row.status,
    notes: row.notes,
  }));

  const data: PortalEmployeeData = {
    portal: 'employee',
    profile,
    employee: record,
    attendance,
    leaves: leaveRows.map((row) => ({
      id: row.id,
      leaveType: row.leave_category || 'Leave',
      startDate: row.start_date,
      endDate: row.end_date,
      reason: row.reason,
      status: row.status,
      rejectionReason: row.rejection_reason,
      approvedAt: row.approved_at,
      createdAt: row.created_at,
    })),
    leaveBalance: {
      takenDays,
      pendingDays,
      approvedThisYear: yearLeaves.filter((row) => row.status === 'approved').length,
    },
    payslips,
    expenses,
    performance: {
      rating:
        (preferTeacher ? teacher?.performance_rating : staff?.performance_rating) == null
          ? null
          : num(preferTeacher ? teacher?.performance_rating : staff?.performance_rating),
      lastEvaluationDate: preferTeacher
        ? teacher?.last_evaluation_date ?? null
        : staff?.last_evaluation_date ?? null,
      nextEvaluationDate: preferTeacher ? teacher?.next_evaluation_date ?? null : null,
      attendancePercentage: attendance.summary.percentage,
      leaveDaysTaken: takenDays,
      openTasks: tasks.filter(
        (task) => !task.status || !['done', 'completed', 'closed'].includes(task.status.toLowerCase())
      ).length,
    },
    documents,
    tasks,
    schedule,
  };

  return NextResponse.json(data);
}
