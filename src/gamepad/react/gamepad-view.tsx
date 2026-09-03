import { useEffect, useState } from 'react';

import { GamepadSampler } from '../sampler';
import { Button, isPressed, sameSnapshot } from '../snapshot';
import { GamepadSnapshot } from '../types';

export interface GamepadViewProps {
  /** The sampler to follow. Subscribed here, so only this component re-renders. */
  sampler: GamepadSampler;
  width?: number | string;
  height?: number | string;
  /** Fill and stroke of a control that is being pressed. */
  activeColor?: string;
  /** Fill of a control at rest. */
  idleColor?: string;
  /** Outline of every control. */
  strokeColor?: string;
  /** The line from centre to the stick position. */
  stickColor?: string;
  /** The stick position marker at rest. Must differ from `activeColor`, which it takes when
   *  the stick is clicked (L3 / R3) — otherwise the click is invisible. */
  markerColor?: string;
  labelColor?: string;
  /** Hidden from assistive tech unless set: it mirrors a control already in the user's hands. */
  title?: string;
}

const EMPTY: GamepadSnapshot = {
  leftX: 0,
  leftY: 0,
  rightX: 0,
  rightY: 0,
  leftTrigger: 0,
  rightTrigger: 0,
  buttons: 0,
  standardMapping: true,
  id: '',
  index: -1,
};

/** A quarter of the D-pad / face-button rosette, rotated into place. */
const WEDGE = {
  up: 'M0,0 L-0.7071,-0.7071 A1,1 0 0,1 0.7071,-0.7071 Z',
  down: 'M0,0 L0.7071,0.7071 A1,1 0 0,1 -0.7071,0.7071 Z',
  left: 'M0,0 L-0.7071,0.7071 A1,1 0 0,1 -0.7071,-0.7071 Z',
  right: 'M0,0 L0.7071,-0.7071 A1,1 0 0,1 0.7071,0.7071 Z',
};

const TRIGGER = 'M1.4 1.8C1.4 2 1.3 2.1 1.1 2.1H.4C.2 2.1 0 2 0 1.8V.7C0 .3.3 0 .7 0 1.1 0 1.4.3 1.4.7V1.8Z';

/**
 * Draws the live state of a gamepad. Readings are held here, not by the caller, so a moving
 * stick re-renders this component and nothing above it.
 */
export function GamepadView({
  sampler,
  width = 256,
  height = 128,
  activeColor = '#10B981',
  idleColor = 'rgba(127,127,127,0.12)',
  strokeColor = '#6B7280',
  stickColor = '#10B981',
  markerColor = '#EF4444',
  labelColor = 'currentColor',
  title,
}: GamepadViewProps) {
  const [snapshot, setSnapshot] = useState<GamepadSnapshot | null>(sampler.snapshot);

  useEffect(
    () => sampler.onSnapshot((next) => {
      setSnapshot((previous) => (sameSnapshot(previous, next) ? previous : next));
    }),
    [sampler],
  );

  const state = snapshot ?? EMPTY;
  const down = (index: number) => isPressed(state, index);

  // The sticks travel a little past their circle, the way the original did.
  const lx = (state.leftX * 1.2).toFixed(2);
  const ly = (state.leftY * 1.2).toFixed(2);
  const rx = (state.rightX * 1.2).toFixed(2);
  const ry = (state.rightY * 1.2).toFixed(2);

  const fill = (pressed: boolean) => (pressed ? activeColor : idleColor);
  const wedge = (path: string, index: number) => (
    <path d={path} fill={fill(down(index))} stroke={strokeColor} strokeWidth="0.02" />
  );

  return (
    <svg
      viewBox="-2.2 -2.2 8.8 4.4"
      width={width}
      height={height}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <g transform="translate(-2 -2) scale(0.4, 0.4)">
        <path
          d={TRIGGER}
          // Shades with travel, not just pressed.
          fill={down(Button.LT) ? activeColor : idleColor}
          fillOpacity={down(Button.LT) ? Math.max(state.leftTrigger, 0.15) : 1}
          stroke={down(Button.LT) ? activeColor : strokeColor}
          strokeWidth="0.04"
        />
        <rect
          x="-0.1" y="2.5" width="1.7" height="0.5" rx="0.25"
          fill={fill(down(Button.LB))}
          stroke={down(Button.LB) ? activeColor : strokeColor}
          strokeWidth="0.04"
        />
      </g>

      <g>
        {wedge(WEDGE.up, Button.DPadUp)}
        {wedge(WEDGE.down, Button.DPadDown)}
        {wedge(WEDGE.left, Button.DPadLeft)}
        {wedge(WEDGE.right, Button.DPadRight)}
      </g>

      <g>
        <text textAnchor="middle" fill={labelColor} x="0" y="-1.5" fontSize="0.4">
          {state.leftTrigger.toFixed(2)}
        </text>
        <circle cx="0" cy="0" r="1" fill="none" stroke={strokeColor} strokeWidth="0.02" />
        <line x1="0" y1="0" x2={lx} y2={ly} stroke={stickColor} strokeWidth="0.05" />
        <circle cx={lx} cy={ly} r="0.2" fill={down(Button.L3) ? activeColor : markerColor} />
        <text textAnchor="middle" fill={labelColor} x="0" y="1.8" fontSize="0.4">
          {state.leftX.toFixed(2)}, {state.leftY.toFixed(2)}
        </text>
      </g>

      <g transform="translate(5.8 -2) scale(0.4, 0.4)">
        <path
          d={TRIGGER}
          fill={down(Button.RT) ? activeColor : idleColor}
          fillOpacity={down(Button.RT) ? Math.max(state.rightTrigger, 0.15) : 1}
          stroke={down(Button.RT) ? activeColor : strokeColor}
          strokeWidth="0.04"
        />
        <rect
          x="-0.1" y="2.5" width="1.7" height="0.5" rx="0.25"
          fill={fill(down(Button.RB))}
          stroke={down(Button.RB) ? activeColor : strokeColor}
          strokeWidth="0.04"
        />
      </g>

      <g transform="translate(4.4 0)">
        {wedge(WEDGE.down, Button.A)}
        {wedge(WEDGE.right, Button.B)}
        {wedge(WEDGE.left, Button.X)}
        {wedge(WEDGE.up, Button.Y)}
      </g>

      <g transform="translate(4.4 0)">
        <text textAnchor="middle" fill={labelColor} x="0" y="-1.5" fontSize="0.4">
          {state.rightTrigger.toFixed(2)}
        </text>
        <line x1="0" y1="0" x2={rx} y2={ry} stroke={stickColor} strokeWidth="0.05" />
        <circle cx={rx} cy={ry} r="0.2" fill={down(Button.R3) ? activeColor : markerColor} />
        <text textAnchor="middle" fill={labelColor} x="0" y="1.8" fontSize="0.4">
          {state.rightX.toFixed(2)}, {state.rightY.toFixed(2)}
        </text>
      </g>

      <circle
        cx="1.5" cy="-1.5" r="0.3"
        fill={fill(down(Button.Back))} stroke={strokeColor} strokeWidth="0.02"
      />
      {/* Guide sits between Back and Start, and a little larger, as it does on the hardware. */}
      <circle
        cx="2.2" cy="-1.5" r="0.35"
        fill={fill(down(Button.Guide))} stroke={strokeColor} strokeWidth="0.02"
      />
      <circle
        cx="2.9" cy="-1.5" r="0.3"
        fill={fill(down(Button.Start))} stroke={strokeColor} strokeWidth="0.02"
      />
    </svg>
  );
}
