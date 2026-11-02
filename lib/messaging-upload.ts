import type { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { MAX_CHAT_FILE_BYTES, messageTypeFromMime, type ChatMessageType } from '@/lib/messaging';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

export async function uploadChatFile(
  admin: AdminClient,
  file: File,
  conversationId: string,
  userId: string
): Promise<{ url: string; messageType: ChatMessageType }> {
  if (file.size > MAX_CHAT_FILE_BYTES) {
    throw new Error('File must be 15MB or smaller');
  }

  const ext = (file.name.split('.').pop() || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
  const path = `chat/${conversationId}/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';

  let bucket = 'chat';
  const first = await admin.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
  if (first.error) {
    bucket = 'branding';
    const retry = await admin.storage.from(bucket).upload(path, bytes, { contentType, upsert: true });
    if (retry.error) throw new Error(retry.error.message);
  }

  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, messageType: messageTypeFromMime(contentType) };
}
