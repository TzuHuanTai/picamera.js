import { DataPacket } from "@livekit/protocol";
import { ChannelRole, RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class SubscriberPeer extends RtcPeer {
  constructor(config: RtcPeerConfig) {
    super(config);
    console.debug("SubscriberPeer created.");
  }

  override async onDataChannelMessage(role: ChannelRole, event: MessageEvent): Promise<void> {
    let buffer: ArrayBuffer;
    if (event.data instanceof ArrayBuffer) {
      buffer = event.data;
    } else if (event.data instanceof Blob) {
      buffer = await event.data.arrayBuffer();
    } else {
      console.error('unsupported data type', event.data);
      return;
    }

    const dp = DataPacket.fromBinary(new Uint8Array(buffer));

    if (dp.value?.case === 'user') {
      super.dispatchPayload(role, dp.value.value.payload);
    }
  }
}
