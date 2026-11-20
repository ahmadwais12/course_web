'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Eye,
  Plus,
  Printer,
  Send,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  DashboardBarChart,
  DashboardPieChart,
} from '@/components/dashboards/DashboardCharts';
import {
  DataTable,
  Dropdown,
  ErrorBanner,
  FormDialog,
  InputField,
  ListPageShell,
  PortButton,
  RowActions,
  StatCard,
  StatusChip,
  TextAreaField,
} from '@/components/ports';
import type { DataColumn, RowActionItem, SelectOption } from '@/components/ports';
import type { ChartConfig } from '@/components/ui/chart';
import { useListQuery } from '@/hooks/useListQuery';
import { toast } from '@/components/ui/Toast';

type Item = {
  id: string;
  kind: 'asset' | 'inventory';
  ref_id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  serial: string;
  quantity: number;
  returned: number;
  damaged: number;
  missing: number;
  condition_before: string;
  condition_return: string;
  custodian_name: string;
  notes: string;
};

type Event = { id: string; action: string; detail: string; actor_name: string; at: string };
type ReturnRecord = {
  id: string;
  at: string;
  by_name: string;
  note: string;
  lines: { item_id: string; returned: number; damaged: number; missing: number; condition: string; note: string }[];
};

type HandoverRow = {
  id: string;
  number: string;
  type: 'project' | 'employee';
  status: string;
  handover_date: string;
  source_warehouse: string;
  department: string;
  project_id: string | null;
  project_name: string;
  employee_id: string | null;
  employee_name: string;
  responsible_person: string;
  expected_return_date: string;
  purpose: string;
  description: string;
  sender_name: string;
  sender_employee_id: string;
  sender_department: string;
  sender_designation: string;
  receiver_name: string;
  receiver_employee_id: string;
  receiver_department: string;
  receiver_designation: string;
  receiver_contact: string;
  items: Item[];
  history: Event[];
  returns: ReturnRecord[];
  rejection_reason: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  received_at: string | null;
  closed_at: string | null;
  overdue: boolean;
  totals: { line_items: number; quantity: number; returned: number; damaged: number; missing: number; closed_items: number; open_items: number };
};

type Overview = {
  summary: Record<string, number>;
  monthly: { key: string; label: string; created: number; returned: number }[];
  type_split: { name: string; value: number }[];
  category_split: { name: string; value: number }[];
  returns: { intact: number; damaged: number; missing: number; open_items: number };
  rows: HandoverRow[];
};

type Options = {
  me: { id: string; name: string; role: string; manager: boolean };
  assets: { value: string; label: string; name: string; code: string; category: string; serial: string; location: string; condition: string; available: boolean }[];
  inventory: { value: string; label: string; name: string; code: string; unit: string; quantity: number; unit_price: number; available: boolean }[];
  projects: { value: string; label: string; manager: string; status: string }[];
  employees: { value: string; label: string; contact: string; department: string }[];
  departments: SelectOption[];
  warehouses: SelectOption[];
};

type DraftItem = {
  key: string;
  kind: 'asset' | 'inventory';
  ref_id: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  condition: string;
  custodian_id: string;
  notes: string;
};

const EMPTY_FORM = {
  type: 'employee' as 'project' | 'employee',
  handover_date: new Date().toISOString().slice(0, 10),
  source_warehouse: '',
  department: '',
  project_id: '',
  employee_id: '',
  responsible_person: '',
  expected_return_date: '',
  purpose: '',
  description: '',
  sender_name: '',
  sender_employee_id: '',
  sender_department: '',
  sender_designation: '',
  receiver_name: '',
  receiver_employee_id: '',
  receiver_department: '',
  receiver_designation: '',
  receiver_contact: '',
};

const CONDITIONS = ['New', 'Excellent', 'Good', 'Fair', 'Damaged', 'Under Repair'].map((value) => ({ value, label: value }));

const STATUS_TONE: Record<string, 'blue' | 'gold' | 'purple' | 'green' | 'gray'> = {
  draft: 'gray',
  pending_approval: 'gold',
  pending_receipt: 'blue',
  handed_over: 'green',
  partially_returned: 'gold',
  returned: 'green',
  rejected: 'purple',
  cancelled: 'gray',
};

const MONTHLY_CONFIG = {
  created: { label: 'Created', color: 'var(--chart-2)' },
  returned: { label: 'Returned', color: 'var(--chart-4)' },
} satisfies ChartConfig;

