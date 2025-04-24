export interface IWebSocketConnectionOptions {
  websocketUrl?: string;
  token?: string;
}

export type WebsocketActionType = 'join' | 'offer' | 'answer' |
  'trickle' | 'addVideoTrack' | 'addAudioTrack' |
  'trackPublished' | 'leave' | 'close' | 'ping' |
  'tricklePublisher' | 'trickleSubscriber' |
  'error' | 'info';

export type TrickleTarget = 'PUBLISHER' | 'SUBSCRIBER';

export interface ProxyMessage {
  action: WebsocketActionType;
  message: string;
}

export class TrickleResponse {
  target: TrickleTarget;
  candidateInit: RTCIceCandidateInit;

  constructor(data: { target: TrickleTarget, candidateInit: RTCIceCandidateInit }) {
    this.target = data.target;
    this.candidateInit = data.candidateInit;
  }

  static fromJson(jsonStr: string): TrickleResponse {
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.candidateInit === "string") {
      parsed.candidateInit = JSON.parse(parsed.candidateInit);
    }
    return new TrickleResponse(parsed);
  }
}
