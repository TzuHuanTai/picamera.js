import { arrayBufferToString } from "../utils/rtc-tools";

export type OnProgress = (received: number, total: number) => void;
export type OnComplete = (body: Uint8Array) => void;

export interface ReceiverEvent {
  onProgress?: OnProgress;
  onComplete: OnComplete;
}

export class DataChannelReceiver {
  private receivedLength: number;
  private isFirstPacket: boolean;
  private fileBuffer: Uint8Array;

  private onProgress?: OnProgress;
  private onComplete: OnComplete;

  constructor(event: ReceiverEvent) {
    this.onProgress = event.onProgress;
    this.onComplete = event.onComplete;
    this.fileBuffer = new Uint8Array();
    this.receivedLength = 0;
    this.isFirstPacket = true;
  }

  receiveData(packet: Uint8Array) {
    if (this.isFirstPacket) {
      this.fileBuffer = new Uint8Array(Number(arrayBufferToString(packet)));
      this.isFirstPacket = false;
    } else if (packet.length === 0) {
      this.reset();
    } else {
      this.fileBuffer.set(packet, this.receivedLength);
      this.receivedLength += packet.length;

      this.onProgress?.(this.receivedLength, this.fileBuffer.length);

      if (this.receivedLength === this.fileBuffer.length) {
        this.onComplete(this.fileBuffer);
      }
    }
  }

  reset() {
    this.fileBuffer = new Uint8Array();
    this.receivedLength = 0;
    this.isFirstPacket = true;
  }
}
