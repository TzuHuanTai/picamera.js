import mqtt, { MqttClient as MqttLibClient, IClientOptions } from 'mqtt';
import { IMqttConnectionOptions, TopicType } from './mqtt-client.interface';
import { ISignalingClient } from '../rtc/pi-camera.interface';

export class MqttClient implements ISignalingClient {
  private options: IMqttConnectionOptions;
  private clientId: string;
  private client?: MqttLibClient;
  private subscribedFnMap: Map<string, (msg: string)=> void>;

  public onConnect?: (conn: ISignalingClient) => void;

  constructor(options: IMqttConnectionOptions) {
    this.options = options;
    this.subscribedFnMap = new Map();
    this.clientId = crypto.randomUUID();
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

    this.client?.on('connect', () => {
      console.debug(`MQTT connection (${this.clientId}) established. -> ${this.options.deviceUid}`);
      this.onConnect?.(this);
    });

    this.client?.on('message', (topic, message) => this.handleMessage(topic, message.toString()));

    this.client?.connect();
  }

  private handleMessage(topic: string, message: string) {
    console.debug(`Received message on topic: ${topic} -> ${message}`);
    const callback = this.subscribedFnMap.get(topic);
    callback?.(message);
  }

  subscribe = (topic: TopicType, callback: (msg: string) => void) => {
    if (!this.client) {
      console.warn("Subscribe failed: client is undefined.");
      return;
    }

    const fullTopic = this.constructTopic(topic);
    this.client.subscribe(fullTopic, { qos: 2 });
    this.subscribedFnMap.set(fullTopic, callback);
  }

  unsubscribe = (topic: TopicType) => {
    if (!this.client) {
      console.warn("Unsubscribe failed: client is undefined.");
      return;
    }

    const fullTopic = this.constructTopic(topic);
    this.client.unsubscribe(fullTopic);
    this.subscribedFnMap.delete(fullTopic);
  }

  publish = (topic: TopicType, message: string) => {
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
    this.client = undefined;
    this.subscribedFnMap.clear();
  }

  isConnected = (): boolean => this.client?.connected ?? false;

  private constructTopic(topic: string): string {
    return `${this.options.deviceUid}/${topic}/${this.clientId}`;
  }
}
