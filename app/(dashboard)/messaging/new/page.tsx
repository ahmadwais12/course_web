'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import {
  Dropdown,
  ErrorBanner,
  FormDialog,
  FormDialogFooter,
  InputField,
  ListPageShell,
  MultiSelectField,
  RowActions,
  StatusChip,
  TextAreaField,
  statusToneFromValue,
} from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import UserAvatar from '@/components/messaging/UserAvatar';
import { useListQuery } from '@/hooks/useListQuery';
import { createClient } from '@/lib/supabase/client';
import {
  hydrateMessagingType,
  isDirectMessagingType,
  type MessagingTypeRow,
} from '@/lib/messaging-types';

type DirectoryUser = {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  status: string;
  is_active: boolean;
};

function usernameOf(user: Pick<DirectoryUser, 'full_name' | 'email' | 'username'>) {
  return user.username || user.full_name?.trim() || user.email || 'Unnamed user';
}

function formatRole(role: string | null) {
  if (!role) return '';
  return role.replace(/[_-]+/g, ' ');
}

export default function NewConversationPage() {
  const router = useRouter();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [messagingTypes, setMessagingTypes] = useState<MessagingTypeRow[]>([]);
  const [selectedTypeSlug, setSelectedTypeSlug] = useState('direct');

  const loadMessagingTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/messaging-types', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load messaging types');
      const items = (Array.isArray(data) ? data : [])
        .map((row) => hydrateMessagingType(row))
        .filter((item) => item.is_active);
      setMessagingTypes(items);
      const requested =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('type') : null;
      setSelectedTypeSlug((current) => {
        if (requested && items.some((item) => item.slug === requested)) return requested;
        if (current && items.some((item) => item.slug === current)) return current;
        return items.find((item) => item.slug === 'direct')?.slug || items[0]?.slug || 'direct';
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load messaging types');
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      const rows = (Array.isArray(data) ? data : []).map((row: Record<string, unknown>) => {
        const fullName = row.full_name ? String(row.full_name) : null;
        const email = row.email ? String(row.email) : null;
        const role = row.role_name ? String(row.role_name) : row.role ? String(row.role) : null;
        const isActive = row.is_active == null ? true : Boolean(row.is_active);
        return {
          id: String(row.id),
          username: fullName?.trim() || email || 'Unnamed user',
          full_name: fullName,
          email,
          phone: row.phone ? String(row.phone) : null,
          role,
          status: isActive ? 'active' : 'inactive',
          is_active: isActive,
        } satisfies DirectoryUser;
      });
      setUsers(rows);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setUsers([]);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    loadMessagingTypes();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, [loadUsers, loadMessagingTypes]);

  const directory = useMemo(
    () => users.filter((user) => user.id !== meId) as (DirectoryUser & Record<string, unknown>)[],
    [users, meId]
  );

  const isDirect = isDirectMessagingType(selectedTypeSlug);
  const selectedType =
    messagingTypes.find((item) => item.slug === selectedTypeSlug) || messagingTypes[0] || null;
  const typeLabel = selectedType?.name || (isDirect ? 'Direct' : 'Group');

  const typeOptions = useMemo(() => {
    const options = messagingTypes.map((item) => ({ value: item.slug, label: item.name }));
    if (options.length) return options;
    return [
      { value: 'direct', label: 'Direct' },
      { value: 'group', label: 'Group' },
    ];
  }, [messagingTypes]);

  const roleOptions = useMemo(() => {
    const roles = Array.from(new Set(directory.map((user) => formatRole(user.role)).filter(Boolean)));
    return roles.sort().map((role) => ({ value: role, label: role }));
  }, [directory]);

  const filterFn = useCallback(
    (item: DirectoryUser & Record<string, unknown>) => {
      if (statusFilter && item.status !== statusFilter) return false;
      if (roleFilter && formatRole(item.role) !== roleFilter) return false;
      return true;
    },
    [statusFilter, roleFilter]
  );

  const list = useListQuery({
    items: directory,
    searchKeys: ['username', 'full_name', 'email', 'phone', 'role', 'status'],
    initialPerPage: 10,
    filterKey: `${statusFilter}:${roleFilter}`,
    filterFn,
  });

  const userOptions = useMemo(
    () => directory.map((user) => ({ value: user.id, label: usernameOf(user) })),
    [directory]
  );

  function openCreate() {
    setNameError(null);
    setMembersError(null);
    setShowCreate(true);
  }

  function closeCreate() {
    if (creatingGroup) return;
    setShowCreate(false);
  }

  async function startDirect(userId: string) {
    if (startingId) return;
    setStartingId(userId);
    try {
      const res = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start conversation');
      router.push(`/messaging?c=${data.conversationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start conversation');
      setStartingId(null);
    }
  }

  async function createConversation(event?: React.FormEvent) {
    event?.preventDefault();
    if (creatingGroup || startingId) return;

    if (isDirect) {
      if (!selectedUserId) {
        setMembersError('Select a user');
        return;
      }
      setMembersError(null);
      setShowCreate(false);
      await startDirect(selectedUserId);
      return;
    }

    const name = groupName.trim();
    let invalid = false;
    if (!name) {
      setNameError(`${typeLabel} name is required`);
      invalid = true;
    } else {
      setNameError(null);
    }
    if (!memberIds.length) {
      setMembersError('Add at least one person');
      invalid = true;
    } else {
      setMembersError(null);
    }
    if (invalid) return;

    setCreatingGroup(true);
    try {
      const res = await fetch('/api/messaging/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: groupDescription.trim(),
          memberIds,
          type: selectedTypeSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to create ${typeLabel.toLowerCase()}`);
      toast.success(`${typeLabel} created`);
      router.push(`/messaging?c=${data.conversationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to create ${typeLabel.toLowerCase()}`);
      setCreatingGroup(false);
    }
  }

  return (
    <ListPageShell
      title="New conversation"
      description="Search users by username, then start a chat or add people to a group. Ten users load per page."
      primaryAction={{ label: 'Create', onClick: openCreate }}
      search={list.search}
      onSearchChange={list.setSearch}
      searchPlaceholder="Search by username, email, or role…"
      onResetFilters={() => {
        list.reset();
        setRoleFilter('');
        setStatusFilter('active');
      }}
      filters={[
        {
          key: 'role',
          label: 'Role',
          value: roleFilter,
          options: roleOptions,
          onChange: setRoleFilter,
        },
        {
          key: 'status',
          label: 'Status',
          value: statusFilter,
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
          onChange: setStatusFilter,
        },
      ]}
      loading={loading}
      columns={[
        {
          key: 'username',
          header: 'Username',
          render: (row) => (
            <span className="inline-flex items-center gap-2">
              <UserAvatar name={usernameOf(row)} size="sm" />
              <span className="font-semibold">{usernameOf(row)}</span>
            </span>
          ),
        },
        {
          key: 'email',
          header: 'Email',
          render: (row) => row.email || '—',
        },
        {
          key: 'phone',
          header: 'Phone',
          render: (row) => row.phone || '—',
        },
        {
          key: 'role',
          header: 'Role',
          render: (row) => {
            const role = formatRole(row.role);
            return role ? <StatusChip label={role} tone={statusToneFromValue(role)} /> : '—';
          },
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => <StatusChip label={row.status} tone={statusToneFromValue(row.status)} />,
        },
        {
          key: 'actions',
          header: 'Actions',
          align: 'right',
          render: (row) => (
            <RowActions
              maxInline={1}
              items={[
                {
                  key: 'message',
                  label: startingId === row.id ? 'Opening…' : 'Message',
                  icon: <MessageSquare size={14} />,
                  disabled: startingId !== null,
                  onClick: () => startDirect(row.id),
                },
              ]}
            />
          ),
        },
      ]}
      rows={list.rows as DirectoryUser[]}
      rowKey={(row) => row.id}
      page={list.page}
      perPage={list.perPage}
      total={list.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
      emptyMessage={
        list.search || roleFilter || statusFilter
          ? 'No users match this search or filter.'
          : 'There are no other users yet.'
      }
    >
      {error && <ErrorBanner message={error} />}

      <FormDialog
        open={showCreate}
        title={`Create ${typeLabel.toLowerCase()}`}
        onClose={closeCreate}
        maxWidth="lg"
        footer={
          <FormDialogFooter
            onCancel={closeCreate}
            submitLabel={creatingGroup || startingId ? 'Creating…' : `Create ${typeLabel.toLowerCase()}`}
            submitting={creatingGroup || Boolean(startingId)}
            formId="create-conversation-form"
          />
        }
      >
        <form id="create-conversation-form" onSubmit={createConversation} className="space-y-4">
          <Dropdown
            label="Messaging type"
            value={selectedTypeSlug}
            onChange={(value) => {
              setSelectedTypeSlug(value);
              setNameError(null);
              setMembersError(null);
            }}
            options={typeOptions}
          />
          {isDirect ? (
            <Dropdown
              label="User"
              value={selectedUserId}
              onChange={(value) => {
                setSelectedUserId(value);
                if (membersError) setMembersError(null);
              }}
              options={userOptions}
              placeholder="Search by username…"
              required
            />
          ) : (
            <>
              <InputField
                label={`${typeLabel} name`}
                name="name"
                required
                value={groupName}
                onChange={(event) => {
                  setGroupName(event.target.value);
                  if (nameError) setNameError(null);
                }}
                maxLength={120}
                placeholder={`e.g. Science ${typeLabel.toLowerCase()}`}
                error={nameError ?? undefined}
              />
              <TextAreaField
                label="Description (optional)"
                name="description"
                value={groupDescription}
                onChange={(event) => setGroupDescription(event.target.value)}
                maxLength={300}
                placeholder={`What is this ${typeLabel.toLowerCase()} about?`}
              />
              <MultiSelectField
                label="Members"
                required
                value={memberIds}
                onChange={(value) => {
                  setMemberIds(value);
                  if (value.length) setMembersError(null);
                }}
                options={userOptions}
                placeholder="Search usernames and add people"
                filterPlaceholder="Search by username…"
              />
            </>
          )}
          {membersError && <ErrorBanner message={membersError} />}
        </form>
      </FormDialog>
    </ListPageShell>
  );
}
