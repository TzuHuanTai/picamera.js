import { arrayBufferToString } from "../utils/rtc-tools";

export class DataChannelReceiver {
  private receivedLength: number;
  private isFirstPacket: boolean;
  private fileBuffer: Uint8Array;
  private onComplete: (body: Uint8Array) => void;

  constructor(onComplete: (body: Uint8Array) => void) {
    this.onComplete = onComplete;
    this.fileBuffer = new Uint8Array();
    this.receivedLength = 0;
    this.isFirstPacket = true;
  }

  receiveData(packet: Uint8Array) {
    if (this.isFirstPacket) {
      this.fileBuffer = new Uint8Array(Number(arrayBufferToString(packet)));
      this.isFirstPacket = false;
    } else {
      this.fileBuffer.set(packet, this.receivedLength);
      this.receivedLength += packet.length;
    }

    if (packet.length === 0) {
      this.onComplete(this.fileBuffer);
      this.reset();
    }
  }

  reset() {
    this.fileBuffer = new Uint8Array();
    this.receivedLength = 0;
    this.isFirstPacket = true;
  }
}
