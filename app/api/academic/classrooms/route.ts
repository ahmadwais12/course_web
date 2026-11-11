import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { num, str } from '@/lib/portal-api';

type RoomRow = {
  id: string;
  name: string;
  building: string | null;
  floor: number | null;
  capacity: number | null;
  room_type: string | null;
  is_active: boolean | null;
};

type IdRow = { room_id: string | null };

export async function GET() {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const roomQuery = admin
      .from('rooms')
      .select('id, name, building, floor, capacity, room_type, is_active')
      .order('name', { ascending: true });
    const lessonQuery = admin.from('timetables').select('room_id');
    const [{ data: roomData, error }, { data: lessonData }] = await Promise.all([
      tenantId ? roomQuery.eq('tenant_id', tenantId) : roomQuery,
      tenantId ? lessonQuery.eq('tenant_id', tenantId) : lessonQuery,
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const usage = new Map<string, number>();
    for (const row of (lessonData ?? []) as IdRow[]) {
      if (row.room_id) usage.set(row.room_id, (usage.get(row.room_id) ?? 0) + 1);
    }

    return NextResponse.json({
      rows: ((roomData ?? []) as RoomRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        building: row.building,
        floor: row.floor,
        capacity: num(row.capacity),
        roomType: row.room_type ?? 'classroom',
        lessons: usage.get(row.id) ?? 0,
        isActive: row.is_active !== false,
      })),
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load classrooms');
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body.name ?? '').trim();
    const roomType = String(body.roomType ?? 'classroom');
    const capacity = Number(body.capacity ?? 0);
    const floor = body.floor === '' || body.floor === undefined ? null : Number(body.floor);

    if (!name) return NextResponse.json({ error: 'Room name is required' }, { status: 400 });
    if (!Number.isFinite(capacity) || capacity < 0) {
      return NextResponse.json({ error: 'Capacity must be zero or more' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data, error } = await admin
      .from('rooms')
      .insert({
        tenant_id: tenantId,
        name,
        building: str(body.building),
        floor: floor !== null && Number.isFinite(floor) ? floor : null,
        capacity,
        room_type: roomType,
        is_active: body.isActive !== false,
        created_at: now,
        updated_at: now,
      })
      .select('id')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: (data as { id: string } | null)?.id ?? null }, { status: 201 });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to create classroom');
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;
    const { admin, tenantId } = auth.session;

    const body = (await request.json()) as Record<string, unknown>;
    const id = str(body.id);
    if (!id) return NextResponse.json({ error: 'Room id is required' }, { status: 400 });

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.building === 'string') patch.building = body.building.trim() || null;
    if (body.floor !== undefined) {
      const floor = body.floor === '' ? null : Number(body.floor);
      patch.floor = floor !== null && Number.isFinite(floor) ? floor : null;
    }
    if (body.capacity !== undefined) {
      const capacity = Number(body.capacity);
      if (!Number.isFinite(capacity) || capacity < 0) {
        return NextResponse.json({ error: 'Capacity must be zero or more' }, { status: 400 });
      }
      patch.capacity = capacity;
    }
    if (typeof body.roomType === 'string' && body.roomType) patch.room_type = body.roomType;
    if (typeof body.isActive === 'boolean') patch.is_active = body.isActive;

    const update = admin.from('rooms').update(patch).eq('id', id);
    const { error } = await (tenantId ? update.eq('tenant_id', tenantId) : update);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to update classroom');
  }
}
