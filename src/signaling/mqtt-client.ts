import mqtt, { MqttClient as MqttLibClient, IClientOptions, MqttProtocol } from 'mqtt';
import { IPiCameraOptions, ISignalingClient } from './signaling-client';

export type MqttTopicType = 'sdp' | 'ice';

export interface IMqttConnectionOptions {
  deviceUid?: string;
  mqttHost?: string;
  mqttPath?: string;
  mqttPort?: number;
  mqttProtocol?: MqttProtocol;
  mqttUsername?: string;
  mqttPassword?: string;
}

export class MqttClient implements ISignalingClient<MqttClient, MqttTopicType> {
  private options: IPiCameraOptions;
  private clientId: string;
  private client: MqttLibClient;

  public onConnect?: (conn: MqttClient) => void;
  public onIceCandidate?: (candidate: RTCIceCandidate) => void;
  public onAnswer?: (sdp: RTCSessionDescription) => void;

  constructor(options: IPiCameraOptions) {
    this.options = options;
    this.clientId = crypto.randomUUID();
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
    this.client.subscribe(this.getFullTopic('sdp'), { qos: 2 });
    this.client.subscribe(this.getFullTopic('ice'), { qos: 2 });
  }

  connect = () => {
    this.client.on('connect', () => {
      console.debug(`MQTT connection "${this.options.deviceUid}"(${this.clientId}) established.`);
      this.onConnect?.(this);
    });

    this.client.on('message', (topic, message) => this.handleMessage(topic, message.toString()));

    this.client.connect();
  }

  private handleMessage(topic: string, message: string) {
    console.debug(`Received message on topic :"${topic}"`,  message);

    switch (topic) {
      case this.getFullTopic('ice'):
        const iceCandidate: RTCIceCandidate = JSON.parse(message);
        this.onIceCandidate?.(iceCandidate);
        break;
      case this.getFullTopic('sdp'):
        const sdp: RTCSessionDescription = JSON.parse(message);
        this.onAnswer?.(sdp);
        break;
      default:
        console.warn(`Unknown topic: ${topic}`);
        return;
    }
  }

  send = (topic: MqttTopicType, message: string) => {
    if (!this.isConnected()) {
      console.warn("Publish failed: client is not connected.");
      return;
    }

    const destination = `${this.getFullTopic(topic)}/offer`;
    this.client.publish(destination, message);
  }

  disconnect = () => {
    if (this.client.disconnected) return;

    console.debug(`Terminating "${this.options.deviceUid}" MQTT connection.`);
    this.client.unsubscribe(this.getFullTopic('sdp'));
    this.client.unsubscribe(this.getFullTopic('ice'));
    this.client.end(true);
  }

  isConnected = (): boolean => this.client.connected ?? false;

  private getFullTopic(topic: MqttTopicType): string {
    return `${this.options.deviceUid}/${topic}/${this.clientId}`;
  }
}
