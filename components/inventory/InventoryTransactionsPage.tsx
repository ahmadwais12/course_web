'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { DetailDialog, Dropdown, ErrorBanner, ListPageShell, RowActions, StatusChip } from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';

type Item = { id: string; item_name: string; quantity: number };
type Warehouse = { id: string; name: string };
type Movement = {
  id: string;
  item_id: string;
  item_name: string;
  transaction_type: 'in' | 'out';
  invoice_number: string;
  quantity: number;
  price: number;
  employee_id_number: string;
  holder_name: string;
  transaction_date: string;
  department: string;
  location: string;
  transaction_description: string;
};

export default function InventoryTransactionsPage() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [itemFilter, setItemFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [viewing, setViewing] = useState<Movement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, itemRes, whRes] = await Promise.all([
        fetch('/api/inventory/transactions'),
        fetch('/api/inventory/items'),
        fetch('/api/inventory/warehouses'),
      ]);
      const txData = await txRes.json();
      const itemData = await itemRes.json();
      const whData = await whRes.json();
      if (!txRes.ok) throw new Error(txData.error || 'Failed to load transactions');
      setRows(Array.isArray(txData) ? txData : []);
      setItems(Array.isArray(itemData) ? itemData : []);
      setWarehouses(Array.isArray(whData) ? whData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filterFn = useCallback(
    (row: Movement) => {
      if (typeFilter && row.transaction_type !== typeFilter) return false;
      if (itemFilter && row.item_id !== itemFilter) return false;
      if (locationFilter && row.location !== locationFilter) return false;
      return true;
    },
    [typeFilter, itemFilter, locationFilter]
  );

  const list = useListQuery({
    items: rows as (Movement & Record<string, unknown>)[],
    searchKeys: ['item_name', 'invoice_number', 'holder_name', 'department', 'transaction_description'],
    filterKey: `${typeFilter}|${itemFilter}|${locationFilter}`,
    filterFn: filterFn as (row: Movement & Record<string, unknown>) => boolean,
  });

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title="Inventory Transactions"
        description="All stock in and stock out movements in one place. Filter by type, item, or warehouse to trace any balance change."
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search item, invoice, holder, or description…"
        filters={[
          {
            key: 'type',
            label: 'Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: 'in', label: 'Stock in' },
              { value: 'out', label: 'Stock out' },
            ],
          },
          {
            key: 'item',
            label: 'Item',
            value: itemFilter,
            onChange: setItemFilter,
            options: items.map((item) => ({ value: item.id, label: item.item_name })),
          },
          {
            key: 'location',
            label: 'Warehouse',
            value: locationFilter,
            onChange: setLocationFilter,
            options: warehouses.map((row) => ({ value: row.name, label: row.name })),
          },
        ]}
        onResetFilters={() => {
          setTypeFilter('');
          setItemFilter('');
          setLocationFilter('');
          list.reset();
        }}
        columns={[
          { key: 'transaction_date', header: 'Date' },
          { key: 'item_name', header: 'Item' },
          {
            key: 'quantity',
            header: 'Quantity',
            render: (row) => (
              <span className="inline-flex items-center gap-2">
                {row.quantity}
                <StatusChip
                  tone={row.transaction_type === 'out' ? 'gold' : 'green'}
                  label={row.transaction_type === 'out' ? 'Out' : 'In'}
                />
              </span>
            ),
          },
          { key: 'holder_name', header: 'Holder', render: (row) => row.holder_name || '—' },
          { key: 'department', header: 'Department', render: (row) => row.department || '—' },
          { key: 'location', header: 'Warehouse', render: (row) => row.location || '—' },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex justify-end">
                <RowActions
                  items={[
                    { key: 'view', label: 'Details', icon: <Eye size={16} />, onClick: () => setViewing(row as Movement) },
                  ]}
                />
              </div>
            ),
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        loading={loading}
        emptyMessage="No transactions yet."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      />

      <DetailDialog
        open={Boolean(viewing)}
        title={viewing?.item_name || 'Transaction'}
        onClose={() => setViewing(null)}
        rows={
          viewing
            ? [
                { label: 'Type', value: viewing.transaction_type === 'out' ? 'Stock out' : 'Stock in' },
                { label: 'Invoice', value: viewing.invoice_number },
                { label: 'Quantity', value: String(viewing.quantity) },
                { label: 'Price', value: String(viewing.price) },
                { label: 'Date', value: viewing.transaction_date },
                { label: 'Employee ID', value: viewing.employee_id_number },
                { label: 'Holder', value: viewing.holder_name },
                { label: 'Department', value: viewing.department },
                { label: 'Warehouse', value: viewing.location },
                { label: 'Description', value: viewing.transaction_description },
              ]
            : []
        }
      />
    </>
  );
}
