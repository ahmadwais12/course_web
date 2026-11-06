const T = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TODAY = new Date().toISOString().slice(0, 10);

/** Small, tenant-A-only dataset so tools exercise their follow-up lookups. */
export const FIXTURES: Record<string, unknown[]> = {
  students: [
    { id: 's1', tenant_id: T, class_id: 'c1', full_name: 'Ahmad', status: 'active', course_ids: ['k1'], outstanding_balance: 500, created_at: `${TODAY}T08:00:00Z` },
    { id: 's2', tenant_id: T, class_id: 'c1', full_name: 'Zahra', status: 'active', course_ids: [], outstanding_balance: 0, created_at: `${TODAY}T08:00:00Z` },
  ],
  classes: [{ id: 'c1', tenant_id: T, name: 'Class 1', teacher_id: '11111111-1111-4111-8111-111111111111' }],
  courses: [{ id: 'k1', tenant_id: T, name: 'English', teacher_id: '11111111-1111-4111-8111-111111111111' }],
  student_enrollments: [{ id: 'e1', tenant_id: T, student_id: 's1', class_id: 'c1', status: 'active', created_at: `${TODAY}T08:00:00Z` }],
  attendance: [
    { id: 'a1', tenant_id: T, person_id: 's1', student_id: 's1', class_id: 'c1', person_type: 'student', status: 'absent', date: TODAY },
    { id: 'a2', tenant_id: T, person_id: 's1', student_id: 's1', class_id: 'c1', person_type: 'student', status: 'absent', date: TODAY },
    { id: 'a3', tenant_id: T, person_id: 's1', student_id: 's1', class_id: 'c1', person_type: 'student', status: 'present', date: TODAY },
  ],
  exams: [{ id: 'x1', tenant_id: T, name: 'Midterm', class_id: 'c1', exam_date: TODAY, passing_marks: 50, total_marks: 100 }],
  grades: [{ id: 'r1', tenant_id: T, exam_id: 'x1', student_id: 's1', score: 70, marks_obtained: 70 }],
  payments: [{ id: 'p1', tenant_id: T, amount: 1000, status: 'completed', payment_method: 'cash', payment_type: 'tuition', payment_date: TODAY, created_at: `${TODAY}T08:00:00Z` }],
  expenses: [{ id: 'ex1', tenant_id: T, amount: 200, category: 'rent', expense_date: TODAY, status: 'approved', created_at: `${TODAY}T08:00:00Z` }],
  invoices: [{ id: 'i1', tenant_id: T, student_id: 's1', total_amount: 800, paid_amount: 300, status: 'unpaid', due_date: TODAY }],
  teachers: [{ id: 't1', tenant_id: T, full_name: 'Teacher', status: 'active', department: 'Languages' }],
  staff: [{ id: 'st1', tenant_id: T, full_name: 'Staff', status: 'active', department: 'Admin' }],
  departments: [{ id: 'd1', tenant_id: T, name: 'Languages' }],
  employee_leaves: [],
  payroll: [{ id: 'pr1', tenant_id: T, total_amount: 5000, net_total: 5000, status: 'paid', period_start: TODAY, period_end: TODAY }],
  salaries: [{ id: 'sa1', tenant_id: T, amount: 300, net_salary: 300, status: 'paid', payment_date: TODAY }],
};
