import mqtt from 'mqtt';
import { generateUid } from './rtcUtils';

export interface IMqttConnectionOptions {
  deviceId: string;
  mqttHost: string;
  mqttPath: string;
  mqttPort: number;
  mqttUsername: string;
  mqttPassword: string;
}

export class MqttClient {
  private options: IMqttConnectionOptions;
  private clientId: string;
  private client?: mqtt.MqttClient;
  private subscribedFnMap: Map<string, (...args: any[]) => void>;

  public onConnect?: (conn: MqttClient) => void;

  constructor(options: IMqttConnectionOptions) {
    this.options = options;
    this.subscribedFnMap = new Map();
    this.clientId = generateUid(23);
  }

  connect = () => {
    this.client = mqtt.connect({
      host: this.options.mqttHost,
      port: this.options.mqttPort,
      path: this.options.mqttPath,
      clientId: this.clientId,
      username: this.options.mqttUsername,
      password: this.options.mqttPassword,
      protocol: 'wss',
      keepalive: 20,
      protocolVersion: 5,
      clean: true,
      manualConnect: true,
      reconnectPeriod: 0,
    });

    this.client.on('connect', (_response) => {
      console.debug(`MQTT connection(${this.clientId}) established. -> ${this.options.deviceId}`);
      if (this.onConnect) {
        this.onConnect(this);
      }
    });

    this.client.on('message', (topic, message, _packet) => {
      console.debug('Received Message: ' + message.toString() + '\nOn topic: ' + topic)
      const invokeFn = this.subscribedFnMap.get(topic);
      if (invokeFn) {
        invokeFn(message.toString());
      }
    });

    this.client.reconnect();
  }

  subscribe = (topic: string, callback: (...args: any[]) => void) => {
    if (!this.client) {
      console.warn("subscribe failed due to undefined client.");
      return;
    }
    this.client.subscribe(`${this.options.deviceId}/${topic}/${this.clientId}`, { qos: 2 });
    this.subscribedFnMap.set(`${this.options.deviceId}/${topic}/${this.clientId}`, callback);
  }

  unsubscribe = (topic: string) => {
    if (!this.client) {
      console.warn("unsubscribe failed due to undefined client.");
      return;
    }
    this.client.unsubscribe(`${this.options.deviceId}/${topic}`);
    this.subscribedFnMap.delete(`${this.options.deviceId}/${topic}`);
  }

  publish = (topic: string, message: string) => {
    if (!this.client) {
      console.warn("publish failed due to undefined client.");
      return;
    }
    const destination = `${this.options.deviceId}/${topic}/${this.clientId}/offer`;
    this.client.publish(destination, message);
  }

  disconnect = () => {
    if (!this.client) {
      return;
    }

    console.debug(`Terminate MQTT connection(${this.clientId}).`);
    this.client.removeAllListeners();
    this.client.end(true);
    this.subscribedFnMap.clear();
  }

  isConnected = (): boolean => {
    if (!this.client) {
      return false;
    }
    return this.client.connected;
  }
}
