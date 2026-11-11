/**
 * Seeds demo data for the student / teacher / employee portals.
 * Idempotent: every row uses a fixed UUID, so re-running updates in place.
 *
 *   node --env-file=.env scripts/seed-portal-demo.mjs
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
if (!url || !key) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const uuid = (prefix, n) => {
  const head = `${prefix}00000000`.slice(0, 8);
  return `${head}-0000-4000-8000-${String(n).padStart(12, '0')}`;
};

const today = new Date();
const iso = (date) => date.toISOString().slice(0, 10);
const day = (offset) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return iso(d);
};
const stamp = (offset, hour = 9) => `${day(offset)}T${String(hour).padStart(2, '0')}:00:00.000Z`;

const failures = [];

async function push(table, rows) {
  if (!rows?.length) return;
  const { error } = await sb.from(table).upsert(rows, { onConflict: 'id' });
  if (error) {
    failures.push(`${table}: ${error.message}`);
    console.log(`${table.padEnd(22)} ERROR ${error.message}`);
  } else {
    console.log(`${table.padEnd(22)} ${rows.length} rows`);
  }
}

async function update(table, id, values) {
  const { error } = await sb.from(table).update(values).eq('id', id);
  if (error) {
    failures.push(`${table} update: ${error.message}`);
    console.log(`${table.padEnd(22)} UPDATE ERROR ${error.message}`);
  }
}

function pickPortalUser(profiles, signedInAt) {
  const eligible = profiles.filter(
    (row) => row.role && !['student', 'guardian', 'parent'].includes(row.role)
  );
  const score = (row) => {
    const ts = signedInAt.get(row.id);
    return ts ? Date.parse(ts) : 0;
  };
  const pool = eligible.length ? eligible : profiles;
  return [...pool].sort((a, b) => score(b) - score(a))[0] ?? null;
}

async function main() {
  // ---------- discover users ----------
  const { data: profiles, error: profilesError } = await sb
    .from('users')
    .select('id, role, tenant_id, full_name, email, created_at')
    .order('created_at', { ascending: false });
  if (profilesError) throw new Error(`users: ${profilesError.message}`);

  const signedInAt = new Map();
  try {
    const { data: auth } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const user of auth?.users ?? []) {
      if (user.last_sign_in_at) signedInAt.set(user.id, user.last_sign_in_at);
    }
  } catch {
    // last sign-in is only used to prefer an account — not required
  }

  const portalAccounts = (profiles ?? [])
    .filter((row) => row.role && !['student', 'guardian', 'parent'].includes(row.role))
    .sort((a, b) => {
      const ta = signedInAt.get(a.id);
      const tb = signedInAt.get(b.id);
      return (tb ? Date.parse(tb) : 0) - (ta ? Date.parse(ta) : 0);
    });
  const portalUser = portalAccounts[0] ?? pickPortalUser(profiles ?? [], signedInAt);
  if (!portalUser) throw new Error('No user accounts found to link demo records to');
  if (!portalAccounts.length) portalAccounts.push(portalUser);

  const tenant =
    portalUser.tenant_id ??
    (profiles ?? []).find((row) => row.tenant_id)?.tenant_id ??
    null;
  const fullName = portalUser.full_name || 'Demo Staff';
  const email = portalUser.email || null;

  console.log(`portal accounts      ${portalAccounts.length} (primary role=${portalUser.role})`);
  console.log(`tenant               ${tenant ? 'set' : 'none'}`);

  // ---------- program / classes / subjects ----------
  const programId = uuid('d1', 1);
  await push('programs', [
    {
      id: programId,
      tenant_id: tenant,
      name: 'IELTS Preparation Programme',
      code: 'DEMO-IELTS',
      description: 'Intensive IELTS preparation track used for portal demo data.',
      duration: '6 months',
      credits: 30,
      status: 'active',
    },
  ]);

  const classA = uuid('d2', 1);
  const classB = uuid('d2', 2);
  await push('classes', [
    {
      id: classA,
      tenant_id: tenant,
      name: 'IELTS Morning Batch A (demo)',
      grade: 'Intermediate',
      year: '2026',
      program_id: programId,
      teacher_id: portalUser.id,
      active: true,
      student_count: 0,
    },
    {
      id: classB,
      tenant_id: tenant,
      name: 'IELTS Evening Batch B (demo)',
      grade: 'Beginner',
      year: '2026',
      program_id: programId,
      teacher_id: portalAccounts[1]?.id ?? portalUser.id,
      active: true,
      student_count: 0,
    },
  ]);

  const subjects = [
    { id: uuid('d3', 1), name: 'English Grammar', code: 'DEMO-ENG101' },
    { id: uuid('d3', 2), name: 'Academic Writing', code: 'DEMO-WRT102' },
    { id: uuid('d3', 3), name: 'Listening & Speaking', code: 'DEMO-LSN103' },
    { id: uuid('d3', 4), name: 'IELTS Preparation', code: 'DEMO-IEL104' },
  ];
  await push(
    'subjects',
    subjects.map((subject) => ({
      ...subject,
      tenant_id: tenant,
      description: `${subject.name} — demo subject`,
      credits: 3,
      is_active: true,
    }))
  );

  const classSubjects = [];
  let classSubjectSeq = 1;
  for (const [classId, list] of [
    [classA, subjects],
    [classB, subjects.slice(0, 3)],
  ]) {
    for (const subject of list) {
      classSubjects.push({
        id: uuid('d4', classSubjectSeq),
        tenant_id: tenant,
        class_id: classId,
        subject_id: subject.id,
        teacher_id: portalAccounts[(classSubjectSeq - 1) % portalAccounts.length].id,
        is_active: true,
      });
      classSubjectSeq += 1;
    }
  }
  await push('class_subjects', classSubjects);

  const roomId = uuid('d5', 1);
  await push('rooms', [
    {
      id: roomId,
      tenant_id: tenant,
      name: 'Demo Room A-101',
      building: 'Main',
      floor: 1,
      capacity: 30,
      room_type: 'classroom',
      is_active: true,
    },
  ]);

  // ---------- teacher + staff records for every portal account ----------
  const accountInfo = [];
  for (const [index, account] of portalAccounts.entries()) {
    const label = String(index + 1).padStart(3, '0');
    const teacherValues = {
      profile_id: account.id,
      tenant_id: tenant,
      employee_code: `DEMO-TCH-${label}`,
      full_name: account.full_name || 'Demo Staff',
      email: account.email || null,
      qualification: 'MA Applied Linguistics',
      specialization: 'IELTS & Academic English',
      experience_years: 7,
      join_date: day(-420),
      contract_type: 'contract',
      contract_end_date: day(310),
      salary: 45000,
      workload_hours: 24,
      max_workload_hours: 30,
      performance_rating: 4.5,
      last_evaluation_date: day(-45),
      next_evaluation_date: day(135),
      status: 'active',
      emergency_contact_name: 'Demo Emergency Contact',
      emergency_contact_phone: '+93 700 000 000',
      bank_name: 'Demo Bank',
      bank_account_number: '0000000000',
    };

    const { data: existingTeacher } = await sb
      .from('teachers')
      .select('id')
      .eq('profile_id', account.id)
      .limit(1)
      .maybeSingle();
    let teacherId = existingTeacher?.id ?? null;
    if (teacherId) {
      await update('teachers', teacherId, teacherValues);
    } else {
      teacherId = uuid('e1', index + 1);
      await push('teachers', [{ id: teacherId, ...teacherValues }]);
    }

    const staffValues = {
      profile_id: account.id,
      tenant_id: tenant,
      employee_code: `DEMO-EMP-${label}`,
      full_name: account.full_name || 'Demo Staff',
      email: account.email || null,
      department: 'Academic Operations',
      designation: 'Academic Coordinator',
      role: 'staff',
      join_date: day(-300),
      contract_type: 'contract',
      contract_end_date: day(400),
      salary: 38000,
      shift_type: 'morning',
      assigned_tasks: [
        { id: 'demo-task-1', title: 'Review week 12 lesson plans', status: 'in_progress' },
        { id: 'demo-task-2', title: 'Prepare monthly attendance report', status: 'pending' },
        { id: 'demo-task-3', title: 'Update student enrollment records', status: 'completed' },
        { id: 'demo-task-4', title: 'Coordinate parent-teacher meeting', status: 'pending' },
      ],
      performance_rating: 4.2,
      last_evaluation_date: day(-60),
      status: 'active',
      emergency_contact_name: 'Demo Emergency Contact',
      emergency_contact_phone: '+93 700 000 000',
      address: 'Kabul, Afghanistan',
      bank_name: 'Demo Bank',
      bank_account_number: '0000000000',
    };

    const { data: existingStaff } = await sb
      .from('staff')
      .select('id')
      .eq('profile_id', account.id)
      .limit(1)
      .maybeSingle();
    let staffId = existingStaff?.id ?? null;
    if (staffId) {
      await update('staff', staffId, staffValues);
    } else {
      staffId = uuid('e2', index + 1);
      await push('staff', [{ id: staffId, ...staffValues }]);
    }

    accountInfo.push({ user: account, teacherId, staffId });
  }

  // ---------- students ----------
  const { data: portalStudentRows } = await sb
    .from('students')
    .select('id, profile_id')
    .in('profile_id', portalAccounts.map((account) => account.id));
  const studentByProfile = new Map(
    (portalStudentRows ?? []).map((row) => [row.profile_id, row.id])
  );

  for (const [index, account] of portalAccounts.entries()) {
    if (studentByProfile.has(account.id)) continue;
    const id = uuid('d6', index + 1);
    const classId = index % 2 === 0 ? classA : classB;
    await push('students', [
      {
        id,
        profile_id: account.id,
        tenant_id: tenant,
        student_code: `DEMO-STU-${String(index + 1).padStart(3, '0')}`,
        full_name: `${account.full_name || 'Demo Student'} (demo student)`,
        email: account.email || null,
        phone: '+93 700 000 001',
        date_of_birth: day(-365 * 22),
        gender: 'Male',
        address: 'Demo Street 12, Kabul',
        city: 'Kabul',
        country: 'Afghanistan',
        guardian_name: 'Demo Guardian',
        guardian_phone: '+93 700 111 222',
        guardian_relationship: 'Father',
        program_id: programId,
        class_id: classId,
        duration_months: 6,
        enrollment_date: day(-180),
        expected_completion_date: day(180),
        status: 'active',
        student_level: index % 2 === 0 ? 'Intermediate' : 'Beginner',
        batch_number: classId === classA ? 'MORN-A' : 'EVE-B',
        certificate_issued: true,
        certificate_url: 'https://example.com/demo/certificate.pdf',
        total_fees: 42000,
        paid_amount: index % 2 === 0 ? 30000 : 42000,
        attendance_percentage: index % 2 === 0 ? 92 : 85,
        average_grade: index % 2 === 0 ? 84 : 76,
      },
    ]);
    studentByProfile.set(account.id, id);
  }

  const { data: existingStudents } = await sb
    .from('students')
    .select('id, profile_id, full_name, email, student_code, class_id')
    .not('profile_id', 'is', null)
    .order('created_at', { ascending: true });

  const studentIds = [];
  let seq = 0;
  for (const student of existingStudents ?? []) {
    seq += 1;
    const classId = seq % 2 === 1 ? classA : classB;
    const totalFees = 42000;
    const paid = seq % 2 === 1 ? 42000 : 30000;
    await update('students', student.id, {
      tenant_id: tenant,
      program_id: programId,
      class_id: classId,
      status: 'active',
      enrollment_date: day(-180),
      expected_completion_date: day(180),
      student_level: seq % 2 === 1 ? 'Intermediate' : 'Beginner',
      batch_number: classId === classA ? 'MORN-A' : 'EVE-B',
      total_fees: totalFees,
      paid_amount: paid,
      attendance_percentage: seq % 2 === 1 ? 92 : 85,
      average_grade: seq % 2 === 1 ? 84 : 76,
      guardian_name: student.full_name ? `Guardian of ${student.full_name}` : 'Demo Guardian',
      guardian_phone: '+93 700 111 222',
      guardian_email: null,
      guardian_relationship: 'Father',
      city: 'Kabul',
      address: 'Demo Street 12, Kabul',
      gender: 'Male',
      date_of_birth: day(-365 * 21),
      certificate_issued: true,
      certificate_url: 'https://example.com/demo/certificate.pdf',
    });
    studentIds.push({ id: student.id, profileId: student.profile_id, className: classId });
  }

  // Keep the portal-preview students in predictable batches (class A has the full schedule).
  for (const [index, account] of portalAccounts.entries()) {
    const id = studentByProfile.get(account.id);
    if (!id) continue;
    const classId = index % 2 === 0 ? classA : classB;
    await update('students', id, {
      class_id: classId,
      batch_number: classId === classA ? 'MORN-A' : 'EVE-B',
      program_id: programId,
    });
    const entry = studentIds.find((row) => row.id === id);
    if (entry) entry.className = classId;
  }

  const uniqueStudents = [];
  const seenStudentIds = new Set();
  for (const row of studentIds) {
    if (seenStudentIds.has(row.id)) continue;
    seenStudentIds.add(row.id);
    uniqueStudents.push(row);
  }
  studentIds.length = 0;
  studentIds.push(...uniqueStudents);

  const allStudentIds = studentIds.map((row) => row.id);
  const studentClass = new Map(studentIds.map((row) => [row.id, row.className]));

  await push(
    'student_enrollments',
    studentIds.map((row, index) => ({
      id: uuid('d7', index + 1),
      tenant_id: tenant,
      student_id: row.id,
      class_id: row.className,
      enrollment_date: day(-180),
      status: 'active',
      grade: row.className === classA ? 'B+' : 'B',
      remarks: 'Portal demo enrollment',
    }))
  );

  await update('classes', classA, {
    student_count: studentIds.filter((row) => row.className === classA).length,
  });
  await update('classes', classB, {
    student_count: studentIds.filter((row) => row.className === classB).length,
  });

  // ---------- timetable ----------
  const timetableRows = [];
  let timetableSeq = 1;
  const slots = [
    { day: 1, start: '08:00:00', end: '09:30:00', subject: subjects[0], classId: classA },
    { day: 1, start: '10:00:00', end: '11:30:00', subject: subjects[1], classId: classA },
    { day: 3, start: '08:00:00', end: '09:30:00', subject: subjects[2], classId: classA },
    { day: 3, start: '10:00:00', end: '11:30:00', subject: subjects[3], classId: classA },
    { day: 6, start: '09:00:00', end: '10:30:00', subject: subjects[3], classId: classA },
    { day: 2, start: '16:00:00', end: '17:30:00', subject: subjects[0], classId: classB },
    { day: 4, start: '16:00:00', end: '17:30:00', subject: subjects[1], classId: classB },
    { day: 6, start: '16:00:00', end: '17:30:00', subject: subjects[2], classId: classB },
  ];
  for (const slot of slots) {
    timetableRows.push({
      id: uuid('a2', timetableSeq),
      tenant_id: tenant,
      class_id: slot.classId,
      subject_id: slot.subject.id,
      teacher_id: portalAccounts[(timetableSeq - 1) % portalAccounts.length].id,
      room_id: roomId,
      day_of_week: slot.day,
      start_time: slot.start,
      end_time: slot.end,
      is_active: true,
    });
    timetableSeq += 1;
  }
  await push('timetables', timetableRows);

  // ---------- attendance ----------
  const attendanceRows = [];
  let attendanceSeq = 1;
  for (const [studentIndex, studentId] of allStudentIds.entries()) {
    for (let offset = 40; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const weekday = date.getDay();
      if (weekday === 5) continue; // Friday off
      const seed = studentIndex * 7 + offset;
      const status = seed % 13 === 0 ? 'absent' : seed % 9 === 0 ? 'late' : seed % 17 === 0 ? 'excused' : 'present';
      attendanceRows.push({
        id: uuid('a1', attendanceSeq++),
        tenant_id: tenant,
        person_id: studentId,
        person_type: 'student',
        date: iso(date),
        status,
        check_in_time: status === 'absent' ? null : '08:05:00',
        check_out_time: status === 'absent' ? null : '12:00:00',
        late_minutes: status === 'late' ? 15 : 0,
        remarks: status === 'excused' ? 'Medical appointment' : null,
        marked_by: portalUser.id,
      });
    }
  }
  for (const [infoIndex, info] of accountInfo.entries()) {
    if (!info.staffId) continue;
    for (let offset = 20; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      if (date.getDay() === 5) continue;
      const isToday = offset === 0;
      attendanceRows.push({
        id: uuid('a9', 500 + infoIndex * 30 + (20 - offset)),
        tenant_id: tenant,
        person_id: info.staffId,
        person_type: 'staff',
        date: iso(date),
        status: 'present',
        check_in_time: '07:55:00',
        check_out_time: isToday ? null : '16:10:00',
        late_minutes: 0,
        overtime_minutes: 30,
        marked_by: info.user.id,
      });
    }
  }
  await push('attendance', attendanceRows);

  // ---------- exams + grades + results ----------
  const examDefs = [
    { id: uuid('a3', 1), name: 'Grammar Midterm', subject: 'English Grammar', date: day(-34), status: 'completed' },
    { id: uuid('a3', 2), name: 'Academic Writing Assessment', subject: 'Academic Writing', date: day(-18), status: 'completed' },
    { id: uuid('a3', 3), name: 'Listening Practice Test', subject: 'Listening & Speaking', date: day(7), status: 'scheduled' },
    { id: uuid('a3', 4), name: 'IELTS Mock Exam', subject: 'IELTS Preparation', date: day(16), status: 'scheduled' },
  ];
  await push(
    'exams',
    examDefs.map((exam) => ({
      id: exam.id,
      tenant_id: tenant,
      name: exam.name,
      exam_type: exam.status === 'completed' ? 'midterm' : 'mock',
      subject: exam.subject,
      program_id: programId,
      class_id: classA,
      exam_date: exam.date,
      start_time: '09:00:00',
      end_time: '11:00:00',
      duration_minutes: 120,
      total_marks: 100,
      passing_marks: 50,
      weight_percentage: 20,
      description: `${exam.name} — demo examination`,
      status: exam.status,
      created_by: portalUser.id,
    }))
  );

  const completedExams = examDefs.filter((exam) => exam.status === 'completed');
  const gradeRows = [];
  const resultRows = [];
  let gradeSeq = 1;
  let resultSeq = 1;
  for (const [studentIndex, studentId] of allStudentIds.entries()) {
    for (const [examIndex, exam] of completedExams.entries()) {
      const score = [86, 74, 91, 68, 79, 83][(studentIndex + examIndex) % 6];
      const percentage = score;
      const grade = percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 70 ? 'C' : 'D';
      gradeRows.push({
        id: uuid('a4', gradeSeq++),
        tenant_id: tenant,
        student_id: studentId,
        exam_id: exam.id,
        class_id: classA,
        subject: exam.subject,
        score,
        max_score: 100,
        percentage,
        grade,
        grade_point: percentage >= 80 ? 4 : percentage >= 70 ? 3 : 2,
        remarks: 'Demo result',
        graded_by: portalUser.id,
        graded_at: stamp(-examIndex * 2 - 3, 14),
        status: 'graded',
      });
      resultRows.push({
        id: uuid('a5', resultSeq++),
        student_id: studentId,
        exam_name: exam.name,
        subject: exam.subject,
        score,
        max_score: 100,
        percentage,
        grade,
        exam_date: exam.date,
        class_id: classA,
        teacher_id: portalUser.id,
        comments: 'Demo examination result',
      });
    }
  }
  await push('grades', gradeRows);
  await push('exam_results', resultRows);

  // ---------- homework + submissions ----------
  const homeworkDefs = [
    { id: uuid('a6', 1), title: 'Grammar workbook — unit 3', subject: subjects[0], classId: classA, due: day(-6), assigned: day(-12) },
    { id: uuid('a6', 2), title: 'Essay: technology and education', subject: subjects[1], classId: classA, due: day(3), assigned: day(-4) },
    { id: uuid('a6', 3), title: 'Listening practice set 5', subject: subjects[2], classId: classA, due: day(5), assigned: day(-1) },
    { id: uuid('a6', 4), title: 'IELTS reading passage 2', subject: subjects[3], classId: classA, due: day(-14), assigned: day(-20) },
    { id: uuid('a6', 5), title: 'Vocabulary journal — week 4', subject: subjects[0], classId: classB, due: day(-2), assigned: day(-8) },
    { id: uuid('a6', 6), title: 'Paragraph writing practice', subject: subjects[1], classId: classB, due: day(4), assigned: day(-3) },
  ];
  await push(
    'homework',
    homeworkDefs.map((item) => ({
      id: item.id,
      tenant_id: tenant,
      class_id: item.classId,
      subject_id: item.subject.id,
      teacher_id:
        item.classId === classA
          ? portalAccounts[0].id
          : (portalAccounts[1] ?? portalAccounts[0]).id,
      title: item.title,
      description: `${item.title} — complete all exercises and upload your work.`,
      assigned_date: item.assigned,
      due_date: item.due,
      max_marks: 100,
      weight_percentage: 10,
      status: item.due < day(0) ? 'completed' : 'active',
    }))
  );

  const submissionRows = [];
  let submissionSeq = 1;
  for (const [studentIndex, studentId] of allStudentIds.entries()) {
    const classId = studentClass.get(studentId);
    const studentHomework = homeworkDefs.filter((item) => item.classId === classId);
    for (const [homeworkIndex, homework] of studentHomework.entries()) {
      const graded = homeworkIndex < 2;
      const submitted = graded || homeworkIndex === 2;
      submissionRows.push({
        id: uuid('a7', submissionSeq++),
        tenant_id: tenant,
        homework_id: homework.id,
        student_id: studentId,
        submission_url: submitted ? `https://example.com/demo/submissions/${homeworkIndex + 1}.pdf` : null,
        submission_text: submitted ? 'Submitted through the portal (demo).' : null,
        submitted_at: submitted ? stamp(homeworkIndex === 0 ? -8 : -2, 18) : null,
        marks_obtained: graded ? [88, 92, 76, 81, 84, 79][(studentIndex + homeworkIndex) % 6] : null,
        feedback: graded ? 'Good structure and clear answers. Keep practising timed writing.' : null,
        status: graded ? 'graded' : submitted ? 'submitted' : 'pending',
        graded_by: graded ? portalUser.id : null,
        graded_at: graded ? stamp(-1, 10) : null,
      });
    }
  }
  await push('homework_submissions', submissionRows);

  // ---------- lesson plans ----------
  const lessonPlans = [
    { title: 'Tenses review and error correction', subject: subjects[0], dayOffset: -9 },
    { title: 'Cohesion and coherence in essays', subject: subjects[1], dayOffset: -6 },
    { title: 'Listening for detail — section 2', subject: subjects[2], dayOffset: -3 },
    { title: 'IELTS speaking part 2 strategies', subject: subjects[3], dayOffset: -1 },
    { title: 'Complex sentences workshop', subject: subjects[0], dayOffset: 2 },
    { title: 'Mock exam review session', subject: subjects[3], dayOffset: 6 },
  ];
  await push(
    'lesson_plans',
    lessonPlans.map((plan, index) => ({
      id: uuid('a8', index + 1),
      tenant_id: tenant,
      teacher_id: portalAccounts[index % portalAccounts.length].id,
      class_id: classA,
      subject_id: plan.subject.id,
      title: plan.title,
      objectives: 'Practise the target skill and give corrective feedback.',
      materials: 'Course book, whiteboard, audio tracks, worksheets.',
      activities: ['Warm-up discussion', 'Guided practice', 'Pair work', 'Feedback round'],
      assessment: 'In-class exercise marked out of 10.',
      lesson_date: day(plan.dayOffset),
      duration_minutes: 90,
      status: plan.dayOffset < 0 ? 'completed' : 'approved',
      approved_by: portalUser.id,
      approved_at: stamp(-4, 11),
    }))
  );

  // ---------- finance ----------
  const feeTypes = [
    { id: uuid('b1', 1), name: 'Tuition Fee', category: 'tuition', recurrence: 'monthly' },
    { id: uuid('b1', 2), name: 'Registration Fee', category: 'admission', recurrence: 'one_time' },
    { id: uuid('b1', 3), name: 'Examination Fee', category: 'exam', recurrence: 'quarterly' },
  ];
  await push(
    'fee_types',
    feeTypes.map((fee) => ({
      ...fee,
      tenant_id: tenant,
      description: `${fee.name} — demo`,
      is_recurring: fee.recurrence !== 'one_time',
      is_active: true,
    }))
  );

  await push('fee_structures', [
    {
      id: uuid('b2', 1),
      tenant_id: tenant,
      fee_type_id: feeTypes[0].id,
      program_id: programId,
      class_id: classA,
      name: 'Monthly tuition — IELTS Morning Batch',
      description: 'Monthly tuition for the demo morning batch.',
      amount: 12000,
      total_amount: 12000,
      currency: 'AFN',
      frequency: 'monthly',
      due_day: 5,
      effective_from: day(-180),
      effective_until: day(180),
      is_active: true,
      created_by: portalUser.id,
    },
    {
      id: uuid('b2', 2),
      tenant_id: tenant,
      fee_type_id: feeTypes[1].id,
      program_id: programId,
      class_id: classA,
      name: 'One-time registration',
      description: 'Registration fee charged at enrollment.',
      amount: 2000,
      total_amount: 2000,
      currency: 'AFN',
      frequency: 'one_time',
      due_day: 1,
      effective_from: day(-180),
      is_active: true,
      created_by: portalUser.id,
    },
    {
      id: uuid('b2', 3),
      tenant_id: tenant,
      fee_type_id: feeTypes[2].id,
      program_id: programId,
      class_id: null,
      name: 'Mock exam fee',
      description: 'Charged per mock examination.',
      amount: 1500,
      total_amount: 1500,
      currency: 'AFN',
      frequency: 'quarterly',
      due_day: 10,
      effective_from: day(-60),
      is_active: true,
      created_by: portalUser.id,
    },
  ]);

  const invoiceRows = [];
  const paymentRows = [];
  let invoiceSeq = 1;
  let paymentSeq = 1;
  for (const [studentIndex, studentId] of allStudentIds.entries()) {
    const defs = [
      { issue: -70, due: -60, status: 'paid', paid: 12000 },
      { issue: -35, due: -25, status: 'pending', paid: 6000 },
      { issue: -5, due: 10, status: 'overdue', paid: 0 },
    ];
    for (const [index, def] of defs.entries()) {
      const invoiceId = uuid('b3', invoiceSeq);
      invoiceRows.push({
        id: invoiceId,
        tenant_id: tenant,
        invoice_number: `DEMO-INV-${String(invoiceSeq).padStart(4, '0')}`,
        student_id: studentId,
        amount: 12000,
        paid_amount: def.paid,
        discount_amount: 0,
        tax_amount: 0,
        issue_date: day(def.issue),
        due_date: day(def.due),
        status: def.status,
        description: index === 2 ? 'Monthly tuition — November' : `Monthly tuition — demo invoice ${invoiceSeq}`,
        payment_method: def.paid ? 'cash' : null,
        items: [{ description: 'Monthly tuition', quantity: 1, unit_price: 12000, total: 12000 }],
        created_by: portalUser.id,
      });
      invoiceSeq += 1;
      if (def.paid > 0) {
        paymentRows.push({
          id: uuid('b4', paymentSeq),
          tenant_id: tenant,
          student_id: studentId,
          invoice_id: invoiceId,
          payment_number: `DEMO-PAY-${String(paymentSeq).padStart(4, '0')}`,
          amount: def.paid,
          payment_method: paymentSeq % 2 === 0 ? 'bank_transfer' : 'cash',
          payment_date: day(def.issue + 4),
          payment_type: def.paid === 12000 ? 'advance' : 'installment',
          reference_number: `REF-${1000 + paymentSeq}`,
          receipt_url: `https://example.com/demo/receipts/${paymentSeq}.pdf`,
          collected_by: portalUser.id,
          status: 'completed',
          notes: 'Demo payment',
        });
        paymentSeq += 1;
      }
    }
  }
  await push('invoices', invoiceRows);
  await push('payments', paymentRows);

  // ---------- certificates ----------
  await push(
    'certificates',
    studentIds.map((row, index) => ({
      id: uuid('b5', index + 1),
      tenant_id: tenant,
      student_id: row.id,
      certificate_type: 'completion',
      course_name: 'IELTS Preparation Programme',
      level_achieved: index % 2 === 0 ? 'Intermediate' : 'Beginner',
      issue_date: day(-20 + index),
      certificate_number: `DEMO-CERT-${String(index + 1).padStart(3, '0')}`,
      certificate_url: `https://example.com/demo/certificates/${index + 1}.pdf`,
      qr_code_url: null,
      issued_by: portalUser.id,
      status: 'issued',
      notes: 'Demo certificate',
    }))
  );

  // ---------- documents + leaves ----------
  const documentRows = [];
  const studentLeaveRows = [];
  let documentSeq = 1;
  let leaveSeq = 1;
  for (const [index, row] of studentIds.entries()) {
    documentRows.push(
      {
        id: uuid('c4', documentSeq++),
        tenant_id: tenant,
        student_id: row.id,
        document_type: 'id_card',
        document_url: `https://example.com/demo/documents/tazkira-${index + 1}.pdf`,
        issue_date: day(-700),
        issued_by: 'Civil Registry',
        is_verified: true,
      },
      {
        id: uuid('c4', documentSeq++),
        tenant_id: tenant,
        student_id: row.id,
        document_type: 'transcript',
        document_url: `https://example.com/demo/documents/photo-${index + 1}.jpg`,
        issue_date: day(-200),
        is_verified: true,
      }
    );
    studentLeaveRows.push(
      {
        id: uuid('c5', leaveSeq++),
        tenant_id: tenant,
        student_id: row.id,
        start_date: day(-22),
        end_date: day(-21),
        reason: 'Family emergency',
        status: 'approved',
        approved_by: portalUser.id,
        approved_at: stamp(-23, 9),
      },
      {
        id: uuid('c5', leaveSeq++),
        tenant_id: tenant,
        student_id: row.id,
        start_date: day(4),
        end_date: day(5),
        reason: 'Medical appointment',
        status: 'pending',
      }
    );
  }
  await push('student_documents', documentRows);
  await push('student_leaves', studentLeaveRows);

  // ---------- announcements / events / holidays ----------
  await push('announcements', [
    {
      id: uuid('b7', 1),
      tenant_id: tenant,
      title: 'Mock IELTS exam this month',
      content:
        'The full mock IELTS examination will take place on the 23rd. Bring your identification card and arrive 30 minutes early.',
      type: 'news',
      audience: 'all',
      priority: 'high',
      publish_date: day(-2),
      expiry_date: day(20),
      is_pinned: true,
      is_featured: true,
      status: 'published',
      created_by: portalUser.id,
    },
    {
      id: uuid('b7', 2),
      tenant_id: tenant,
      title: 'New writing workshop materials uploaded',
      content:
        'Academic Writing students can now download the week 12 workshop pack from the materials page.',
      type: 'news',
      audience: 'students',
      priority: 'normal',
      publish_date: day(-5),
      is_pinned: false,
      status: 'published',
      created_by: portalUser.id,
    },
    {
      id: uuid('b7', 3),
      tenant_id: tenant,
      title: 'Teacher meeting — Friday',
      content:
        'All teachers are invited to the weekly coordination meeting in the staff room at 14:00.',
      type: 'event',
      audience: 'teachers',
      priority: 'normal',
      publish_date: day(-3),
      is_pinned: false,
      status: 'published',
      created_by: portalUser.id,
    },
    {
      id: uuid('b7', 4),
      tenant_id: tenant,
      title: 'Staff timesheet reminder',
      content:
        'Please submit your monthly timesheet before the end of the week. Contact HR for any corrections.',
      type: 'news',
      audience: 'staff',
      priority: 'normal',
      publish_date: day(-1),
      is_pinned: false,
      status: 'published',
      created_by: portalUser.id,
    },
    {
      id: uuid('b7', 5),
      tenant_id: tenant,
      title: 'Campus maintenance notice',
      content:
        'The second-floor classrooms will be unavailable on Saturday morning due to scheduled maintenance.',
      type: 'news',
      audience: 'all',
      priority: 'low',
      publish_date: day(-6),
      expiry_date: day(10),
      is_pinned: false,
      status: 'published',
      created_by: portalUser.id,
    },
  ]);

  await push('events', [
    {
      id: uuid('b8', 1),
      tenant_id: tenant,
      title: 'IELTS Mock Exam Day',
      description: 'Full mock examination covering listening, reading, writing and speaking.',
      event_type: 'seminar',
      start_date: stamp(16, 8),
      end_date: stamp(16, 13),
      location: 'Main Campus — Exam Hall',
      status: 'scheduled',
      is_public: false,
      created_by: portalUser.id,
    },
    {
      id: uuid('b8', 2),
      tenant_id: tenant,
      title: 'Parent–Teacher Meeting',
      description: 'Term progress review for morning and evening batches.',
      event_type: 'meeting',
      start_date: stamp(9, 10),
      end_date: stamp(9, 12),
      location: 'Main Campus — Auditorium',
      status: 'scheduled',
      is_public: false,
      created_by: portalUser.id,
    },
    {
      id: uuid('b8', 3),
      tenant_id: tenant,
      title: 'Academic Writing Workshop',
      description: 'Optional workshop on task 2 essay structure.',
      event_type: 'workshop',
      start_date: stamp(-12, 14),
      end_date: stamp(-12, 16),
      location: 'Room A-101',
      status: 'scheduled',
      is_public: false,
      created_by: portalUser.id,
    },
  ]);

  await push('holidays', [
    {
      id: uuid('b9', 1),
      tenant_id: tenant,
      name: 'Independence Day (demo)',
      date: day(21),
      description: 'Institute closed.',
      is_recurring: true,
    },
    {
      id: uuid('b9', 2),
      tenant_id: tenant,
      name: 'Mid-term break',
      date: day(35),
      description: 'No classes for one week.',
      is_recurring: false,
    },
    {
      id: uuid('b9', 3),
      tenant_id: tenant,
      name: 'Staff training day',
      date: day(49),
      description: 'Professional development day for all staff.',
      is_recurring: false,
    },
  ]);

  // ---------- employee data ----------
  const leaveRows = [];
  const salaryRows = [];
  const expenseRows = [];
  for (const [infoIndex, info] of accountInfo.entries()) {
    const base = infoIndex * 3;
    leaveRows.push(
      {
        id: uuid('c1', base + 1),
        tenant_id: tenant,
        employee_id: info.user.id,
        leave_category: 'full_day',
        start_date: day(-45),
        end_date: day(-44),
        reason: 'Family event',
        is_paid: true,
        status: 'approved',
        approved_by: info.user.id,
        approved_at: stamp(-46, 10),
      },
      {
        id: uuid('c1', base + 2),
        tenant_id: tenant,
        employee_id: info.user.id,
        leave_category: 'full_day',
        start_date: day(8),
        end_date: day(8),
        reason: 'Personal appointment',
        is_paid: true,
        status: 'pending',
      },
      {
        id: uuid('c1', base + 3),
        tenant_id: tenant,
        employee_id: info.user.id,
        leave_category: 'half_day',
        start_date: day(-10),
        end_date: day(-10),
        reason: 'Medical check-up',
        is_paid: false,
        status: 'rejected',
        rejection_reason: 'Coverage could not be arranged for that day.',
      }
    );

    const salaryBase = {
      tenant_id: tenant,
      employee_id: info.user.id,
      employee_type: 'staff',
      basic_salary: 38000,
      allowances: { transport: 3000, housing: 5000 },
      deductions: { tax: 1800, insurance: 500 },
      bonus: 0,
      overtime_hours: 6,
      overtime_pay: 1500,
      gross_salary: 47500,
      net_salary: 45200,
      payment_method: 'bank_transfer',
      created_by: info.user.id,
    };
    salaryRows.push(
      { id: uuid('c2', base + 1), ...salaryBase, month: 9, year: today.getFullYear(), status: 'paid', payment_date: day(-40), payslip_url: 'https://example.com/demo/payslips/september.pdf' },
      { id: uuid('c2', base + 2), ...salaryBase, month: 10, year: today.getFullYear(), status: 'paid', payment_date: day(-10), payslip_url: 'https://example.com/demo/payslips/october.pdf' },
      { id: uuid('c2', base + 3), ...salaryBase, month: 11, year: today.getFullYear(), status: 'pending', gross_salary: 46000, net_salary: 43700 }
    );

    expenseRows.push(
      {
        id: uuid('c3', base + 1),
        tenant_id: tenant,
        category: 'Transport',
        subcategory: 'Staff commute',
        amount: 1500,
        expense_date: day(-3),
        description: 'Taxi fare for exam material delivery',
        vendor: 'Demo Transport Co.',
        status: 'approved',
        payment_method: 'cash',
        created_by: info.user.id,
      },
      {
        id: uuid('c3', base + 2),
        tenant_id: tenant,
        category: 'Supplies',
        subcategory: 'Stationery',
        amount: 2400,
        expense_date: day(-8),
        description: 'Whiteboard markers and paper',
        vendor: 'Demo Stationery',
        status: 'approved',
        payment_method: 'cash',
        created_by: info.user.id,
      },
      {
        id: uuid('c3', base + 3),
        tenant_id: tenant,
        category: 'Utilities',
        subcategory: 'Internet',
        amount: 5000,
        expense_date: day(-1),
        description: 'Monthly internet subscription',
        vendor: 'Demo ISP',
        status: 'pending',
        payment_method: 'bank_transfer',
        created_by: info.user.id,
      }
    );
  }
  await push('employee_leaves', leaveRows);
  await push('salaries', salaryRows);
  await push('expenses', expenseRows);

  // ---------- support tickets ----------
  await sb
    .from('support_tickets')
    .delete()
    .in('id', [uuid('b6', 3), uuid('b6', 4), uuid('b6', 5)]);
  const ticketRows = [];
  for (const [infoIndex, info] of accountInfo.entries()) {
    ticketRows.push(
      {
        id: uuid('b6', infoIndex * 2 + 1),
        tenant_id: tenant,
        title: 'Cannot download assignment attachment',
        description: 'The attachment on the writing assignment opens a blank page.',
        category: 'hardware',
        priority: 'high',
        status: 'resolved',
        reported_by: info.user.id,
        resolution_notes: 'The file was re-uploaded and now opens correctly.',
        resolved_at: stamp(-4, 12),
      },
      {
        id: uuid('b6', infoIndex * 2 + 2),
        tenant_id: tenant,
        title: 'Request for a duplicate receipt',
        description: 'Need a duplicate copy of the October tuition receipt.',
        category: 'account',
        priority: 'low',
        status: 'open',
        reported_by: info.user.id,
      }
    );
  }
  for (const [studentIndex, student] of studentIds.entries()) {
    if (!student.profileId) continue;
    const resolved = studentIndex % 2 === 0;
    ticketRows.push({
      id: uuid('b6', 100 + studentIndex),
      tenant_id: tenant,
      title: 'Timetable clarification',
      description: 'Please confirm the room for Saturday class.',
      category: 'other',
      priority: 'low',
      status: resolved ? 'resolved' : 'open',
      reported_by: student.profileId,
      resolution_notes: resolved ? 'Room confirmed as A-101.' : null,
      resolved_at: resolved ? stamp(-2, 15) : null,
    });
  }
  await push('support_tickets', ticketRows);

  // ---------- done ----------
  const { count: studentCount } = await sb.from('students').select('id', { count: 'exact', head: true });
  console.log(`\nstudents total        ${studentCount ?? 'unknown'}`);

  if (failures.length) {
    console.log(`\n${failures.length} table(s) reported errors:`);
    for (const failure of failures) console.log(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log('\nSeed completed without errors.');
  }
}

main().catch((error) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
