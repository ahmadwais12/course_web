import { monthKey, toISODate } from '@/lib/ai/period';
import {
  PERIOD_PARAMS,
  countBy,
  fetchRows,
  labelTenants,
  money,
  num,
  periodFrom,
  scopeInfo,
  scoped,
  sumBy,
  tenantNameMap,
  topEntries,
  type ToolDefinition,
} from '@/lib/ai/tools/common';
import { expensesOf, loadExpenses, loadPayments, revenueOf } from '@/lib/ai/tools/metrics';

const FINANCE_LINKS = [
  { label: 'Payments', href: '/payments' },
  { label: 'Financial Reports', href: '/reports/finance' },
];

const NOT_A_STATEMENT =
  'Derived from recorded transactions in DreamFlow; this is not a verified financial statement. Use Financial Reports for official figures.';

type InvoiceRow = {
  amount: number | null;
  discount_amount: number | null;
  tax_amount: number | null;
  paid_amount: number | null;
  total_amount: number | null;
  outstanding_amount: number | null;
  due_date: string | null;
  status: string | null;
  tenant_id: string | null;
};

function outstandingOf(r: InvoiceRow) {
  if (r.outstanding_amount !== null && r.outstanding_amount !== undefined) return num(r.outstanding_amount);
  const total =
    r.total_amount !== null && r.total_amount !== undefined
      ? num(r.total_amount)
      : num(r.amount) - num(r.discount_amount) + num(r.tax_amount);
  return Math.max(0, total - num(r.paid_amount));
}

async function loadOpenInvoices(db: Parameters<ToolDefinition['execute']>[2], ctx: Parameters<ToolDefinition['execute']>[1]) {
  return fetchRows<InvoiceRow>(
    scoped(
      db
        .from('invoices')
        .select('amount, discount_amount, tax_amount, paid_amount, total_amount, outstanding_amount, due_date, status, tenant_id'),
      ctx
    )
      .in('status', ['pending', 'overdue'])
      .limit(10000)
  );
}

const getRevenueSummary: ToolDefinition = {
  name: 'get_revenue_summary',
  module: 'finance',
  description:
    'Revenue (cash received from completed payments) in the period, grouped by payment method, branch, month, or payment type. Also counts pending/failed payments.',
  parameters: {
    type: 'object',
    properties: {
      ...PERIOD_PARAMS,
      group_by: { type: 'string', enum: ['method', 'branch', 'month', 'type'], description: 'Default method.' },
    },
  },
  async execute(args, ctx, db) {
    const period = periodFrom(args);
    const groupBy = (args.group_by as string) || 'method';
    const { rows, truncated } = await loadPayments(db, ctx, period);
    const totals = revenueOf(rows);
    const completed = rows.filter((r) => r.status === 'completed');
    const names = await tenantNameMap(db, ctx, rows.map((r) => r.tenant_id || ''));
    const grouped =
      groupBy === 'branch'
        ? labelTenants(totals.byTenant, names)
        : groupBy === 'month'
          ? sumBy(completed, (r) => (r.payment_date ? monthKey(r.payment_date) : null), (r) => num(r.amount))
          : groupBy === 'type'
            ? sumBy(completed, (r) => r.payment_type, (r) => num(r.amount))
            : sumBy(completed, (r) => r.payment_method || 'not recorded', (r) => num(r.amount));
    const entries = groupBy === 'month' ? Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)) : topEntries(grouped, 12);
    return {
      data: {
        revenue: totals.revenue,
        completed_payments: totals.completed_count,
        refunds_recorded: totals.refunds_recorded,
        [`revenue_by_${groupBy}`]: Object.fromEntries(entries),
        payments_by_status: countBy(rows, (r) => r.status),
        truncated,
      },
      scope: scopeInfo(ctx, period, {
        currency: ctx.currency,
        basis: 'Cash received: sum of completed payment amounts by payment date. Refunds are shown separately and not subtracted.',
      }),
      chart: {
        type: groupBy === 'month' ? 'line' : 'bar',
        title: `Revenue by ${groupBy}`,
        data: entries.map(([label, value]) => ({ label, revenue: value })),
        series: [{ key: 'revenue', label: 'Revenue' }],
        valueFormat: 'currency',
        currency: ctx.currency,
      },
      links: FINANCE_LINKS,
      notes: [NOT_A_STATEMENT],
    };
  },
};

