import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { verificationOptions } from '@/lib/verification-store';
import { listAssets } from '@/lib/asset-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const [storeOptions, assets, branchesResult, officersResult] = await Promise.all([
      verificationOptions(),
      listAssets({}),
      access.access.admin
        .from('tenants')
        .select('id, name, city, country, organization_type, is_active')
        .eq('organization_type', 'branch')
        .order('name'),
      access.access.admin.from('users').select('id, full_name, email, role, is_active').order('full_name'),
    ]);

    const uniq = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
    const assetDepartments = assets.map((asset) => asset.department || '');
    const assetLocations = assets.map((asset) => asset.location || '');
    const assetProvinces = assets.map((asset) => asset.province || '');
    const assetCategories = assets.map((asset) => asset.category_name || '');

    const branchRows = ((branchesResult.data ?? []) as {
      id: string;
      name: string;
      city?: string | null;
      country?: string | null;
      is_active?: boolean | null;
    }[]).filter((row) => row.is_active !== false);

    const officers = ((officersResult.data ?? []) as {
      id: string;
      full_name?: string | null;
      email?: string | null;
      role?: string | null;
      is_active?: boolean | null;
    }[])
      .filter((row) => row.is_active !== false)
      .map((row) => ({
        value: row.id,
        label: row.full_name?.trim() || row.email || row.id,
        role: row.role ?? '',
      }));

    return NextResponse.json({
      ...storeOptions,
      me: {
        id: access.access.actor.userId,
        name: access.access.actor.name,
        role: access.access.actor.role,
        manager: access.access.actor.manager,
      },
      branches: branchRows.map((row) => ({
        id: row.id,
        name: row.name,
        country: row.country ?? '',
        province: row.city ?? '',
      })),
      officers,
      departments: uniq([...assetDepartments, ...storeOptions.departments.map((row) => row.value)]).map((name) => ({
        value: name,
        label: name,
      })),
      locations: uniq([...assetLocations, ...assetProvinces]).map((name) => ({ value: name, label: name })),
      provinces: uniq([...assetProvinces, ...branchRows.map((row) => row.city ?? '')]).map((name) => ({
        value: name,
        label: name,
      })),
      categories: uniq([...assetCategories, ...storeOptions.categories.map((row) => row.value)]).map((name) => ({
        value: name,
        label: name,
      })),
      countries: uniq([...storeOptions.countries.map((row) => row.value), ...branchRows.map((row) => row.country ?? '')]).map(
        (name) => ({ value: name, label: name })
      ),
    });
  } catch (error) {
    return verificationError(error);
  }
}
