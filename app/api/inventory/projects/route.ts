import { NextResponse } from 'next/server';
import { listProjects, saveProject } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await listProjects(new URL(request.url).searchParams.get('q') ?? ''));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await saveProject(await request.json()), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
