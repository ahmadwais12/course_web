export type SocialRow = {
  id: string;
  platform: string;
  url: string;
  icon: string | null;
  display_order: number;
  status: 'active' | 'inactive';
  created_at: string | null;
  updated_at: string | null;
};

export const SOCIAL_PLATFORMS = [
  'Facebook',
  'Instagram',
  'X',
  'LinkedIn',
  'YouTube',
  'TikTok',
  'Telegram',
  'WhatsApp',
  'GitHub',
  'Discord',
  'Website',
] as const;

export function toSocialRow(row: Record<string, unknown>): SocialRow {
  return {
    id: String(row.id),
    platform: String(row.platform ?? ''),
    url: String(row.url ?? ''),
    icon: row.icon ? String(row.icon) : null,
    display_order: Number(row.display_order) || 0,
    status: row.is_active === false ? 'inactive' : 'active',
    created_at: row.created_at ? String(row.created_at) : null,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  };
}

/** Validate a social link body into a `social_media_links` payload, or return an error message. */
export function parseSocialLink(body: Record<string, unknown>) {
  const platform = String(body.platform ?? '').trim();
  const url = String(body.url ?? '').trim();
  if (!platform || !url) return { error: 'Platform and link are required' } as const;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { error: 'Link must be a full URL, e.g. https://facebook.com/your-page' } as const;
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { error: 'Link must start with http:// or https://' } as const;
  }

  return {
    payload: {
      platform,
      url: parsedUrl.toString(),
      icon: platform.toLowerCase(),
      display_order: Math.max(0, Math.round(Number(body.display_order) || 0)),
      is_active: body.status !== 'inactive',
    },
  } as const;
}
