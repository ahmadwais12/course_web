'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  Copy,
  Download,
  FileText,
  Forward,
  Info,
  Pause,
  Pencil,
  Pin,
  Play,
  Reply,
  Star,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormDialog, PortButton, RowActions } from '@/components/ports';
import type { ChatMessage } from '@/lib/messaging';

const URL_RE = /https?:\/\/[^\s<>"']+/gi;
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function fileSizeLabel(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function waveformBars(seed: string) {
  const bars: number[] = [];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 33 + seed.charCodeAt(i)) >>> 0;
  for (let i = 0; i < 28; i += 1) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    bars.push(8 + (hash % 18));
  }
  return bars;
}

type MessageBubbleProps = {
  message: ChatMessage;
  mine: boolean;
  showSender?: boolean;
  starred?: boolean;
  memberCount?: number;
  currentUserId?: string | null;
  highlight?: boolean;
  pinned?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onStar?: () => void;
  onReply?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onDeleteForMe?: () => void;
  onEdit?: () => void;
  onForward?: () => void;
  onInfo?: () => void;
  onPin?: () => void;
  onDownload?: () => void;
  onSelect?: () => void;
  onReact?: (emoji: string) => void;
  onJumpReply?: (id: string) => void;
  onPollVote?: (index: number) => void;
  onOpenMedia?: () => void;
};

