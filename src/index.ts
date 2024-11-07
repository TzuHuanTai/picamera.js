import { IMqttConnectionOptions, MqttClient } from './mqttClient';
import {
  arrayBufferToBase64,
  arrayBufferToString,
  CommandType,
  generateUid,
  RtcMessage
} from './rtcUtils';

const MQTT_SDP_TOPIC: string = "sdp";
const MQTT_ICE_TOPIC: string = "ice";
const DEFAULT_TIMEOUT: number = 10000;

export interface IPiCameraOptions extends IMqttConnectionOptions {
  stunUrls: string[];
  turnUrl?: string;
  turnUsername?: string;
  turnPassword?: string;
  timeout?: number;
}

export class PiCamera {
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onDatachannel?: (dataChannel: RTCDataChannel) => void;
  onSnapshot?: (base64: string) => void;
  onTimeout?: () => void;

  private options: IPiCameraOptions;
  private mqttClient?: MqttClient;
  private rtcTimer?: NodeJS.Timeout;
  private rtcPeer?: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;

  private cacheIceList: RTCIceCandidate[] = [];
  private receivedLength: number = 0;
  private isFirstPacket: boolean = true;
  private completeFile: Uint8Array = new Uint8Array();

  constructor(options: IPiCameraOptions) {
    this.options = options;
  }

  connect = () => {
    this.mqttClient = new MqttClient(this.options);
    this.mqttClient.onConnect = async (conn: MqttClient) => {
      this.rtcPeer = this.createPeer();

      conn.subscribe(MQTT_SDP_TOPIC, this.handleSdpMessage);
      conn.subscribe(MQTT_ICE_TOPIC, this.handleIceMessage);

      const offer = await this.rtcPeer.createOffer({});
      this.rtcPeer?.setLocalDescription(offer);
      conn.publish(MQTT_SDP_TOPIC, JSON.stringify(offer));
    }

    this.mqttClient.connect();

    this.rtcTimer = setTimeout(() => {
      if (this.onTimeout) {
        this.onTimeout();
      }
      this.terminate();
    }, this.options.timeout ?? DEFAULT_TIMEOUT);
  }

  terminate = () => {
    clearTimeout(this.rtcTimer);

    if (this.dataChannel) {
      if (this.dataChannel.readyState === 'open') {
        const command = new RtcMessage(CommandType.CONNECT, "false");
        this.dataChannel.send(command.ToString());
      }
      this.dataChannel.close();
      this.dataChannel = undefined;
    }

    if (this.rtcPeer) {
      this.rtcPeer.close();
      this.rtcPeer = undefined;
    }

    if (this.mqttClient) {
      this.mqttClient.disconnect();
      this.mqttClient = undefined;
    }
  }

  getStatus = (): RTCPeerConnectionState | void => {
    return this.rtcPeer?.connectionState;
  }

  snapshot = (quality: number = 30) => {
    if (this.dataChannel?.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = new RtcMessage(CommandType.SNAPSHOT, String(quality));
      this.dataChannel.send(command.ToString());
    }
  }

  private getRtcConfig = (): RTCConfiguration => {
    let config: RTCConfiguration = {};
    config.iceServers = [];
    config.iceCandidatePoolSize = 10;
    config.iceServers.push({ urls: this.options.stunUrls });

    if (this.options.turnUrl && this.options.turnUsername && this.options.turnPassword) {
      config.iceServers.push({
        urls: this.options.turnUrl,
        username: this.options.turnUsername,
        credential: this.options.turnPassword,
      });
    }
    return config;
  }

  private createPeer = (): RTCPeerConnection => {
    const peer = new RTCPeerConnection(this.getRtcConfig());

    peer.addEventListener("icecandidate", (e) => {
      if (e.candidate && this.mqttClient?.isConnected()) {
        this.mqttClient.publish(MQTT_ICE_TOPIC, JSON.stringify(e.candidate));
      }
    });

    this.dataChannel = peer.createDataChannel(generateUid(10), {
      negotiated: true,
      ordered: true,
      id: 0,
    });
    this.dataChannel.addEventListener("open", () => {
      if (this.onDatachannel && this.dataChannel) {
        this.onDatachannel(this.dataChannel);
      }
    });

    this.dataChannel.addEventListener("message", e => {
      const packet = new Uint8Array(e.data as ArrayBuffer);
      const header = packet[0];
      const body = packet.slice(1);

      switch (header) {
        case CommandType.SNAPSHOT:
          this.receiveSnapshot(body);
          break;
      }
    });

    peer.addEventListener("connectionstatechange", () => {
      if (this.onConnectionState) {
        this.onConnectionState(peer.connectionState);
      }

      if (peer.connectionState === "connected" && this.mqttClient?.isConnected()) {
        this.mqttClient.disconnect();
        this.mqttClient = undefined;
      } else if (peer.connectionState === "failed") {
        this.terminate();
      }
    });

    return peer;
  }

  private receiveSnapshot = (body: Uint8Array) => {
    if (!this.onSnapshot) {
      return;
    }

    if (this.isFirstPacket) {
      this.completeFile = new Uint8Array(Number(arrayBufferToString(body)));
      this.isFirstPacket = false;
    } else if (body.byteLength > 0) {
      this.completeFile.set(body, this.receivedLength);
      this.receivedLength += body.byteLength;
    } else if (body.byteLength === 0) {
      this.receivedLength = 0;
      this.isFirstPacket = true;
      this.setWartermark(
        "data:image/jpeg;base64," + arrayBufferToBase64(this.completeFile),
        'github.com/TzuHuanTai').then(base64Image => {
          if (this.onSnapshot) {
            this.onSnapshot(base64Image);
          }
        });
    }
  }

  private setWartermark = (base64Image: string, watermarkText: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = base64Image;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        const fontSize = Math.max(20, canvas.width * 0.05);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const padding = 10;
        ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);

        resolve(canvas.toDataURL());
      };

      img.onerror = () => reject(new Error("Failed to load shapshot."));
    });
  }

  private handleSdpMessage = (message: string) => {
    const sdp = JSON.parse(message) as RTCSessionDescription;
    this.rtcPeer?.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  private handleIceMessage = (message: string) => {
    const ice = JSON.parse(message) as RTCIceCandidate;
    if (this.rtcPeer?.currentRemoteDescription) {
      this.rtcPeer.addIceCandidate(new RTCIceCandidate(ice));

      while (this.cacheIceList.length > 0) {
        const cacheIce = this.cacheIceList.shift();
        this.rtcPeer.addIceCandidate(new RTCIceCandidate(cacheIce));
      }
    } else {
      this.cacheIceList.push(ice);
    }
  }
}
