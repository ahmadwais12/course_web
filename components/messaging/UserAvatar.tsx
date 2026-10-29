'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const AVATAR_TONES = [
  'bg-sky-400 text-sky-950',
  'bg-emerald-200 text-emerald-900',
  'bg-amber-200 text-amber-900',
  'bg-purple-200 text-purple-900',
  'bg-rose-200 text-rose-900',
  'bg-cyan-200 text-cyan-900',
];

function toneFor(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

type UserAvatarProps = {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export default function UserAvatar({ name, size = 'md', className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold',
        size === 'sm' && 'h-8 w-8 text-[11px]',
        size === 'md' && 'h-10 w-10 text-sm',
        size === 'lg' && 'h-12 w-12 text-base',
        toneFor(name),
        className
      )}
      aria-hidden
    >
      {initials(name) || '?'}
    </span>
  );
}
