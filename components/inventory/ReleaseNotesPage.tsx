'use client';

import React from 'react';
import { BadgeCheck, Boxes, FileSpreadsheet, QrCode, Shield, Truck } from 'lucide-react';
import { PageHeader, SectionPanel, StatusChip } from '@/components/ports';

const RELEASES = [
  {
    date: '2026-11-18',
    version: 'Inventory tools',
    icon: <FileSpreadsheet size={16} />,
    items: [
      'Excel import for items, assets, and suppliers with row-level error reporting.',
      'Excel and CSV reports for assets, items, suppliers, purchases, movements, verification, and handovers.',
      'QR code image archives as ZIP files for assets and stock items.',
      'Verification, handover, and movement report screens with date ranges.',
    ],
  },
  {
    date: '2026-11-18',
    version: 'Asset operations',
    icon: <BadgeCheck size={16} />,
    items: [
      'Change history for assets, projects, asset holders, and inventory settings.',
      'Registers for assignments, transfer requests, exit clearance, damage/loss, disposal, project closure.',
      'Repairs, service schedules, and warranty tracking.',
      'Depreciation view with annual, accumulated, and book values.',
    ],
  },
  {
    date: '2026-11-18',
    version: 'Fleet',
    icon: <Truck size={16} />,
    items: [
      'Vehicle register, vehicle logs, and fuel logs.',
      'Fleet report combining logged distance and fuel spend per vehicle.',
    ],
  },
  {
    date: '2026-11-18',
    version: 'Stock control',
    icon: <Boxes size={16} />,
    items: [
      'Goods Received (GRN) register and stock balance view.',
      'Scan and field work log for QR/barcode verification.',
      'QR tag printing sheet with browser print support.',
      'Monthly reports with movements, GRN, purchase, and handover summaries.',
    ],
  },
  {
    date: '2026-11-18',
    version: 'Administration',
    icon: <Shield size={16} />,
    items: [
      'Document archive, duty stations, and IMS asset holder registers.',
      'Security policy settings for two-factor requirements and session length.',
      'Downloadable JSON backups for inventory, assets, operations, and change history.',
    ],
  },
];

export default function ReleaseNotesPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Release Notes"
        description="What changed in the inventory module, newest first."
        pill="CHANGELOG"
        pillTone="live"
      />

      <SectionPanel
        title="Inventory module releases"
        description="Each entry lists the features shipped together."
      >
        <ol className="relative space-y-6 border-s border-border ps-5">
          {RELEASES.map((release, index) => (
            <li key={`${release.date}-${release.version}-${index}`} className="relative">
              <span className="absolute -start-[27px] flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                {release.icon}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">{release.version}</h3>
                <StatusChip tone="gray" label={release.date} />
              </div>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                {release.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </SectionPanel>

      <SectionPanel
        title="About this page"
        description="The log is kept with the code so every deployment carries its own history."
      >
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <QrCode size={16} /> QR printing and Excel tooling run on the server; no external services are required.
        </p>
      </SectionPanel>
    </div>
  );
}
