import { Packet, Stream_Header } from "../proto/packet";

/** A reassembled stream body. `requestId` is what says how to parse it; `mimeType` is a hint. */
export interface StreamResult {
  streamId: string;
  requestId: string;
  mimeType: string;
  body: Uint8Array;
}

export type OnStreamProgress = (received: number, total: number, requestId: string) => void;
export type OnStreamComplete = (result: StreamResult) => void;
export type OnStreamAbort = (streamId: string, reason: string, requestId: string) => void;

export interface StreamAssemblerEvents {
  onProgress?: OnStreamProgress;
  onComplete: OnStreamComplete;
  /** The device aborted the stream, or it broke the contract. */
  onAbort?: OnStreamAbort;
  /** Min ms between onProgress calls, per stream. Default 100. */
  progressThrottleMs?: number;
  /** Incomplete streams held before evicting the oldest. Default 64. */
  maxConcurrentStreams?: number;
  /** Pre-header chunk bytes parked per stream before giving up. Default 8 MiB. */
  maxOrphanBytes?: number;
  /** Idle time before a stream is discarded. Default 30 s. */
  streamTimeoutMs?: number;
}

/** Half-open byte interval `[start, end)`. */
interface Range {
  start: number;
  end: number;
}

interface Orphan {
  offset: number;
  data: Uint8Array;
}

interface Assembly {
  streamId: string;
  /** Unset until the header arrives; chunks wait in `orphans`. */
  header?: Stream_Header;
  requestId: string;
  mimeType: string;
  buffer?: Uint8Array;
  totalLength: number;
  /** Sorted, disjoint ranges already written into `buffer`. */
  ranges: Range[];
  written: number;
  orphans: Orphan[];
  orphanBytes: number;
  lastProgressTime: number;
  lastActivityAt: number;
}

/**
 * Insert `[start, end)`, merging what it overlaps or touches. Returns the bytes *newly* covered,
 * so a chunk delivered twice adds nothing.
 */
function insertRange(ranges: Range[], start: number, end: number): number {
  if (end <= start) {
    return 0;
  }

  let i = 0;
  while (i < ranges.length && ranges[i].end < start) {
    i++;
  }

  let mergedStart = start;
  let mergedEnd = end;
  let alreadyCovered = 0;
  let j = i;
  while (j < ranges.length && ranges[j].start <= end) {
    const overlap = Math.min(ranges[j].end, end) - Math.max(ranges[j].start, start);
    if (overlap > 0) {
      alreadyCovered += overlap;
    }
    mergedStart = Math.min(mergedStart, ranges[j].start);
    mergedEnd = Math.max(mergedEnd, ranges[j].end);
    j++;
  }

  ranges.splice(i, j - i, { start: mergedStart, end: mergedEnd });
  return end - start - alreadyCovered;
}

/** Most often the idle sweep runs. */
const SWEEP_INTERVAL_MS = 1000;

/** Finished stream ids kept, so stragglers cannot rebuild them. */
const REMEMBERED_STREAMS = 256;

/**
 * Reassembles `Stream` bodies off an unordered channel, where several streams interleave, a chunk
 * can beat its header, and the trailer can beat the last chunk. Each stream is tracked by
 * `stream_id`, placed by `Chunk.offset`, and complete only once the header has been seen and every
 * byte in `[0, total_length)` written.
 *
 * Only the header carries `request_id`, so the assembly holds it from then on.
 */
export class StreamAssembler {
  private assemblies = new Map<string, Assembly>();
  private finished = new Set<string>();
  private lastSweep = 0;

  private readonly onProgress?: OnStreamProgress;
  private readonly onComplete: OnStreamComplete;
  private readonly onAbort?: OnStreamAbort;
  private readonly progressThrottleMs: number;
  private readonly maxConcurrentStreams: number;
  private readonly maxOrphanBytes: number;
  private readonly streamTimeoutMs: number;

  constructor(events: StreamAssemblerEvents) {
    this.onProgress = events.onProgress;
    this.onComplete = events.onComplete;
    this.onAbort = events.onAbort;
    this.progressThrottleMs = events.progressThrottleMs ?? 100;
    this.maxConcurrentStreams = events.maxConcurrentStreams ?? 64;
    this.maxOrphanBytes = events.maxOrphanBytes ?? 8 * 1024 * 1024;
    this.streamTimeoutMs = events.streamTimeoutMs ?? 30_000;
  }

  receive(packet: Packet): void {
    const stream = packet.stream;
    if (!stream) {
      return;
    }

    const streamId = stream.streamId;
    if (!streamId) {
      console.warn("Ignoring a stream packet with no stream_id.");
      return;
    }

    // A packet arriving after its stream ended would otherwise build a fresh entry that
    // nothing ever finishes.
    if (this.finished.has(streamId)) {
      return;
    }

    this.sweep();

    if (stream.header) {
      this.handleHeader(streamId, stream.header, packet.requestId);
    } else if (stream.chunk) {
      this.handleChunk(streamId, stream.chunk.offset, stream.chunk.data);
    } else if (stream.trailer) {
      this.handleTrailer(streamId, stream.trailer.reason);
    }
  }

  /** Drop every in-flight stream, so an aborted transfer cannot leak. */
  reset(): void {
    this.assemblies.clear();
    this.finished.clear();
    this.lastSweep = 0;
  }

