import { BanterLoader } from '@/components/ports';

/** Shown while any dashboard route segment is loading. */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center py-16">
      <BanterLoader label="Loading…" />
    </div>
  );
}
