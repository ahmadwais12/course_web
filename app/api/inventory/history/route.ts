import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { listChanges, type ChangeEntity } from '@/lib/change-log';

const ENTITIES: ChangeEntity[] = ['asset', 'project', 'holder', 'settings'];

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const raw = new URL(request.url).searchParams.get('entity') ?? '';
    if (raw && !ENTITIES.includes(raw as ChangeEntity)) {
      return NextResponse.json({ error: 'Unknown history entity.' }, { status: 400 });
    }
    return NextResponse.json(listChanges((raw as ChangeEntity) || ''));
  } catch (error) {
    return inventoryError(error);
  }
}
