'use client';

import { useRouter } from 'next/navigation';
import { PortButton } from '@/components/ports';

export default function SignInAction() {
  const router = useRouter();
  return (
    <PortButton variant="secondary" onClick={() => router.push('/login')}>
      Sign in
    </PortButton>
  );
}
