import { RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class PublisherPeer extends RtcPeer {
  constructor(config: RtcPeerConfig) {
    super(config);
    super.createDataChannel('_reliable', { ordered: true });
    super.createDataChannel('_lossy', { ordered: true, maxRetransmits: 0 });
    console.debug("PublisherPeer created.");
  }
}
