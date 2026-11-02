'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Mic, Paperclip, Send, Smile, Square, X } from 'lucide-react';
import { FormDialog, InputField, PortButton } from '@/components/ports';
import { toast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😴',
  '😭', '😡', '👍', '👎', '🙏', '👏', '🔥', '❤️', '💙', '🎉',
  '✅', '📌', '📷', '📄', '📞', '🎵', '💡', '⭐', '🤝', '👋',
];

export type ReplyDraft = {
  id: string;
  name: string;
  text: string;
};

type MentionMember = { id: string; name: string };

type ChatComposerProps = {
  name: string;
  value: string;
  sending?: boolean;
  blocked?: boolean;
  reply?: ReplyDraft | null;
  mentionMembers?: MentionMember[];
  onChange: (value: string) => void;
  onSend: () => void;
  onAttach: (file: File, kind: 'image' | 'file') => void;
  onVoice: (file: File) => void;
  onPoll?: () => void;
  onUnblock?: () => void;
  onCancelReply?: () => void;
  onTyping?: (typing: boolean) => void;
};

export default function ChatComposer({
  name,
  value,
  sending,
  blocked,
  reply,
  mentionMembers = [],
  onChange,
  onSend,
  onAttach,
  onVoice,
  onPoll,
  onUnblock,
  onCancelReply,
  onTyping,
}: ChatComposerProps) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const imageRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelRef = useRef(false);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) {
      setRecordSeconds(0);
      return;
    }
    const timer = window.setInterval(() => setRecordSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim() || sending || blocked) return;
    onSend();
  }

  const mentionNeedle = useMemo(() => {
    const match = value.match(/(?:^|\s)@([^\s@]*)$/);
    return match ? match[1].toLowerCase() : null;
  }, [value]);

  const mentionMatches = useMemo(() => {
    if (mentionNeedle === null) return [];
    return mentionMembers
      .filter((member) => member.name.toLowerCase().includes(mentionNeedle))
      .slice(0, 6);
  }, [mentionMembers, mentionNeedle]);

  useEffect(() => {
    setMentionOpen(Boolean(mentionMatches.length));
  }, [mentionMatches.length]);

  function insertMention(name: string) {
    onChange(value.replace(/(?:^|\s)@([^\s@]*)$/, (chunk) => `${chunk.startsWith(' ') ? ' ' : ''}@${name} `));
    setMentionOpen(false);
    emitTyping();
  }

  function emitTyping() {
    onTyping?.(true);
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => onTyping?.(false), 1500);
  }

  function takeFiles(files: FileList | File[] | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const kind = file.type.startsWith('image/') || file.type.startsWith('video/') ? 'image' : 'file';
      onAttach(file, kind);
    });
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelRef.current = false;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelRef.current) return;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        onVoice(file);
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      toast.error('Microphone permission is required for voice messages');
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    mediaRef.current = null;
    setRecording(false);
  }

  function cancelRecording() {
    cancelRef.current = true;
    stopRecording();
  }

  return (
    <div
      className={cn('relative', dragOver && 'ring-2 ring-primary/40')}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        takeFiles(event.dataTransfer.files);
      }}
    >
      {blocked && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          <span className="flex-1">You blocked this contact. Unblock to send messages.</span>
          {onUnblock && (
            <PortButton variant="secondary" className="h-8" onClick={onUnblock}>
              Unblock
            </PortButton>
          )}
        </div>
      )}
      {reply && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
          <div className="min-w-0 flex-1 border-s-2 border-primary ps-2">
            <p className="m-0 text-[11px] font-semibold text-primary">{reply.name}</p>
            <p className="m-0 truncate text-xs text-muted-foreground">{reply.text}</p>
          </div>
          <PortButton variant="ghost" className="h-8 w-8 px-0" onClick={onCancelReply} aria-label="Cancel reply">
            <X size={14} />
          </PortButton>
        </div>
      )}
      {recording && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-destructive" />
          Recording {Math.floor(recordSeconds / 60)}:{String(recordSeconds % 60).padStart(2, '0')}
          <span className="flex-1" />
          <PortButton variant="ghost" className="h-8" onClick={cancelRecording}>
            Cancel
          </PortButton>
        </div>
      )}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-1 bg-transparent px-2 py-2 sm:px-3">
        <PortButton
          variant="ghost"
          className="h-11 w-11 shrink-0 px-0"
          aria-label="Attach"
          disabled={blocked}
          onClick={() => setAttachOpen(true)}
        >
          <Paperclip size={18} />
        </PortButton>
        <div className="relative">
          <PortButton
            variant="ghost"
            className="h-11 w-11 shrink-0 px-0"
            aria-label="Emoji"
            disabled={blocked}
            onClick={() => setEmojiOpen((open) => !open)}
          >
            <Smile size={18} />
          </PortButton>
          {emojiOpen && (
            <div className="absolute bottom-12 start-0 z-20 grid w-[220px] grid-cols-6 gap-1 rounded-lg border border-border bg-popover p-2 shadow-lg">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="h-8 rounded-md text-lg hover:bg-muted"
                  onClick={() => {
                    onChange(`${value}${emoji}`);
                    setEmojiOpen(false);
                    emitTyping();
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <InputField
          name="message"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            emitTyping();
          }}
          onPaste={(event) => {
            const files = event.clipboardData?.files;
            if (files && files.length) {
              event.preventDefault();
              takeFiles(files);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={4000}
          placeholder={blocked ? 'Unblock to send a message' : reply ? 'Reply…' : 'Type a message'}
          className="h-11 rounded-full"
          containerClassName="min-w-0 flex-1 relative"
          disabled={sending || recording || blocked}
          autoComplete="off"
          aria-label={`Message ${name}`}
        />
        {mentionOpen && mentionMatches.length > 0 && (
          <div className="absolute bottom-14 start-24 z-20 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {mentionMatches.map((member) => (
              <button
                key={member.id}
                type="button"
                className="block w-full px-3 py-2 text-start text-sm hover:bg-muted"
                onClick={() => insertMention(member.name)}
              >
                @{member.name}
              </button>
            ))}
          </div>
        )}
        {value.trim() ? (
          <PortButton
            type="submit"
            variant="primary"
            className="h-11 w-11 shrink-0 rounded-full px-0"
            disabled={sending || blocked}
            aria-label="Send message"
          >
            <Send size={16} />
          </PortButton>
        ) : (
          <PortButton
            variant={recording ? 'danger' : 'primary'}
            className="h-11 w-11 shrink-0 rounded-full px-0"
            onClick={recording ? stopRecording : startRecording}
            disabled={blocked}
            aria-label={recording ? 'Stop recording' : 'Record voice message'}
          >
            {recording ? <Square size={14} /> : <Mic size={16} />}
          </PortButton>
        )}
      </form>

      <input
        ref={imageRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = '';
        }}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = '';
        }}
      />

      <FormDialog open={attachOpen} title="Attach" onClose={() => setAttachOpen(false)}>
        <div className="grid gap-2 sm:grid-cols-3">
          <PortButton
            variant="secondary"
            onClick={() => {
              setAttachOpen(false);
              imageRef.current?.click();
            }}
          >
            Photos & videos
          </PortButton>
          <PortButton
            variant="secondary"
            onClick={() => {
              setAttachOpen(false);
              cameraRef.current?.click();
            }}
          >
            <Camera size={16} /> Camera
          </PortButton>
          <PortButton
            variant="secondary"
            onClick={() => {
              setAttachOpen(false);
              fileRef.current?.click();
            }}
          >
            Document
          </PortButton>
          {onPoll && (
            <PortButton
              variant="secondary"
              onClick={() => {
                setAttachOpen(false);
                onPoll();
              }}
            >
              Poll
            </PortButton>
          )}
        </div>
      </FormDialog>
    </div>
  );
}
