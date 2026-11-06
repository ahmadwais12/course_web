import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logAccountWork } from '@/lib/audit';
import { createInAppNotification } from '@/lib/notify';
import { requestMeta } from '@/lib/system-access';

const RELATIONSHIPS = new Set(['father', 'mother', 'guardian', 'other']);
const GENDERS = new Set(['Male', 'Female', 'Other']);

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function studentCode() {
  const stamp = Date.now().toString().slice(-5);
  return `STU-${stamp}`;
}

function optionalString(value: unknown): string | null {
  const s = String(value ?? '').trim();
  return s ? s : null;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    let query = supabase
      .from('students')
      .select('id, student_code, full_name, email, phone, status, enrollment_date, program_id')
      .order('created_at', { ascending: false })
      .limit(100);

    let { data, error } = await query.is('deleted_at', null);
    if (error && /deleted_at/i.test(error.message)) {
      const retry = await supabase
        .from('students')
        .select('id, student_code, full_name, email, phone, status, enrollment_date, program_id')
        .order('created_at', { ascending: false })
        .limit(100);
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch students';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Create student + parent/guardian accounts and link them.
 * Mirrors course_team users_screen + student_registration_screen:
 * auth student → users → auth guardian → users → students → parents → parent_students
 * Uses service-role Auth Admin so the signed-in admin session is not replaced.
 */
export async function POST(request: Request) {
  try {
    const auth = await createClient();
    const {
      data: { user: actor },
    } = await auth.auth.getUser();
    if (!actor) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const studentName = String(body.student_full_name ?? body.full_name ?? '').trim();
    const studentEmail = String(body.student_email ?? '').trim().toLowerCase();
    const studentPhone = String(body.student_phone ?? '').trim();
    const studentPassword = String(body.student_password ?? '');
    const studentAddress = optionalString(body.student_address);
    const city = optionalString(body.city);
    const gender = String(body.gender ?? '').trim();
    const dateOfBirth = optionalString(body.date_of_birth);
    const enrollmentDate =
      optionalString(body.enrollment_date) || new Date().toISOString().slice(0, 10);
    const fatherName = optionalString(body.father_name);
    const tazkiraNumber = optionalString(body.tazkira_number);

    const programId = optionalString(body.program_id);
    const classId = optionalString(body.class_id);
    const durationMonths = optionalNumber(body.duration_months);
    const studentLevel = optionalString(body.student_level);
    const totalFees = optionalNumber(body.total_fees) ?? 0;
    const discountPercentage = optionalNumber(body.discount_percentage) ?? 0;
    const notes = optionalString(body.notes);

    const parentName = String(body.parent_full_name ?? '').trim();
    const parentEmail = String(body.parent_email ?? '').trim().toLowerCase();
    const parentPhone = String(body.parent_phone ?? '').trim();
    const parentPassword = String(body.parent_password ?? '');
    const parentAddress = optionalString(body.parent_address);
    const relationship = String(body.relationship ?? 'guardian').trim().toLowerCase();
    const tenantIdBody = body.tenant_id ? String(body.tenant_id) : null;

    if (!studentName || !studentEmail || !studentPassword) {
      return NextResponse.json(
        { error: 'Student full name, email, and password are required' },
        { status: 400 }
      );
    }
    if (!studentPhone) {
      return NextResponse.json({ error: 'Student phone is required' }, { status: 400 });
    }
    if (studentPassword.length < 6) {
      return NextResponse.json(
        { error: 'Student password must be at least 6 characters' },
        { status: 400 }
      );
    }
    if (!parentName || !parentEmail || !parentPassword) {
      return NextResponse.json(
        { error: 'Parent full name, email, and password are required' },
        { status: 400 }
      );
    }
    if (!parentPhone) {
      return NextResponse.json({ error: 'Parent phone is required' }, { status: 400 });
    }
    if (parentPassword.length < 6) {
      return NextResponse.json(
        { error: 'Parent password must be at least 6 characters' },
        { status: 400 }
      );
    }
    if (studentEmail === parentEmail) {
      return NextResponse.json(
        { error: 'Student and parent must use different emails' },
        { status: 400 }
      );
    }
    if (!RELATIONSHIPS.has(relationship)) {
      return NextResponse.json({ error: 'Invalid parent relationship' }, { status: 400 });
    }
    if (gender && !GENDERS.has(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }
    if (!programId) {
      return NextResponse.json({ error: 'Program is required' }, { status: 400 });
    }
    if (durationMonths == null || durationMonths <= 0) {
      return NextResponse.json({ error: 'Duration is required' }, { status: 400 });
    }
    if (discountPercentage < 0 || discountPercentage > 100) {
      return NextResponse.json({ error: 'Discount must be between 0 and 100' }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: actorProfile } = await admin
      .from('users')
      .select('id, tenant_id, role')
      .eq('id', actor.id)
      .maybeSingle();

    const tenantId = tenantIdBody || (actorProfile?.tenant_id as string | null) || null;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Your account has no tenant assigned. Contact an administrator.' },
        { status: 400 }
      );
    }

    const { first: studentFirst, last: studentLast } = splitName(studentName);
    const code = studentCode();
    const meta = requestMeta(request);

    let studentAuthId: string | null = null;
    let parentAuthId: string | null = null;

    const cleanupAuth = async () => {
      if (studentAuthId) {
        await admin.auth.admin.deleteUser(studentAuthId).catch(() => undefined);
      }
      if (parentAuthId) {
        await admin.auth.admin.deleteUser(parentAuthId).catch(() => undefined);
      }
    };

    // 1. Student auth
    const { data: studentAuth, error: studentAuthError } = await admin.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: { full_name: studentName, role: 'student' },
    });
    if (studentAuthError || !studentAuth.user) {
      return NextResponse.json(
        { error: studentAuthError?.message || 'Failed to create student login' },
        { status: 500 }
      );
    }
    studentAuthId = studentAuth.user.id;

    // 2. Student users row (course_team profile fields)
    const studentUserPayload: Record<string, unknown> = {
      id: studentAuthId,
      email: studentEmail,
      full_name: studentName,
      phone: studentPhone || null,
      address: studentAddress,
      role: 'student',
      tenant_id: tenantId,
      is_active: true,
      father_name: fatherName,
      tazkira_number: tazkiraNumber,
    };

    let studentUserError = (await admin.from('users').upsert(studentUserPayload)).error;
    if (studentUserError && /father_name|tazkira_number|address/i.test(studentUserError.message)) {
      studentUserError = (
        await admin.from('users').upsert({
          id: studentAuthId,
          email: studentEmail,
          full_name: studentName,
          phone: studentPhone || null,
          role: 'student',
          tenant_id: tenantId,
          is_active: true,
        })
      ).error;
    }
    if (studentUserError) {
      await cleanupAuth();
      return NextResponse.json({ error: studentUserError.message }, { status: 500 });
    }

    // 3. Guardian auth
    const { data: parentAuth, error: parentAuthError } = await admin.auth.admin.createUser({
      email: parentEmail,
      password: parentPassword,
      email_confirm: true,
      user_metadata: { full_name: parentName, role: 'guardian' },
    });
    if (parentAuthError || !parentAuth.user) {
      await cleanupAuth();
      return NextResponse.json(
        { error: parentAuthError?.message || 'Failed to create parent login' },
        { status: 500 }
      );
    }
    parentAuthId = parentAuth.user.id;

    // 4. Guardian users row
    const { error: parentUserError } = await admin.from('users').upsert({
      id: parentAuthId,
      email: parentEmail,
      full_name: parentName,
      phone: parentPhone || null,
      role: 'guardian',
      tenant_id: tenantId,
      is_active: true,
    });
    if (parentUserError) {
      await cleanupAuth();
      return NextResponse.json({ error: parentUserError.message }, { status: 500 });
    }

    // 5. Student record (registration + users_screen fields)
    const studentPayload: Record<string, unknown> = {
      profile_id: studentAuthId,
      tenant_id: tenantId,
      student_code: code,
      full_name: studentName,
      first_name: studentFirst || null,
      last_name: studentLast || null,
      email: studentEmail,
      phone: studentPhone || null,
      address: studentAddress,
      city,
      gender: gender || null,
      date_of_birth: dateOfBirth,
      enrollment_date: enrollmentDate,
      status: 'active',
      guardian_name: parentName,
      guardian_email: parentEmail,
      guardian_phone: parentPhone || null,
      guardian_relationship: relationship,
      program_id: programId,
      class_id: classId,
      duration_months: durationMonths,
      student_level: studentLevel,
      total_fees: totalFees,
      discount_percentage: discountPercentage,
      notes,
    };

    let studentInsert = await admin
      .from('students')
      .insert(studentPayload)
      .select('id, student_code, full_name, email, phone, status, enrollment_date')
      .single();

    if (
      studentInsert.error &&
      /city|program_id|class_id|duration_months|student_level|total_fees|discount_percentage|notes|guardian_/i.test(
        studentInsert.error.message
      )
    ) {
      // Retry with core columns only (schema may lag behind course_team)
      studentInsert = await admin
        .from('students')
        .insert({
          profile_id: studentAuthId,
          tenant_id: tenantId,
          student_code: code,
          full_name: studentName,
          first_name: studentFirst || null,
          last_name: studentLast || null,
          email: studentEmail,
          phone: studentPhone || null,
          address: studentAddress,
          gender: gender || null,
          date_of_birth: dateOfBirth,
          enrollment_date: enrollmentDate,
          status: 'active',
          guardian_name: parentName,
          guardian_email: parentEmail,
          guardian_phone: parentPhone || null,
          guardian_relationship: relationship,
        })
        .select('id, student_code, full_name, email, phone, status, enrollment_date')
        .single();
    }

    if (studentInsert.error || !studentInsert.data) {
      await cleanupAuth();
      return NextResponse.json(
        { error: studentInsert.error?.message || 'Failed to create student record' },
        { status: 500 }
      );
    }
    const studentRow = studentInsert.data;

    // 6. Parent record
    const parentInsert = await admin
      .from('parents')
      .insert({
        profile_id: parentAuthId,
        tenant_id: tenantId,
        full_name: parentName,
        email: parentEmail,
        phone: parentPhone || null,
        address: parentAddress,
        is_guardian: true,
      })
      .select('id')
      .single();

    if (parentInsert.error) {
      await admin.from('students').delete().eq('id', studentRow.id);
      await cleanupAuth();
      return NextResponse.json(
        {
          error: /parents|42P01/i.test(parentInsert.error.message)
            ? 'Parents table missing. Apply migration 20261103_parents_table.sql'
            : parentInsert.error.message,
        },
        { status: 500 }
      );
    }
    const parentRow = parentInsert.data;

    // 7. Link parent_students
    const { error: linkError } = await admin.from('parent_students').insert({
      tenant_id: tenantId,
      parent_id: parentRow!.id,
      student_id: studentRow.id,
      relationship,
      is_primary: true,
    });

    if (linkError) {
      await admin.from('parents').delete().eq('id', parentRow!.id);
      await admin.from('students').delete().eq('id', studentRow.id);
      await cleanupAuth();
      return NextResponse.json({ error: linkError.message }, { status: 500 });
    }

    await logAccountWork(
      {
        admin,
        userId: actor.id,
        tenantId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
      {
        action: 'create',
        entityType: 'student',
        entityId: studentRow.id,
        tableName: 'students',
        historyAction: 'insert',
        details: {
          display_name: studentName,
          parent_name: parentName,
          student_code: code,
          program_id: programId,
        },
        newValues: {
          student_id: studentRow.id,
          parent_id: parentRow!.id,
          relationship,
        },
      }
    );

    // In-app notifications (realtime to open sessions)
    await createInAppNotification({
      admin,
      userId: actor.id,
      tenantId,
      title: 'Student & parent created',
      message: `${studentName} (${code}) linked with guardian ${parentName}.`,
      type: 'academic',
      priority: 'normal',
      actionUrl: '/students',
      data: { student_id: studentRow.id, parent_id: parentRow!.id },
    });
    if (studentAuthId) {
      await createInAppNotification({
        admin,
        userId: studentAuthId,
        tenantId,
        title: 'Welcome to DreamFlow',
        message: `Your student account is ready. Student code: ${code}.`,
        type: 'system',
        priority: 'normal',
        actionUrl: '/dashboard',
      });
    }
    if (parentAuthId) {
      await createInAppNotification({
        admin,
        userId: parentAuthId,
        tenantId,
        title: 'Guardian account ready',
        message: `You are linked as ${relationship} for ${studentName}.`,
        type: 'system',
        priority: 'normal',
        actionUrl: '/dashboard',
      });
    }

    return NextResponse.json(
      {
        student: studentRow,
        parent: { id: parentRow!.id, full_name: parentName, email: parentEmail },
        relationship,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create student and parent';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
