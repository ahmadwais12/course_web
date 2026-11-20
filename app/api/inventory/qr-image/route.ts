import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { requireInventoryUser } from '@/lib/inventory-api';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const code = (params.get('code') ?? '').trim().slice(0, 200);
  if (!code) return NextResponse.json({ error: 'Code is required.' }, { status: 400 });
  const width = Math.min(1024, Math.max(120, Number(params.get('width')) || 320));
  try {
    const png = await QRCode.toBuffer(code, {
      type: 'png',
      width,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not build the QR image.' }, { status: 500 });
  }
}
