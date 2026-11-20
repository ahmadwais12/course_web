import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireStaff } from '@/lib/system-access';
import { InventoryError } from '@/lib/inventory-store';
import type { VerificationActor } from '@/lib/verification-store';

const MANAGER_ROLES = new Set(['super_admin', 'ceo', 'admin', 'branch_manager', 'inventory_manager']);

export type VerificationAccess = {
  actor: VerificationActor;
  admin: SupabaseClient;
  tenantId: string | null;
};

export async function requireVerificationUser(): Promise<
  { ok: true; access: VerificationAccess } | { ok: false; response: NextResponse }
> {
  const staff = await requireStaff();
  if ('error' in staff) {
    return { ok: false, response: NextResponse.json({ error: staff.error }, { status: staff.status }) };
  }
  const { data: profile } = await staff.admin
    .from('users')
    .select('full_name, email')
    .eq('id', staff.user.id)
    .maybeSingle();
  const row = profile as { full_name?: string | null; email?: string | null } | null;
  return {
    ok: true,
    access: {
      actor: {
        userId: staff.user.id,
        name: row?.full_name?.trim() || row?.email || staff.user.email || 'Staff user',
        role: staff.role ?? '',
        manager: Boolean(staff.role && MANAGER_ROLES.has(staff.role)),
      },
      admin: staff.admin,
      tenantId: staff.tenantId,
    },
  };
}

export function requireVerificationManager(access: VerificationAccess) {
  if (!access.actor.manager) {
    return NextResponse.json({ error: 'Head office access required' }, { status: 403 });
  }
  return null;
}

export function verificationError(error: unknown) {
  if (error instanceof InventoryError) {
    return NextResponse.json({ error: error.message, field: error.field ?? null }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : 'Verification request failed';
  return NextResponse.json({ error: message }, { status: 500 });
}

export function stringParam(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value && value.trim() ? value.trim() : null;
}
