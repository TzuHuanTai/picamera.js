import { GamepadSampler } from './sampler';
import { GamepadSamplerOptions, IpcSink } from './types';

/** Everything `GamepadSampler` takes except the destination, which is the first argument. */
export type AttachGamepadOptions = Omit<GamepadSamplerOptions, 'sink'>;

/**
 * Read a controller into a device, and start.
 *
 * Order against `connect()` does not matter: readings taken before the link is up are dropped,
 * and sending picks up once it opens. Returns the sampler; `stop()` detaches.
 *
 * ```ts
 * const pad = attachGamepad(camera, { hz: 60 });
 * pad.onButton(Button.A, (pressed) => { if (pressed) camera.snapshot(); });
 * ```
 */
export function attachGamepad(camera: IpcSink, options: AttachGamepadOptions = {}): GamepadSampler {
  const sampler = new GamepadSampler({ ...options, sink: camera });
  sampler.start();
  return sampler;
}
