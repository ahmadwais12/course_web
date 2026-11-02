'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SectionPanel } from '@/components/ports';
import ContactInfoPanel from '@/components/messaging/ContactInfoPanel';

export default function MessagingProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const conversationId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  if (!conversationId) {
    return (
      <SectionPanel>
        <p className="text-sm text-muted-foreground">Conversation not found.</p>
      </SectionPanel>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SectionPanel bodyClassName="h-full min-h-0 p-0" className="h-full overflow-hidden">
        <ContactInfoPanel
          conversationId={conversationId}
          variant="page"
          onClose={() => router.push(`/messaging?c=${conversationId}`)}
          onMessage={() => router.push(`/messaging?c=${conversationId}`)}
        />
      </SectionPanel>
    </div>
  );
}
