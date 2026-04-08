import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VENDING_MACHINE_WORLD_POSITION } from '../officeLayout';
import { useGameStore } from '../store/useGameStore';
import type { DeskItem, FurnitureItem } from '../types';

export type OfficeTutorialPhase = 'desk' | 'vending';

const STORAGE_PREFIX = 'office_tutorial_v1:';

function tutorialStorageKey(email: string) {
  return `${STORAGE_PREFIX}${email}`;
}

export function isOfficeTutorialComplete(email: string | undefined): boolean {
  if (!email || typeof localStorage === 'undefined') return true;
  return localStorage.getItem(tutorialStorageKey(email)) === '1';
}

function markOfficeTutorialComplete(email: string) {
  localStorage.setItem(tutorialStorageKey(email), '1');
}

/** Returns world position of the desk owned by `email`, if present in the layout. */
function findMyDeskPosition(layout: FurnitureItem[], email: string): [number, number, number] | null {
  const id = `desk-${email}`;
  const item = layout.find((f): f is DeskItem => f.type === 'desk' && f.id === id);
  if (!item) return null;
  const [x, y, z] = item.position;
  return [x, y, z];
}

/**
 * First-visit path tutorial: desk (focus / reams) then vending machine.
 * Pauses while Pomodoro focus is active. Persists completion per email in localStorage.
 * Only active while `inRoom` is true (layout in the store may outlive the current room).
 */
export function useOfficeTutorial(email: string | undefined, inRoom: boolean) {
  const roomLayout = useGameStore((s) => s.roomLayout);
  const nearestDeskId = useGameStore((s) => s.nearestDeskId);
  const nearVendingMachine = useGameStore((s) => s.nearVendingMachine);
  const showVendingMenu = useGameStore((s) => s.showVendingMenu);
  const isTimerActive = useGameStore((s) => s.isTimerActive);

  const [phase, setPhase] = useState<OfficeTutorialPhase | null>(null);
  const openedVendingInStepRef = useRef(false);
  const prevPhaseRef = useRef<OfficeTutorialPhase | null>(null);

  const myDeskPosition = useMemo(
    () => (email ? findMyDeskPosition(roomLayout, email) : null),
    [email, roomLayout]
  );

  useEffect(() => {
    openedVendingInStepRef.current = false;
  }, [email]);

  useEffect(() => {
    if (!inRoom) {
      setPhase(null);
      return;
    }
    if (!email || isOfficeTutorialComplete(email)) {
      setPhase(null);
      return;
    }
    if (!myDeskPosition) {
      setPhase(null);
      return;
    }
    setPhase((prev) => {
      if (prev === 'vending') return prev;
      return 'desk';
    });
  }, [inRoom, email, myDeskPosition]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;
    if (prev !== 'vending' && phase === 'vending') {
      openedVendingInStepRef.current = false;
    }
  }, [phase]);

  useEffect(() => {
    if (phase === 'vending' && showVendingMenu) {
      openedVendingInStepRef.current = true;
    }
  }, [phase, showVendingMenu]);

  useEffect(() => {
    if (!email || phase !== 'desk') return;
    if (nearestDeskId === `desk-${email}`) {
      setPhase('vending');
    }
  }, [email, phase, nearestDeskId]);

  useEffect(() => {
    if (!email || phase !== 'vending') return;
    if (nearVendingMachine || openedVendingInStepRef.current) {
      markOfficeTutorialComplete(email);
      setPhase(null);
    }
  }, [email, phase, nearVendingMachine, showVendingMenu]);

  const skip = useCallback(() => {
    if (email) markOfficeTutorialComplete(email);
    setPhase(null);
  }, [email]);

  const visible = inRoom && phase !== null && !isTimerActive;
  const targetPosition: [number, number, number] | null =
    !visible || !phase
      ? null
      : phase === 'desk'
        ? myDeskPosition
        : [...VENDING_MACHINE_WORLD_POSITION] as [number, number, number];

  return {
    active: visible,
    phase: visible ? phase : null,
    targetPosition,
    skip,
  };
}