const getExpenseSummary: ToolDefinition = {
  name: 'get_expense_summary',
  module: 'finance',
  description: 'Recorded expenses (approved + paid) in the period by category and branch, plus pending expenses.',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    const period = periodFrom(args);
    const { rows, truncated } = await loadExpenses(db, ctx, period);
    const totals = expensesOf(rows);
    const names = await tenantNameMap(db, ctx, rows.map((r) => r.tenant_id || ''));
    const top = topEntries(totals.byCategory, 10);
    return {
      data: {
        recorded_expenses: totals.recorded,
        recorded_count: totals.recorded_count,
        pending_expenses: totals.pending,
        pending_count: totals.pending_count,
        by_category: Object.fromEntries(top),
        by_branch: labelTenants(totals.byTenant, names),
        truncated,
      },
      scope: scopeInfo(ctx, period, {
        currency: ctx.currency,
        basis: 'Recorded = expenses with status approved or paid, by expense date. Rejected expenses are excluded.',
      }),
      chart: {
        type: 'bar',
        title: 'Expenses by category',
        data: top.map(([label, value]) => ({ label, amount: value })),
        series: [{ key: 'amount', label: 'Expenses' }],
        valueFormat: 'currency',
        currency: ctx.currency,
      },
      links: [{ label: 'Financial Reports', href: '/reports/finance' }],
      notes: [NOT_A_STATEMENT],
    };
  },
};

const getUnpaidFees: ToolDefinition = {
  name: 'get_unpaid_fees',
  module: 'finance',
  description:
    'Unpaid student fees: open invoice balances (pending/overdue) and student outstanding balances, with the students owing the most.',
  parameters: {
    type: 'object',
    properties: { limit: { type: 'integer', minimum: 1, maximum: 20, description: 'Students to list. Default 10.' } },
  },
  async execute(args, ctx, db) {
    const limit = num(args.limit) || 10;
    const today = toISODate(new Date());
    const [{ rows: invoices, truncated }, { rows: students }] = await Promise.all([
      loadOpenInvoices(db, ctx),
      fetchRows<{ full_name: string | null; outstanding_balance: number | null; status: string | null }>(
        scoped(db.from('students').select('full_name, outstanding_balance, status'), ctx)
          .gt('outstanding_balance', 0)
          .order('outstanding_balance', { ascending: false })
          .limit(5000),
        5000
      ),
    ]);
    const openTotal = money(invoices.reduce((s, r) => s + outstandingOf(r), 0));
    const overdue = invoices.filter((r) => r.status === 'overdue' || (r.due_date && r.due_date < today));
    return {
      data: {
        open_invoices: invoices.length,
        open_invoice_balance: openTotal,
        overdue_invoices: overdue.length,
        overdue_balance: money(overdue.reduce((s, r) => s + outstandingOf(r), 0)),
        students_with_balance: students.length,
        student_outstanding_balance_total: money(students.reduce((s, r) => s + num(r.outstanding_balance), 0)),
        top_students_by_balance: students.slice(0, limit).map((s) => ({
          name: s.full_name || 'Unknown student',
          outstanding_balance: money(num(s.outstanding_balance)),
          status: s.status,
        })),
        truncated,
      },
      scope: scopeInfo(ctx, undefined, {
        currency: ctx.currency,
        basis:
          'Two separate measures: open invoice balance (invoices pending/overdue) and the outstanding balance stored on student records (total fees − paid). They can overlap; do not add them together.',
      }),
      links: [
        { label: 'Payments', href: '/payments' },
        { label: 'Students', href: '/students' },
      ],
      notes: [NOT_A_STATEMENT],
    };
  },
};

