import { RtcPeer, RtcPeerConfig } from "./rtc-peer";

/**
 * The subscribe side of a Cloudflare Realtime SFU session.
 *
 * Cloudflare hands each pulled track over on its own transceiver rather than grouping them into
 * a stream per publisher, so the track name the SFU accepted — which the signaling client learns
 * from the /tracks/new response — is what identifies a stream here.
 */
export class CloudflarePeer extends RtcPeer {
  private midToTrackName = new Map<string, string>();

  constructor(config: RtcPeerConfig) {
    super(config);
    // Pulling remote tracks always makes the SFU the offerer, and there is no endpoint that takes
    // an offer from this side, so a renegotiation started here would have nowhere to go.
    this.peer.onnegotiationneeded = null;
    console.debug("CloudflarePeer created.");
  }

  /** Must be called before the offer carrying those mids is applied. */
  setTrackNames(midToTrackName: Map<string, string>): void {
    midToTrackName.forEach((name, mid) => this.midToTrackName.set(mid, name));
  }

  protected override getStreamKey(event: RTCTrackEvent): string {
    const mid = event.transceiver.mid;
    return (mid ? this.midToTrackName.get(mid) : undefined) ?? mid ?? event.track.id;
  }
}
