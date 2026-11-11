import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'AI Assistant',
  description:
    'Ask the DreamFlow AI Assistant how the platform works — features, navigation, and setup answers from the documentation, no sign-in needed.',
  path: '/assistant',
  keywords: ['DreamFlow', 'AI assistant', 'help', 'documentation', 'EMIS'],
});

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
