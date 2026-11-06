import { SvgFrameLoader } from '@/components/ports';

/** Root / public route loading — SVG frame loader for the homepage feel. */
export default function RootLoading() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#070b12]">
      <SvgFrameLoader label="Loading" />
    </div>
  );
}
