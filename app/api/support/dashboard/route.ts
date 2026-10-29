import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type TicketRow = {
  id: string;
  title: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  created_at: string | null;
};

type CallbackRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  topic: string | null;
  status: string | null;
  created_at: string | null;
};

type ContactRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  subject: string | null;
  status: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type SocialRow = {
  id: string;
  platform: string | null;
  is_active: boolean | null;
};

type PersonRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
};

function countBy(rows: { [key: string]: unknown }[], key: string) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[key];
    const value = typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : 'unknown';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function countByDate(rows: { created_at: string | null }[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = row.created_at?.slice(0, 10);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

const TREND_DAYS = 14;

function buildTrend(
  tickets: { created_at: string | null }[],
  callbacks: { created_at: string | null }[],
  messages: { created_at: string | null }[]
) {
  const ticketCounts = countByDate(tickets);
  const callbackCounts = countByDate(callbacks);
  const messageCounts = countByDate(messages);
  const days: string[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().slice(0, 10));
  }
  return days.map((date) => ({
    date,
    tickets: ticketCounts.get(date) ?? 0,
    callbacks: callbackCounts.get(date) ?? 0,
    messages: messageCounts.get(date) ?? 0,
  }));
}

export async function GET() {
  try {
    const supabase = await createClient();

    const [ticketsRes, callbacksRes, contactsRes, socialRes, peopleRes] = await Promise.all([
      supabase
        .from('support_tickets')
        .select('id, title, category, priority, status, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('callback_requests')
        .select('id, full_name, phone, topic, status, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('contact_messages')
        .select('id, full_name, email, subject, status, is_read, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('social_media_links')
        .select('id, platform, is_active')
        .order('display_order', { ascending: true })
        .limit(200),
      supabase
        .from('users')
        .select('id, full_name, email, role, is_active')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    const firstError =
      ticketsRes.error ||
      callbacksRes.error ||
      contactsRes.error ||
      socialRes.error ||
      peopleRes.error;
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }

    const tickets = (ticketsRes.data ?? []) as TicketRow[];
    const callbacks = (callbacksRes.data ?? []) as CallbackRow[];
    const contacts = (contactsRes.data ?? []) as ContactRow[];
    const socials = (socialRes.data ?? []) as SocialRow[];
    const people = (peopleRes.data ?? []) as PersonRow[];

    const openTickets = tickets.filter(
      (row) => !['resolved', 'closed'].includes((row.status ?? 'open').toLowerCase())
    ).length;
    const resolvedTickets = tickets.filter((row) =>
      ['resolved', 'closed'].includes((row.status ?? '').toLowerCase())
    ).length;
    const pendingCallbacks = callbacks.filter(
      (row) => !['completed', 'cancelled', 'done'].includes((row.status ?? 'pending').toLowerCase())
    ).length;
    const unreadMessages = contacts.filter((row) => row.is_read !== true).length;

    return NextResponse.json({
      tickets: {
        total: tickets.length,
        open: openTickets,
        resolved: resolvedTickets,
        byStatus: countBy(tickets as unknown as { [key: string]: unknown }[], 'status'),
        byPriority: countBy(tickets as unknown as { [key: string]: unknown }[], 'priority'),
        byCategory: countBy(tickets as unknown as { [key: string]: unknown }[], 'category'),
        recent: tickets.slice(0, 5).map((row) => ({
          id: row.id,
          title: row.title,
          category: row.category,
          priority: row.priority ?? 'normal',
          status: row.status ?? 'open',
          created_at: row.created_at,
        })),
      },
      callbacks: {
        total: callbacks.length,
        pending: pendingCallbacks,
        byStatus: countBy(callbacks as unknown as { [key: string]: unknown }[], 'status'),
        recent: callbacks.slice(0, 5).map((row) => ({
          id: row.id,
          name: row.full_name,
          phone: row.phone,
          topic: row.topic,
          status: row.status ?? 'pending',
          created_at: row.created_at,
        })),
      },
      messages: {
        total: contacts.length,
        unread: unreadMessages,
        recent: contacts.slice(0, 5).map((row) => ({
          id: row.id,
          name: row.full_name,
          email: row.email,
          subject: row.subject,
          status: row.status ?? (row.is_read ? 'read' : 'new'),
          created_at: row.created_at,
        })),
      },
      social: {
        total: socials.length,
        active: socials.filter((row) => row.is_active !== false).length,
        channels: socials.map((row) => ({
          id: row.id,
          platform: row.platform,
          status: row.is_active === false ? 'inactive' : 'active',
        })),
      },
      trend: buildTrend(tickets, callbacks, contacts),
      people: people.map((row) => ({
        id: row.id,
        name: row.full_name?.trim() || row.email || 'Unnamed user',
        email: row.email,
        role: row.role ?? 'user',
        status: row.is_active === false ? 'inactive' : 'active',
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load support overview';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
