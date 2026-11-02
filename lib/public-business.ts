import { cache } from 'react';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { BUSINESS_SELECT, withBusinessMeta, type BusinessRow } from '@/lib/business';
import { isReservedBusinessSlug } from '@/lib/business-url';

export type PublicBusiness = BusinessRow;

async function publicLookupClient() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return createClient();
  }
}

export const getPublicBusinessBySlug = cache(async (slug: string): Promise<PublicBusiness | null> => {
  const clean = slug.trim().toLowerCase();
  if (!clean || isReservedBusinessSlug(clean)) return null;

  const supabase = await publicLookupClient();
  const { data, error } = await supabase
    .from('tenants')
    .select(BUSINESS_SELECT)
    .eq('slug', clean)
    .eq('organization_type', 'central')
    .maybeSingle();

  if (error || !data) return null;
  const row = withBusinessMeta(data as BusinessRow);
  if (row.status !== 'active' || row.is_active === false) return null;
  return row;
});

export async function listPublicBusinessSlugs(): Promise<string[]> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('tenants')
      .select('slug, is_active, organization_type')
      .eq('organization_type', 'central')
      .eq('is_active', true)
      .limit(500);

    if (error || !data) return [];
    return data
      .map((row) => String(row.slug || '').toLowerCase())
      .filter((slug) => slug && !isReservedBusinessSlug(slug));
  } catch {
    return [];
  }
}
