'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  BadgeCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
  QrCode,
  Upload,
} from 'lucide-react';
import {
  ErrorBanner,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { downloadFile } from '@/lib/download';
import { useReportFilters } from '@/components/reports/ReportWorkspace';
import InventoryReportPage from '@/components/inventory/InventoryReportPage';
import VerificationReportPage from '@/components/inventory/VerificationReportPage';
import HandoverReportPage from '@/components/inventory/HandoverReportPage';
import MovementReportPage from '@/components/inventory/MovementReportPage';

type ReportCard = {
  type: 'assets' | 'items' | 'suppliers' | 'purchases' | 'movements' | 'verification' | 'handover';
  title: string;
  description: string;
};

const REPORTS: ReportCard[] = [
  {
    type: 'assets',
    title: 'Asset register',
    description: 'Every registered asset with tag, holder, department, cost, and book value.',
  },
  {
    type: 'items',
    title: 'Stock items',
    description: 'Bin cards, on-hand quantities, minimums, and valuation per item.',
  },
  {
    type: 'suppliers',
    title: 'Suppliers',
    description: 'Supplier directory with contact details and received purchase value.',
  },
  {
    type: 'purchases',
    title: 'Purchase orders',
    description: 'Purchase references, suppliers, quantities, totals, and status.',
  },
  {
    type: 'movements',
    title: 'Stock movements',
    description: 'Every stock in and stock out record with holder and warehouse.',
  },
  {
    type: 'verification',
    title: 'Verification report',
    description: 'Stock counts against minimums plus the fixed-asset custody list.',
  },
  {
    type: 'handover',
    title: 'Handover report',
    description: 'Asset handover history and the current holder for every asset.',
  },
];

type Counts = { assets: number | null; items: number | null; suppliers: number | null; purchases: number | null };

export default function InventoryReportsPage() {
  const filters = useReportFilters();
  const [activeReport, setActiveReport] = useState<'overview' | 'verification' | 'handover' | 'movements'>('overview');
  const [counts, setCounts] = useState<Counts>({ assets: null, items: null, suppliers: null, purchases: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [assets, items, suppliers, purchases] = await Promise.all([
          fetch('/api/inventory/assets').then((res) => (res.ok ? res.json() : [])),
          fetch('/api/inventory/items').then((res) => (res.ok ? res.json() : [])),
          fetch('/api/inventory/suppliers').then((res) => (res.ok ? res.json() : [])),
          fetch('/api/inventory/purchases').then((res) => (res.ok ? res.json() : [])),
        ]);
        setCounts({
          assets: Array.isArray(assets) ? assets.length : 0,
          items: Array.isArray(items) ? items.length : 0,
          suppliers: Array.isArray(suppliers) ? suppliers.length : 0,
          purchases: Array.isArray(purchases) ? purchases.length : 0,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load record counts');
      }
    })();
  }, []);

  const download = (type: ReportCard['type'], format: 'xlsx' | 'csv') => {
    const params = new URLSearchParams({ type, format });
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    downloadFile(`/api/inventory/export?${params.toString()}`);
  };

  const downloadQr = (type: 'assets' | 'items') => {
    toast.success(type === 'assets' ? 'Building the asset QR archive…' : 'Building the item QR archive…');
    downloadFile(`/api/inventory/qr-zip?type=${type}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory Reports"
        description="Review stock health and movement trends, then filter and download inventory reports or QR archives."
        pill="EXCEL READY"
        pillTone="live"
      />

      {error && <ErrorBanner message={error} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Assets" value={counts.assets ?? '—'} accent="purple" />
        <StatCard label="Stock items" value={counts.items ?? '—'} accent="green" />
        <StatCard label="Suppliers" value={counts.suppliers ?? '—'} accent="blue" />
        <StatCard label="Purchase orders" value={counts.purchases ?? '—'} accent="gold" />
      </div>

      <SectionPanel title="Inventory report views" description="Choose a report to review its records and apply its filters here.">
        <div className="flex flex-wrap gap-2">
          <PortButton variant={activeReport === 'overview' ? 'primary' : 'ghost'} onClick={() => setActiveReport('overview')}>Stock overview</PortButton>
          <PortButton variant={activeReport === 'verification' ? 'primary' : 'ghost'} onClick={() => setActiveReport('verification')}>Verification</PortButton>
          <PortButton variant={activeReport === 'handover' ? 'primary' : 'ghost'} onClick={() => setActiveReport('handover')}>Handovers</PortButton>
          <PortButton variant={activeReport === 'movements' ? 'primary' : 'ghost'} onClick={() => setActiveReport('movements')}>Stock movements</PortButton>
        </div>
        <div className="mt-4">
          {activeReport === 'overview' && <InventoryReportPage embedded />}
          {activeReport === 'verification' && <VerificationReportPage />}
          {activeReport === 'handover' && <HandoverReportPage />}
          {activeReport === 'movements' && <MovementReportPage />}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Download reports"
        description="Each report downloads as a formatted .xlsx workbook with a frozen header row. CSV downloads the first sheet."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {REPORTS.map((report) => (
            <article
              key={report.type}
              className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileSpreadsheet size={16} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{report.title}</h3>
                  <p className="text-xs text-muted-foreground">{report.description}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <PortButton variant="primary" onClick={() => download(report.type, 'xlsx')}>
                  <Download size={16} /> Excel
                </PortButton>
                <PortButton onClick={() => download(report.type, 'csv')}>
                  <FileText size={16} /> CSV
                </PortButton>
              </div>
            </article>
          ))}
        </div>
      </SectionPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel
          title="QR code images (Zip)"
          description="Every asset tag and every bin card as a PNG QR image, packed in a single ZIP with an index file."
        >
          <div className="flex flex-wrap gap-2">
            <PortButton variant="primary" onClick={() => downloadQr('assets')}>
              <QrCode size={16} /> Assets QR (.zip)
            </PortButton>
            <PortButton onClick={() => downloadQr('items')}>
              <QrCode size={16} /> Items QR (.zip)
            </PortButton>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            QR content is the asset tag number or the item bin card number. Codes without a tag fall back to the
            record id.
          </p>
        </SectionPanel>

        <SectionPanel
          title="Upload Excel"
          description="Import items, assets, or suppliers from an .xlsx workbook. Download the template first to keep the header row intact."
        >
          <div className="flex flex-wrap gap-2">
            <PortButton onClick={() => downloadFile('/api/inventory/import?type=items')}>
              <Package size={16} /> Items template
            </PortButton>
            <PortButton onClick={() => downloadFile('/api/inventory/import?type=assets')}>
              <BadgeCheck size={16} /> Assets template
            </PortButton>
            <PortButton onClick={() => downloadFile('/api/inventory/import?type=suppliers')}>
              <FileSpreadsheet size={16} /> Suppliers template
            </PortButton>
          </div>
          <div className="mt-3">
            <Link
              href="/inventory/import"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] bg-[#88b6ff] px-4 text-sm font-semibold text-[#142033] shadow-sm transition-opacity hover:opacity-90"
            >
              <Upload size={16} /> Open the Excel uploader
            </Link>
          </div>
        </SectionPanel>
      </div>

    </div>
  );
}
