'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { MachineStatus } from '@bowling-machine/api-contracts';
import type { ConnectMachineResult, ControlLockResult, MachineSummary } from '@/lib/api/client';
import { DEFAULT_PRACTICE_SETUP, type PracticeSetupState } from '@/lib/practice/setup-state';

/** Practice workflow state shared across connect → setup → session pages. */
export type PracticeContextValue = {
  selectedMachine: MachineSummary | ConnectMachineResult | null;
  setSelectedMachine: (machine: MachineSummary | ConnectMachineResult | null) => void;
  controlLock: ControlLockResult | null;
  setControlLock: (lock: ControlLockResult | null) => void;
  liveMachineStatus: MachineStatus | null;
  setLiveMachineStatus: (status: MachineStatus | null) => void;
  activeSessionId: string | null;
  setActiveSessionId: (sessionId: string | null) => void;
  /** Delivery configuration — preserved while navigating within the practice flow. */
  setupState: PracticeSetupState;
  setSetupState: (state: PracticeSetupState) => void;
  updateSetupState: (patch: Partial<PracticeSetupState>) => void;
  clearPracticeState: () => void;
};

const PracticeContext = createContext<PracticeContextValue | null>(null);

export function PracticeProvider({ children }: { children: ReactNode }) {
  const [selectedMachine, setSelectedMachine] = useState<
    MachineSummary | ConnectMachineResult | null
  >(null);
  const [controlLock, setControlLock] = useState<ControlLockResult | null>(null);
  const [liveMachineStatus, setLiveMachineStatus] = useState<MachineStatus | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [setupState, setSetupState] = useState<PracticeSetupState>(DEFAULT_PRACTICE_SETUP);

  const updateSetupState = useCallback((patch: Partial<PracticeSetupState>) => {
    setSetupState((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearPracticeState = useCallback(() => {
    setSelectedMachine(null);
    setControlLock(null);
    setLiveMachineStatus(null);
    setActiveSessionId(null);
    setSetupState(DEFAULT_PRACTICE_SETUP);
  }, []);

  const value = useMemo(
    () => ({
      selectedMachine,
      setSelectedMachine,
      controlLock,
      setControlLock,
      liveMachineStatus,
      setLiveMachineStatus,
      activeSessionId,
      setActiveSessionId,
      setupState,
      setSetupState,
      updateSetupState,
      clearPracticeState,
    }),
    [
      selectedMachine,
      controlLock,
      liveMachineStatus,
      activeSessionId,
      setupState,
      updateSetupState,
      clearPracticeState,
    ],
  );

  return <PracticeContext.Provider value={value}>{children}</PracticeContext.Provider>;
}

export function usePracticeContext(): PracticeContextValue {
  const ctx = useContext(PracticeContext);
  if (!ctx) {
    throw new Error('usePracticeContext must be used within PracticeProvider');
  }
  return ctx;
}
