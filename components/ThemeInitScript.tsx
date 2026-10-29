'use client';

import { useServerInsertedHTML } from 'next/navigation';

const themeInitScript = `(function(){try{var t=localStorage.getItem('emis-theme');var dark;if(t==='dark')dark=true;else if(t==='light')dark=false;else dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.classList.toggle('dark',dark);r.style.colorScheme=dark?'dark':'light';}catch(e){}})();`;

export default function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
  ));

  return null;
}
