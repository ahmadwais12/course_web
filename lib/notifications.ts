export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type AppNotification = {
  id: string;
  tenant_id: string | null;
  user_id: string;
  title: string;
  message: string;
  type: string;
  priority: NotificationPriority;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
};

export function hydrateNotification(row: Record<string, unknown>): AppNotification {
  const message =
    String(row.message ?? row.body ?? '').trim() ||
    '';
  const priorityRaw = String(row.priority ?? 'normal').toLowerCase();
  const priority = (['low', 'normal', 'high', 'urgent'].includes(priorityRaw)
    ? priorityRaw
    : 'normal') as NotificationPriority;

  return {
    id: String(row.id),
    tenant_id: row.tenant_id ? String(row.tenant_id) : null,
    user_id: String(row.user_id),
    title: String(row.title ?? 'Notification'),
    message,
    type: String(row.type ?? 'general'),
    priority,
    is_read: Boolean(row.is_read),
    read_at: row.read_at ? String(row.read_at) : null,
    action_url: row.action_url ? String(row.action_url) : null,
    data:
      row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? (row.data as Record<string, unknown>)
        : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export function relativeTime(iso: string) {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
