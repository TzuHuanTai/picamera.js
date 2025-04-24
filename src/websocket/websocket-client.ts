import { ActionType, ISignalingClient } from '../rtc/pi-camera.interface';
import { IWebSocketConnectionOptions, ProxyMessage, WebsocketActionType } from './websocket-client.interface';

export class WebSocketClient implements ISignalingClient {
  private url?: string;
  private token?: string;
  private client?: WebSocket;
  private subscribedFnMap: Map<string, (msg: string) => void>;
  private pingInterval?: NodeJS.Timeout;

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
      this.clearPingInterval();
    };

    this.client.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }

  private handleMessage(event: MessageEvent) {
    let { action, message }: ProxyMessage = JSON.parse(event.data);
    console.debug(`Received message (${action}): ${message}`);

    if (action === 'join') {
      this.startPingInterval();
    }

    const callback = this.subscribedFnMap.get(action);
    callback?.(message);
  }

  subscribe = (action: ActionType, callback: (msg: string) => void) => {
    this.subscribedFnMap.set(action, callback);
  }

  unsubscribe = (action: ActionType) => {
    this.subscribedFnMap.delete(action);
  }

  publish = (action: ActionType, message: string = '') => {
    if (!this.client) {
      console.warn("Publish failed: client is undefined.");
      return;
    }

    let data: ProxyMessage = { action: action as WebsocketActionType, message };
    this.client.send(JSON.stringify(data));
  }

  disconnect = () => {
    if (!this.client) return;
    this.publish('leave');
    console.debug(`Terminating websocket connection.`);
    this.client.close();
    this.subscribedFnMap.clear();
  }

  isConnected = (): boolean => this.client?.readyState === WebSocket.OPEN;

  private startPingInterval() {
    this.clearPingInterval();

    console.debug('start ping interval');
    this.pingInterval = setInterval(() => {
      this.publish('ping');
    }, 5000);
  }

  private clearPingInterval() {
    console.debug('clearing ping interval');
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
  }
}
