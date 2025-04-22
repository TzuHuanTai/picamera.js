import { ISignalingClient } from '../rtc/pi-camera.interface';
import { ActionType, IWebSocketConnectionOptions, ProxyMessage } from './websocket-client.interface';

export class WebSocketClient implements ISignalingClient {
  private url?: string;
  private token?: string;
  private client?: WebSocket;
  private subscribedFnMap: Map<string, (msg: string) => void>;

  public onConnect?: (conn: ISignalingClient) => void;

  constructor(options: IWebSocketConnectionOptions) {
    this.url = options.websocketUrl;
    this.token = options.token;
    this.subscribedFnMap = new Map();
  }

  connect = () => {
    this.client = new WebSocket(`${this.url}/rtc?token=${this.token}`);

    this.client.onopen = () => {
      console.log('WebSocket Connected');
      this.onConnect?.(this);
    };

    this.client.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.client.onclose = () => {
      console.log('WebSocket Disconnected');
    };

    this.client.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }

  private handleMessage(event: MessageEvent) {
    let { action, message }: ProxyMessage = JSON.parse(event.data);
    console.debug(`Received message (${action}): ${message}`);
    const callback = this.subscribedFnMap.get(action);
    callback?.(message);
  }

  subscribe = (action: ActionType, callback: (msg: string) => void) => {
    if (!this.client) {
      console.warn("Subscribe failed: client is undefined.");
      return;
    }
    this.subscribedFnMap.set(action, callback);
  }

  unsubscribe = (action: ActionType) => {
    if (!this.client) {
      console.warn("Unsubscribe failed: client is undefined.");
      return;
    }
    this.subscribedFnMap.delete(action);
  }

  publish = (action: ActionType, message: string) => {
    if (!this.client) {
      console.warn("Publish failed: client is undefined.");
      return;
    }

    let data: ProxyMessage = { action: action as ActionType, message };
    this.client.send(JSON.stringify(data));
  }

  disconnect = () => {
    if (!this.client) return;

    console.debug(`Terminating websocket connection.`);
    this.client.close();
    this.subscribedFnMap.clear();
  }

  isConnected = (): boolean => this.client?.readyState === WebSocket.OPEN;
}
