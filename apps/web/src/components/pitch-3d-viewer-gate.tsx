'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Lazily loads the Three.js / R3F 3D pitch viewer so the 2D practice UI
 * stays interactive immediately and the heavier WebGL bundle loads later.
 */
const Pitch3DViewerLazy = dynamic(
  () => import('@/components/pitch-3d-viewer').then((mod) => mod.Pitch3DViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
        <LoadingSpinner label="Loading 3D pitch" />
      </div>
    ),
  },
);

type Pitch3DViewerGateProps = {
  target: PitchTarget | null;
};

/**
 * Secondary, collapsed-by-default 3D visualization.
 * Keeps the practice page focused on the original 2D + controls layout.
 */
export function Pitch3DViewerGate({ target }: Pitch3DViewerGateProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-800">3D pitch view</h2>
          <p className="text-sm text-slate-600">Optional visualization — tap to rotate and zoom</p>
        </div>
        <span className="text-sm font-medium text-pitch-700">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open ? (
        <div className="border-t border-slate-200 p-4">
          <Pitch3DViewerLazy target={target} />
        </div>
      ) : null}
    </section>
  );
}
