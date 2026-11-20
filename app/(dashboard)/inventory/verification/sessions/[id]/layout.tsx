import type { Metadata } from 'next';
import { privateAppPageMetadata } from '@/lib/seo';

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return privateAppPageMetadata(
    'Verification Session Workspace',
    'Inspect expected assets, scan codes, record results, upload evidence, and submit a branch verification session.',
    `/inventory/verification/sessions/${id}`
  );
}

export default function PageSeoLayout({ children }: Props) {
  return children;
}
