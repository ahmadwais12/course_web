'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Create Users is merged into User Management (/users) like KMS Add User modal. */
export default function CreateUsersRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/users');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      Redirecting to User Management...
    </div>
  );
}
