import { Suspense } from 'react';
import TransfersPage from '@/components/inventory/TransfersPage';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TransfersPage />
    </Suspense>
  );
}
