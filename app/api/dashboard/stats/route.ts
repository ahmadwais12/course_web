import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function emptyTrend(from: string, to: string) {
  const points: { date: string; count: number; values: Record<string, number> }[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    points.push({
      date,
      count: 0,
      values: { enrollments: 0, payments: 0, students: 0 },
    });
  }
  return points;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || daysAgo(29);
    const to = searchParams.get('to') || daysAgo(0);
    const statusFilter = searchParams.get('status') || '';
    const methodFilter = searchParams.get('method') || '';

    const [
      studentsRes,
      coursesRes,
      staffRes,
      paymentsRes,
      enrollmentsRes,
      recentStudentsRes,
    ] = await Promise.all([
      supabase.from('students').select('id, created_at, full_name, email, phone, status', { count: 'exact' }).limit(5000),
      supabase.from('courses').select('id, name, code, status', { count: 'exact' }).limit(500),
      supabase.from('teachers').select('id', { count: 'exact', head: true }),
      supabase
        .from('payments')
        .select('id, amount, status, payment_method, payment_date, created_at, student_id, payment_number')
        .gte('payment_date', from)
        .lte('payment_date', to)
        .limit(5000),
      supabase
        .from('student_enrollments')
        .select('id, status, enrollment_date, created_at, student_id')
        .gte('enrollment_date', from)
        .lte('enrollment_date', to)
        .limit(5000),
      supabase
        .from('students')
        .select('id, full_name, email, phone, created_at, status')
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    let payments = paymentsRes.data ?? [];
    if (statusFilter) payments = payments.filter((p) => p.status === statusFilter);
    if (methodFilter) payments = payments.filter((p) => p.payment_method === methodFilter);

    const enrollments = enrollmentsRes.data ?? [];
    const students = studentsRes.data ?? [];
    const courses = coursesRes.data ?? [];

    const paymentStatuses = {
      completed: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
      voided: 0,
    };
    for (const p of payments) {
      const key = (p.status || 'pending') as keyof typeof paymentStatuses;
      if (key in paymentStatuses) paymentStatuses[key] += 1;
    }

    const enrollmentStatuses = {
      active: 0,
      completed: 0,
      withdrawn: 0,
      suspended: 0,
    };
    for (const e of enrollments) {
      const key = (e.status || 'active') as keyof typeof enrollmentStatuses;
      if (key in enrollmentStatuses) enrollmentStatuses[key] += 1;
    }

    const revenue = payments
      .filter((p) => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    const trend = emptyTrend(from, to);
    const byDate = new Map(trend.map((t) => [t.date, t]));

    for (const e of enrollments) {
      const date = String(e.enrollment_date || e.created_at || '').slice(0, 10);
      const point = byDate.get(date);
      if (point) {
        point.values.enrollments += 1;
        point.count += 1;
      }
    }
    for (const p of payments) {
      const date = String(p.payment_date || p.created_at || '').slice(0, 10);
      const point = byDate.get(date);
      if (point) {
        point.values.payments += 1;
        point.count += 1;
      }
    }
    for (const s of students) {
      const date = String(s.created_at || '').slice(0, 10);
      const point = byDate.get(date);
      if (point) {
        point.values.students += 1;
        point.count += 1;
      }
    }

    const methodMap = new Map<string, { name: string; total: number; values: number[] }>();
    const statusOrder = ['completed', 'pending', 'failed', 'refunded', 'voided'] as const;
    for (const p of payments) {
      const name = p.payment_method || 'Not recorded';
      if (!methodMap.has(name)) {
        methodMap.set(name, { name, total: 0, values: [0, 0, 0, 0, 0] });
      }
      const row = methodMap.get(name)!;
      row.total += 1;
      const idx = statusOrder.indexOf((p.status || 'pending') as (typeof statusOrder)[number]);
      if (idx >= 0) row.values[idx] += 1;
    }
    const channels = [...methodMap.values()]
      .map((c) => ({
        ...c,
        success: c.total ? Math.round((c.values[0] / c.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const enrollmentTypeTotal = Object.values(enrollmentStatuses).reduce((a, b) => a + b, 0) || 1;
    const deals = [
      {
        name: 'Enrollments',
        total: enrollments.length,
        values: [
          enrollmentStatuses.active,
          enrollmentStatuses.completed,
          enrollmentStatuses.withdrawn,
          enrollmentStatuses.suspended,
          0,
        ],
        rate: Math.round((enrollmentStatuses.active / enrollmentTypeTotal) * 1000) / 10,
        subcategories: [
          {
            key: 'active',
            total: enrollmentStatuses.active,
            values: [enrollmentStatuses.active, 0, 0, 0, 0],
            rate: 100,
          },
          {
            key: 'completed',
            total: enrollmentStatuses.completed,
            values: [0, enrollmentStatuses.completed, 0, 0, 0],
            rate: 100,
          },
        ],
      },
      {
        name: 'Payments',
        total: payments.length,
        values: [
          paymentStatuses.completed,
          paymentStatuses.pending,
          paymentStatuses.failed,
          paymentStatuses.refunded,
          paymentStatuses.voided,
        ],
        rate: payments.length
          ? Math.round((paymentStatuses.completed / payments.length) * 1000) / 10
          : 0,
        subcategories: [
          {
            key: 'completed',
            total: paymentStatuses.completed,
            values: [paymentStatuses.completed, 0, 0, 0, 0],
            rate: 100,
          },
          {
            key: 'pending',
            total: paymentStatuses.pending,
            values: [0, paymentStatuses.pending, 0, 0, 0],
            rate: 0,
          },
        ],
      },
    ];

    const courseNameMap = new Map<string, number>();
    for (const c of courses) {
      const name = (c as { name?: string; code?: string }).name || (c as { code?: string }).code || 'Course';
      courseNameMap.set(name, (courseNameMap.get(name) || 0) + 1);
    }
    const vehicles = [...courseNameMap.entries()]
      .map(([name, total]) => ({ name, total, karwwan_numbers: [] as string[] }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const pendingPayments = payments
      .filter((p) => p.status === 'pending' || p.status === 'failed')
      .slice(0, 50)
      .map((p) => ({
        id: p.id,
        customer: `Payment ${p.payment_number || p.id.slice(0, 8)}`,
        contact_number: '—',
        method: p.payment_method || '—',
        deal: 'Payment',
        status: p.status || 'pending',
        vehicle: `$${Number(p.amount || 0).toLocaleString()}`,
        last: String(p.payment_date || '').slice(0, 10),
        days: Math.max(
          0,
          Math.floor(
            (Date.now() - new Date(`${p.payment_date || p.created_at}T00:00:00`).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        ),
        link: '/payments',
      }));

    const inactiveStudents = (recentStudentsRes.data ?? [])
      .filter((s) => s.status && s.status !== 'active')
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        customer: s.full_name || 'Student',
        contact_number: s.phone || '—',
        method: s.email || '—',
        deal: 'Student',
        status: s.status === 'suspended' ? 'failed' : 'pending',
        vehicle: s.status || 'inactive',
        last: String(s.created_at || '').slice(0, 10),
        days: Math.max(
          0,
          Math.floor((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24))
        ),
        link: '/students',
      }));

    const attention = [...pendingPayments, ...inactiveStudents].slice(0, 30);

    const completedCount = paymentStatuses.completed;
    const successRate = payments.length
      ? Math.round((completedCount / payments.length) * 1000) / 10
      : 0;

    return NextResponse.json({
      students: studentsRes.count ?? students.length,
      courses: coursesRes.count ?? courses.length,
      staff: staffRes.count ?? 0,
      revenue,
      total: (studentsRes.count ?? 0) + payments.length + enrollments.length,
      statuses: {
        completed: paymentStatuses.completed,
        pending: paymentStatuses.pending,
        failed: paymentStatuses.failed,
        refunded: paymentStatuses.refunded,
        active: enrollmentStatuses.active,
      },
      payment_statuses: paymentStatuses,
      enrollment_statuses: enrollmentStatuses,
      attention_total: attention.length,
      attention,
      attention_pagination: {
        total: attention.length,
        per_page: attention.length || 10,
        current_page: 1,
        last_page: 1,
        from: attention.length ? 1 : 0,
        to: attention.length,
      },
      trend,
      trend_event_total: trend.reduce((s, p) => s + p.count, 0),
      channels,
      deals,
      vehicles,
      locations: [],
      interactions: payments.length + enrollments.length,
      success_rate: successRate,
      period: { from, to, latest_date: to },
      filter_options: {
        methods: [...new Set(payments.map((p) => p.payment_method).filter(Boolean))],
        statuses: ['completed', 'pending', 'failed', 'refunded', 'voided'],
      },
      errors: {
        students: studentsRes.error?.message ?? null,
        courses: coursesRes.error?.message ?? null,
        staff: staffRes.error?.message ?? null,
        payments: paymentsRes.error?.message ?? null,
        enrollments: enrollmentsRes.error?.message ?? null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch stats';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
