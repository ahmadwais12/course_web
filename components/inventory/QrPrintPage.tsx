'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Printer, QrCode } from 'lucide-react';
import {
  ErrorBanner,
  InputField,
  PageHeader,
  PortButton,
  SegmentedControl,
  StatusChip,
} from '@/components/ports';
import { downloadFile } from '@/lib/download';

type Asset = { id: string; tag_number: string; asset_name: string; department: string };
type Item = { id: string; bin_card_number: string; item_name: string; unit_label: string };

type Tag = { id: string; code: string; name: string; meta: string };

export default function QrPrintPage() {
  const [mode, setMode] = useState<'assets' | 'items'>('assets');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assetRes, itemRes] = await Promise.all([
        fetch('/api/inventory/assets'),
        fetch('/api/inventory/items'),
      ]);
      const assetData = await assetRes.json();
      const itemData = await itemRes.json();
      if (!assetRes.ok) throw new Error(assetData.error || 'Failed to load tags');
      setAssets(Array.isArray(assetData) ? assetData : []);
      setItems(Array.isArray(itemData) ? itemData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tags = useMemo<Tag[]>(() => {
    const query = search.trim().toLowerCase();
    if (mode === 'assets') {
      return assets
        .map((asset) => ({
          id: asset.id,
          code: asset.tag_number || asset.id,
          name: asset.asset_name,
          meta: asset.department || '',
        }))
        .filter((tag) => !query || `${tag.code} ${tag.name} ${tag.meta}`.toLowerCase().includes(query));
    }
    return items
      .map((item) => ({
        id: item.id,
        code: item.bin_card_number || item.id,
        name: item.item_name,
        meta: item.unit_label || '',
      }))
      .filter((tag) => !query || `${tag.code} ${tag.name} ${tag.meta}`.toLowerCase().includes(query));
  }, [mode, assets, items, search]);

  return (
    <div className="space-y-4">
      <div className="space-y-4 print:hidden">
        <PageHeader
          title="QR Tag Printing"
          description="Print QR labels for assets or stock items. The QR content is the asset tag or bin card number."
          pill="PRINT SHEET"
          pillTone="live"
          actions={
            <>
              <PortButton variant="primary" onClick={() => window.print()} disabled={!tags.length}>
                <Printer size={16} /> Print labels
              </PortButton>
              <PortButton onClick={() => downloadFile(`/api/inventory/qr-zip?type=${mode}`)}>
                <Download size={16} /> PNG archive (.zip)
              </PortButton>
            </>
          }
        />

        {error && <ErrorBanner message={error} />}

        <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
          <SegmentedControl
            options={[
              { value: 'assets', label: `Assets (${assets.length})` },
              { value: 'items', label: `Items (${items.length})` },
            ]}
            value={mode}
            onChange={(value) => {
              setMode(value as 'assets' | 'items');
              setSearch('');
            }}
          />
          <InputField
            label="Filter labels"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tag, name, or department…"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 print:hidden">
        <StatusChip tone="blue" label={`${tags.length} label(s)`} />
        {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
        <span className="text-xs text-muted-foreground">Each label prints with its QR and code.</span>
      </div>

      {!loading && tags.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No {mode} to print. Register records first.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 print:grid-cols-4 print:gap-2">
        {tags.map((tag) => (
          <article
            key={tag.id}
            className="break-inside-avoid rounded-xl border border-border bg-white p-3 text-center text-[#142033] print:border print:border-black/30"
          >
            <img
              src={`/api/inventory/qr-image?code=${encodeURIComponent(tag.code)}&width=240`}
              alt={`QR code ${tag.code}`}
              className="mx-auto h-28 w-28"
            />
            <div className="mt-2 flex items-center justify-center gap-1 text-sm font-semibold">
              <QrCode size={14} /> {tag.code}
            </div>
            <div className="truncate text-xs font-medium">{tag.name}</div>
            {tag.meta && <div className="truncate text-[11px] text-gray-600">{tag.meta}</div>}
          </article>
        ))}
      </div>
    </div>
  );
}
