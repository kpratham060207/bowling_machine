'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import dynamic from 'next/dynamic';
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
      <section className="card flex h-64 items-center justify-center sm:h-80">
        <LoadingSpinner label="Loading 3D pitch" />
      </section>
    ),
  },
);

type Pitch3DViewerGateProps = {
  target: PitchTarget | null;
};

/** Client gate used by the practice setup page for progressive 3D loading. */
export function Pitch3DViewerGate({ target }: Pitch3DViewerGateProps) {
  return <Pitch3DViewerLazy target={target} />;
}
