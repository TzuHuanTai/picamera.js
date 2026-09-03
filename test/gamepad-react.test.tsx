// Renders the view, to catch what typechecking cannot: a bad element tree, an import that
// only breaks at runtime, or a control whose pressed state looks identical to its rest state.
import { renderToStaticMarkup } from 'react-dom/server';

import { GamepadSampler } from '../src/gamepad/sampler';
import { GamepadView } from '../src/gamepad/react/gamepad-view';
import { Button, toSnapshot } from '../src/gamepad/snapshot';
import { GamepadSnapshot } from '../src/gamepad/types';

let failures = 0;

function check(ok: boolean, what: string) {
  console.log((ok ? '  ok   ' : '  FAIL ') + what);
  if (!ok) {
    failures++;
  }
}

function pad(over: Record<string, unknown> = {}): Gamepad {
  return {
    id: 'Fake Pad', index: 0, connected: true, mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    timestamp: 0, vibrationActuator: null, ...over,
  } as unknown as Gamepad;
}

/** A sampler whose latest reading is fixed, so the view has something to draw. */
function seeded(snapshot: GamepadSnapshot | null): GamepadSampler {
  const sampler = new GamepadSampler();
  (sampler as unknown as { latest: GamepadSnapshot | null }).latest = snapshot;
  return sampler;
}

function render(snapshot: GamepadSnapshot | null, props = {}) {
  return renderToStaticMarkup(<GamepadView sampler={seeded(snapshot)} {...props} />);
}

function withPressed(...indices: number[]): GamepadSnapshot {
  const p = pad();
  const buttons = p.buttons as unknown as Array<{ pressed: boolean; value: number }>;
  for (const i of indices) {
    buttons[i] = { pressed: true, value: 1 };
  }
  return toSnapshot(p);
}

console.log('[1] renders with nothing connected');
{
  const html = render(null);
  check(html.startsWith('<svg'), 'produced an svg');
  check(html.includes('0.00, 0.00'), 'sticks read as centred');
  check(html.includes('aria-hidden="true"'), 'hidden from assistive tech by default');
}

console.log('[2] renders a live reading');
{
  const p = pad({ axes: [-1, 0.5, 0.25, -0.75] });
  (p.buttons as unknown as Array<{ pressed: boolean; value: number }>)[Button.Start] =
    { pressed: true, value: 1 };
  const html = render(toSnapshot(p), { activeColor: '#ABCDEF' });
  check(html.includes('-1.00, 0.50'), 'left stick readout');
  check(html.includes('0.25, -0.75'), 'right stick readout');
  check(html.includes('#ABCDEF'), 'the pressed button took the active colour');
}

console.log('[3] every button is visibly different when pressed');
{
  // The bug this covers: the stick markers took `stickColor` at rest and `activeColor` when
  // clicked, and both defaulted to the same green — so L3 and R3 pressed nothing visible.
  const rest = render(withPressed());
  const invisible: string[] = [];
  for (const [name, index] of Object.entries(Button)) {
    if (render(withPressed(index)) === rest) {
      invisible.push(`${name}(${index})`);
    }
  }
  check(invisible.length === 0,
        invisible.length ? `no visible change for: ${invisible.join(', ')}` :
                           'all 17 buttons change the rendered svg');
}

console.log('[4] a title makes it visible to assistive tech');
{
  const html = render(null, { title: 'Controller state' });
  check(html.includes('role="img"'), 'role is img');
  check(html.includes('aria-label="Controller state"'), 'and the label is carried');
  check(!html.includes('aria-hidden'), 'and it is no longer hidden');
}

console.log(failures === 0 ? '\nALL PASSED' : `\nFAILURES: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
