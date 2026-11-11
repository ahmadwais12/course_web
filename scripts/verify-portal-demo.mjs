import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const sb = createClient(url, key, { auth: { persistSession: false } });

async function count(table, apply = (q) => q) {
  const { count: total, error } = await apply(
    sb.from(table).select('id', { count: 'exact', head: true })
  );
  return error ? `ERR` : total ?? 0;
}

const { data: users } = await sb
  .from('users')
  .select('id, role, tenant_id, full_name, email');
const accounts = users.filter((row) => !['student', 'guardian', 'parent'].includes(row.role ?? ''));

console.log('-- coverage per portal account --');
for (const account of accounts) {
  const { data: student } = await sb
    .from('students')
    .select('id, class_id, student_code')
    .eq('profile_id', account.id)
    .maybeSingle();
  const { data: teacher } = await sb.from('teachers').select('id').eq('profile_id', account.id).maybeSingle();
  const { data: staff } = await sb.from('staff').select('id').eq('profile_id', account.id).maybeSingle();
  const taught = await count('class_subjects', (q) => q.eq('teacher_id', account.id));
  console.log(
    `${account.role.padEnd(12)} student=${student?.student_code ?? 'none'} teacher=${teacher ? 'yes' : 'no'} classes=${taught} staff=${staff ? 'yes' : 'no'} payslips=${await count('salaries', (q) => q.eq('employee_id', account.id))}`
  );
}

const { data: primaryStudent } = await sb
  .from('students')
  .select('id, class_id, student_code')
  .eq('profile_id', accounts[0].id)
  .maybeSingle();

console.log('\n-- primary account portal data --');
console.log('student class            ', primaryStudent?.class_id ? 'assigned' : 'none');
console.log('class subjects           ', await count('class_subjects', (q) => q.eq('class_id', primaryStudent?.class_id ?? '')));
console.log('timetable slots          ', await count('timetables', (q) => q.eq('class_id', primaryStudent?.class_id ?? '')));
console.log('attendance rows          ', await count('attendance', (q) => q.eq('person_id', primaryStudent?.id ?? '')));
console.log('homework for class       ', await count('homework', (q) => q.eq('class_id', primaryStudent?.class_id ?? '')));
console.log('exams for class          ', await count('exams', (q) => q.eq('class_id', primaryStudent?.class_id ?? '')));
console.log('grades                   ', await count('grades', (q) => q.eq('student_id', primaryStudent?.id ?? '')));
console.log('invoices                 ', await count('invoices', (q) => q.eq('student_id', primaryStudent?.id ?? '')));
console.log('payments                 ', await count('payments', (q) => q.eq('student_id', primaryStudent?.id ?? '')));
console.log('certificates             ', await count('certificates', (q) => q.eq('student_id', primaryStudent?.id ?? '')));
console.log('tickets (account)        ', await count('support_tickets', (q) => q.eq('reported_by', accounts[0].id)));
console.log('lesson plans (account)   ', await count('lesson_plans', (q) => q.eq('teacher_id', accounts[0].id)));
console.log('attendance (staff id)    ', await count('attendance', (q) => q.eq('person_type', 'staff')));

console.log('\n-- shared --');
console.log('announcements            ', await count('announcements', (q) => q.eq('status', 'published')));
console.log('events                   ', await count('events', (q) => q.eq('status', 'scheduled')));
console.log('holidays                 ', await count('holidays'));
console.log('homework submissions     ', await count('homework_submissions'));
