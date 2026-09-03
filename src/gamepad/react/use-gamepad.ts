import { useEffect, useRef, useState } from 'react';

import { GamepadSampler } from '../sampler';
import { GamepadSamplerOptions, IpcSink, SuspendReason } from '../types';

export interface UseGamepadResult {
  /** Whether a pad is currently reporting. */
  connected: boolean;
  /** Why sampling stopped, or null while it is running. */
  suspended: SuspendReason | null;
  /** Hand to `<GamepadView>`, which subscribes directly rather than re-rendering here. */
  sampler: GamepadSampler;
}

export interface UseGamepadOptions extends Omit<GamepadSamplerOptions, 'sink'> {
  /** A `PiCamera` fits. May be null before the connection is up, and may change after. */
  sink?: IpcSink | null;
}

/**
 * Starts one sampler for the life of the component, and puts only `connected` and
 * `suspended` in state. Readings arrive 60/s; holding them here would re-render the caller.
 */
export function useGamepad(options: UseGamepadOptions = {}): UseGamepadResult {
  const { sink = null, hz, endpoint, sampleWhileHidden } = options;

  const [connected, setConnected] = useState(false);
  const [suspended, setSuspended] = useState<SuspendReason | null>(null);

  // Built once: rebuilding it on an option change would drop the loop mid-flight.
  const samplerRef = useRef<GamepadSampler | null>(null);
  if (samplerRef.current === null) {
    samplerRef.current = new GamepadSampler({ hz, endpoint, sampleWhileHidden });
  }
  const sampler = samplerRef.current;

  useEffect(() => {
    const offSnapshot = sampler.onSnapshot((snapshot) => {
      setConnected((was) => {
        const now = snapshot !== null;
        return was === now ? was : now;
      });
      if (snapshot !== null) {
        setSuspended(null);
      }
    });
    const offSuspend = sampler.onSuspend((reason) => setSuspended(reason));

    sampler.start();
    return () => {
      offSnapshot();
      offSuspend();
      sampler.stop();
    };
  }, [sampler]);

  useEffect(() => {
    sampler.setSink(sink);
  }, [sampler, sink]);

  return { connected, suspended, sampler };
}
