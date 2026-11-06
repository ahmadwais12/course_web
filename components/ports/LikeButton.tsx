'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

type LikeButtonProps = {
  /** Current total, including the viewer's own like when `liked` is true. */
  count: number;
  /** Controlled state. Omit to let the button manage it with `defaultLiked`. */
  liked?: boolean;
  defaultLiked?: boolean;
  onLikedChange?: (liked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
};

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/** Heart toggle with a sliding counter. */
export default function LikeButton({
  count,
  liked,
  defaultLiked = false,
  onLikedChange,
  label = 'Likes',
  disabled,
  className,
}: LikeButtonProps) {
  const [innerLiked, setInnerLiked] = useState(defaultLiked);
  const isControlled = liked !== undefined;
  const isLiked = isControlled ? liked : innerLiked;

  const baseCount = Math.max(0, isLiked ? count - 1 : count);
  const likedCount = baseCount + 1;

  const toggle = () => {
    const next = !isLiked;
    if (!isControlled) setInnerLiked(next);
    onLikedChange?.(next);
  };

  return (
    <button
      type="button"
      aria-pressed={isLiked}
      disabled={disabled}
      onClick={toggle}
      className={cn('like-button', isLiked && 'is-liked', className)}
    >
      <span className="like-button__main">
        <svg className="like-button__icon" viewBox="0 0 24 24" aria-hidden>
          <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
        </svg>
        <span className="like-button__text">{label}</span>
      </span>
      <span className="like-button__count like-button__count--base" aria-hidden>
        {compact.format(baseCount)}
      </span>
      <span className="like-button__count like-button__count--liked" aria-hidden>
        {compact.format(likedCount)}
      </span>
      <span className="sr-only">, {isLiked ? likedCount : baseCount}</span>
    </button>
  );
}
