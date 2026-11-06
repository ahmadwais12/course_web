import ModulePlaceholder from '@/components/ModulePlaceholder';
import { plannedModuleParams } from '@/lib/sidebar-nav';

export const dynamicParams = false;

export function generateStaticParams() {
  return plannedModuleParams('/finance');
}

type Props = { params: Promise<{ slug: string }> };

export default async function FinanceModulePage({ params }: Props) {
  const { slug } = await params;
  return <ModulePlaceholder path={`/finance/${slug}`} />;
}
