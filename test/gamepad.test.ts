// Run with: npm test
//
// Covers the parts of the sampler that a hand-rolled gamepad page usually gets wrong: one loop
// however many pads arrive, no unguarded index reads, and a rate that does not depend on
// the display or on the tab being in front.

import { attachGamepad } from '../src/gamepad/attach';
import { GamepadSampler } from '../src/gamepad/sampler';
import { Button, isPressed, sameSnapshot, toSnapshot } from '../src/gamepad/snapshot';
import { InputReport } from '../src/proto/input';
import { GamepadSnapshot, IpcSink } from '../src/gamepad/types';

let failures = 0;

function check(ok: boolean, what: string) {
  console.log((ok ? '  ok   ' : '  FAIL ') + what);
  if (!ok) {
    failures++;
  }
}

// --- a browser stood up far enough for the sampler to run against ------------

interface Sent {
  data: Uint8Array;
  mode?: string;
  options?: { endpoint?: string; sequence?: number };
}

class RecordingSink implements IpcSink {
  readonly sent: Sent[] = [];
  /** Flip to model a link that comes up late, or goes away. */
  open = true;

  sendToEndpoint(data: Uint8Array, mode?: 'lossy' | 'reliable',
                 options?: { endpoint?: string; sequence?: number }) {
    this.sent.push({ data, mode, options });
  }

  canSend() {
    return this.open;
  }
}

function fakePad(over: Partial<Gamepad> & { buttons?: unknown[] } = {}): Gamepad {
  return {
    id: 'Fake Pad',
    index: 0,
    connected: true,
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })),
    timestamp: 0,
    vibrationActuator: null,
    ...over,
  } as unknown as Gamepad;
}

const listeners: Record<string, Array<(e: unknown) => void>> = {};
let pads: Array<Gamepad | null> = [];
let visibility = 'visible';

// Node 22 defines `navigator` itself, getter-only, so plain assignment throws.
function define(name: string, value: unknown) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
}

define('navigator', { getGamepads: () => pads });
(globalThis as any).window = {
  addEventListener: (type: string, fn: (e: unknown) => void) => {
    (listeners[type] ??= []).push(fn);
  },
  removeEventListener: (type: string, fn: (e: unknown) => void) => {
    listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
  },
};
define('document', {
  get visibilityState() { return visibility; },
  addEventListener: (globalThis as any).window.addEventListener,
  removeEventListener: (globalThis as any).window.removeEventListener,
});

