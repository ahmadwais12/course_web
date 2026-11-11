import { NextResponse } from 'next/server';
import { loadPublicSettings, PUBLIC_UNAVAILABLE_MESSAGE } from '@/lib/ai/guest';
import { aiErrorResponse } from '@/lib/ai/http';
import type { AIModule } from '@/lib/ai/modules';
import { isProviderConfigured } from '@/lib/ai/providers';
import { getSuggestions } from '@/lib/ai/suggestions';

export const dynamic = 'force-dynamic';

const PUBLIC_MODULES: AIModule[] = ['platform_support'];

/** Guest availability — depends only on the platform switch and the provider key. */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang');
    const language = lang === 'dr' || lang === 'ps' ? lang : 'en';
    const settings = await loadPublicSettings();
    const available = settings.enabled && isProviderConfigured(settings.provider);
    return NextResponse.json({
      available,
      message: available ? null : PUBLIC_UNAVAILABLE_MESSAGE,
      suggestions: available ? getSuggestions(PUBLIC_MODULES, language) : [],
    });
  } catch (error) {
    return aiErrorResponse(error, 'ai/public/status');
  }
}