export default function MessageBubble({
  message,
  mine,
  showSender,
  starred,
  memberCount = 2,
  currentUserId,
  highlight,
  pinned,
  selectMode,
  selected,
  onStar,
  onReply,
  onCopy,
  onDelete,
  onDeleteForMe,
  onEdit,
  onForward,
  onInfo,
  onPin,
  onDownload,
  onSelect,
  onReact,
  onJumpReply,
  onPollVote,
  onOpenMedia,
}: MessageBubbleProps) {
  const [playing, setPlaying] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [voiceRate, setVoiceRate] = useState(1);
  const [pickerOpen, setPickerOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const links = useMemo(() => {
    const matches = message.content.match(URL_RE) ?? [];
    return matches.map((url) => url.replace(/[),.;]+$/, ''));
  }, [message.content]);
  const firstLink = links[0];
  const othersRead = message.readBy.filter((id) => id !== message.senderId).length;
  const read = mine && othersRead >= Math.max(1, memberCount - 1);
  const reactionEntries = Object.entries(message.reactions || {}).filter(([, ids]) => ids.length);

  function clearPress() {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pressOrigin.current = null;
  }

  function openPicker() {
    if (message.isDeleted || !onReact) return;
    suppressClick.current = true;
    setPickerOpen(true);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (message.isDeleted || selectMode || !onReact || event.button !== 0) return;
    pressOrigin.current = { x: event.clientX, y: event.clientY };
    pressTimer.current = window.setTimeout(() => {
      openPicker();
      pressTimer.current = null;
    }, 420);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pressOrigin.current) return;
    const dx = event.clientX - pressOrigin.current.x;
    const dy = event.clientY - pressOrigin.current.y;
    if (dx * dx + dy * dy > 64) clearPress();
  }

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (pickerRef.current?.contains(event.target as Node)) return;
      setPickerOpen(false);
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [pickerOpen]);

  useEffect(() => () => clearPress(), []);

  function toggleVoice() {
    const node = audioRef.current;
    if (!node) return;
    if (playing) {
      node.pause();
      setPlaying(false);
      return;
    }
    void node.play();
    setPlaying(true);
  }

  const actions = [
    onReply && { key: 'reply', label: 'Reply', icon: <Reply size={14} />, onClick: onReply },
    onCopy && { key: 'copy', label: 'Copy', icon: <Copy size={14} />, onClick: onCopy },
    onStar && {
      key: 'star',
      label: starred ? 'Remove star' : 'Star',
      icon: <Star size={14} />,
      onClick: onStar,
    },
    onForward && { key: 'forward', label: 'Forward', icon: <Forward size={14} />, onClick: onForward },
    onPin && {
      key: 'pin',
      label: pinned ? 'Unpin' : 'Pin',
      icon: <Pin size={14} />,
      onClick: onPin,
    },
    onDownload && message.fileUrl
      ? { key: 'download', label: 'Download', icon: <Download size={14} />, onClick: onDownload }
      : null,
    onInfo && { key: 'info', label: 'Info', icon: <Info size={14} />, onClick: onInfo },
    mine && onEdit && message.messageType === 'text' && !message.isDeleted && !message.poll
      ? { key: 'edit', label: 'Edit', icon: <Pencil size={14} />, onClick: onEdit }
      : null,
    onDeleteForMe && !message.isDeleted
      ? { key: 'hide', label: 'Delete for me', icon: <Trash2 size={14} />, onClick: onDeleteForMe }
      : null,
    mine && onDelete && !message.isDeleted
      ? { key: 'delete', label: 'Delete for everyone', icon: <Trash2 size={14} />, onClick: onDelete, danger: true }
      : null,
  ].filter(Boolean) as { key: string; label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];

  return (
    <>
      <div
        className={cn(
          'group relative flex max-w-[78%] items-end gap-2 overflow-visible sm:max-w-[65%]',
          highlight && 'ring-2 ring-primary/40 rounded-lg',
          selectMode && 'max-w-full'
        )}
      >
        {selectMode && (
          <button
            type="button"
            className={cn(
              'mb-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card'
            )}
            onClick={onSelect}
            aria-label={selected ? 'Deselect message' : 'Select message'}
          >
            {selected ? <Check size={12} /> : null}
          </button>
        )}
        <div className="relative min-w-0 flex-1 overflow-visible">
        <div
          className={cn(
            'select-none rounded-lg px-2.5 pb-1.5 pt-1.5 text-sm leading-relaxed shadow-sm touch-manipulation',
            message.isDeleted
              ? 'bg-muted italic text-muted-foreground'
              : mine
                ? 'rounded-br-sm bg-[#88b6ff] text-[#142033]'
                : 'rounded-bl-sm bg-card text-foreground'
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={clearPress}
          onPointerCancel={clearPress}
          onContextMenu={(event) => {
            if (message.isDeleted || !onReact) return;
            event.preventDefault();
            openPicker();
          }}
          onClickCapture={(event) => {
            if (!suppressClick.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }}
        >
          {showSender && !message.isDeleted && (
            <p className="mb-0.5 text-[11px] font-semibold text-primary">{message.senderName}</p>
          )}

          {message.isDeleted ? (
            <p className="mb-0">This message was deleted</p>
          ) : (
            <>
              {message.replyTo && (
                <button
                  type="button"
                  className="mb-1 w-full rounded-md border-s-2 border-current/40 bg-black/5 px-2 py-1 text-start"
                  onClick={() => message.replyTo && onJumpReply?.(message.replyTo)}
                >
                  <span className="block text-[11px] font-semibold">{message.replyName || 'Message'}</span>
                  <span className="block truncate text-[11px] opacity-80">{message.replyText}</span>
                </button>
              )}

              {message.messageType === 'image' && message.fileUrl && (
                <button
                  type="button"
                  className="mb-1 block overflow-hidden rounded-md"
                  onClick={() => (onOpenMedia ? onOpenMedia() : setPreviewOpen(true))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={message.fileUrl} alt={message.fileName || 'Photo'} className="max-h-64 w-full object-cover" />
                </button>
              )}

              {message.messageType === 'video' && message.fileUrl && (
                <video src={message.fileUrl} controls className="mb-1 max-h-64 w-full rounded-md" />
              )}

              {message.messageType === 'voice' && message.fileUrl && (
                <div className="mb-1 flex min-w-[220px] items-center gap-2">
                  <PortButton
                    variant={mine ? 'secondary' : 'primary'}
                    className="h-8 w-8 px-0"
                    onClick={toggleVoice}
                    aria-label={playing ? 'Pause voice message' : 'Play voice message'}
                  >
                    {playing ? <Pause size={14} /> : <Play size={14} />}
                  </PortButton>
                  <div className="flex h-8 flex-1 items-center gap-[2px]">
                    {waveformBars(message.id).map((height, index) => (
                      <span
                        key={`${message.id}-${index}`}
                        className={cn('w-[3px] rounded-full', mine ? 'bg-[#142033]/70' : 'bg-primary/70')}
                        style={{ height }}
                      />
                    ))}
                  </div>
                  <audio
                    ref={audioRef}
                    src={message.fileUrl}
                    onEnded={() => setPlaying(false)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    className="text-[11px] font-semibold"
                    onClick={() => {
                      const next = voiceRate === 1 ? 1.5 : voiceRate === 1.5 ? 2 : 1;
                      setVoiceRate(next);
                      if (audioRef.current) audioRef.current.playbackRate = next;
                    }}
                  >
                    {voiceRate}x
                  </button>
                </div>
              )}

              {message.messageType === 'file' && (
                <a
                  href={message.fileUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-1 flex items-center gap-2 rounded-md bg-black/5 px-2 py-2 no-underline"
                >
                  <FileText size={18} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{message.fileName || 'Document'}</span>
                    <span className="block text-[11px] opacity-70">{fileSizeLabel(message.fileSize)}</span>
                  </span>
                </a>
              )}

              {firstLink && message.messageType === 'text' && (
                <a
                  href={firstLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-1 block overflow-hidden rounded-md bg-black/5 no-underline"
                >
                  <span className="block px-2 py-2">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">
                      {hostnameOf(firstLink)}
                    </span>
                    <span className="block truncate text-xs">{firstLink}</span>
                  </span>
                </a>
              )}

              {message.poll && (
                <div className="mb-1 min-w-[220px]">
                  <p className="mb-2 text-sm font-semibold">{message.poll.question}</p>
                  <div className="space-y-1.5">
                    {message.poll.options.map((option, index) => {
                      const total = message.poll?.options.reduce((sum, item) => sum + item.votes.length, 0) || 0;
                      const mineVote = currentUserId ? option.votes.includes(currentUserId) : false;
                      const pct = total ? Math.round((option.votes.length / total) * 100) : 0;
                      return (
                        <button
                          key={`${message.id}-opt-${index}`}
                          type="button"
                          className={cn(
                            'relative block w-full overflow-hidden rounded-md border px-2 py-1.5 text-start text-sm',
                            mineVote ? 'border-current' : 'border-black/10'
                          )}
                          onClick={() => onPollVote?.(index)}
                        >
                          <span
                            className="absolute inset-y-0 start-0 bg-black/10"
                            style={{ width: `${pct}%` }}
                          />
                          <span className="relative flex items-center justify-between gap-2">
                            <span>{option.text}</span>
                            <span className="text-[11px] opacity-70">{pct}%</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {message.messageType === 'text' && !message.poll && (
                <p className="mb-0 whitespace-pre-wrap break-words">
                  {message.content.split(URL_RE).map((part, index) => (
                    <React.Fragment key={`${message.id}-t-${index}`}>
                      {part}
                      {links[index] && (
                        <a href={links[index]} target="_blank" rel="noreferrer" className="underline">
                          {links[index]}
                        </a>
                      )}
                    </React.Fragment>
                  ))}
                </p>
              )}
            </>
          )}

          <p
            className={cn(
              'mt-0.5 mb-0 flex items-center justify-end gap-1 text-[10px] leading-none',
              mine && !message.isDeleted ? 'text-[#142033]/70' : 'text-muted-foreground'
            )}
          >
            {pinned && <Pin size={10} />}
            {starred && <Star size={10} className="fill-current" />}
            {message.edited && !message.isDeleted && <span>edited</span>}
            {formatTime(message.createdAt)}
            {mine && !message.isDeleted && (read ? <CheckCheck size={12} /> : <Check size={12} />)}
          </p>
        </div>

        {!message.isDeleted && (
          <div
            ref={pickerRef}
            className={cn(
              'absolute top-full z-20 mt-1 w-fit flex-nowrap items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1 shadow-sm',
              pickerOpen ? 'inline-flex' : 'hidden group-hover:inline-flex',
              mine ? 'end-0' : 'start-0'
            )}
          >
            {onReact &&
              REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base hover:bg-muted',
                    currentUserId && message.reactions?.[emoji]?.includes(currentUserId) && 'bg-muted'
                  )}
                  aria-label={`React with ${emoji}`}
                  onClick={() => {
                    onReact(emoji);
                    setPickerOpen(false);
                  }}
                >
                  {emoji}
                </button>
              ))}
            <RowActions maxInline={0} items={actions} />
          </div>
        )}

        {reactionEntries.length > 0 && (
          <div className={cn('mt-0.5 flex flex-wrap gap-1', mine ? 'justify-end' : 'justify-start')}>
            {reactionEntries.map(([emoji, ids]) => (
              <button
                key={emoji}
                type="button"
                className={cn(
                  'rounded-full border border-border bg-card px-1.5 py-0.5 text-[11px]',
                  currentUserId && ids.includes(currentUserId) && 'border-primary'
                )}
                onClick={() => onReact?.(emoji)}
              >
                {emoji} {ids.length}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      <FormDialog open={previewOpen} title={message.fileName || 'Photo'} onClose={() => setPreviewOpen(false)}>
        {message.fileUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.fileUrl} alt={message.fileName || 'Photo'} className="max-h-[70vh] w-full object-contain" />
        ) : null}
      </FormDialog>
    </>
  );
}
