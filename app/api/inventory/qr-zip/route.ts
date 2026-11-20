import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { buildQrZip } from '@/lib/inventory-tools';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;

  const type = new URL(request.url).searchParams.get('type') === 'items' ? 'items' : 'assets';
  try {
    const { buffer, count } = await buildQrZip(type);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${type}-qr-codes-${new Date()
          .toISOString()
          .slice(0, 10)}.zip"`,
        'X-Qr-Count': String(count),
      },
    });
  } catch (error) {
    return inventoryError(error);
  }
}
