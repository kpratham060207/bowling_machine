'use client';

import type { PitchTarget } from '@bowling-machine/api-contracts';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import {
  BOWLING_LENGTH_ZONES,
  CRICKET_PITCH_LENGTH_M,
  getBowlingLengthFromTarget,
} from '@/lib/pitch/bowling-length';

/** Standard pitch strip width (~10 ft) — UI visualization only, not machine geometry. */
const PITCH_WIDTH_M = 3.05;
const OUTFIELD_SIZE_M = 28;

type Pitch3DSceneProps = {
  target: PitchTarget | null;
};

/**
 * Converts normalized target coordinates into 3D scene metres.
 * X: left (−) → right (+). Z: bowler (−) → batter (+).
 * Matches the 2D convention where target_y=0 is bowler and target_y=1 is batter.
 */
function targetToWorldPosition(target: PitchTarget): [number, number, number] {
  const x = (target.target_x - 0.5) * PITCH_WIDTH_M;
  const z = (target.target_y - 0.5) * CRICKET_PITCH_LENGTH_M;
  return [x, 0.08, z];
}

function Stumps({ z }: { z: number }) {
  const offsets = [-0.11, 0, 0.11];
  return (
    <group position={[0, 0, z]}>
      {offsets.map((ox) => (
        <mesh key={ox} position={[ox, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.022, 0.72, 10]} />
          <meshStandardMaterial color="#f5f5f4" />
        </mesh>
      ))}
      <mesh position={[0, 0.73, 0]}>
        <boxGeometry args={[0.28, 0.03, 0.03]} />
        <meshStandardMaterial color="#e7e5e4" />
      </mesh>
    </group>
  );
}

function CreaseLine({ z, width }: { z: number; width: number }) {
  return (
    <mesh position={[0, 0.021, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, 0.06]} />
      <meshStandardMaterial color="#f8fafc" transparent opacity={0.9} />
    </mesh>
  );
}

function LengthZoneBands() {
  return (
    <group>
      {BOWLING_LENGTH_ZONES.map((zone) => {
        // Zone measured from batter (+Z end). Convert to centred Z span.
        const nearBatterZ = CRICKET_PITCH_LENGTH_M / 2 - zone.minDistanceFromBatterM;
        const nearBowlerZ = CRICKET_PITCH_LENGTH_M / 2 - zone.maxDistanceFromBatterM;
        const centreZ = (nearBatterZ + nearBowlerZ) / 2;
        const depth = Math.abs(nearBatterZ - nearBowlerZ);

        return (
          <mesh key={zone.category} position={[0, 0.025, centreZ]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[PITCH_WIDTH_M * 0.96, depth]} />
            <meshStandardMaterial color={zone.solid} transparent opacity={0.32} />
          </mesh>
        );
      })}
    </group>
  );
}

function PitchScene({ target }: Pitch3DSceneProps) {
  const { invalidate } = useThree();
  const markerPosition = useMemo(() => (target ? targetToWorldPosition(target) : null), [target]);

  // Demand frameloop: redraw when the shared 2D target moves.
  useEffect(() => {
    invalidate();
  }, [target, invalidate]);

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Outfield grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[OUTFIELD_SIZE_M, OUTFIELD_SIZE_M]} />
        <meshStandardMaterial color="#2f6b32" />
      </mesh>

      {/* Pitch strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[PITCH_WIDTH_M, CRICKET_PITCH_LENGTH_M]} />
        <meshStandardMaterial color="#c9a86c" />
      </mesh>

      <LengthZoneBands />

      {/* Creases near each end */}
      <CreaseLine z={CRICKET_PITCH_LENGTH_M / 2 - 1.22} width={PITCH_WIDTH_M * 1.15} />
      <CreaseLine z={-(CRICKET_PITCH_LENGTH_M / 2 - 1.22)} width={PITCH_WIDTH_M * 1.15} />

      <Stumps z={CRICKET_PITCH_LENGTH_M / 2 - 0.35} />
      <Stumps z={-(CRICKET_PITCH_LENGTH_M / 2 - 0.35)} />

      {markerPosition ? (
        <group position={markerPosition}>
          <mesh>
            <sphereGeometry args={[0.16, 20, 20]} />
            <meshStandardMaterial color="#dc2626" emissive="#7f1d1d" emissiveIntensity={0.35} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <ringGeometry args={[0.22, 0.34, 32]} />
            <meshStandardMaterial color="#ef4444" transparent opacity={0.7} />
          </mesh>
        </group>
      ) : null}
    </>
  );
}

export type Pitch3DViewerProps = {
  /** Shared normalized target from the 2D pitch — visualization only. */
  target: PitchTarget | null;
};

/**
 * Interactive 3D pitch visualization.
 *
 * Rotatable / zoomable for spatial understanding. Does NOT modify target_x / target_y.
 * The 2D InteractivePitch remains the sole source of truth for selection.
 */
export function Pitch3DViewer({ target }: Pitch3DViewerProps) {
  // OrbitControls exposes reset(); avoid a hard dependency on three-stdlib types here.
  const controlsRef = useRef<{ reset: () => void } | null>(null);

  function resetCamera() {
    controlsRef.current?.reset();
  }

  const analysis = target ? getBowlingLengthFromTarget(target) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          Drag to rotate · scroll or pinch to zoom. Selection stays on the 2D pitch.
        </p>
        <button type="button" className="btn-secondary" onClick={resetCamera}>
          Reset view
        </button>
      </div>

      <div
        className="relative h-56 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-900 sm:h-64"
        role="img"
        aria-label={
          analysis
            ? `3D pitch visualization showing ${analysis.label} target`
            : '3D pitch visualization — no target selected yet'
        }
      >
        <Canvas
          shadows
          camera={{ position: [9, 10, 14], fov: 42, near: 0.1, far: 80 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, powerPreference: 'low-power' }}
          frameloop="demand"
        >
          <Suspense fallback={null}>
            <PitchScene target={target} />
            <OrbitControls
              ref={controlsRef as never}
              makeDefault
              enablePan={false}
              minDistance={8}
              maxDistance={28}
              maxPolarAngle={Math.PI / 2.15}
              target={[0, 0, 0]}
            />
          </Suspense>
        </Canvas>
      </div>

      <p className="text-xs text-slate-500">
        {analysis
          ? `Showing ${analysis.label} marker from the 2D selection.`
          : 'Select a target on the 2D pitch to place the 3D marker.'}
      </p>
    </div>
  );
}
