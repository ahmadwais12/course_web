'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorBanner, InputField, PageHeader, PortButton, SearchBar, SectionPanel } from '@/components/ports';
import { TextAreaField } from '@/components/ports/InputField';
import MultiSelect from '@/components/ui/MultiSelect';
import { toast } from '@/components/ui/Toast';
import UserAvatar from '@/components/messaging/UserAvatar';
import { createClient } from '@/lib/supabase/client';

type UserRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

export default function NewConversationPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);

  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [nameError, setNameError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load users');
      setUsers(Array.isArray(data) ? (data as UserRow[]) : []);
      setUsersError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users';
      setUsersError(message);
      toast.error(message);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setMeId(data.user?.id ?? null));
  }, [loadUsers]);

  const colleagues = useMemo(
    () => users.filter((user) => user.id !== meId && user.is_active !== false),
    [users, meId]
  );

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return colleagues;
    return colleagues.filter(
      (user) =>
        (user.full_name ?? '').toLowerCase().includes(needle) ||
        (user.email ?? '').toLowerCase().includes(needle) ||
        (user.role ?? '').toLowerCase().includes(needle)
    );
  }, [colleagues, query]);

  const memberOptions = useMemo(
    () =>
      colleagues.map((user) => ({
        value: user.id,
        label: user.email
          ? `${user.full_name || user.email} (${user.email})`
          : user.full_name || 'Unnamed user',
      })),
    [colleagues]
  );

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

  async function createGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creatingGroup) return;

    const name = groupName.trim();
    let invalid = false;
    if (!name) {
      setNameError('Group name is required');
      invalid = true;
    } else {
      setNameError(null);
    }
    if (!memberIds.length) {
      setMembersError('Select at least one member');
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create group');
      toast.success('Group created');
      router.push(`/messaging?c=${data.conversationId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create group');
      setCreatingGroup(false);
    }
  }

  return (
    <>
      <PageHeader
        title="New conversation"
        description="Message a colleague directly or start a group chat."
        actions={
          <PortButton variant="secondary" onClick={() => router.push('/messaging')}>
            <span className="inline-flex items-center gap-2">
              <ArrowLeft size={16} /> Back to messaging
            </span>
          </PortButton>
        }
      />

      <SectionPanel bodyClassName="p-0" className="max-w-3xl">
        <div className="border-b border-border p-3">
          <div className="grid grid-cols-2 gap-1 rounded-[9px] bg-muted p-1">
            <button
              type="button"
              onClick={() => setTab('direct')}
              className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-[7px] text-sm font-semibold transition-colors',
                tab === 'direct'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare size={15} /> Direct message
            </button>
            <button
              type="button"
              onClick={() => setTab('group')}
              className={cn(
                'inline-flex h-9 items-center justify-center gap-2 rounded-[7px] text-sm font-semibold transition-colors',
                tab === 'group'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users size={15} /> Group chat
            </button>
          </div>
        </div>

        {tab === 'direct' ? (
          <div>
            <div className="border-b border-border p-3">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search people by name, email, or role…"
              />
            </div>
            {usersError && (
              <div className="p-4">
                <ErrorBanner message={usersError} />
                <PortButton variant="secondary" className="mt-2" onClick={loadUsers}>
                  Retry
                </PortButton>
              </div>
            )}
            {usersLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading people…</p>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                message={
                  query ? 'No people match your search.' : 'There are no other active users yet.'
                }
              />
            ) : (
              <ul className="m-0 max-h-[420px] list-none overflow-y-auto p-0">
                {filteredUsers.map((user) => {
                  const name = user.full_name?.trim() || user.email || 'Unnamed user';
                  return (
                    <li
                      key={user.id}
                      className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
                    >
                      <UserAvatar name={name} />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-semibold text-foreground">{name}</p>
                        <p className="m-0 truncate text-xs text-muted-foreground">
                          {user.email || '—'}
                          {user.role ? ` · ${user.role}` : ''}
                        </p>
                      </div>
                      <PortButton
                        variant="secondary"
                        className="h-8 px-3 text-xs"
                        disabled={startingId !== null}
                        onClick={() => startDirect(user.id)}
                      >
                        {startingId === user.id ? 'Opening…' : 'Message'}
                      </PortButton>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <form onSubmit={createGroup} className="space-y-4 p-4 sm:p-5">
            <InputField
              label="Group name"
              name="name"
              required
              value={groupName}
              onChange={(event) => {
                setGroupName(event.target.value);
                if (nameError) setNameError(null);
              }}
              maxLength={120}
              placeholder="e.g. Science department"
              error={nameError ?? undefined}
            />

            <TextAreaField
              label="Description (optional)"
              name="description"
              value={groupDescription}
              onChange={(event) => setGroupDescription(event.target.value)}
              maxLength={300}
              placeholder="What is this group about?"
            />

            <div className="space-y-1.5">
              <span className="block text-sm font-medium text-foreground">
                Members <span className="text-destructive">*</span>
              </span>
              <MultiSelect
                value={memberIds}
                onChange={(value) => {
                  setMemberIds(value);
                  if (membersError) setMembersError(null);
                }}
                options={memberOptions}
                placeholder="Select members"
                filterPlaceholder="Search people…"
                loading={usersLoading}
                invalid={Boolean(membersError)}
              />
              {membersError ? (
                <p className="text-xs text-destructive">{membersError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You are added to the group automatically.
                  {memberIds.length > 0 && ` ${memberIds.length} selected.`}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <PortButton
                variant="ghost"
                onClick={() => router.push('/messaging')}
                disabled={creatingGroup}
              >
                Cancel
              </PortButton>
              <PortButton type="submit" variant="primary" disabled={creatingGroup}>
                {creatingGroup ? 'Creating…' : 'Create group'}
              </PortButton>
            </div>
          </form>
        )}
      </SectionPanel>
    </>
  );
}
