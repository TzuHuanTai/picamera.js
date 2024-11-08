import { IMqttConnectionOptions, MqttClient } from '../mqtt/mqttClient';
import {
  arrayBufferToBase64,
  arrayBufferToString,
  CommandType,
  generateUid,
  RtcMessage
} from './rtcUtils';
import { addWatermarkToImage, addWatermarkToStream } from '../utils/watermark';

const MQTT_SDP_TOPIC: string = "sdp";
const MQTT_ICE_TOPIC: string = "ice";
const DEFAULT_TIMEOUT: number = 10000;

export interface IPiCameraOptions extends IMqttConnectionOptions {
  stunUrls: string[];
  turnUrl?: string;
  turnUsername?: string;
  turnPassword?: string;
  timeout?: number;
  datachannelOnly?: boolean;
  defaultMicOn?: boolean;
  defaultSpeakerOn?: boolean;
}

export class PiCamera {
  /**
   * webrtc peer connection state changed event.
   */
  onConnectionState?: (state: RTCPeerConnectionState) => void;

  /**
   * This event is triggered when the datachannel is opened.
   */
  onDatachannel?: (dataChannel: RTCDataChannel) => void;

  /**
   * This event is triggered when the snapshot image is completely received.
   */
  onSnapshot?: (base64: string) => void;

  /**
   * The event is triggered if the connection is not connected in time. It'll execute terminate() afterward.
   */
  onTimeout?: () => void;

  private options: IPiCameraOptions;
  private mqttClient?: MqttClient;
  private rtcTimer?: NodeJS.Timeout;
  private rtcPeer?: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private mediaElement?: HTMLVideoElement;

  private cacheIceList: RTCIceCandidate[] = [];
  private receivedLength: number = 0;
  private isFirstPacket: boolean = true;
  private completeFile: Uint8Array = new Uint8Array();

  constructor(options: IPiCameraOptions) {
    this.options = this.initializeOptions(options);
  }

  attach = (mediaElement: HTMLVideoElement) => {
    this.mediaElement = mediaElement;
  }

  connect = () => {
    this.mqttClient = new MqttClient(this.options);
    this.mqttClient.onConnect = async (conn: MqttClient) => {
      this.rtcPeer = await this.createPeer();

      conn.subscribe(MQTT_SDP_TOPIC, this.handleSdpMessage);
      conn.subscribe(MQTT_ICE_TOPIC, this.handleIceMessage);

      const offer = await this.rtcPeer.createOffer({});
      this.rtcPeer?.setLocalDescription(offer);
      conn.publish(MQTT_SDP_TOPIC, JSON.stringify(offer));
    }

    this.mqttClient.connect();

    this.rtcTimer = setTimeout(() => {
      if (this.rtcPeer?.connectionState === 'connected' ||
        this.rtcPeer?.connectionState === 'closed'
      ) {
        return;
      }

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
        this.dataChannel.send(JSON.stringify(command));
      }
      this.dataChannel.close();
      this.dataChannel = undefined;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => { track.stop() });
      this.localStream = undefined;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => { track.stop() });
      this.remoteStream = undefined;
    }

    if (this.mediaElement) {
      this.mediaElement.srcObject = null;
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

  /**
   * require a jpeg image in quility between 0 to 100 (lower to higher).
   */
  snapshot = (quality: number = 30) => {
    if (this.dataChannel?.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = new RtcMessage(CommandType.SNAPSHOT, String(quality));
      this.dataChannel.send(JSON.stringify(command));
    }
  }

  toggleMic = (enabled = true) => {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  };

  toggleSpeaker = (enabled = true) => {
    if (this.remoteStream) {
      this.remoteStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }

    if (this.mediaElement) {
      this.mediaElement.muted = !enabled;
    }
  };

  private initializeOptions(userOptions: IPiCameraOptions): IPiCameraOptions {
    const defaultOptions = {
      timeout: DEFAULT_TIMEOUT,
      datachannelOnly: false,
      defaultMicOn: true,
      defaultSpeakerOn: true,
    };

    return { ...defaultOptions, ...userOptions };
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

  private createPeer = async (): Promise<RTCPeerConnection> => {
    const peer = new RTCPeerConnection(this.getRtcConfig());

    if (!this.options.datachannelOnly) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false,
      });

      this.localStream.getAudioTracks().forEach(track => {
        peer.addTrack(track, this.localStream!);
        track.enabled = this.options.defaultMicOn ?? false;
      });
      peer.addTransceiver("video", { direction: "recvonly" });
      peer.addTransceiver("audio", { direction: "sendrecv" });

      peer.addEventListener("track", (e) => {
        this.remoteStream = new MediaStream();
        e.streams[0].getTracks().forEach((track) => {
          this.remoteStream?.addTrack(track);
          if (track.kind === "audio") {
            track.enabled = this.options.defaultSpeakerOn ?? false;
          }
        });

        if (this.mediaElement) {
          this.mediaElement.srcObject =
            addWatermarkToStream(
              this.remoteStream, 'github.com/TzuHuanTai'
            );
        }
      });
    }

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
    this.dataChannel.binaryType = "arraybuffer";
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
      addWatermarkToImage(
        "data:image/jpeg;base64," + arrayBufferToBase64(this.completeFile),
        'github.com/TzuHuanTai').then(base64Image => {
          if (this.onSnapshot) {
            this.onSnapshot(base64Image);
          }
        });
    }
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
