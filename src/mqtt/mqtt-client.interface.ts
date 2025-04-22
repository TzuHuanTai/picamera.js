import { MqttProtocol } from 'mqtt';

export type TopicType = 'sdp' | 'ice';

export interface IMqttConnectionOptions {
  deviceUid: string;
  mqttHost: string;
  mqttPath: string;
  mqttPort: number;
  mqttProtocol?: MqttProtocol;
  mqttUsername: string;
  mqttPassword: string;
}
