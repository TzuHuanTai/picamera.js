import { RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class SubscriberPeer extends RtcPeer {
  constructor(config: RtcPeerConfig) {
    super(config);
    console.debug("SubscriberPeer created.");
  }
}
