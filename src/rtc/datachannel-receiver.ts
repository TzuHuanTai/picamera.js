import { Packet } from "../proto/packet";

export type OnProgress = (received: number, total: number) => void;
export type OnComplete = (body: Uint8Array) => void;

export interface ReceiverEvent {
  onProgress?: OnProgress;
  onComplete: OnComplete;
  /** Minimum interval in ms between onProgress calls. Defaults to 100. */
  progressThrottleMs?: number;
}

export class DataChannelReceiver {
  private totalLength: number = 0;
  private receivedLength: number = 0;
  private fileBuffer: Uint8Array | null = null;

  private onProgress?: OnProgress;
  private onComplete: OnComplete;
  private progressThrottleMs: number;
  private lastProgressTime: number = 0;

  constructor(event: ReceiverEvent) {
    this.onProgress = event.onProgress;
    this.onComplete = event.onComplete;
    this.progressThrottleMs = event.progressThrottleMs ?? 100;
  }

  receiveData(packet: Packet) {
    if (packet.streamHeader) {
      this.totalLength = packet.streamHeader.totalLength;
      this.fileBuffer = new Uint8Array(this.totalLength);
      this.receivedLength = 0;
      this.lastProgressTime = 0;
      return;
    }

    if (packet.streamChunk && this.fileBuffer) {
      const offset = packet.streamChunk.offset;
      const data = packet.streamChunk.data;
      this.fileBuffer.set(data, offset);

      this.receivedLength += data.length;

      const isFinal = this.receivedLength >= this.totalLength;
      const now = Date.now();
      if (this.onProgress && (isFinal || now - this.lastProgressTime >= this.progressThrottleMs)) {
        this.lastProgressTime = now;
        this.onProgress(this.receivedLength, this.totalLength);
      }

      if (isFinal) {
        this.onComplete(this.fileBuffer);
      }
      return;
    }

    if (packet.streamTrailer) {
      if (this.totalLength === 0 && this.fileBuffer !== null) {
        this.onComplete(this.fileBuffer);
      }
      this.reset();
    }
  }

  reset() {
    this.fileBuffer = null;
    this.totalLength = 0;
    this.receivedLength = 0;
    this.lastProgressTime = 0;
  }
}
