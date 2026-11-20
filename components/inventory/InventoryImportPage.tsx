'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  InputField,
  PageHeader,
  PortButton,
  SectionPanel,
  StatCard,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { downloadFile } from '@/lib/download';

type Kind = 'items' | 'assets' | 'suppliers';

type ImportResult = {
  imported: number;
  skipped: number;
  total: number;
  errors: string[];
};

const KINDS: { value: Kind; label: string; description: string }[] = [
  {
    value: 'items',
    label: 'Inventory items',
    description: 'Item name, bin card, unit, quantity, minimum quantity, unit price, description.',
  },
  {
    value: 'assets',
    label: 'Assets',
    description: 'Tag number, asset name, status, holder, department, location, cost, and depreciation fields.',
  },
  {
    value: 'suppliers',
    label: 'Suppliers',
    description: 'Supplier name, contact person, phone, email, address, and active flag.',
  },
];

export default function InventoryImportPage() {
  const [kind, setKind] = useState<Kind>('items');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = KINDS.find((row) => row.value === kind) ?? KINDS[0];

  const downloadTemplate = () => {
    toast.success('Downloading the Excel template…');
    downloadFile(`/api/inventory/import?type=${kind}`);
  };

  const upload = async () => {
    if (!file) {
      setError('Choose an .xlsx workbook first.');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append('type', kind);
      body.append('file', file);
      const res = await fetch('/api/inventory/import', { method: 'POST', body });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.errors)) {
        setResult({
          imported: Number(data.imported) || 0,
          skipped: Number(data.skipped) || 0,
          total: Number(data.total) || 0,
          errors: data.errors,
        });
      }
      if (!res.ok) {
        throw new Error(data.error || 'Import failed');
      }
      toast.success(`${data.imported ?? 0} row(s) imported`);
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Upload Excel"
        description="Import inventory items, assets, or suppliers from an .xlsx workbook. Download the template first so the header row matches."
        pill="BULK IMPORT"
        pillTone="live"
        actions={
          <PortButton onClick={downloadTemplate}>
            <Download size={16} /> Template
          </PortButton>
        }
      />

      {error && <ErrorBanner message={error} />}

      <SectionPanel
        title="Choose a record type"
        description={selected.description}
      >
        <div className="max-w-md">
          <Dropdown
            label="Record type"
            value={kind}
            onChange={(value) => {
              setKind(value as Kind);
              setFile(null);
              setResult(null);
              setError(null);
            }}
            options={KINDS.map((row) => ({ value: row.value, label: row.label }))}
            required
          />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Workbook"
        description="One sheet named Data. Up to 1,000 rows per upload; header names are matched automatically."
      >
        <div className="grid max-w-2xl gap-3">
          <InputField
            label="Excel workbook (.xlsx)"
            type="file"
            accept=".xlsx"
            disabled={uploading}
            hint={
              file
                ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB`
                : 'Excel 2007+ workbook. Maximum size 10MB.'
            }
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <PortButton variant="primary" onClick={upload} disabled={uploading || !file}>
              {uploading ? 'Uploading…' : 'Upload and import'}
            </PortButton>
            <PortButton onClick={downloadTemplate}>
              <FileSpreadsheet size={16} /> Download template
            </PortButton>
          </div>
        </div>
      </SectionPanel>

      {result && (
        <SectionPanel
          title="Import result"
          description={`${result.imported} imported · ${result.skipped} skipped · ${result.total} rows read`}
        >
          <div className="grid grid-cols-3 gap-3 sm:max-w-md">
            <StatCard label="Imported" value={result.imported} accent="green" />
            <StatCard label="Skipped" value={result.skipped} accent="gold" />
            <StatCard label="Rows read" value={result.total} accent="blue" />
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                Rows that could not be imported
              </h3>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border bg-background p-3 text-xs text-muted-foreground">
                {result.errors.map((message, index) => (
                  <li key={`${index}-${message}`}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          {result.errors.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              Every row in the workbook was accepted.
            </p>
          )}
        </SectionPanel>
      )}

      <SectionPanel
        title="How the import behaves"
        description="A few rules keep duplicate records out of the ledger."
      >
        <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
          <li>Blank required cells are reported per row and skipped; the rest of the workbook still imports.</li>
          <li>Unit, holder, category, and project names must already exist — unknown names are reported.</li>
          <li>Suppliers with a name that already exists are skipped instead of creating duplicates.</li>
          <li>Imported stock is added as a starting balance; use Stock In for later receipts.</li>
        </ul>
      </SectionPanel>
    </div>
  );
}
