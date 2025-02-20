import { MqttClient } from '../mqtt/mqtt-client';
import {
  arrayBufferToBase64,
  arrayBufferToString,
  generateUid,
  keepOnlyCodec,
  padZero
} from '../utils/rtc-tools';
import { CommandType, MetadataCommand } from './command';
import { DEFAULT_TIMEOUT, MQTT_ICE_TOPIC, MQTT_SDP_TOPIC } from '../constants';
import { CameraOptionMessage, MetaCmdMessage, RtcMessage, VideoMetadata } from './message';
import { IPiCamera, IPiCameraOptions } from './pi-camera.interface';
import { CameraOptionType, CameraOptionValue } from './camera-options';
import { addWatermarkToImage, addWatermarkToStream } from '../utils/watermark';
import { DataChannelReceiver } from './datachannel-receiver';

export class PiCamera implements IPiCamera {
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onDatachannel?: (dataChannel: RTCDataChannel) => void;
  onSnapshot?: (base64: string) => void;
  onMetadata?: ((metadata: VideoMetadata) => void);
  onTimeout?: () => void;

  private options: IPiCameraOptions;
  private mqttClient?: MqttClient;
  private rtcTimer?: NodeJS.Timeout;
  private rtcPeer?: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
  private mediaElement?: HTMLVideoElement;
  private pendingIceCandidates: RTCIceCandidate[] = [];

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

      if (this.options.codec && offer.sdp) {
        offer.sdp = keepOnlyCodec(offer.sdp, this.options.codec);
      }

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
        this.dataChannel.send(command.ToString());
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

  getRecordingMetadata(param?: string | Date): void {
    if (this.onMetadata && this.dataChannel?.readyState === 'open') {
      let metaCmd: MetaCmdMessage;

      if (param === undefined) {
        metaCmd = new MetaCmdMessage(MetadataCommand.LATEST, "");
      } else if (typeof param === "string") {
        metaCmd = new MetaCmdMessage(MetadataCommand.OLDER, param);
      } else {
        const formattedDate = `${param.getFullYear()}${padZero(param.getMonth() + 1)}${padZero(param.getDate())}` +
          "_" + `${padZero(param.getHours())}${padZero(param.getMinutes())}${padZero(param.getSeconds())}`;
        metaCmd = new MetaCmdMessage(MetadataCommand.SPECIFIC_TIME, formattedDate);
      }

      const command = new RtcMessage(CommandType.METADATA, metaCmd.ToString());
      this.dataChannel.send(command.ToString());
    }
  }

  setCameraOption = (key: CameraOptionType, value: CameraOptionValue) => {
    if (this.dataChannel?.readyState === 'open') {
      const option = new CameraOptionMessage(key, value);
      const command = new RtcMessage(CommandType.CAMERA_CONTROL, JSON.stringify(option));
      this.dataChannel.send(command.ToString());
    }
  }

  snapshot = (quality: number = 30) => {
    if (this.onSnapshot && this.dataChannel?.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = new RtcMessage(CommandType.SNAPSHOT, String(quality));
      this.dataChannel.send(command.ToString());
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
      credits: true,
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
          this.mediaElement.srcObject = this.options.credits ?
            addWatermarkToStream(
              this.remoteStream, 'github.com/TzuHuanTai'
            ) : this.remoteStream;
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
          this.snapshotReceiver.receiveData(body);
          break;
        case CommandType.METADATA:
          this.metadataReceiver.receiveData(body);
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

    peer.addEventListener("icegatheringstatechange", e => {
      console.debug("peer.iceGatheringState: ", peer.iceGatheringState);

      if (peer.iceGatheringState === "complete") {
        console.debug("peer.localDescription: ", peer.localDescription);
      }
    });

    return peer;
  }

  private snapshotReceiver = new DataChannelReceiver((body) => {
    addWatermarkToImage(
      "data:image/jpeg;base64," + arrayBufferToBase64(body),
      this.options.credits ? 'github.com/TzuHuanTai' : ''
    ).then(base64Image => {
      if (this.onSnapshot) {
        this.onSnapshot(base64Image);
      }
    });
  });

  private metadataReceiver = new DataChannelReceiver((body) => {
    let bodyStr = arrayBufferToString(body);
    let parsedBody = JSON.parse(bodyStr) as VideoMetadata;

    if (this.onMetadata) {
      this.onMetadata(parsedBody);
    }
  });

  private handleSdpMessage = (message: string) => {
    const sdp = JSON.parse(message) as RTCSessionDescription;
    this.rtcPeer?.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  private handleIceMessage = (message: string) => {
    const ice = JSON.parse(message) as RTCIceCandidate;
    if (this.rtcPeer?.currentRemoteDescription) {
      this.rtcPeer.addIceCandidate(new RTCIceCandidate(ice));

      while (this.pendingIceCandidates.length > 0) {
        const cacheIce = this.pendingIceCandidates.shift();
        this.rtcPeer.addIceCandidate(new RTCIceCandidate(cacheIce));
      }
    } else {
      this.pendingIceCandidates.push(ice);
    }
  }
}
