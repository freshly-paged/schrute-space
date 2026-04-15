import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CONFERENCE_ROOM_CENTER_WORLD_POSITION,
  EXIT_DOOR_WORLD_POSITION,
  OFFICE_PLAN_FRAME_WORLD_POSITION,
  VENDING_MACHINE_WORLD_POSITION,
  WATER_COOLER_WORLD_POSITION,
} from '../officeLayout';
import { useGameStore } from '../store/useGameStore';
import { PHASE_ORDER, type OfficeTutorialPhase } from '../tutorialCopy';
import type { DeskItem, FurnitureItem } from '../types';

export type { OfficeTutorialPhase };

const STORAGE_PREFIX = 'office_tutorial_v2:';

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

function findMyDeskPosition(layout: FurnitureItem[], email: string): [number, number, number] | null {
  const id = `desk-${email}`;
  const item = layout.find((f): f is DeskItem => f.type === 'desk' && f.id === id);
  if (!item) return null;
  return [...item.position] as [number, number, number];
}

function nextPhase(phase: OfficeTutorialPhase): OfficeTutorialPhase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return null;
  return PHASE_ORDER[idx + 1];
}

/**
 * Michael Scott-themed first-visit tutorial with 9 phases.
 * Manual phases (intro, focus-energy, leaderboard, exit) require Next button.
 * Auto phases advance when the player reaches the relevant landmark.
 * Persists completion per email in localStorage (key: office_tutorial_v2:<email>).
 * Pauses while Pomodoro focus timer is active.
 */
export function useOfficeTutorial(email: string | undefined, inRoom: boolean) {
  const roomLayout = useGameStore((s) => s.roomLayout);
  const nearestDeskId = useGameStore((s) => s.nearestDeskId);
  const nearVendingMachine = useGameStore((s) => s.nearVendingMachine);
  const showVendingMenu = useGameStore((s) => s.showVendingMenu);
  const nearWaterCooler = useGameStore((s) => s.nearWaterCooler);
  const showComputerInterface = useGameStore((s) => s.showComputerInterface);
  const requestCustomizeOffice = useGameStore((s) => s.requestCustomizeOffice);
  const showLeaderboard = useGameStore((s) => s.showLeaderboard);
  const requestExitRoom = useGameStore((s) => s.requestExitRoom);
  const isTimerActive = useGameStore((s) => s.isTimerActive);

  const [phase, setPhase] = useState<OfficeTutorialPhase | null>(null);

  // Guards against an auto-advance condition persisting into the next phase
  const triggeredRef = useRef(false);
  useEffect(() => {
    triggeredRef.current = false;
  }, [phase]);

  const myDeskPosition = useMemo(
    () => (email ? findMyDeskPosition(roomLayout, email) : null),
    [email, roomLayout]
  );

  // Initialise tutorial on room join
  useEffect(() => {
    if (!inRoom) { setPhase(null); return; }
    if (!email || isOfficeTutorialComplete(email)) { setPhase(null); return; }
    if (!myDeskPosition) { setPhase(null); return; }
    setPhase((prev) => prev ?? 'intro');
  }, [inRoom, email, myDeskPosition]);

  const advance = useCallback(() => {
    setPhase((prev) => {
      if (!prev) return null;
      const next = nextPhase(prev);
      if (!next && email) markOfficeTutorialComplete(email);
      return next;
    });
  }, [email]);

  const skip = useCallback(() => {
    if (email) markOfficeTutorialComplete(email);
    setPhase(null);
  }, [email]);

  // desk → focus-energy: near own desk
  useEffect(() => {
    if (phase !== 'desk' || !email) return;
    if (nearestDeskId === `desk-${email}`) advance();
  }, [phase, email, nearestDeskId, advance]);

  // upgrades → water-cooler: computer interface opened
  useEffect(() => {
    if (phase !== 'upgrades') return;
    if (showComputerInterface && !triggeredRef.current) {
      triggeredRef.current = true;
      advance();
    }
  }, [phase, showComputerInterface, advance]);

  // water-cooler → vending: near water cooler
  useEffect(() => {
    if (phase !== 'water-cooler') return;
    if (nearWaterCooler && !triggeredRef.current) {
      triggeredRef.current = true;
      advance();
    }
  }, [phase, nearWaterCooler, advance]);

  // vending → customize: near vending machine or opened vending menu
  useEffect(() => {
    if (phase !== 'vending') return;
    if ((nearVendingMachine || showVendingMenu) && !triggeredRef.current) {
      triggeredRef.current = true;
      advance();
    }
  }, [phase, nearVendingMachine, showVendingMenu, advance]);

  // customize → leaderboard: office customizer opened
  useEffect(() => {
    if (phase !== 'customize') return;
    if (requestCustomizeOffice && !triggeredRef.current) {
      triggeredRef.current = true;
      advance();
    }
  }, [phase, requestCustomizeOffice, advance]);

  // leaderboard → exit: leaderboard opened
  useEffect(() => {
    if (phase !== 'leaderboard') return;
    if (showLeaderboard && !triggeredRef.current) {
      triggeredRef.current = true;
      advance();
    }
  }, [phase, showLeaderboard, advance]);

  // exit → complete: exit door triggered
  useEffect(() => {
    if (phase !== 'exit') return;
    if (requestExitRoom) skip();
  }, [phase, requestExitRoom, skip]);

  const visible = inRoom && phase !== null && !isTimerActive;
  const currentPhase = visible ? phase : null;

  const targetPosition: [number, number, number] | null = (() => {
    if (!visible || !phase) return null;
    switch (phase) {
      case 'intro': return null;
      case 'desk': return myDeskPosition;
      case 'focus-energy': return myDeskPosition;
      case 'upgrades': return myDeskPosition;
      case 'water-cooler': return [...WATER_COOLER_WORLD_POSITION] as [number, number, number];
      case 'vending': return [...VENDING_MACHINE_WORLD_POSITION] as [number, number, number];
      case 'customize': return [...OFFICE_PLAN_FRAME_WORLD_POSITION] as [number, number, number];
      case 'leaderboard': return [...CONFERENCE_ROOM_CENTER_WORLD_POSITION] as [number, number, number];
      case 'exit': return [...EXIT_DOOR_WORLD_POSITION] as [number, number, number];
      default: return null;
    }
  })();

  return { active: visible, phase: currentPhase, targetPosition, advance, skip };
}
