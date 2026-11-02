'use client';

import { useEffect, useState } from 'react';
import { APP_NAME } from '@/lib/branding';

/**
 * Full-page splash on every hard load / refresh.
 * Root layout stays mounted during client navigations, so in-app routing does not replay it.
 */
export default function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fadeAt = reduce ? 400 : 2200;
    const removeAt = reduce ? 700 : 2900;
    const fadeTimer = window.setTimeout(() => setFading(true), fadeAt);
    const removeTimer = window.setTimeout(() => setRemoved(true), removeAt);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      aria-hidden={fading}
      className={`df-splash ${fading ? 'df-splash--out' : ''}`}
    >
      <div className="df-splash__glow df-splash__glow--one" />
      <div className="df-splash__glow df-splash__glow--two" />
      <div className="df-splash__glow df-splash__glow--three" />

      <div className="df-splash__stage">
        <div className="df-splash__copy">
          <p className="df-splash__kicker">Education Management</p>
          <h1>{APP_NAME}</h1>
          <p className="df-splash__tag">Courses, people, and operations in one flow</p>
        </div>

        <div className="df-splash__bar" role="progressbar" aria-label="Loading">
          <span />
        </div>
      </div>
    </div>
  );
}