const getReceivablesSummary: ToolDefinition = {
  name: 'get_receivables_summary',
  module: 'finance',
  description: 'Outstanding receivables from open invoices, aged by days past due (current, 1–30, 31–60, 61–90, 90+).',
  parameters: { type: 'object', properties: {} },
  async execute(_args, ctx, db) {
    const { rows, truncated } = await loadOpenInvoices(db, ctx);
    const now = Date.now();
    const buckets: Record<string, number> = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    for (const r of rows) {
      const due = r.due_date ? new Date(`${r.due_date}T00:00:00`).getTime() : now;
      const days = Math.floor((now - due) / 86_400_000);
      const key = days <= 0 ? 'current' : days <= 30 ? '1-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      buckets[key] = money(buckets[key] + outstandingOf(r));
    }
    const names = await tenantNameMap(db, ctx, rows.map((r) => r.tenant_id || ''));
    return {
      data: {
        total_receivables: money(Object.values(buckets).reduce((a, b) => a + b, 0)),
        open_invoices: rows.length,
        aging: buckets,
        by_branch: labelTenants(sumBy(rows, (r) => r.tenant_id, outstandingOf), names),
        truncated,
      },
      scope: scopeInfo(ctx, undefined, {
        currency: ctx.currency,
        basis: 'Open invoices (pending/overdue); outstanding = total − paid; aged by due date.',
      }),
      chart: {
        type: 'bar',
        title: 'Receivables aging',
        data: Object.entries(buckets).map(([label, value]) => ({ label, amount: value })),
        series: [{ key: 'amount', label: 'Outstanding' }],
        valueFormat: 'currency',
        currency: ctx.currency,
      },
      links: FINANCE_LINKS,
      notes: [NOT_A_STATEMENT],
    };
  },
};

const getProfitLossSummary: ToolDefinition = {
  name: 'get_profit_loss_summary',
  module: 'finance',
  description:
    'Cash-basis estimate for the period: revenue received minus recorded expenses. Payroll paid is shown separately when the user may see payroll.',
  parameters: { type: 'object', properties: { ...PERIOD_PARAMS } },
  async execute(args, ctx, db) {
    const period = periodFrom(args);
    const [payments, expenses] = await Promise.all([loadPayments(db, ctx, period), loadExpenses(db, ctx, period)]);
    const revenue = revenueOf(payments.rows);
    const spend = expensesOf(expenses.rows);
    const data: Record<string, unknown> = {
      revenue_received: revenue.revenue,
      recorded_expenses: spend.recorded,
      net_before_payroll: money(revenue.revenue - spend.recorded),
      pending_expenses_not_included: spend.pending,
      truncated: payments.truncated || expenses.truncated,
    };
    const notes = [NOT_A_STATEMENT];
    if (ctx.allowedModules.includes('payroll')) {
      const { rows } = await fetchRows<{ total_net: number | null }>(
        scoped(db.from('payroll').select('total_net'), ctx)
          .eq('status', 'paid')
          .gte('pay_date', period.from)
          .lte('pay_date', period.to)
          .limit(2000),
        2000
      );
      data.payroll_paid = money(rows.reduce((s, r) => s + num(r.total_net), 0));
      notes.push(
        'Payroll paid is listed separately and not subtracted, because salaries may already be recorded as expenses.'
      );
    } else {
      notes.push('Payroll is excluded because your role cannot view payroll data.');
    }
    return {
      data,
      scope: scopeInfo(ctx, period, {
        currency: ctx.currency,
        basis: 'Cash basis: completed payments received minus approved/paid expenses, by transaction date.',
      }),
      chart: {
        type: 'bar',
        title: 'Revenue vs expenses',
        data: [
          { label: 'Revenue', amount: revenue.revenue },
          { label: 'Expenses', amount: spend.recorded },
          { label: 'Net', amount: money(revenue.revenue - spend.recorded) },
        ],
        series: [{ key: 'amount', label: 'Amount' }],
        valueFormat: 'currency',
        currency: ctx.currency,
      },
      links: [{ label: 'Financial Reports', href: '/reports/finance' }],
      notes,
    };
  },
};

export const financeTools: ToolDefinition[] = [
  getRevenueSummary,
  getExpenseSummary,
  getUnpaidFees,
  getReceivablesSummary,
  getProfitLossSummary,
];
