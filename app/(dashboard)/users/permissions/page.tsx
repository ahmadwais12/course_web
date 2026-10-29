'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import type { PermissionRow } from '@/lib/rbac';
import { cn } from '@/lib/utils';

export default function PermissionsPage() {
  const [items, setItems] = useState<PermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/permissions');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load permissions';
      setError(message);
      setItems([]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setError(null);
    setShowDialog(true);
  };

  const openEdit = (item: PermissionRow) => {
    setEditing(item);
    setName(item.name);
    setError(null);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditing(null);
    setName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(editing ? `/api/permissions/${editing.id}` : '/api/permissions', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      closeDialog();
      toast.success(editing ? 'Permission updated successfully' : 'Permission created successfully');
      await fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: PermissionRow) => {
    if (!confirm(`Delete permission "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/permissions/${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      toast.success(`Permission "${item.name}" deleted`);
      await fetchAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Permissions Management</h1>
          <p className="text-muted-foreground">Manage system permissions and access controls (KMS workflow).</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Permissions</h2>
              <p className="text-sm text-muted-foreground">Total: {items.length} permissions</p>
            </div>
            <button
              type="button"
              onClick={openAdd}
              className="emis-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold"
            >
              <Plus size={16} />
              Add Permission
            </button>
          </div>

          {loading ? (
            <div className="p-10 text-center text-muted-foreground font-medium">Loading permissions...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-6 py-3 font-bold">Name</th>
                    <th className="px-6 py-3 font-bold">Guard</th>
                    <th className="px-6 py-3 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/40">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        <span className="inline-flex items-center gap-2">
                          <KeyRound size={14} className="text-primary" />
                          {item.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{item.guard_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="p-2 rounded-lg border border-border hover:bg-muted text-foreground"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-2 rounded-lg border border-destructive/30 hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                        No permissions yet. Run <code className="text-xs bg-muted px-1 rounded">sql/rbac_kms_style.sql</code> or add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="emis-dialog bg-popover text-popover-foreground w-full max-w-md rounded-2xl p-6 border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">{editing ? 'Edit Permission' : 'Add New Permission'}</h3>
              <button type="button" onClick={closeDialog} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Permission Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Students, Add Vehicles, Team"
                  className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                />
                <p className="text-xs text-muted-foreground mt-1">Use Title Case names like KMS (page access or actions).</p>
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeDialog} className="px-4 py-2 rounded-xl border border-border hover:bg-muted">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn('emis-btn-primary rounded-xl px-4 py-2 font-bold disabled:opacity-50')}
                >
                  {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
