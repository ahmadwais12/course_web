import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SocialRow = {
  id: string;
  platform: string | null;
  url: string | null;
  is_active: boolean | null;
  display_order: number | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('social_media_links')
      .select('id, platform, url, is_active, display_order')
      .order('display_order', { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      ((data ?? []) as SocialRow[]).map((row) => ({
        id: row.id,
        platform: row.platform,
        url: row.url,
        display_order: row.display_order ?? 0,
        status: row.is_active === false ? 'inactive' : 'active',
      }))
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch social channels';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