  /** Drop streams that went quiet, so a header that never arrives cannot pin memory. */
  private sweep(): void {
    const now = Date.now();
    if (now - this.lastSweep < SWEEP_INTERVAL_MS) {
      return;
    }
    this.lastSweep = now;

    for (const assembly of [...this.assemblies.values()]) {
      if (now - assembly.lastActivityAt > this.streamTimeoutMs) {
        this.abort(assembly, `no packets for ${this.streamTimeoutMs} ms`);
      }
    }
  }

  private markFinished(streamId: string): void {
    this.finished.add(streamId);
    while (this.finished.size > REMEMBERED_STREAMS) {
      const oldest = this.finished.values().next();
      if (oldest.done) {
        break;
      }
      this.finished.delete(oldest.value);
    }
  }

  private handleHeader(streamId: string, header: Stream_Header, requestId: string): void {
    const existing = this.assemblies.get(streamId);

    if (existing?.header) {
      console.warn(`Duplicate stream header for ${streamId}, ignoring.`);
      return;
    }

    const assembly: Assembly = existing ?? this.createAssembly(streamId);
    assembly.header = header;
    assembly.requestId = requestId;
    assembly.mimeType = header.mimeType;
    assembly.totalLength = header.totalLength;
    assembly.buffer = new Uint8Array(header.totalLength);
    assembly.lastActivityAt = Date.now();
    this.assemblies.set(streamId, assembly);
    this.evictIfNeeded();

    // Nothing to wait for.
    if (assembly.totalLength === 0) {
      this.complete(assembly);
      return;
    }

    const orphans = assembly.orphans;
    assembly.orphans = [];
    assembly.orphanBytes = 0;
    for (const orphan of orphans) {
      if (!this.write(assembly, orphan.offset, orphan.data)) {
        return;
      }
    }
    this.reportProgress(assembly, true);
    this.completeIfWhole(assembly);
  }

  private handleChunk(streamId: string, offset: number, data: Uint8Array): void {
    let assembly = this.assemblies.get(streamId);

    if (!assembly) {
      assembly = this.createAssembly(streamId);
      this.assemblies.set(streamId, assembly);
      this.evictIfNeeded();
    }
    assembly.lastActivityAt = Date.now();

    // No header yet, so nowhere to put this.
    if (!assembly.buffer) {
      assembly.orphanBytes += data.length;
      if (assembly.orphanBytes > this.maxOrphanBytes) {
        this.abort(assembly, `header missing after ${assembly.orphanBytes} bytes of chunks`);
        return;
      }
      assembly.orphans.push({ offset, data });
      return;
    }

    if (!this.write(assembly, offset, data)) {
      return;
    }
    this.reportProgress(assembly, false);
    this.completeIfWhole(assembly);
  }

  private handleTrailer(streamId: string, reason: string): void {
    // A clean trailer only marks the end of the send side, and can overtake the last chunk.
    // Completion is decided by the byte count, never here.
    if (!reason) {
      return;
    }

    const assembly = this.assemblies.get(streamId);
    if (assembly) {
      this.abort(assembly, reason);
    }
  }

  private createAssembly(streamId: string): Assembly {
    return {
      streamId,
      requestId: "",
      mimeType: "",
      totalLength: 0,
      ranges: [],
      written: 0,
      orphans: [],
      orphanBytes: 0,
      lastProgressTime: 0,
      lastActivityAt: Date.now(),
    };
  }

  /** False if the chunk broke the contract and the assembly was discarded. */
  private write(assembly: Assembly, offset: number, data: Uint8Array): boolean {
    const end = offset + data.length;
    if (offset < 0 || end > assembly.totalLength) {
      this.abort(
        assembly,
        `chunk [${offset}, ${end}) falls outside the declared length ${assembly.totalLength}`
      );
      return false;
    }

    assembly.buffer!.set(data, offset);
    assembly.written += insertRange(assembly.ranges, offset, end);
    return true;
  }

  private reportProgress(assembly: Assembly, force: boolean): void {
    if (!this.onProgress) {
      return;
    }
    const isFinal = assembly.written >= assembly.totalLength;
    const now = Date.now();
    if (!force && !isFinal && now - assembly.lastProgressTime < this.progressThrottleMs) {
      return;
    }
    assembly.lastProgressTime = now;
    this.onProgress(assembly.written, assembly.totalLength, assembly.requestId);
  }

  private completeIfWhole(assembly: Assembly): void {
    const { ranges, totalLength } = assembly;
    if (ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === totalLength) {
      this.complete(assembly);
    }
  }

  private complete(assembly: Assembly): void {
    this.assemblies.delete(assembly.streamId);
    this.markFinished(assembly.streamId);
    this.onComplete({
      streamId: assembly.streamId,
      requestId: assembly.requestId,
      mimeType: assembly.mimeType,
      body: assembly.buffer ?? new Uint8Array(0),
    });
  }

  private abort(assembly: Assembly, reason: string): void {
    this.assemblies.delete(assembly.streamId);
    this.markFinished(assembly.streamId);
    console.warn(`Stream ${assembly.streamId} aborted: ${reason}`);
    this.onAbort?.(assembly.streamId, reason, assembly.requestId);
  }

  private evictIfNeeded(): void {
    while (this.assemblies.size > this.maxConcurrentStreams) {
      // Least recently active, so a healthy transfer is not dropped for being the oldest.
      let stalest: Assembly | undefined;
      for (const assembly of this.assemblies.values()) {
        if (!stalest || assembly.lastActivityAt < stalest.lastActivityAt) {
          stalest = assembly;
        }
      }
      if (!stalest) {
        return;
      }
      this.abort(stalest, `evicted, more than ${this.maxConcurrentStreams} streams in flight`);
    }
  }
}
