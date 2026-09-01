/**
 * Client for the picamera device API (picamera-hono).
 *
 * The SFU calls are relayed by the worker rather than made against
 * https://rtc.live.cloudflare.com directly, because the Cloudflare App Secret grants full access
 * to every session in the app and has no business in a browser. The relay passes Cloudflare's
 * status and body through untouched, so the response shapes below are still Cloudflare's.
 * https://developers.cloudflare.com/realtime/sfu/https-api/
 */

export interface ApiConnectionOptions {
  /**
   * Base url of the picamera device API, e.g. https://picamera-hono.<account>.workers.dev.
   * The same deployment fronts both LiveKit and the Cloudflare Realtime SFU.
   */
  apiUrl?: string;

  /**
   * Sent as `Authorization: Bearer`. This is the device API's own viewer key — not
   * `livekitKey`, which LiveKit issues and the relay only forwards.
   */
  apiKey?: string;
}

export interface CfSessionDescription {
  sdp: string;
  type: 'offer' | 'answer';
}

export interface CfTrackObject {
  location?: 'local' | 'remote';
  mid?: string;
  sessionId?: string;
  trackName?: string;
  kind?: string;
  /** only returned by getSessionState */
  status?: 'active' | 'inactive' | 'waiting';
  errorCode?: string;
  errorDescription?: string;
}

export interface CfErrorResponse {
  errorCode?: string;
  errorDescription?: string;
}

export interface CfNewSessionResponse extends CfErrorResponse {
  sessionId: string;
  sessionDescription?: CfSessionDescription;
}

export interface CfTracksResponse extends CfErrorResponse {
  requiresImmediateRenegotiation?: boolean;
  sessionDescription?: CfSessionDescription;
  tracks?: CfTrackObject[];
}

export interface CfSessionStateResponse extends CfErrorResponse {
  tracks?: CfTrackObject[];
}

/** What a device last reported it is publishing into. */
export interface DeviceSession {
  uid: string;
  backend: string;
  sessionId: string;
  appId?: string;
  tracks: string[];
  reportedAt: string;
}

export class PicameraApi {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: ApiConnectionOptions) {
    this.baseUrl = (options.apiUrl ?? '').replace(/\/+$/, '');
    this.apiKey = options.apiKey ?? '';
  }

  /**
   * Resolves a device uid to the SFU session it is publishing into. The session id changes on
   * every reconnect, so this has to be re-read before each connection attempt.
   */
  getDeviceSession(uid: string): Promise<DeviceSession> {
    return this.request<DeviceSession>('GET', `/devices/${encodeURIComponent(uid)}`);
  }

  /** Returns the tracks published to / pulled by the given session. */
  getSessionState(sessionId: string): Promise<CfSessionStateResponse> {
    return this.request<CfSessionStateResponse>('GET', `/sfu/sessions/${encodeURIComponent(sessionId)}`);
  }

  /** Creates an empty session, the SFU generates the offer once tracks are added. */
  newSession(): Promise<CfNewSessionResponse> {
    return this.request<CfNewSessionResponse>('POST', '/sfu/sessions/new');
  }

  newTracks(sessionId: string, tracks: CfTrackObject[]): Promise<CfTracksResponse> {
    return this.request<CfTracksResponse>(
      'POST', `/sfu/sessions/${encodeURIComponent(sessionId)}/tracks/new`, { tracks });
  }

  renegotiate(sessionId: string, sessionDescription: CfSessionDescription): Promise<CfErrorResponse> {
    return this.request<CfErrorResponse>(
      'PUT', `/sfu/sessions/${encodeURIComponent(sessionId)}/renegotiate`, { sessionDescription });
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    let payload: (T & CfErrorResponse & { error?: string; message?: string }) | undefined;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    // Cloudflare reports failures inside a 2xx body, the worker reports its own as {error,message},
    // so neither the status nor the body alone is enough to tell success from failure.
    if (!response.ok || payload?.errorCode) {
      throw new Error(
        payload?.errorDescription ?? payload?.message ?? payload?.errorCode ?? payload?.error
        ?? `${method} ${path} failed (${response.status})`);
    }

    if (!payload) {
      throw new Error(`${method} ${path} returned an empty body`);
    }

    return payload;
  }
}

/** Tracks that the given session published itself, i.e. the ones we can pull. */
export function getPublishedTracks(state: CfSessionStateResponse): CfTrackObject[] {
  return (state.tracks ?? []).filter(t => t.location === 'local' && t.status !== 'inactive' && !!t.trackName);
}
