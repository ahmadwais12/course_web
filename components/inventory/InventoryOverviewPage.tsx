'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Archive,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Contact,
  FolderKanban,
  ListTree,
  Package,
  PackageMinus,
  PackagePlus,
  Ruler,
  ShoppingCart,
  SlidersHorizontal,
  Tags,
  Trash2,
  Truck,
  Warehouse,
} from 'lucide-react';
import { ErrorBanner, PageHeader, PortButton, StatCard } from '@/components/ports';
import type { LucideIcon } from 'lucide-react';

type Dashboard = {
  headlines: {
    inventory_items: number;
    total_on_hand: number;
    items_at_or_below_minimum: number;
    movements_last_30_days: number;
  };
};

type SectionLink = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

const SECTIONS: SectionLink[] = [
  { href: '/inventory/items', icon: Package, title: 'Inventory Items', description: 'Items, bin cards, on-hand quantity, and prices.' },
  { href: '/inventory/stock-in', icon: PackagePlus, title: 'Stock In', description: 'Record received stock into on-hand quantity.' },
  { href: '/inventory/stock-out', icon: PackageMinus, title: 'Stock Out', description: 'Issue stock against the current balance.' },
  { href: '/inventory/transfers', icon: ArrowLeftRight, title: 'Transfers', description: 'Move stock between warehouses.' },
  { href: '/inventory/adjustments', icon: SlidersHorizontal, title: 'Adjustments', description: 'Correct quantities after counts or damage.' },
  { href: '/inventory/warehouses', icon: Warehouse, title: 'Warehouses', description: 'Warehouse locations used by movements.' },
  { href: '/inventory/suppliers', icon: Truck, title: 'Suppliers', description: 'Suppliers and their contact details.' },
  { href: '/inventory/purchases', icon: ShoppingCart, title: 'Purchase', description: 'Purchase orders and receiving goods.' },
  { href: '/inventory/categories', icon: Tags, title: 'Categories', description: 'Categories used on items and assets.' },
  { href: '/inventory/units', icon: Ruler, title: 'Units', description: 'Units of measure for stock items.' },
  { href: '/inventory/assets', icon: Archive, title: 'Assets', description: 'Registered fixed assets by holder and status.' },
  { href: '/inventory/projects', icon: FolderKanban, title: 'Projects', description: 'Projects linked to fixed assets.' },
  { href: '/inventory/holders', icon: Contact, title: 'Asset Holders', description: 'People and offices holding assets.' },
  { href: '/inventory/properties', icon: ListTree, title: 'Asset Properties', description: 'Category, department, location, province values.' },
  { href: '/inventory/assets/trash', icon: Trash2, title: 'Asset Trash', description: 'Restore or permanently remove assets.' },
  { href: '/reports/inventory', icon: BarChart3, title: 'Inventory Reports', description: 'On-hand totals and stock health.' },
];

export default function InventoryOverviewPage() {
  const router = useRouter();
  const [headlines, setHeadlines] = useState<Dashboard['headlines'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory/dashboard');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load inventory totals');
      setHeadlines(body.headlines ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inventory totals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = (n: number | undefined) => (n == null ? '—' : n.toLocaleString());

  return (
    <div className="min-w-0 space-y-4 animate-fade-up">
      <PageHeader
        title="Inventory"
        description="The inventory module at a glance — jump into items, stock movements, warehouses, and assets."
        pill={loading ? 'LOADING…' : 'MODULE'}
        pillTone={loading ? 'neutral' : 'live'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PortButton onClick={() => router.push('/reports/inventory')}>Reports</PortButton>
            <PortButton variant="primary" onClick={() => router.push('/inventory/items')}>
              Inventory items
            </PortButton>
          </div>
        }
      />
      {error && (
        <div className="space-y-2">
          <ErrorBanner message={error} />
          <PortButton variant="secondary" className="h-8 text-xs" onClick={() => void load()}>
            Retry
          </PortButton>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Inventory items" value={value(headlines?.inventory_items)} hint="Stock item records" accent="blue" />
        <StatCard label="Total on hand" value={value(headlines?.total_on_hand)} hint="Sum of item quantities" accent="green" />
        <StatCard
          label="At or below minimum"
          value={value(headlines?.items_at_or_below_minimum)}
          hint="Items to reorder"
          accent="gold"
        />
        <StatCard
          label="Movements (30 days)"
          value={value(headlines?.movements_last_30_days)}
          hint="Stock in and out"
          accent="purple"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group flex flex-col rounded-2xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-200 group-hover:scale-110">
                <section.icon size={20} />
              </div>
              <ArrowRight
                size={15}
                className="text-muted-foreground opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 rtl:-scale-x-100"
              />
            </div>
            <p className="text-sm font-bold text-foreground">{section.title}</p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