function fire(type: string, event: unknown) {
  (listeners[type] ?? []).forEach((fn) => fn(event));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// --- snapshot ---------------------------------------------------------------

async function testSnapshot() {
  console.log('[1] a short report is read without throwing');
  const short = fakePad({
    axes: [0.5, -0.5],
    buttons: [{ pressed: true, touched: true, value: 1 }],
  });
  let snapshot: GamepadSnapshot | null = null;
  try {
    snapshot = toSnapshot(short);
    check(true, 'a 1-button / 2-axis pad produced a snapshot');
  } catch (e) {
    check(false, `threw: ${e}`);
  }
  check(snapshot?.leftX === 0.5, 'the axis it does report reads back');
  check(snapshot?.rightX === 0, 'a missing axis reads as centred');
  check(snapshot?.leftTrigger === 0, 'a missing trigger reads as released');
  check(isPressed(snapshot, Button.A), 'the button it does report reads back');
  check(!isPressed(snapshot, Button.Start), 'a missing button reads as released');

  console.log('[2] buttons become a bitfield');
  const pressed = fakePad();
  (pressed.buttons as any)[Button.Back] = { pressed: true, touched: true, value: 1 };
  (pressed.buttons as any)[Button.Start] = { pressed: true, touched: true, value: 1 };
  const bits = toSnapshot(pressed);
  check(bits.buttons === ((1 << 8) | (1 << 9)), `Back + Start is 0b1100000000 (${bits.buttons})`);

  console.log('[3] a non-standard mapping is carried, not hidden');
  check(toSnapshot(fakePad({ mapping: '' as GamepadMappingType })).standardMapping === false,
        'standardMapping is false when the browser could not place the pad');

  console.log('[4] sameSnapshot compares what drives the hardware');
  check(sameSnapshot(toSnapshot(fakePad()), toSnapshot(fakePad())), 'two rest readings match');
  check(!sameSnapshot(toSnapshot(fakePad()), bits), 'a pressed button does not match rest');
  check(sameSnapshot(null, null) && !sameSnapshot(null, bits), 'null compares sanely');
}

// --- sampler ----------------------------------------------------------------

async function testSampler() {
  console.log('[5] one loop, however many pads arrive');
  pads = [fakePad()];
  const sink = new RecordingSink();
  const sampler = new GamepadSampler({ sink, hz: 100 });

  sampler.start();
  sampler.start();  // idempotent: the page this replaces started a second loop here
  fire('gamepadconnected', { gamepad: pads[0] });
  await wait(120);

  const afterOne = sink.sent.length;
  check(afterOne > 0, `sampling produced messages (${afterOne} in ~120ms at 100Hz)`);
  check(afterOne < 40, 'and only one loop is running (a doubled loop would roughly double this)');

  console.log('[6] every message is addressed and sequenced');
  const first = sink.sent[0];
  check(first.mode === 'lossy', 'sent on the lossy channel');
  check(first.options?.endpoint === 'gamepad', "addressed to the 'gamepad' endpoint");
  check(first.options?.sequence === 1, 'sequence starts at 1, not 0');
  const sequences = sink.sent.map((s) => s.options?.sequence ?? 0);
  check(sequences.every((n, i) => i === 0 || n > sequences[i - 1]), 'and only ever increases');

  console.log('[7] the payload is an InputReport the device can read');
  const report = InputReport.decode(first.data);
  check(report.gamepad !== undefined, 'carries gamepad input');
  check(report.gamepad?.standardMapping === true, 'with the mapping flag set');
  check(report.sequence === 1, 'and its own sequence');
  check((report.timestamp?.monotonicNs ?? 0) > 0, 'and a monotonic timestamp');

  console.log('[8] hiding the document stops sending');
  const before = sink.sent.length;
  visibility = 'hidden';
  fire('visibilitychange', {});
  await wait(120);
  check(sink.sent.length === before, 'nothing was sent while hidden');
  check(!sampler.sampling, 'and the timer is actually stopped, not just quiet');

  visibility = 'visible';
  fire('visibilitychange', {});
  await wait(60);
  check(sink.sent.length > before, 'showing it again resumes');

  console.log('[9] a non-standard pad is not sent');
  const atNonStandard = sink.sent.length;
  const odd = new RecordingSink();
  pads = [fakePad({ mapping: '' as GamepadMappingType })];
  const oddSampler = new GamepadSampler({ sink: odd, hz: 100 });
  oddSampler.start();
  await wait(120);
  check(odd.sent.length === 0, 'nothing was sent for a pad outside the standard mapping');
  check(sink.sent.length === atNonStandard, 'and the already-running sampler stopped too');
  oddSampler.stop();

  console.log('[10] stop() ends it');
  // Back to a pad that would be sent, otherwise "nothing was sent" proves nothing.
  pads = [fakePad()];
  await wait(60);
  check(sink.sent.length > atNonStandard, 'a standard pad is being sent again');

  sampler.stop();
  const atStop = sink.sent.length;
  await wait(80);
  check(sink.sent.length === atStop, 'nothing is sent after stop()');
  check(!sampler.sampling, 'and the sampler reports itself stopped');

  pads = [];
}

async function testButtonEvents() {
  console.log('[11] button events fire on change only');
  pads = [fakePad()];
  const sampler = new GamepadSampler({ hz: 100 });   // no sink: local events must still work
  const seen: Array<{ index: number; pressed: boolean }> = [];
  const aPresses: boolean[] = [];

  sampler.onButtonChange((e) => seen.push({ index: e.index, pressed: e.pressed }));
  sampler.onButton(Button.A, (pressed) => aPresses.push(pressed));
  sampler.start();
  await wait(60);
  check(seen.length === 0, 'nothing fires while no button is touched');

  const press = (...indices: number[]) => {
    const p = fakePad();
    for (const i of indices) {
      (p.buttons as any)[i] = { pressed: true, touched: true, value: 1 };
    }
    pads = [p];
  };

  press(Button.A);
  await wait(60);
  check(seen.length === 1 && seen[0].index === Button.A && seen[0].pressed,
        'pressing A fires once, pressed=true');

  await wait(120);   // ~12 more ticks with A still held
  check(seen.length === 1, 'and does not repeat while held');

  press();           // release
  await wait(60);
  check(seen.length === 2 && !seen[1].pressed, 'releasing fires once, pressed=false');
  check(aPresses.join() === 'true,false', `onButton(A) saw exactly press then release (${aPresses})`);

  console.log('[12] two buttons at once are reported separately');
  seen.length = 0;
  press(Button.X, Button.Start);
  await wait(60);
  check(seen.length === 2, `two events (${seen.length})`);
  check(seen.some((e) => e.index === Button.X && e.pressed)
        && seen.some((e) => e.index === Button.Start && e.pressed),
        'one for X and one for Start');

  console.log('[13] a pad that vanishes releases what it was holding');
  seen.length = 0;
  pads = [];         // unplugged mid-hold
  await wait(60);
  check(seen.length === 2 && seen.every((e) => !e.pressed),
        'both held buttons came up, so a toggle listener cannot stick on');

  console.log('[14] other buttons are not delivered to onButton(A)');
  aPresses.length = 0;
  pads = [fakePad()];
  await wait(40);
  press(Button.B);
  await wait(60);
  check(aPresses.length === 0, 'pressing B told the A listener nothing');

  sampler.stop();
  pads = [];
}

// --- holding a destination across the life of a connection -------------------

async function testLinkGating() {
  console.log('[15] a destination handed over before the link is up');
  pads = [fakePad()];
  const camera = new RecordingSink();
  camera.open = false;
  const sampler = new GamepadSampler({ sink: camera, hz: 100 });
  const seen: number[] = [];
  sampler.onButtonChange((e) => seen.push(e.index));

  sampler.start();
  await wait(120);
  check(camera.sent.length === 0, 'nothing is sent while the link is down');

  const held = fakePad();
  (held.buttons as any)[Button.A] = { pressed: true, touched: true, value: 1 };
  pads = [held];
  await wait(60);
  check(seen.length === 1, 'but local listeners still fire, so the page works offline');

  console.log('[16] and picked up when the link comes up, with no rewiring');
  camera.open = true;
  await wait(120);
  check(camera.sent.length > 0, `sending started on its own (${camera.sent.length} messages)`);
  check(camera.sent[0].options?.sequence === 1,
        'and the first message the device sees is sequence 1, not one from the dead ticks');

  console.log('[17] and dropped again when it goes away');
  camera.open = false;
  const atClose = camera.sent.length;
  await wait(120);
  check(camera.sent.length === atClose, 'nothing is sent after the link closes');

  camera.open = true;
  await wait(60);
  check(camera.sent.length > atClose, 'and it comes back on reconnect');
  // Nth send carries sequence N; a gap would mean dead ticks were counted.
  const last = camera.sent[camera.sent.length - 1].options?.sequence ?? 0;
  check(last === camera.sent.length,
        `the sequence counts sends, not ticks (${last} for ${camera.sent.length} messages)`);

  sampler.stop();
  pads = [];
}

async function testAttach() {
  console.log('[18] attachGamepad starts the loop and sends to the camera');
  pads = [fakePad()];
  const camera = new RecordingSink();
  const sampler = attachGamepad(camera, { hz: 100 });
  check(sampler.sampling, 'it is already running, with no start() call');
  await wait(120);
  check(camera.sent.length > 0, `and sending (${camera.sent.length} messages)`);
  check(camera.sent[0].options?.endpoint === 'gamepad', "to the 'gamepad' endpoint");

  console.log('[19] stop() detaches it');
  sampler.stop();
  const atStop = camera.sent.length;
  await wait(80);
  check(camera.sent.length === atStop, 'nothing more is sent');
  check(!sampler.sampling, 'and the loop is stopped');

  pads = [];
}

async function main() {
  await testSnapshot();
  await testSampler();
  await testButtonEvents();
  await testLinkGating();
  await testAttach();
  console.log(failures === 0 ? '\nALL PASSED' : `\nFAILURES: ${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
