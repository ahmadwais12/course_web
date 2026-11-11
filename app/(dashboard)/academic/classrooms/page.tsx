'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  RowActions,
  StatCard,
  StatusChip,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { useListQuery } from '@/hooks/useListQuery';

type RoomRow = {
  id: string;
  name: string;
  building: string | null;
  floor: number | null;
  capacity: number;
  roomType: string;
  lessons: number;
  isActive: boolean;
};

type FormState = {
  name: string;
  building: string;
  floor: string;
  capacity: string;
  roomType: string;
  isActive: boolean;
};

const ROOM_TYPES = [
  { value: 'classroom', label: 'Classroom' },
  { value: 'lab', label: 'Lab' },
  { value: 'lecture_hall', label: 'Lecture hall' },
  { value: 'meeting_room', label: 'Meeting room' },
  { value: 'office', label: 'Office' },
];

const emptyForm = (): FormState => ({
  name: '',
  building: '',
  floor: '',
  capacity: '0',
  roomType: 'classroom',
  isActive: true,
});

export default function ClassroomsPage() {
  const [rows, setRows] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roomType, setRoomType] = useState('');
  const [status, setStatus] = useState('');

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/academic/classrooms');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load classrooms');
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load classrooms';
      setRows([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const list = useListQuery({
    items: rows as (RoomRow & Record<string, unknown>)[],
    searchKeys: ['name', 'building', 'roomType'],
    filterKey: `${roomType}|${status}`,
    filterFn: (row) =>
      (!roomType || row.roomType === roomType) &&
      (!status || (status === 'active' ? row.isActive : !row.isActive)),
  });

  const stats = useMemo(
    () => ({
      total: rows.length,
      capacity: rows.reduce((sum, row) => sum + row.capacity, 0),
      scheduled: rows.filter((row) => row.lessons > 0).length,
      inactive: rows.filter((row) => !row.isActive).length,
    }),
    [rows]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (row: RoomRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      building: row.building ?? '',
      floor: row.floor === null ? '' : String(row.floor),
      capacity: String(row.capacity),
      roomType: row.roomType,
      isActive: row.isActive,
    });
    setFormError(null);
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!form.name.trim()) {
      setFormError('Room name is required');
      return;
    }
    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity < 0) {
      setFormError('Capacity must be zero or more');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/academic/classrooms', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity, id: editingId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save classroom');
      toast.success(editingId ? 'Classroom updated' : 'Classroom created');
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to save classroom');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageShell
        title="Classrooms"
        description="Rooms, labs, and halls available for timetabling, with their capacity."
        primaryAction={{ label: 'Add Room', onClick: openCreate }}
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Search room, building, or type…"
        onResetFilters={() => {
          list.reset();
          setRoomType('');
          setStatus('');
        }}
        filters={[
          {
            key: 'type',
            label: 'Room type',
            value: roomType,
            options: ROOM_TYPES,
            onChange: setRoomType,
          },
          {
            key: 'status',
            label: 'Status',
            value: status,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ],
            onChange: setStatus,
          },
        ]}
        loading={loading}
        columns={[
          {
            key: 'name',
            header: 'Room',
            render: (row) => (
              <div>
                <div className="font-semibold">{row.name}</div>
                <div className="text-xs text-muted-foreground">
                  {[row.building, row.floor !== null ? `Floor ${row.floor}` : null]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </div>
              </div>
            ),
          },
          {
            key: 'type',
            header: 'Type',
            render: (row) => (ROOM_TYPES.find((t) => t.value === row.roomType)?.label ?? row.roomType),
          },
          { key: 'capacity', header: 'Capacity', align: 'center', render: (row) => row.capacity },
          { key: 'lessons', header: 'Scheduled lessons', align: 'center', render: (row) => row.lessons },
          {
            key: 'status',
            header: 'Status',
            render: (row) => (
              <StatusChip
                label={row.isActive ? 'active' : 'inactive'}
                tone={statusToneFromValue(row.isActive ? 'active' : 'inactive')}
              />
            ),
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (row) => <RowActions onEdit={() => openEdit(row)} />,
          },
        ]}
        rows={list.rows as RoomRow[]}
        rowKey={(row) => row.id}
        page={list.page}
        perPage={list.perPage}
        total={list.total}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        emptyMessage="No rooms yet. Add a classroom, lab, or hall to start timetabling."
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Rooms" value={stats.total} accent="blue" />
          <StatCard label="Seats available" value={stats.capacity} accent="green" />
          <StatCard label="With lessons" value={stats.scheduled} accent="gold" />
          <StatCard label="Inactive rooms" value={stats.inactive} accent="purple" />
        </div>
        {error && <ErrorBanner message={error} />}
      </ListPageShell>

      <FormDialog
        open={open}
        title={editingId ? 'Edit Classroom' : 'Add Classroom'}
        onClose={() => setOpen(false)}
        footer={
          <FormDialogFooter
            onCancel={() => setOpen(false)}
            submitLabel={editingId ? 'Save changes' : 'Create room'}
            submitting={saving}
            formId="room-form"
          />
        }
      >
        <form id="room-form" onSubmit={submit} className="space-y-4">
          <InputField
            label="Room name"
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Room 101"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <InputField
              label="Building"
              value={form.building}
              onChange={(e) => setForm((prev) => ({ ...prev, building: e.target.value }))}
            />
            <InputField
              label="Floor"
              type="number"
              step="1"
              value={form.floor}
              onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))}
            />
            <InputField
              label="Capacity"
              type="number"
              min="0"
              step="1"
              value={form.capacity}
              onChange={(e) => setForm((prev) => ({ ...prev, capacity: e.target.value }))}
            />
          </div>
          <Dropdown
            label="Room type"
            required
            value={form.roomType}
            onChange={(value) => setForm((prev) => ({ ...prev, roomType: value }))}
            options={ROOM_TYPES}
          />
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
            Available for scheduling
          </label>
          {formError && <ErrorBanner message={formError} />}
        </form>
      </FormDialog>
    </>
  );
}
