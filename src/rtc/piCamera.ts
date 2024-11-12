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
  isMicOn?: boolean;
  isSpeakerOn?: boolean;
}

interface IPiCamera {
  // Events
  /**
   * Emitted when the WebRTC peer connection state changes.
   *
   * @param state - The new state of the RTCPeerConnection.
   */
  onConnectionState?: (state: RTCPeerConnectionState) => void;

  /**
   * Emitted when the data channel is successfully opened.
   *
   * @param dataChannel - The opened RTCDataChannel instance for data communication.
   */
  onDatachannel?: (dataChannel: RTCDataChannel) => void;

  /**
   * Emitted after calling the `snapshot()` method. This event emits a base64-encoded image 
   * once all image packets are received from the server.
   *
   * @param base64 - The base64 string representing the captured image.
   */
  onSnapshot?: (base64: string) => void;

  /**
   * Emitted when the P2P connection cannot be established within the allotted time. 
   * Automatically triggers the `terminate()` function.
   */
  onTimeout?: () => void;

  // Methods
  /**
   * Attaches the remote media stream to the specified media element for playback.
   *
   * @param mediaElement - The HTML video element where the remote media stream will be rendered.
   */
  attach(mediaElement: HTMLVideoElement): void;

  /**
   * Start trying to establish the WebRTC connection.
   */
  connect(): void;

  /**
   * Terminates the WebRTC connection.
   */
  terminate(): void;

  /**
   * Retrieves the current connection status.
   */
  getStatus(): RTCPeerConnectionState;

  /**
   * Requests a snapshot image from the server.
   * 
   * @param quality - The range from `0` to `100`, determines the image quality. The default value is `30`.
   */
  snapshot(quality?: number): void;

  /**
   * Toggles the **local** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.
   * @param enabled 
   */
  toggleMic(enabled?: boolean): void;

  /**
   * Toggles the **remote** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.
   * @param enabled
   */
  toggleSpeaker(enabled?: boolean): void;
}

export class PiCamera implements IPiCamera {
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onDatachannel?: (dataChannel: RTCDataChannel) => void;
  onSnapshot?: (base64: string) => void;
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
    }, this.options.timeout);
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

    if (this.onConnectionState) {
      this.onConnectionState('closed');
    }
  }

  getStatus = (): RTCPeerConnectionState => {
    if (!this.rtcPeer) {
      return 'new';
    }
    return this.rtcPeer.connectionState;
  }

  snapshot = (quality: number = 30) => {
    if (this.dataChannel?.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = new RtcMessage(CommandType.SNAPSHOT, String(quality));
      this.dataChannel.send(JSON.stringify(command));
    }
  }

  toggleMic = (enabled: boolean = !this.options.isMicOn) => {
    this.options.isMicOn = enabled;
    this.toggleTrack(this.options.isMicOn, this.localStream);
  };

  toggleSpeaker = (enabled: boolean = !this.options.isSpeakerOn) => {
    this.options.isSpeakerOn = enabled;
    this.toggleTrack(this.options.isSpeakerOn, this.remoteStream);

    if (this.mediaElement) {
      this.mediaElement.muted = !this.options.isSpeakerOn;
    }
  };

  private toggleTrack = (isOn: boolean, stream?: MediaStream) => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = isOn;
    });
  };

  private initializeOptions(userOptions: IPiCameraOptions): IPiCameraOptions {
    const defaultOptions = {
      mqttProtocol: 'wss',
      mqttPath: '',
      timeout: DEFAULT_TIMEOUT,
      datachannelOnly: false,
      isMicOn: true,
      isSpeakerOn: true,
    } as IPiCameraOptions;

    return { ...defaultOptions, ...userOptions };
  }

  private getRtcConfig = (): RTCConfiguration => {
    let config: RTCConfiguration = {};
    config.iceServers = [];
    config.iceCandidatePoolSize = 10;
    if (this.options.stunUrls && this.options.stunUrls.length > 0) {
      config.iceServers.push({ urls: this.options.stunUrls });
    }

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
        track.enabled = this.options.isMicOn ?? false;
      });
      peer.addTransceiver("video", { direction: "recvonly" });
      peer.addTransceiver("audio", { direction: "sendrecv" });

      peer.addEventListener("track", (e) => {
        this.remoteStream = new MediaStream();
        e.streams[0].getTracks().forEach((track) => {
          this.remoteStream?.addTrack(track);
          if (track.kind === "audio") {
            track.enabled = this.options.isSpeakerOn ?? false;
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
