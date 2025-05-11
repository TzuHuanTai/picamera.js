import { ChannelId, RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class PublisherPeer extends RtcPeer {
  constructor(config: RtcPeerConfig) {
    super(config);
    super.createDataChannel(ChannelId.Reliable, { ordered: true });
    super.createDataChannel(ChannelId.Lossy, { ordered: true, maxRetransmits: 0 });
    console.debug("PublisherPeer created.");
  }
}
