'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageSquare, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import {
  ConfirmDialog,
  EmptyState,
  FormDialog,
  FormDialogFooter,
  InputField,
  PageHeader,
  PortButton,
  RowActions,
  SearchBar,
  SectionPanel,
} from '@/components/ports';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import AIChatPanel from '@/components/ai/AIChatPanel';
import { AI_STRINGS } from '@/components/ai/strings';
import { useAIChat, useAIStatus } from '@/components/ai/useAIChat';

type ConversationItem = { id: string; title: string; updated_at: string; message_count: number };

function AIAssistantInner() {
  const { lang } = useLanguage();
  const strings = AI_STRINGS[lang];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status, refresh: refreshStatus } = useAIStatus(lang);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [search, setSearch] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [renaming, setRenaming] = useState<ConversationItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<ConversationItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await fetch(`/api/ai/conversations?pageSize=50&search=${encodeURIComponent(search)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      setConversations(res.ok && json ? (json.data as ConversationItem[]) : []);
    } finally {
      setListLoading(false);
    }
  }, [search]);

  const chat = useAIChat({
    lang,
    pagePath: pathname,
    onSent: () => {
      void loadList();
      void refreshStatus();
    },
  });

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const activeParam = searchParams.get('c');
  const { loadConversation, reset, conversationId } = chat;
  useEffect(() => {
    if (activeParam && activeParam !== conversationId) void loadConversation(activeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParam]);

  useEffect(() => {
    if (conversationId && conversationId !== activeParam) router.replace(`/ai-assistant?c=${conversationId}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const startNew = () => {
    reset();
    router.replace('/ai-assistant', { scroll: false });
  };

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renaming || !renameValue.trim()) return;
    setBusy(true);
    await fetch(`/api/ai/conversations/${renaming.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: renameValue }),
    }).catch(() => undefined);
    setBusy(false);
    setRenaming(null);
    void loadList();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    await fetch(`/api/ai/conversations/${deleting.id}`, { method: 'DELETE' }).catch(() => undefined);
    setBusy(false);
    if (deleting.id === conversationId) startNew();
    setDeleting(null);
    void loadList();
  };

  const usage = status?.usage;

  return (
    <div className="flex h-full min-h-[560px] flex-col gap-4">
      <PageHeader
        title={strings.assistant}
        description={status?.scope ? `${strings.scope}: ${status.scope}` : strings.subtitle}
        pill={status ? (status.available ? 'Online' : 'Unavailable') : undefined}
        pillTone={status?.available ? 'live' : 'offline'}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {usage && (usage.dailyLimit !== null || usage.monthlyLimit !== null) && (
              <span className="text-xs text-muted-foreground">
                {strings.usage}: {usage.daily}
                {usage.dailyLimit !== null ? `/${usage.dailyLimit}` : ''} {strings.today} · {usage.monthly}
                {usage.monthlyLimit !== null ? `/${usage.monthlyLimit}` : ''} {strings.thisMonth}
              </span>
            )}
            {status?.canManageOrganization && (
              <PortButton variant="secondary" onClick={() => router.push('/ai-assistant/settings')}>
                <Settings size={15} />
                AI Settings
              </PortButton>
            )}
            <PortButton variant="primary" onClick={startNew}>
              <Plus size={15} />
              {strings.newChat}
            </PortButton>
          </div>
        }
      />

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SectionPanel title={strings.history} className="flex min-h-0 flex-col max-lg:max-h-72" bodyClassName="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <SearchBar value={search} onChange={setSearch} placeholder={strings.searchHistory} />
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {!listLoading && conversations.length === 0 && <EmptyState message={strings.noHistory} />}
            {conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-muted',
                  c.id === conversationId && 'bg-muted'
                )}
              >
                <button
                  type="button"
                  dir="auto"
                  onClick={() => router.replace(`/ai-assistant?c=${c.id}`, { scroll: false })}
                  className="flex min-w-0 flex-1 items-center gap-2 text-start"
                >
                  <MessageSquare size={14} className="shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{c.title}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </span>
                  </span>
                </button>
                <RowActions
                  maxInline={0}
                  items={[
                    {
                      key: 'rename',
                      label: strings.rename,
                      icon: <Pencil size={14} />,
                      onClick: () => {
                        setRenaming(c);
                        setRenameValue(c.title);
                      },
                    },
                    {
                      key: 'delete',
                      label: strings.delete,
                      icon: <Trash2 size={14} />,
                      danger: true,
                      onClick: () => setDeleting(c),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel className="flex min-h-[480px] flex-col" bodyClassName="flex min-h-0 flex-1 flex-col p-0">
          <AIChatPanel chat={chat} status={status} strings={strings} className="flex-1" />
        </SectionPanel>
      </div>

      <FormDialog
        open={!!renaming}
        title={strings.renameTitle}
        onClose={() => setRenaming(null)}
        footer={
          <FormDialogFooter
            onCancel={() => setRenaming(null)}
            submitLabel={strings.save}
            submitting={busy}
            disabled={!renameValue.trim()}
            formId="ai-rename-form"
          />
        }
      >
        <form id="ai-rename-form" onSubmit={submitRename}>
          <InputField
            label={strings.title}
            value={renameValue}
            maxLength={120}
            dir="auto"
            onChange={(e) => setRenameValue(e.target.value)}
            required
          />
        </form>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        title={strings.deleteTitle}
        message={strings.deleteMessage}
        confirmLabel={strings.delete}
        submitting={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

export default function AIAssistantPage() {
  return (
    <Suspense fallback={null}>
      <AIAssistantInner />
    </Suspense>
  );
}
