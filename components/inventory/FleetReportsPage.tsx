'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  ErrorBanner,
  ListPageShell,
  PortButton,
  PriceText,
  StatCard,
  StatusChip,
} from '@/components/ports';
import { useListQuery } from '@/hooks/useListQuery';
import { downloadCsv } from '@/lib/csv';

type Vehicle = {
  id: string;
  plate_number: string;
  make_model: string;
  vehicle_type: string;
  driver_name: string;
  odometer: number;
  status: string;
};

type VehicleLog = { id: string; vehicle: string; start_km: number; end_km: number };
type FuelLog = { id: string; vehicle: string; liters: number; cost: number };

type FleetRow = Vehicle & {
  distance: number;
  liters: number;
  fuelCost: number;
};

export default function FleetReportsPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [logs, setLogs] = useState<VehicleLog[]>([]);
  const [fuel, setFuel] = useState<FuelLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleRes, logRes, fuelRes] = await Promise.all([
        fetch('/api/inventory/ops/vehicles'),
        fetch('/api/inventory/ops/vehicleLogs'),
        fetch('/api/inventory/ops/fuelLogs'),
      ]);
      const vehicleData = await vehicleRes.json();
      const logData = await logRes.json();
      const fuelData = await fuelRes.json();
      if (!vehicleRes.ok) throw new Error(vehicleData.error || 'Failed to load fleet data');
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
      setLogs(Array.isArray(logData) ? logData : []);
      setFuel(Array.isArray(fuelData) ? fuelData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo<FleetRow[]>(
    () =>
      vehicles.map((vehicle) => {
        const distance = logs
          .filter((log) => log.vehicle === vehicle.plate_number)
          .reduce((sum, log) => sum + Math.max(0, Number(log.end_km || 0) - Number(log.start_km || 0)), 0);
        const vehicleFuel = fuel.filter((row) => row.vehicle === vehicle.plate_number);
        return {
          ...vehicle,
          distance,
          liters: vehicleFuel.reduce((sum, row) => sum + Number(row.liters || 0), 0),
          fuelCost: vehicleFuel.reduce((sum, row) => sum + Number(row.cost || 0), 0),
        };
      }),
    [vehicles, logs, fuel]
  );

  const filterFn = useCallback(
    (row: FleetRow) => (statusFilter ? row.status === statusFilter : true),
    [statusFilter]
  );

  const list = useListQuery({
    items: rows as (FleetRow & Record<string, unknown>)[],
    searchKeys: ['plate_number', 'make_model', 'vehicle_type', 'driver_name', 'status'],
    filterKey: statusFilter,
    filterFn: filterFn as (row: FleetRow & Record<string, unknown>) => boolean,
  });

  const totals = useMemo(() => {
    const visible = list.filtered as FleetRow[];
    return {
      distance: visible.reduce((sum, row) => sum + row.distance, 0),
      liters: visible.reduce((sum, row) => sum + row.liters, 0),
      cost: visible.reduce((sum, row) => sum + row.fuelCost, 0),
    };
  }, [list.filtered]);

  const exportCsv = () => {
    downloadCsv(
      `fleet-report-${new Date().toISOString().slice(0, 10)}`,
      list.filtered as FleetRow[],
      [
        { header: 'Plate', value: (row) => row.plate_number },
        { header: 'Make / model', value: (row) => row.make_model },
        { header: 'Type', value: (row) => row.vehicle_type },
        { header: 'Driver', value: (row) => row.driver_name },
        { header: 'Status', value: (row) => row.status },
        { header: 'Odometer', value: (row) => row.odometer },
        { header: 'Logged distance', value: (row) => row.distance },
        { header: 'Fuel liters', value: (row) => row.liters },
        { header: 'Fuel cost', value: (row) => row.fuelCost },
      ]
    );
  };

  return (
    <>
      {error && (
        <div className="mb-4">
          <ErrorBanner message={error} />
        </div>
      )}
      <ListPageShell
        title="Fleet Reports"
        description="Distance and fuel use per vehicle, built from the vehicle and fuel logs."
        loading={loading}
        secondaryActions={
          <PortButton onClick={exportCsv} disabled={loading || list.total === 0}>
            <Download size={16} /> CSV
          </PortButton>
        }
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search plate, model, or driver…"
        filters={[
          {
            key: 'status',
            label: 'Vehicle status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: ['active', 'maintenance', 'retired'].map((value) => ({
              value,
              label: value.charAt(0).toUpperCase() + value.slice(1),
            })),
          },
        ]}
        onResetFilters={() => {
          setStatusFilter('');
          list.reset();
        }}
        columns={[
          { key: 'plate_number', header: 'Plate' },
          {
            key: 'make_model',
            header: 'Make / model',
            render: (row) => (
              <div>
                <div>{row.make_model || '—'}</div>
                <div className="text-xs text-muted-foreground">{row.vehicle_type || '—'}</div>
              </div>
            ),
          },
          { key: 'driver_name', header: 'Driver', render: (row) => row.driver_name || '—' },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <StatusChip tone="blue" label={row.status || 'unknown'} />,
          },
          {
            key: 'distance',
            header: 'Distance (km)',
            align: 'right',
            render: (row) => row.distance.toLocaleString(),
          },
          {
            key: 'liters',
            header: 'Fuel (L)',
            align: 'right',
            render: (row) => Math.round(row.liters).toLocaleString(),
          },
          {
            key: 'fuelCost',
            header: 'Fuel cost',
            align: 'right',
            render: (row) => <PriceText value={Math.round(row.fuelCost)} />,
          },
        ]}
        rows={list.rows}
        rowKey={(row) => String(row.id)}
        emptyMessage="No vehicles registered yet."
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Vehicles" value={list.total} accent="blue" />
          <StatCard
            label="Active"
            value={(list.filtered as FleetRow[]).filter((row) => row.status === 'active').length}
            accent="green"
          />
          <StatCard label="Distance (km)" value={Math.round(totals.distance)} accent="purple" />
          <StatCard label="Fuel cost" value={Math.round(totals.cost)} accent="gold" />
        </div>
      </ListPageShell>
    </>
  );
}
