import mqtt, { MqttClient as MqttLibClient, IClientOptions } from 'mqtt';
import { generateUid } from '../utils/rtc-tools';
import { IMqttConnectionOptions } from './mqtt-client.interface';

export class MqttClient {
  private options: IMqttConnectionOptions;
  private clientId: string;
  private client?: MqttLibClient;
  private subscribedFnMap: Map<string, (...args: any[]) => void>;

  public onConnect?: (conn: MqttClient) => void;

  constructor(options: IMqttConnectionOptions) {
    this.options = options;
    this.subscribedFnMap = new Map();
    this.clientId = generateUid(23);
  }

  connect = () => {
    const connectionOptions: IClientOptions = {
      host: this.options.mqttHost,
      port: this.options.mqttPort,
      path: this.options.mqttPath,
      clientId: this.clientId,
      username: this.options.mqttUsername,
      password: this.options.mqttPassword,
      protocol: this.options.mqttProtocol,
      keepalive: 20,
      protocolVersion: 5,
      clean: true,
      manualConnect: true,
      reconnectPeriod: 0,
    };

    this.client = mqtt.connect(connectionOptions);
    this.attachClientListeners();
    this.client.reconnect();
  }

  private attachClientListeners() {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.debug(`MQTT connection (${this.clientId}) established. -> ${this.options.deviceUid}`);
      this.onConnect?.(this);
    });

    this.client.on('message', (topic, message) => this.handleMessage(topic, message));
  }

  private handleMessage(topic: string, message: Buffer) {
    console.debug(`Received message on topic: ${topic} -> ${message.toString()}`);
    const callback = this.subscribedFnMap.get(topic);
    callback?.(message.toString());
  }

  subscribe = (topic: string, callback: (...args: any[]) => void) => {
    if (!this.client) {
      console.warn("Subscribe failed: client is undefined.");
      return;
    }

    const fullTopic = this.constructTopic(topic);
    this.client.subscribe(fullTopic, { qos: 2 });
    this.subscribedFnMap.set(fullTopic, callback);
  }

  unsubscribe = (topic: string) => {
    if (!this.client) {
      console.warn("Unsubscribe failed: client is undefined.");
      return;
    }

    const fullTopic = this.constructTopic(topic);
    this.client.unsubscribe(fullTopic);
    this.subscribedFnMap.delete(fullTopic);
  }

  publish = (topic: string, message: string) => {
    if (!this.client) {
      console.warn("Publish failed: client is undefined.");
      return;
    }

    const destination = `${this.constructTopic(topic)}/offer`;
    this.client.publish(destination, message);
  }

  disconnect = () => {
    if (!this.client) return;

    console.debug(`Terminating MQTT connection (${this.clientId}).`);
    this.client.removeAllListeners();
    this.client.end(true);
    this.subscribedFnMap.clear();
  }

  isConnected = (): boolean => this.client?.connected ?? false;

  private constructTopic(topic: string): string {
    return `${this.options.deviceUid}/${topic}/${this.clientId}`;
  }
}
