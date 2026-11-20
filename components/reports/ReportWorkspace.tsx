'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, FileBarChart2, Printer } from 'lucide-react';
import { Dropdown, InputField, PageHeader, PortButton, SectionPanel, StatusChip } from '@/components/ports';
import SearchBar from '@/components/ports/SearchBar';

export type ReportFilters = { from: string; to: string; status: string; classId: string; programId: string; paymentMethod: string; departmentId: string; stockStatus: string };
const EMPTY_FILTERS: ReportFilters = { from: '', to: '', status: '', classId: '', programId: '', paymentMethod: '', departmentId: '', stockStatus: '' };
const ReportFilterContext = createContext<ReportFilters>(EMPTY_FILTERS);
export const useReportFilters = () => useContext(ReportFilterContext);
export function reportDataUrl(path: string, filters: ReportFilters) {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.status) params.set('status', filters.status);
  if (filters.classId) params.set('classId', filters.classId);
  if (filters.programId) params.set('programId', filters.programId);
  if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
  if (filters.departmentId) params.set('departmentId', filters.departmentId);
  if (filters.stockStatus) params.set('stockStatus', filters.stockStatus);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

const REPORTS = [
  { href: '/reports/students', title: 'Student Report', category: 'Students', description: 'Enrollment, class and program distribution, attendance, and fee balances.', status: false },
  { href: '/reports/academic', title: 'Academic Report', category: 'Academic', description: 'Exam performance, class averages, pass rates, and grades.', status: true },
  { href: '/reports/attendance', title: 'Attendance Report', category: 'Attendance', description: 'Attendance rates, monthly trends, and class breakdown.', status: true },
  { href: '/reports/finance', title: 'Financial Report', category: 'Finance', description: 'Collections, expenses, outstanding fees, and financial trends.', status: false },
  { href: '/finance/reports', title: 'Accounting Reports', category: 'Finance', description: 'Trial Balance, Income & Expense, and Balance Sheet.', status: false },
  { href: '/reports/hr', title: 'HR Report', category: 'HR', description: 'Headcount, payroll, departments, and staff leave.', status: true },
  { href: '/inventory/reports', title: 'Inventory Reports', category: 'Inventory', description: 'Stock health, movement trends, Excel and CSV reports, and QR archives.', status: false },
];
const STATUS_OPTIONS: Record<string, { value: string; label: string }[]> = {
  '/reports/students': [{ value: 'active', label: 'Active' }, { value: 'graduated', label: 'Graduated' }, { value: 'inactive', label: 'Inactive' }, { value: 'suspended', label: 'Suspended' }, { value: 'transferred', label: 'Transferred' }, { value: 'dropped', label: 'Dropped' }],
  '/reports/academic': [{ value: 'completed', label: 'Completed exams' }, { value: 'scheduled', label: 'Scheduled exams' }, { value: 'in_progress', label: 'In progress' }],
  '/reports/attendance': [{ value: 'present', label: 'Present' }, { value: 'absent', label: 'Absent' }, { value: 'late', label: 'Late' }, { value: 'excused', label: 'Excused' }],
  '/reports/hr': [{ value: 'pending', label: 'Pending leave' }, { value: 'approved', label: 'Approved leave' }, { value: 'rejected', label: 'Rejected leave' }],
};
const CLASS_REPORTS = new Set(['/reports/students', '/reports/academic', '/reports/attendance']);
const PROGRAM_REPORTS = new Set(['/reports/students']);
const DEPARTMENT_REPORTS = new Set(['/reports/hr']);
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank transfer' }, { value: 'online', label: 'Online' },
  { value: 'check', label: 'Check' }, { value: 'mobile_payment', label: 'Mobile payment' },
];
const STOCK_OPTIONS = [{value:'comfortable',label:'Comfortable stock'},{value:'at',label:'At minimum'},{value:'below',label:'Below minimum'}];

