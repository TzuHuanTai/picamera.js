export interface IWebSocketConnectionOptions {
  websocketUrl?: string;
  token?: string;
}

export type ActionType = 'join' | 'offer' | 'answer' | 'trickle' | 'addVideoTrack' | 'addAudioTrack' | 'trickle' | 'trackPublished' | 'leave' | 'close' | 'error' | 'info';

export interface ProxyMessage {
  action: ActionType;
  message: string;
}
