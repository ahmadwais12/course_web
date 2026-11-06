import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { InventoryError } from '@/lib/inventory-store';

export async function requireInventoryUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  return null;
}

export function inventoryError(error: unknown) {
  if (error instanceof InventoryError) {
    return NextResponse.json(
      { error: error.message, field: error.field ?? null },
      { status: error.status }
    );
  }
  const message = error instanceof Error ? error.message : 'Inventory request failed';
  return NextResponse.json({ error: message }, { status: 500 });
}
