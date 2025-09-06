import { DataPacket } from "@livekit/protocol";
import { ChannelLabel, RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class SubscriberPeer extends RtcPeer {
  constructor(config: RtcPeerConfig) {
    super(config);
    console.debug("SubscriberPeer created.");
  }

  override async onDataChannelMessage(label: ChannelLabel, event: MessageEvent): Promise<void> {
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
      super.dispatchPayload(label, dp.value.value.payload);
    }
  }
}
