const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|semrush|ahrefs|pingdom|uptime|monitor|wget|curl|python-requests|scrapy/i;

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || userAgent.length < 8) return true;
  return BOT_UA.test(userAgent);
}

export function detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'unknown' {
  const ua = userAgent.toLowerCase();
  if (!ua) return 'unknown';
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/.test(ua)) return 'mobile';
  return 'desktop';
}

export function detectBrowser(userAgent: string): string {
  const ua = userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  if (/Firefox\//.test(ua)) return 'Firefox';
  return 'Other';
}

export function detectOs(userAgent: string): string {
  const ua = userAgent;
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

export type TrafficAttribution = {
  source: string;
  medium: string;
  campaign: string | null;
  term: string | null;
  content: string | null;
};

const SOCIAL_HOSTS = [
  'facebook.com',
  'fb.com',
  'instagram.com',
  't.co',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
  'tiktok.com',
  'pinterest.com',
  'reddit.com',
];

const SEARCH_HOSTS = [
  'google.',
  'bing.com',
  'yahoo.',
  'duckduckgo.com',
  'baidu.com',
  'yandex.',
];

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** First-touch attribution for a session (do not overwrite mid-session). */
export function classifyTraffic(input: {
  referrer: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
}): TrafficAttribution {
  const campaign = input.utm_campaign?.trim() || null;
  const term = input.utm_term?.trim() || null;
  const content = input.utm_content?.trim() || null;

  if (input.utm_source || input.utm_medium) {
    const source = (input.utm_source || 'unknown').toLowerCase();
    const medium = (input.utm_medium || 'unknown').toLowerCase();
    return { source, medium, campaign, term, content };
  }

  const host = hostOf(input.referrer);
  if (!host) {
    return { source: 'direct', medium: 'none', campaign, term, content };
  }

  if (SEARCH_HOSTS.some((s) => host.includes(s))) {
    const source = host.includes('google')
      ? 'google'
      : host.includes('bing')
        ? 'bing'
        : host.includes('yahoo')
          ? 'yahoo'
          : host.includes('duckduckgo')
            ? 'duckduckgo'
            : 'search';
    return { source, medium: 'organic', campaign, term, content };
  }

  if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`))) {
    return { source: host, medium: 'social', campaign, term, content };
  }

  return { source: host, medium: 'referral', campaign, term, content };
}

/** Analytics surface: browser ('web') or Flutter mobile app ('app'). */
export type AnalyticsSurface = 'web' | 'app';

export function normalizeSurface(value: unknown): AnalyticsSurface {
  return value === 'app' ? 'app' : 'web';
}

export function isInternalPath(path: string): boolean {
  const p = path.split('?')[0] || '/';
  if (p === '/' || p === '/login') return false;
  if (p.startsWith('/api')) return true;
  const appPrefixes = [
    '/dashboard',
    '/courses',
    '/students',
    '/attendance',
    '/payments',
    '/salaries',
    '/reports',
    '/books',
    '/feedback',
    '/grades',
    '/observers',
    '/ports',
    '/settings',
    '/users',
  ];
  return appPrefixes.some((x) => p === x || p.startsWith(`${x}/`));
}

export function sourceCategory(medium: string | null | undefined, source: string | null | undefined): string {
  const m = (medium || '').toLowerCase();
  const s = (source || '').toLowerCase();
  if (m === 'organic' || (m === 'none' && s === 'direct')) {
    if (m === 'organic') return 'Organic Search';
  }
  if (!m || m === 'none') return s === 'direct' ? 'Direct' : 'Other';
  if (m === 'organic') return 'Organic Search';
  if (m === 'social') return 'Social';
  if (m === 'referral') return 'Referral';
  if (m === 'email') return 'Email';
  if (m === 'cpc' || m === 'ppc' || m === 'paid') return 'Paid Search';
  if (m === 'paid_social') return 'Paid Social';
  return 'Other';
}
