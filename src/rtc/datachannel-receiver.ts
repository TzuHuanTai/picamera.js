import { Packet } from "../proto/packet";

export type OnProgress = (received: number, total: number) => void;
export type OnComplete = (body: Uint8Array) => void;

export interface ReceiverEvent {
  onProgress?: OnProgress;
  onComplete: OnComplete;
}

export class DataChannelReceiver {
  private totalLength: number = 0;
  private receivedLength: number = 0;
  private fileBuffer: Uint8Array | null = null;

  private onProgress?: OnProgress;
  private onComplete: OnComplete;

  constructor(event: ReceiverEvent) {
    this.onProgress = event.onProgress;
    this.onComplete = event.onComplete;
  }

  receiveData(packet: Packet) {
    if (packet.streamHeader) {
      this.totalLength = packet.streamHeader.totalLength;
      this.fileBuffer = new Uint8Array(this.totalLength);
      this.receivedLength = 0;
      return;
    }

    if (packet.streamChunk && this.fileBuffer) {
      const offset = packet.streamChunk.offset;
      const data = packet.streamChunk.data;
      this.fileBuffer.set(data, offset);

      this.receivedLength += data.length;

      this.onProgress?.(this.receivedLength, this.totalLength);

      if (this.receivedLength >= this.totalLength) {
        this.onComplete(this.fileBuffer);
      }
      return;
    }

    if (packet.streamTrailer) {
      this.reset();
    }
  }

  reset() {
    this.fileBuffer = null;
    this.totalLength = 0;
    this.receivedLength = 0;
  }
}
