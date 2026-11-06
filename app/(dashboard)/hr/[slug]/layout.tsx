import type { Metadata } from 'next';
import { plannedModuleMetadata } from '@/lib/sidebar-nav';

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return plannedModuleMetadata(`/hr/${slug}`);
}

export default function PageSeoLayout({ children }: Props) {
  return children;
}