export default function ReportWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const current = REPORTS.find(report => report.href === pathname);
  const [selectedPath, setSelectedPath] = useState(current?.href ?? REPORTS[0].href);
  const selected = REPORTS.find(report => report.href === selectedPath) ?? REPORTS[0];
  const [phase, setPhase] = useState<1 | 2>(1); const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<ReportFilters>(EMPTY_FILTERS); const [applied, setApplied] = useState<ReportFilters>(EMPTY_FILTERS);
  const [classOptions, setClassOptions] = useState<{ value: string; label: string }[]>([]);
  const [programOptions, setProgramOptions] = useState<{ value: string; label: string }[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const initial = { from: query.get('from') ?? '', to: query.get('to') ?? '', status: query.get('status') ?? '', classId: query.get('classId') ?? '', programId: query.get('programId') ?? '', paymentMethod: query.get('paymentMethod') ?? '', departmentId: query.get('departmentId') ?? '', stockStatus: query.get('stockStatus') ?? '' };
    setDraft(initial); setApplied(initial);
    if (query.get('reportStep') === 'preview' && current) { setSelectedPath(current.href); setPhase(2); }
  }, [pathname, current]);

  useEffect(() => {
    if (!CLASS_REPORTS.has(selectedPath)) setClassOptions([]);
    else void fetch('/api/classes').then(res => res.ok ? res.json() : []).then((rows: {id:string;name:string|null;grade?:string|null}[]) => setClassOptions(rows.map(row => ({value:row.id,label:row.name||row.grade||'Unnamed class'})))).catch(() => setClassOptions([]));
    if (!PROGRAM_REPORTS.has(selectedPath)) setProgramOptions([]);
    else void fetch('/api/programs').then(res => res.ok ? res.json() : []).then((rows: {id:string;name:string}[]) => setProgramOptions(rows.map(row => ({value:row.id,label:row.name})))).catch(() => setProgramOptions([]));
    if (!DEPARTMENT_REPORTS.has(selectedPath)) setDepartmentOptions([]);
    else void fetch('/api/organization/departments').then(res => res.ok ? res.json() : {rows:[]}).then((data: {rows?:{id:string;name:string}[]}) => setDepartmentOptions((data.rows??[]).map(row=>({value:row.id,label:row.name})))).catch(() => setDepartmentOptions([]));
  }, [selectedPath]);

  const filteredReports = useMemo(() => REPORTS.filter(report => `${report.title} ${report.category} ${report.description}`.toLowerCase().includes(search.toLowerCase())), [search]);
  const statusOptions = STATUS_OPTIONS[selected.href] ?? [];
  const goNext = () => {
    if (draft.from && draft.to && draft.from > draft.to) return;
    if (selected.href !== pathname) {
      const query = new URLSearchParams({ reportStep: 'preview' });
      if (draft.from) query.set('from', draft.from); if (draft.to) query.set('to', draft.to); if (draft.status) query.set('status', draft.status); if (draft.classId) query.set('classId', draft.classId); if (draft.programId) query.set('programId', draft.programId); if (draft.paymentMethod) query.set('paymentMethod', draft.paymentMethod); if (draft.departmentId) query.set('departmentId',draft.departmentId); if (draft.stockStatus) query.set('stockStatus',draft.stockStatus);
      router.push(`${selected.href}?${query.toString()}`); return;
    }
    setApplied(draft); setPhase(2);
  };
  const reset = () => setDraft(EMPTY_FILTERS);
  const providerValue = phase === 2 ? applied : EMPTY_FILTERS;

  return <ReportFilterContext.Provider value={providerValue}>
    <div className="min-w-0 space-y-4">
      <PageHeader title={phase === 1 ? 'Reports' : 'Report Preview'} description={phase === 1 ? 'Choose a report and set filters before preparing the preview.' : 'Review the generated report. Use Back to adjust the report and its filters.'} pill={`${phase === 1 ? 'STEP 1' : 'STEP 2'} OF 2`} pillTone="neutral" actions={<div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${phase === 1 ? 'bg-sky-100 text-sky-800' : 'bg-muted text-muted-foreground'}`}>1&nbsp; Choose report and filters</span><ArrowRight size={14} className="text-muted-foreground"/><span className={`rounded-full px-3 py-1 text-xs font-semibold ${phase === 2 ? 'bg-sky-100 text-sky-800' : 'bg-muted text-muted-foreground'}`}>2&nbsp; Report Preview</span></div>}/>
      {phase === 1 ? <div className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <SectionPanel title="Available Reports" description="Search and choose a report to configure." className="h-full" bodyClassName="flex h-full flex-col gap-2 p-3">
          <SearchBar value={search} onChange={setSearch} placeholder="Search reports…"/>
          <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pr-1">
            {filteredReports.map((report) => (
              <button
                type="button"
                aria-pressed={selectedPath === report.href}
                key={report.href}
                onClick={() => {
                  setSelectedPath(report.href);
                  setDraft(EMPTY_FILTERS);
                }}
                className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${selectedPath === report.href ? 'border-sky-300 bg-sky-50 dark:bg-sky-950/30' : 'border-border bg-background hover:bg-muted'}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${selectedPath === report.href ? 'bg-sky-100 text-sky-700' : 'bg-muted text-muted-foreground'}`}>
                    <FileBarChart2 size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 text-xs font-semibold leading-4">
                      {report.title}
                      {selectedPath === report.href && <StatusChip label="Selected" tone="blue" className="px-1.5 py-0 text-[10px]" />}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] leading-3 text-muted-foreground">{report.category} · {report.description}</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </SectionPanel>
        <SectionPanel title={selected.title} description={selected.description} className="h-full" bodyClassName="space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3"><div><p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">{selected.category} report</p><p className="m-0 mt-1 text-sm text-muted-foreground">Choose the criteria to include in this report.</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><CalendarDays size={19}/></span></div>
          <div className="rounded-xl border border-border bg-muted/20 p-4"><div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="m-0 text-sm font-semibold">Filter Options</h2><p className="m-0 mt-1 text-xs text-muted-foreground">Narrow the results before preparing your report.</p></div><PortButton variant="secondary" onClick={reset}>Reset filters</PortButton></div>
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2"><InputField label="From date" type="date" value={draft.from} onChange={e => setDraft(prev => ({ ...prev, from: e.target.value }))}/><InputField label="To date" type="date" value={draft.to} onChange={e => setDraft(prev => ({ ...prev, to: e.target.value }))}/>{statusOptions.length > 0 && <Dropdown label={selected.href === '/reports/hr' ? 'Leave status' : selected.href === '/reports/attendance' ? 'Attendance status' : selected.href === '/reports/students' ? 'Enrollment status' : 'Exam status'} value={draft.status} onChange={status => setDraft(prev => ({ ...prev, status }))} options={statusOptions} placeholder="All statuses"/>}{CLASS_REPORTS.has(selected.href) && <Dropdown label="Class" value={draft.classId} onChange={classId => setDraft(prev => ({ ...prev, classId }))} options={classOptions} placeholder="All classes"/>}{PROGRAM_REPORTS.has(selected.href) && <Dropdown label="Program" value={draft.programId} onChange={programId => setDraft(prev => ({ ...prev, programId }))} options={programOptions} placeholder="All programs"/>}{selected.href === '/reports/finance' && <Dropdown label="Payment method" value={draft.paymentMethod} onChange={paymentMethod => setDraft(prev => ({ ...prev, paymentMethod }))} options={PAYMENT_METHODS} placeholder="All methods"/>}{DEPARTMENT_REPORTS.has(selected.href) && <Dropdown label="Department" value={draft.departmentId} onChange={departmentId => setDraft(prev => ({ ...prev, departmentId }))} options={departmentOptions} placeholder="All departments"/>}{selected.href === '/inventory/reports' && <Dropdown label="Stock health" value={draft.stockStatus} onChange={stockStatus => setDraft(prev => ({ ...prev, stockStatus }))} options={STOCK_OPTIONS} placeholder="All stock levels"/>}</div>
            {draft.from && draft.to && draft.from > draft.to && <p role="alert" className="mt-3 text-sm text-destructive">From date must be earlier than or equal to To date.</p>}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><p className="m-0 text-xs text-muted-foreground">Date and status filters are applied to the selected report data.</p><PortButton variant="primary" disabled={Boolean(draft.from && draft.to && draft.from > draft.to)} onClick={goNext}><ArrowRight size={16}/>Next</PortButton></div>
          </div>
        </SectionPanel>
      </div> : <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2 print:hidden"><div className="flex flex-wrap items-center gap-2">{applied.from && <StatusChip label={`From ${applied.from}`} tone="gray"/>}{applied.to && <StatusChip label={`To ${applied.to}`} tone="gray"/>}{applied.status && <StatusChip label={`Status: ${statusOptions.find(o=>o.value===applied.status)?.label ?? applied.status}`} tone="gray"/>}{applied.classId && <StatusChip label={`Class: ${classOptions.find(o=>o.value===applied.classId)?.label ?? 'Selected'}`} tone="gray"/>}{applied.programId && <StatusChip label={`Program: ${programOptions.find(o=>o.value===applied.programId)?.label ?? 'Selected'}`} tone="gray"/>}{applied.paymentMethod && <StatusChip label={`Method: ${PAYMENT_METHODS.find(o=>o.value===applied.paymentMethod)?.label ?? applied.paymentMethod}`} tone="gray"/>}{applied.departmentId && <StatusChip label={`Department: ${departmentOptions.find(o=>o.value===applied.departmentId)?.label ?? 'Selected'}`} tone="gray"/>}{applied.stockStatus && <StatusChip label={`Stock: ${STOCK_OPTIONS.find(o=>o.value===applied.stockStatus)?.label ?? applied.stockStatus}`} tone="gray"/>}</div><div className="flex gap-2"><PortButton variant="secondary" onClick={() => setPhase(1)}><ArrowLeft size={16}/>Back to filters</PortButton><PortButton variant="primary" onClick={() => window.print()}><Printer size={16}/>Print report</PortButton></div></div><div className="report-preview">{children}</div></div>}
    </div>
  </ReportFilterContext.Provider>;
}
