import { arrayBufferToString } from "../utils/rtc-tools";

export class DataChannelReceiver {
  private receivedLength: number;
  private isFirstPacket: boolean;
  private fileBuffer: Uint8Array;
  private onComplete: (received: number, body: Uint8Array) => void;

  constructor(onComplete: (progress: number, body: Uint8Array) => void) {
    this.onComplete = onComplete;
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
      this.onComplete(this.receivedLength, this.fileBuffer);
    }
  }

  reset() {
    this.fileBuffer = new Uint8Array();
    this.receivedLength = 0;
    this.isFirstPacket = true;
  }
}
