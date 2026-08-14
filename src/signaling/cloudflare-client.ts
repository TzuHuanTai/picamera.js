import { ISignalingClient } from './signaling-client';
import {
  CfTrackObject,
  DeviceSession,
  IApiConnectionOptions,
  PicameraApi,
  getPublishedTracks,
} from './picamera-api';
import { IPiCameraOptions } from '../pi-camera.types';

/**
 * Subscribes to a device's tracks on a Cloudflare Realtime SFU through the picamera device API.
 *
 * There is no signaling socket here — the whole exchange is a handful of one-shot HTTPS requests,
 * which is why `isConnected()` tracks a flag of our own rather than a transport state. Pulling
 * remote tracks always makes the SFU the offerer, so the only thing ever sent back out is the
 * answer, and it goes to the renegotiate endpoint.
 *
 * Trickle ICE is not part of the exchange at all: Cloudflare is an ice-lite server on a public
 * address, so the answer can go out without waiting for candidate gathering.
 */

export type CloudflareActionType = 'answer' | 'leave';

/** The SFU's own address, and the only ICE server this path needs. */
const CLOUDFLARE_STUN_URL = 'stun:stun.cloudflare.com:3478';

export class CloudflareClient implements ISignalingClient<CloudflareClient, CloudflareActionType> {
  private api: PicameraApi;
  private uid: string;
  private connected = false;
  /** Ours, the one tracks are pulled into. */
  private localSessionId = '';
  /** The device's, read from the registry on every connect. */
  private remoteSessionId = '';
  private pulledTrackNames = new Set<string>();

  onConnect?: (conn: CloudflareClient) => void;
  onJoin?: (iceServers: RTCIceServer[]) => void;
  onOffer?: (offer: RTCSessionDescriptionInit) => void;
  /** Fires before `onOffer`, because `ontrack` runs while the offer is being applied. */
  onTrackMap?: (midToTrackName: Map<string, string>) => void;
  onDeviceSession?: (session: DeviceSession) => void;
  onError?: (err: Error) => void;
  onLeave?: () => void;

  constructor(options: IPiCameraOptions & IApiConnectionOptions) {
    this.api = new PicameraApi(options);
    this.uid = options.uid ?? '';
  }

  connect = () => {
    void this.bootstrap();
  }

  private async bootstrap() {
    try {
      if (!this.uid) {
        throw new Error('No device uid was given.');
      }

      // Cloudflare mints a new session id on every device reconnect, so the record has to be
      // re-read here rather than remembered.
      const device = await this.api.getDeviceSession(this.uid);
      this.onDeviceSession?.(device);
      if (!device.sessionId) {
        throw new Error('This device has not reported a session yet.');
      }
      this.remoteSessionId = device.sessionId;

      // The record is only a pointer; the SFU is what says whether the stream is still live.
      const published = getPublishedTracks(await this.api.getSessionState(this.remoteSessionId));
      if (published.length === 0) {
        throw new Error('This device is registered but is not publishing any track right now.');
      }

      const session = await this.api.newSession();
      this.localSessionId = session.sessionId;
      this.connected = true;

      // Builds the peer, which pull() then needs.
      this.onJoin?.([{ urls: CLOUDFLARE_STUN_URL }]);
      this.onConnect?.(this);

      await this.pull(published);
    } catch (error) {
      this.fail(error);
    }
  }

  /**
   * Re-reads the remote session and pulls whatever showed up since we connected, resolving to
   * how many tracks that was.
   */
  refresh = async (): Promise<number> => {
    if (!this.connected) {
      return 0;
    }

    const published = getPublishedTracks(await this.api.getSessionState(this.remoteSessionId));
    const added = published.filter(track => !this.pulledTrackNames.has(track.trackName!));
    if (added.length > 0) {
      await this.pull(added);
    }
    return added.length;
  }

  private async pull(tracks: CfTrackObject[]) {
    const response = await this.api.newTracks(this.localSessionId, tracks.map(track => ({
      location: 'remote' as const,
      sessionId: this.remoteSessionId,
      trackName: track.trackName,
    })));

    // The mid to track name mapping has to be ready before the offer is applied, `ontrack` fires
    // while setRemoteDescription is running.
    const midToTrackName = new Map<string, string>();
    response.tracks?.forEach(track => {
      if (track.mid && track.trackName) {
        midToTrackName.set(track.mid, track.trackName);
        this.pulledTrackNames.add(track.trackName);
      }
    });
    this.onTrackMap?.(midToTrackName);

    if (response.requiresImmediateRenegotiation && response.sessionDescription) {
      this.onOffer?.(response.sessionDescription);
    }

    const failed = response.tracks?.filter(track => track.errorCode) ?? [];
    if (failed.length > 0) {
      throw new Error(failed
        .map(t => `${t.trackName}: ${t.errorDescription ?? t.errorCode}`)
        .join(', '));
    }
  }

  send = (action: CloudflareActionType, message: string = '') => {
    if (action === 'leave') {
      this.disconnect();
      return;
    }

    if (!this.isConnected()) {
      console.warn(`Sending ${action} failed: the cloudflare session is not open.`);
      return;
    }

    this.api
      .renegotiate(this.localSessionId, { type: 'answer', sdp: message })
      .catch(error => this.fail(error));
  }

  /**
   * Drops our side of the exchange. There is nothing to tear down server side — an abandoned
   * session simply stops being pulled from.
   */
  disconnect = () => {
    if (!this.connected) {
      return;
    }
    this.connected = false;
    this.localSessionId = '';
    this.remoteSessionId = '';
    this.pulledTrackNames.clear();
    console.debug('Terminating cloudflare session.');
    this.onLeave?.();
  }

  isConnected = (): boolean => this.connected;

  private fail(error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error('cloudflare signaling failed =>', err);
    this.onError?.(err);
  }
}
