'use client';

import { EmptyState, PageHeader, SectionPanel } from '@/components/ports';
import { useLanguage } from '@/context/LanguageContext';
import { findNavSection, findPlannedNavItem } from '@/lib/sidebar-nav';

/** Stand-in page for sidebar modules that are listed but not built yet. */
export default function ModulePlaceholder({ path }: { path: string }) {
  const { t, lang } = useLanguage();
  const item = findPlannedNavItem(path);
  const section = findNavSection(path);
  if (!item) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={item.label[lang]}
        description={item.description}
        pill={t.comingSoon}
        pillTone="neutral"
      />
      <SectionPanel title={section?.label[lang]}>
        <EmptyState message={t.moduleComingSoon} />
      </SectionPanel>
    </div>
  );
}