const CATEGORY_CONFIG = {
  value: { label: 'Assigned quantity', color: 'var(--chart-3)' },
} satisfies ChartConfig;

const PALETTE = ['#88b6ff', '#4fc3a1', '#f4b740', '#8f7cf0'];

function label(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shortDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function stamp(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function remaining(item: Item) {
  return Math.max(0, item.quantity - item.returned - item.damaged - item.missing);
}

export default function HandoverPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [options, setOptions] = useState<Options | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [projectId, setProjectId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [assetPick, setAssetPick] = useState('');
  const [stockPick, setStockPick] = useState('');
  const [stockQty, setStockQty] = useState('1');

  const [detail, setDetail] = useState<HandoverRow | null>(null);
  const [actionDialog, setActionDialog] = useState<{ action: string; row: HandoverRow } | null>(null);
  const [actionNote, setActionNote] = useState('');
  const [returnDialog, setReturnDialog] = useState<HandoverRow | null>(null);
  const [returnLines, setReturnLines] = useState<Record<string, { returned: string; damaged: string; missing: string; condition: string; note: string }>>({});
  const [returnNote, setReturnNote] = useState('');
  const [printRow, setPrintRow] = useState<HandoverRow | null>(null);

  const loadOptions = useCallback(async () => {
    const res = await fetch('/api/inventory/handovers/options', { cache: 'no-store' });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Failed to load handover options');
    setOptions(body);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      if (projectId) params.set('project_id', projectId);
      if (employeeId) params.set('employee_id', employeeId);
      if (department) params.set('department', department);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await fetch(
        `/api/inventory/handovers${params.toString() ? `?${params.toString()}` : ''}`,
        { cache: 'no-store' }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load handovers');
      setData(body);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load handovers';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [status, type, projectId, employeeId, department, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadOptions().catch((e) => {
      const message = e instanceof Error ? e.message : 'Failed to load handover options';
      setError(message);
      toast.error(message);
    });
  }, [loadOptions]);

  const isManager = Boolean(options?.me.manager);

  const list = useListQuery({
    items: (data?.rows ?? []) as (HandoverRow & Record<string, unknown>)[],
    searchKeys: ['number', 'project_name', 'employee_name', 'responsible_person', 'receiver_name', 'purpose'],
    filterKey: `${status}|${type}|${projectId}|${employeeId}|${department}|${from}|${to}`,
    initialPerPage: 10,
  });

  const monthlyData = data?.monthly ?? [];
  const categoryData = data?.category_split ?? [];
  const typeChart = (data?.type_split ?? []).map((row, index) => ({ ...row, fill: PALETTE[index % PALETTE.length] }));
  const typeConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of typeChart) config[row.name] = { label: row.name, color: row.fill };
    return config;
  }, [typeChart]);

  const projectOptions = useMemo<SelectOption[]>(
    () => (options?.projects ?? []).map((row) => ({ value: row.value, label: row.label })),
    [options]
  );
  const employeeOptions = useMemo<SelectOption[]>(
    () => (options?.employees ?? []).map((row) => ({ value: row.value, label: row.label })),
    [options]
  );
  const assetOptions = useMemo<SelectOption[]>(
    () =>
      (options?.assets ?? [])
        .filter((row) => row.available)
        .map((row) => ({ value: row.value, label: `${row.label}${row.category ? ` · ${row.category}` : ''}` })),
    [options]
  );
  const stockOptions = useMemo<SelectOption[]>(
    () =>
      (options?.inventory ?? [])
        .filter((row) => row.available)
        .map((row) => ({ value: row.value, label: `${row.label} · ${row.quantity} ${row.unit}` })),
    [options]
  );
  const custodianOptions = useMemo<SelectOption[]>(
    () => [{ value: '', label: 'Receiver (default)' }, ...employeeOptions],
    [employeeOptions]
  );

  function openCreate() {
    setForm({ ...EMPTY_FORM, sender_name: options?.me.name ?? '' });
    setDraftItems([]);
    setAssetPick('');
    setStockPick('');
    setStockQty('1');
    setCreateOpen(true);
  }

  function addAsset() {
    const asset = options?.assets.find((row) => row.value === assetPick);
    if (!asset || !asset.available) return;
    if (draftItems.some((row) => row.kind === 'asset' && row.ref_id === asset.value)) {
      toast.info('This asset is already in the handover.');
      return;
    }
    setDraftItems((current) => [
      ...current,
      {
        key: `${asset.value}-${Date.now()}`,
        kind: 'asset',
        ref_id: asset.value,
        name: asset.name,
        code: asset.code,
        unit: 'unit',
        quantity: 1,
        condition: 'Good',
        custodian_id: '',
        notes: '',
      },
    ]);
    setAssetPick('');
  }

  function addStock() {
    const stock = options?.inventory.find((row) => row.value === stockPick);
    if (!stock) return;
    const qty = Number(stockQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Enter a quantity greater than zero.');
      return;
    }
    if (qty > stock.quantity) {
      toast.error(`Only ${stock.quantity} ${stock.unit} available.`);
      return;
    }
    if (draftItems.some((row) => row.kind === 'inventory' && row.ref_id === stock.value)) {
      toast.info('This item is already in the handover.');
      return;
    }
    setDraftItems((current) => [
      ...current,
      {
        key: `${stock.value}-${Date.now()}`,
        kind: 'inventory',
        ref_id: stock.value,
        name: stock.name,
        code: stock.code,
        unit: stock.unit,
        quantity: qty,
        condition: 'Good',
        custodian_id: '',
        notes: '',
      },
    ]);
    setStockPick('');
    setStockQty('1');
  }

  function applyEmployee(id: string) {
    const employee = options?.employees.find((row) => row.value === id);
    setForm((current) => ({
      ...current,
      employee_id: id,
      receiver_name: employee?.label ?? current.receiver_name,
      receiver_contact: employee?.contact ?? current.receiver_contact,
      receiver_department: employee?.department ?? current.receiver_department,
      department: current.department || employee?.department || '',
    }));
  }

  function applyProject(id: string) {
    const project = options?.projects.find((row) => row.value === id);
    setForm((current) => ({
      ...current,
      project_id: id,
      responsible_person: current.responsible_person || project?.manager || '',
      receiver_name: current.receiver_name || project?.manager || '',
    }));
  }

  async function submitCreate(submit: boolean) {
    if (!form.project_id && form.type === 'project') {
      toast.error('Choose a project.');
      return;
    }
    if (!form.employee_id && form.type === 'employee') {
      toast.error('Choose the receiving employee.');
      return;
    }
    if (draftItems.length === 0) {
      toast.error('Add at least one asset or inventory item.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/inventory/handovers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          project_id: form.type === 'project' ? form.project_id : null,
          employee_id: form.type === 'employee' ? form.employee_id : null,
          submit,
          items: draftItems.map((row) => ({
            kind: row.kind,
            ref_id: row.ref_id,
            quantity: row.quantity,
            condition: row.condition,
            custodian_id: row.custodian_id || null,
            notes: row.notes,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not create the handover');
      toast.success(`Handover ${body.number} created${submit ? ' and submitted' : ''}.`);
      setCreateOpen(false);
      await Promise.all([load(), loadOptions()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create the handover');
    } finally {
      setBusy(false);
    }
  }

  async function runAction(action: string, note = '', payload: Record<string, unknown> = {}) {
    const row = actionDialog?.row ?? returnDialog ?? detail;
    if (!row) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/inventory/handovers/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note, ...payload }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Handover action failed');
      toast.success(`${label(action)} recorded for ${row.number}.`);
      setActionDialog(null);
      setActionNote('');
      setReturnDialog(null);
      setReturnNote('');
      if (detail?.id === row.id) setDetail(body);
      await Promise.all([load(), loadOptions()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Handover action failed');
    } finally {
      setBusy(false);
    }
  }

  function askAction(action: string, row: HandoverRow) {
    if (action === 'return') {
      const lines: Record<string, { returned: string; damaged: string; missing: string; condition: string; note: string }> = {};
      for (const item of row.items) {
        if (remaining(item) <= 0) continue;
        lines[item.id] = { returned: '', damaged: '', missing: '', condition: item.condition_before, note: '' };
      }
      setReturnLines(lines);
      setReturnNote('');
      setReturnDialog(row);
      return;
    }
    setActionNote('');
    setActionDialog({ action, row });
  }

  function rowActions(row: HandoverRow): RowActionItem[] {
    const actions: RowActionItem[] = [
      { key: 'view', label: 'View', icon: <Eye size={15} />, onClick: () => setDetail(row) },
    ];
    if (['draft', 'rejected'].includes(row.status)) {
      actions.push({ key: 'submit', label: 'Submit for approval', icon: <Send size={15} />, onClick: () => askAction('submit', row) });
    }
    if (row.status === 'pending_approval' && isManager && row.created_by !== options?.me.id) {
      actions.push({ key: 'approve', label: 'Approve', icon: <Check size={15} />, onClick: () => askAction('approve', row) });
      actions.push({ key: 'reject', label: 'Reject', icon: <X size={15} />, onClick: () => askAction('reject', row) });
    }
    if (row.status === 'pending_receipt' && isManager) {
      actions.push({ key: 'receive', label: 'Confirm receipt', icon: <Check size={15} />, onClick: () => askAction('receive', row) });
    }
    if (['handed_over', 'partially_returned'].includes(row.status)) {
      actions.push({ key: 'return', label: 'Return items', icon: <Undo2 size={15} />, onClick: () => askAction('return', row) });
    }
    if (!['handed_over', 'partially_returned', 'returned', 'cancelled'].includes(row.status)) {
      actions.push({ key: 'cancel', label: 'Cancel', icon: <X size={15} />, onClick: () => askAction('cancel', row), danger: true });
    }
    actions.push({ key: 'print', label: 'Print receipt', icon: <Printer size={15} />, onClick: () => printHandover(row) });
    return actions;
  }

  function printHandover(row: HandoverRow) {
    setPrintRow(row);
    setTimeout(() => window.print(), 80);
  }

  const columns: DataColumn<HandoverRow & Record<string, unknown>>[] = [
    { key: 'number', header: 'Handover #' },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <StatusChip label={row.type === 'project' ? 'Project' : 'Employee'} tone={row.type === 'project' ? 'blue' : 'purple'} />,
    },
    {
      key: 'party',
      header: 'Project / Employee',
      render: (row) => (row.type === 'project' ? row.project_name || '—' : row.employee_name || '—'),
    },
    { key: 'items', header: 'Items', align: 'right', render: (row) => row.totals.quantity },
    { key: 'date', header: 'Date', render: (row) => shortDate(row.handover_date) },
    { key: 'responsible', header: 'Responsible', render: (row) => row.responsible_person || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1">
          <StatusChip label={label(row.status)} tone={STATUS_TONE[row.status] ?? 'gray'} />
          {row.overdue && <StatusChip label="Overdue" tone="purple" />}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => <RowActions items={rowActions(row)} maxInline={2} />,
    },
  ];

  const summary = data?.summary ?? {};

  return (
    <>
      <ListPageShell
        title="Handover Management"
        description="Assign assets and stock to projects or employees, track custody, approvals, receipts, and returns."
        pill={loading ? 'LOADING…' : 'LIVE DATA'}
        primaryAction={{ label: 'New handover', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search handover number, project, employee, item…"
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: status,
            onChange: setStatus,
            options: Object.keys(STATUS_TONE).map((value) => ({ value, label: label(value) })),
          },
          {
            key: 'type',
            label: 'Type',
            value: type,
            onChange: setType,
            options: [
              { value: 'project', label: 'Project' },
              { value: 'employee', label: 'Employee' },
            ],
          },
          { key: 'project', label: 'Project', value: projectId, onChange: setProjectId, options: projectOptions },
          { key: 'employee', label: 'Employee', value: employeeId, onChange: setEmployeeId, options: employeeOptions },
          { key: 'department', label: 'Department', value: department, onChange: setDepartment, options: options?.departments ?? [] },
        ]}
        onResetFilters={() => {
          list.reset();
          setStatus('');
          setType('');
          setProjectId('');
          setEmployeeId('');
          setDepartment('');
          setFrom('');
          setTo('');
        }}
        dateFrom={from}
        dateTo={to}
        onDateRangeChange={(next) => {
          setFrom(next.from);
          setTo(next.to);
        }}
        columns={columns}
        rows={list.rows as (HandoverRow & Record<string, unknown>)[]}
        rowKey={(row) => row.id}
        loading={loading}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No handovers match these filters. Create a handover to start custody tracking."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total handovers" value={String(summary.total ?? 0)} hint={`${summary.returned ?? 0} fully returned`} accent="blue" />
            <StatCard label="Project handovers" value={String(summary.project ?? 0)} hint="Assigned to projects" accent="purple" />
            <StatCard label="Employee handovers" value={String(summary.employee ?? 0)} hint="Direct custody" accent="green" />
            <StatCard label="Pending approvals" value={String(summary.pending_approval ?? 0)} hint={`${summary.pending_receipt ?? 0} awaiting receipt`} accent="gold" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Active assignments" value={String(summary.active ?? 0)} hint="Issued and in custody" accent="blue" />
            <StatCard label="Partially returned" value={String(summary.partially_returned ?? 0)} hint={`${data?.returns.open_items ?? 0} item lines still out`} accent="gold" />
            <StatCard label="Overdue returns" value={String(summary.overdue ?? 0)} hint="Past expected return date" accent="purple" />
            <StatCard label="Damaged / missing" value={`${data?.returns.damaged ?? 0} / ${data?.returns.missing ?? 0}`} hint={`${data?.returns.intact ?? 0} returned intact`} accent="green" />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <DashboardBarChart
              title="Monthly handover statistics"
              description="Created and returned handovers over six months"
              data={monthlyData}
              config={MONTHLY_CONFIG}
            />
            <DashboardPieChart
              title="Project vs employee handovers"
              description="Distribution of all handover records"
              data={typeChart}
              config={typeConfig}
            />
          </div>
          <DashboardBarChart
            title="Assignment distribution"
            description="Quantity assigned by asset category and inventory"
            data={categoryData}
            config={CATEGORY_CONFIG}
            layout="horizontal"
          />
          {error && <ErrorBanner message={error} />}
        </div>
      </ListPageShell>

      <FormDialog
        open={createOpen}
        title="New handover"
        onClose={() => setCreateOpen(false)}
        maxWidth="2xl"
        footer={
          <>
            <PortButton variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </PortButton>
            <PortButton disabled={busy} onClick={() => submitCreate(false)}>
              Save draft
            </PortButton>
            <PortButton variant="primary" disabled={busy} onClick={() => submitCreate(true)}>
              {busy ? 'Saving…' : 'Submit for approval'}
            </PortButton>
          </>
        }
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Handover information</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Dropdown
                label="Handover type"
                value={form.type}
                onChange={(value) =>
                  setForm((current) => ({ ...current, type: value === 'project' ? 'project' : 'employee' }))
                }
                options={[
                  { value: 'employee', label: 'Employee / person' },
                  { value: 'project', label: 'Project' },
                ]}
              />
              <InputField
                label="Handover date"
                type="date"
                value={form.handover_date}
                onChange={(event) => setForm((current) => ({ ...current, handover_date: event.target.value }))}
              />
              {form.type === 'project' ? (
                <Dropdown
                  label="Project"
                  value={form.project_id}
                  onChange={applyProject}
                  options={projectOptions}
                  placeholder="Choose a project"
                  required
                />
              ) : (
                <Dropdown
                  label="Receiving employee"
                  value={form.employee_id}
                  onChange={applyEmployee}
                  options={employeeOptions}
                  placeholder="Choose an employee"
                  required
                />
              )}
              <Dropdown
                label="Department"
                value={form.department}
                onChange={(value) => setForm((current) => ({ ...current, department: value }))}
                options={options?.departments ?? []}
                clearable
              />
              <Dropdown
                label="Source warehouse"
                value={form.source_warehouse}
                onChange={(value) => setForm((current) => ({ ...current, source_warehouse: value }))}
                options={options?.warehouses ?? []}
                clearable
              />
              <InputField
                label="Responsible person"
                value={form.responsible_person}
                onChange={(event) => setForm((current) => ({ ...current, responsible_person: event.target.value }))}
                placeholder="Custody owner"
              />
              <InputField
                label="Expected return date"
                type="date"
                value={form.expected_return_date}
                onChange={(event) => setForm((current) => ({ ...current, expected_return_date: event.target.value }))}
              />
              <InputField
                label="Purpose"
                value={form.purpose}
                onChange={(event) => setForm((current) => ({ ...current, purpose: event.target.value }))}
                placeholder="Why the items are needed"
              />
            </div>
            <TextAreaField
              label="Description / notes"
              rows={2}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold">Assets & inventory</h4>
              <span className="text-xs text-muted-foreground">{draftItems.length} selected</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-end gap-2">
                <Dropdown
                  label="Add fixed asset"
                  value={assetPick}
                  onChange={setAssetPick}
                  options={assetOptions}
                  placeholder={assetOptions.length ? 'Search available assets' : 'No available assets'}
                  className="flex-1"
                />
                <PortButton onClick={addAsset} disabled={!assetPick} aria-label="Add asset">
                  <Plus size={15} />
                </PortButton>
              </div>
              <div className="flex items-end gap-2">
                <Dropdown
                  label="Add inventory item"
                  value={stockPick}
                  onChange={setStockPick}
                  options={stockOptions}
                  placeholder={stockOptions.length ? 'Search available stock' : 'No available stock'}
                  className="flex-1"
                />
                <InputField
                  label="Qty"
                  type="number"
                  min={1}
                  value={stockQty}
                  onChange={(event) => setStockQty(event.target.value)}
                  className="w-20"
                />
                <PortButton onClick={addStock} disabled={!stockPick} aria-label="Add item">
                  <Plus size={15} />
                </PortButton>
              </div>
            </div>
            {draftItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Add assets and inventory items to this handover.
              </p>
            ) : (
              <div className="space-y-2">
                {draftItems.map((item) => (
                  <div key={item.key} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-12">
                    <div className="sm:col-span-4">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.code} · {item.kind === 'asset' ? 'Fixed asset' : `Inventory · ${item.unit}`}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <InputField
                        label="Quantity"
                        type="number"
                        min={1}
                        disabled={item.kind === 'asset'}
                        value={item.quantity}
                        onChange={(event) =>
                          setDraftItems((current) =>
                            current.map((row) =>
                              row.key === item.key ? { ...row, quantity: Number(event.target.value) } : row
                            )
                          )
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Dropdown
                        label="Condition"
                        value={item.condition}
                        onChange={(value) =>
                          setDraftItems((current) =>
                            current.map((row) => (row.key === item.key ? { ...row, condition: value } : row))
                          )
                        }
                        options={CONDITIONS}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Dropdown
                        label="Custodian"
                        value={item.custodian_id}
                        onChange={(value) =>
                          setDraftItems((current) =>
                            current.map((row) => (row.key === item.key ? { ...row, custodian_id: value } : row))
                          )
                        }
                        options={custodianOptions}
                      />
                    </div>
                    <div className="flex items-end sm:col-span-1">
                      <PortButton
                        variant="ghost"
                        aria-label="Remove item"
                        onClick={() => setDraftItems((current) => current.filter((row) => row.key !== item.key))}
                      >
                        <Trash2 size={15} />
                      </PortButton>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold">Sender & receiver</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField label="Sender name" value={form.sender_name} onChange={(event) => setForm((current) => ({ ...current, sender_name: event.target.value }))} />
              <InputField label="Sender employee ID" value={form.sender_employee_id} onChange={(event) => setForm((current) => ({ ...current, sender_employee_id: event.target.value }))} />
              <InputField label="Sender department" value={form.sender_department} onChange={(event) => setForm((current) => ({ ...current, sender_department: event.target.value }))} />
              <InputField label="Sender designation" value={form.sender_designation} onChange={(event) => setForm((current) => ({ ...current, sender_designation: event.target.value }))} />
              <InputField label="Receiver name" value={form.receiver_name} onChange={(event) => setForm((current) => ({ ...current, receiver_name: event.target.value }))} required />
              <InputField label="Receiver employee ID" value={form.receiver_employee_id} onChange={(event) => setForm((current) => ({ ...current, receiver_employee_id: event.target.value }))} />
              <InputField label="Receiver department" value={form.receiver_department} onChange={(event) => setForm((current) => ({ ...current, receiver_department: event.target.value }))} />
              <InputField label="Receiver designation" value={form.receiver_designation} onChange={(event) => setForm((current) => ({ ...current, receiver_designation: event.target.value }))} />
              <InputField label="Receiver contact" value={form.receiver_contact} onChange={(event) => setForm((current) => ({ ...current, receiver_contact: event.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">
              Stock and custody change only after approval and receiver confirmation. Signatures are captured on the
              printable handover receipt.
            </p>
          </section>
        </div>
      </FormDialog>

      <FormDialog open={Boolean(detail)} title={detail ? `Handover ${detail.number}` : 'Handover'} onClose={() => setDetail(null)} maxWidth="2xl">
        {detail && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Type" value={detail.type === 'project' ? 'Project' : 'Employee'} />
              <Info label="Status" value={<StatusChip label={label(detail.status)} tone={STATUS_TONE[detail.status] ?? 'gray'} />} />
              <Info label={detail.type === 'project' ? 'Project' : 'Employee'} value={detail.type === 'project' ? detail.project_name : detail.employee_name} />
              <Info label="Handover date" value={shortDate(detail.handover_date)} />
              <Info label="Department" value={detail.department} />
              <Info label="Responsible person" value={detail.responsible_person} />
              <Info label="Expected return" value={shortDate(detail.expected_return_date)} />
              <Info label="Receiver" value={`${detail.receiver_name}${detail.receiver_contact ? ` · ${detail.receiver_contact}` : ''}`} />
              <Info label="Sender" value={detail.sender_name} />
              <Info label="Warehouse" value={detail.source_warehouse} />
              <Info label="Purpose" value={detail.purpose} />
              <Info label="Notes" value={detail.description} />
            </div>
            {detail.rejection_reason && <ErrorBanner message={`Rejected: ${detail.rejection_reason}`} />}

            <DataTable
              columns={[
                { key: 'name', header: 'Item' },
                { key: 'code', header: 'Code' },
                { key: 'kind', header: 'Type', render: (row: Item) => (row.kind === 'asset' ? 'Asset' : 'Inventory') },
                { key: 'quantity', header: 'Qty', align: 'right', render: (row: Item) => row.quantity },
                { key: 'returned', header: 'Returned', align: 'right', render: (row: Item) => row.returned },
                { key: 'damaged', header: 'Damaged', align: 'right', render: (row: Item) => row.damaged },
                { key: 'missing', header: 'Missing', align: 'right', render: (row: Item) => row.missing },
                { key: 'condition', header: 'Condition', render: (row: Item) => row.condition_return || row.condition_before },
              ]}
              rows={detail.items}
              rowKey={(row) => row.id}
            />

            {detail.returns.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Return history</h4>
                {detail.returns.map((record) => (
                  <div key={record.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                    <p className="font-medium">
                      {stamp(record.at)} · {record.by_name}
                    </p>
                    <p className="text-muted-foreground">
                      {record.lines.reduce((sum, line) => sum + line.returned, 0)} returned,{' '}
                      {record.lines.reduce((sum, line) => sum + line.damaged, 0)} damaged,{' '}
                      {record.lines.reduce((sum, line) => sum + line.missing, 0)} missing
                      {record.note ? ` — ${record.note}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Activity timeline</h4>
              <div className="space-y-2">
                {detail.history
                  .slice()
                  .reverse()
                  .map((event) => (
                    <div key={event.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                      <p className="font-medium">
                        {label(event.action)} · {event.actor_name}
                      </p>
                      <p className="text-muted-foreground">{event.detail}</p>
                      <p className="text-xs text-muted-foreground">{stamp(event.at)}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </FormDialog>

      <FormDialog
        open={Boolean(actionDialog)}
        title={actionDialog ? `${label(actionDialog.action)} ${actionDialog.row.number}` : 'Handover action'}
        onClose={() => setActionDialog(null)}
        maxWidth="md"
        footer={
          <>
            <PortButton variant="ghost" onClick={() => setActionDialog(null)}>
              Cancel
            </PortButton>
            <PortButton
              variant="primary"
              disabled={busy || (actionDialog?.action === 'reject' && !actionNote.trim())}
              onClick={() => actionDialog && runAction(actionDialog.action, actionNote)}
            >
              {busy ? 'Working…' : 'Confirm'}
            </PortButton>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {actionDialog?.action === 'receive'
              ? 'Confirming receipt issues fixed assets to the custodian and posts the stock-out transactions.'
              : actionDialog?.action === 'cancel'
                ? 'No stock or custody has changed for a handover that was not received.'
                : 'This action is recorded in the handover audit history.'}
          </p>
          <TextAreaField
            label={actionDialog?.action === 'reject' ? 'Rejection reason' : 'Note (optional)'}
            rows={3}
            value={actionNote}
            onChange={(event) => setActionNote(event.target.value)}
            required={actionDialog?.action === 'reject'}
          />
        </div>
      </FormDialog>

      <FormDialog
        open={Boolean(returnDialog)}
        title={returnDialog ? `Return items — ${returnDialog.number}` : 'Return items'}
        onClose={() => setReturnDialog(null)}
        maxWidth="2xl"
        footer={
          <>
            <PortButton variant="ghost" onClick={() => setReturnDialog(null)}>
              Cancel
            </PortButton>
            <PortButton
              variant="primary"
              disabled={busy}
              onClick={() => {
                const lines = Object.entries(returnLines)
                  .map(([item_id, line]) => ({
                    item_id,
                    returned: Number(line.returned) || 0,
                    damaged: Number(line.damaged) || 0,
                    missing: Number(line.missing) || 0,
                    condition: line.condition,
                    note: line.note,
                  }))
                  .filter((line) => line.returned + line.damaged + line.missing > 0);
                if (lines.length === 0) {
                  toast.error('Enter returned, damaged, or missing quantities.');
                  return;
                }
                void runAction('return', returnNote, { lines });
              }}
            >
              {busy ? 'Recording…' : 'Confirm return'}
            </PortButton>
          </>
        }
      >
        {returnDialog && (
          <div className="space-y-3">
            {returnDialog.items.filter((item) => remaining(item) > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground">All items on this handover are already accounted for.</p>
            ) : (
              returnDialog.items
                .filter((item) => remaining(item) > 0)
                .map((item) => {
                  const line = returnLines[item.id] ?? { returned: '', damaged: '', missing: '', condition: item.condition_before, note: '' };
                  return (
                    <div key={item.id} className="space-y-2 rounded-xl border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.code} · remaining {remaining(item)} {item.kind === 'inventory' ? item.unit : ''}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {(['returned', 'damaged', 'missing'] as const).map((field) => (
                          <InputField
                            key={field}
                            label={label(field)}
                            type="number"
                            min={0}
                            max={remaining(item)}
                            value={line[field]}
                            onChange={(event) =>
                              setReturnLines((current) => ({
                                ...current,
                                [item.id]: { ...line, [field]: event.target.value },
                              }))
                            }
                          />
                        ))}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Dropdown
                          label="Returned condition"
                          value={line.condition}
                          onChange={(value) =>
                            setReturnLines((current) => ({ ...current, [item.id]: { ...line, condition: value } }))
                          }
                          options={CONDITIONS}
                        />
                        <InputField
                          label="Item note"
                          value={line.note}
                          onChange={(event) =>
                            setReturnLines((current) => ({ ...current, [item.id]: { ...line, note: event.target.value } }))
                          }
                        />
                      </div>
                    </div>
                  );
                })
            )}
            <TextAreaField
              label="Inspection notes"
              rows={2}
              value={returnNote}
              onChange={(event) => setReturnNote(event.target.value)}
            />
          </div>
        )}
      </FormDialog>

      {printRow && (
        <div className="handover-print hidden print:block">
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Handover Receipt — {printRow.number}</h1>
          <p style={{ fontSize: 12 }}>
            {printRow.type === 'project' ? `Project: ${printRow.project_name}` : `Employee: ${printRow.employee_name}`} ·{' '}
            {shortDate(printRow.handover_date)} · Status: {label(printRow.status)}
          </p>
          <p style={{ fontSize: 12 }}>
            Sender: {printRow.sender_name} · Receiver: {printRow.receiver_name} · Responsible: {printRow.responsible_person}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12, fontSize: 11 }}>
            <thead>
              <tr>
                {['Item', 'Code', 'Qty', 'Returned', 'Damaged', 'Missing', 'Condition'].map((header) => (
                  <th key={header} style={{ border: '1px solid #999', padding: 4, textAlign: 'left' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {printRow.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ border: '1px solid #999', padding: 4 }}>{item.name}</td>
                  <td style={{ border: '1px solid #999', padding: 4 }}>{item.code}</td>
                  <td style={{ border: '1px solid #999', padding: 4 }}>{item.quantity}</td>
                  <td style={{ border: '1px solid #999', padding: 4 }}>{item.returned}</td>
                  <td style={{ border: '1px solid #999', padding: 4 }}>{item.damaged}</td>
                  <td style={{ border: '1px solid #999', padding: 4 }}>{item.missing}</td>
                  <td style={{ border: '1px solid #999', padding: 4 }}>{item.condition_return || item.condition_before}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, fontSize: 11 }}>
            <div>Sender signature: ______________________</div>
            <div>Receiver signature: ____________________</div>
          </div>
        </div>
      )}
      <style>{`@media print { body * { visibility: hidden; } .handover-print, .handover-print * { visibility: visible; } .handover-print { display: block !important; position: absolute; inset: 0; padding: 24px; background: white; color: black; } }`}</style>
    </>
  );
}

function Info({ label: text, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{text}</p>
      <div className="mt-0.5 break-words text-sm font-medium">{value || '—'}</div>
    </div>
  );
}
