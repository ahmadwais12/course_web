import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type FeeStructureRow = {
  id: string;
  fee_type_id: string | null;
  program_id: string | null;
  class_id: string | null;
  academic_year_id: string | null;
  name: string;
  amount: number | null;
  currency: string | null;
  frequency: string | null;
  due_day: number | null;
  late_fee: number | null;
  total_amount: number | null;
  description: string | null;
  effective_from: string | null;
  effective_until: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type NamedRow = { id: string; name: string | null };

const FREQUENCIES = new Set(['monthly', 'quarterly', 'yearly', 'one_time']);

function frequencyLabel(value: string | null) {
  return (value ?? 'one_time').replaceAll('_', ' ');
}

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const [structuresRes, feeTypesRes, programsRes, classesRes, yearsRes] = await Promise.all([
      (() => {
        const query = admin
          .from('fee_structures')
          .select(
            'id, fee_type_id, program_id, class_id, academic_year_id, name, amount, currency, frequency, due_day, late_fee, total_amount, description, effective_from, effective_until, is_active, created_at'
          )
          .order('created_at', { ascending: false });
        return tenantId ? query.eq('tenant_id', tenantId) : query;
      })(),
      admin.from('fee_types').select('id, name, category, recurrence'),
      admin.from('programs').select('id, name'),
      admin.from('classes').select('id, name'),
      admin.from('academic_years').select('id, name'),
    ]);

    const feeTypes = (feeTypesRes.data ?? []) as (NamedRow & { category: string | null; recurrence: string | null })[];
    const programs = (programsRes.data ?? []) as NamedRow[];
    const classes = (classesRes.data ?? []) as NamedRow[];
    const years = (yearsRes.data ?? []) as NamedRow[];

    const feeTypeById = new Map(feeTypes.map((row) => [row.id, row]));
    const programById = new Map(programs.map((row) => [row.id, row.name]));
    const classById = new Map(classes.map((row) => [row.id, row.name]));
    const yearById = new Map(years.map((row) => [row.id, row.name]));

    const rows = ((structuresRes.data ?? []) as FeeStructureRow[]).map((row) => {
      const feeType = row.fee_type_id ? feeTypeById.get(row.fee_type_id) : undefined;
      return {
        id: row.id,
        name: row.name,
        feeTypeId: row.fee_type_id,
        feeType: str(feeType?.name) ?? 'Unassigned type',
        feeTypeCategory: str(feeType?.category) ?? 'other',
        programId: row.program_id,
        classId: row.class_id,
        academicYearId: row.academic_year_id,
        programName: row.program_id ? programById.get(row.program_id) ?? null : null,
        className: row.class_id ? classById.get(row.class_id) ?? null : null,
        academicYear: row.academic_year_id ? yearById.get(row.academic_year_id) ?? null : null,
        amount: num(row.amount),
        currency: str(row.currency) ?? 'AFN',
        frequency: str(row.frequency) ?? 'one_time',
        frequencyLabel: frequencyLabel(row.frequency),
        dueDay: row.due_day,
        lateFee: num(row.late_fee),
        description: str(row.description),
        totalAmount: num(row.total_amount) || num(row.amount),
        effectiveFrom: row.effective_from,
        effectiveUntil: row.effective_until,
        isActive: row.is_active !== false,
        createdAt: row.created_at,
      };
    });

    return NextResponse.json({
      rows,
      feeTypes: feeTypes
        .filter((row) => row.name)
        .map((row) => ({ value: row.id, label: row.name as string })),
      programs: programs.map((row) => ({ value: row.id, label: row.name ?? row.id })),
      classes: classes.map((row) => ({ value: row.id, label: row.name ?? row.id })),
      academicYears: years.map((row) => ({ value: row.id, label: row.name ?? row.id })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load fee structures');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId, userId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const amount = Number(body.amount);
    const frequency = String(body.frequency ?? 'one_time');
    const dueDay = body.dueDay === '' || body.dueDay == null ? null : Number(body.dueDay);
    const currency = String(body.currency ?? 'AFN').trim().toUpperCase() || 'AFN';

    if (name.length < 2 || name.length > 120) {
      return NextResponse.json({ error: 'Fee structure name is required' }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 });
    }
    if (!FREQUENCIES.has(frequency)) {
      return NextResponse.json({ error: 'Invalid billing frequency' }, { status: 400 });
    }
    if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
      return NextResponse.json({ error: 'Due day must be between 1 and 31' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('fee_structures')
      .insert({
        tenant_id: tenantId,
        fee_type_id: str(body.feeTypeId),
        program_id: str(body.programId),
        class_id: str(body.classId),
        academic_year_id: str(body.academicYearId),
        name,
        description: str(body.description),
        amount,
        total_amount: amount,
        currency,
        frequency,
        due_day: dueDay,
        late_fee: 0,
        effective_from: str(body.effectiveFrom),
        effective_until: str(body.effectiveUntil),
        is_active: body.isActive !== false,
        created_by: userId,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create fee structure');
  }
}
