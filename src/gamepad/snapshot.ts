import { GamepadSnapshot } from './types';

/** Standard-mapping button indices. */
export const Button = {
  A: 0,
  B: 1,
  X: 2,
  Y: 3,
  LB: 4,
  RB: 5,
  LT: 6,
  RT: 7,
  Back: 8,
  Start: 9,
  L3: 10,
  R3: 11,
  DPadUp: 12,
  DPadDown: 13,
  DPadLeft: 14,
  DPadRight: 15,
  Guide: 16,
} as const;

export type ButtonName = keyof typeof Button;

/** Whether bit `index` is set in a snapshot's button field. */
export function isPressed(snapshot: GamepadSnapshot | null, index: number): boolean {
  return snapshot !== null && (snapshot.buttons & (1 << index)) !== 0;
}

/** Copies a browser `Gamepad` into a plain snapshot. */
export function toSnapshot(gamepad: Gamepad): GamepadSnapshot {
  const axis = (index: number) => gamepad.axes[index] ?? 0;
  const value = (index: number) => gamepad.buttons[index]?.value ?? 0;

  // >>> 0 because bit 31 would go negative, and the field is a uint32.
  let buttons = 0;
  const count = Math.min(gamepad.buttons.length, 32);
  for (let i = 0; i < count; i++) {
    if (gamepad.buttons[i]?.pressed) {
      buttons = (buttons | (1 << i)) >>> 0;
    }
  }

  return {
    leftX: axis(0),
    leftY: axis(1),
    rightX: axis(2),
    rightY: axis(3),
    // Trigger travel is the button's own value; axes 4/5 are not part of the mapping.
    leftTrigger: value(Button.LT),
    rightTrigger: value(Button.RT),
    buttons,
    standardMapping: gamepad.mapping === 'standard',
    id: gamepad.id,
    index: gamepad.index,
  };
}

/** True when the two readings would drive the hardware identically. */
export function sameSnapshot(a: GamepadSnapshot | null, b: GamepadSnapshot | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.index === b.index &&
    a.buttons === b.buttons &&
    a.leftX === b.leftX &&
    a.leftY === b.leftY &&
    a.rightX === b.rightX &&
    a.rightY === b.rightY &&
    a.leftTrigger === b.leftTrigger &&
    a.rightTrigger === b.rightTrigger &&
    a.standardMapping === b.standardMapping
  );
}
