import { MqttClient } from './signaling/mqtt-client';
import { keepOnlyCodec } from './utils/rtc-tools';
import { IPiCamera, IPiCameraOptions, ISignalingClient } from './signaling/signaling-client';
import { CameraPropertyType, CameraPropertyValue } from './constants/camera-property';
import { Participant, Quality, RoomInfo, Speaking, WebSocketClient } from './signaling/websocket-client';
import { CmdType, VideoMetadata } from './rtc/cmd-message';
import { RtcPeerConfig } from './peer/rtc-peer';
import { CommanderPeer } from './peer/commander-peer';
import { SubscriberPeer } from './peer/subscriber-peer';
import { PublisherPeer } from './peer/publisher-peer';
import { DEFAULT } from './constants';

export class PiCamera implements IPiCamera {
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onDatachannel?: (cmdDataChannel: RTCDataChannel) => void;
  onSnapshot?: (base64: string) => void;
  onStream?: (stream: MediaStream) => void;
  onSfuStream?: (sid: string, stream: MediaStream) => void;
  onMetadata?: (metadata: VideoMetadata) => void;
  onProgress?: (received: number, total: number, type: CmdType) => void;
  onVideoDownloaded?: (file: Uint8Array) => void;
  onTimeout?: () => void;

  onRoomInfo?: (room: RoomInfo) => void;
  onQuility?: (quality: Quality[]) => void;
  onSpeaking?: (speaking: Speaking[]) => void;
  onParticipant?: (participant: Participant[]) => void;

  private options: IPiCameraOptions;
  private client: ISignalingClient<any, any>;
  private rtcTimer?: NodeJS.Timeout;

  private cmdPeer?: CommanderPeer;
  private subPeer?: SubscriberPeer;
  private pubPeer?: PublisherPeer;

  constructor(options: IPiCameraOptions) {
    this.options = this.initializeOptions(options);

    if (this.options.signaling === 'mqtt') {
      this.client = new MqttClient(this.options);
      this.CreateCmdPeer(this.client as MqttClient);
      this.client.onConnect = (conn) => this.mqttOnConnect(conn);
    } else if (this.options.signaling === 'websocket') {
      this.client = new WebSocketClient(this.options);
      this.setSfuServerEvent(this.client as WebSocketClient);
    } else {
      throw ("unknow signaling method.")
    }
  }

  connect = () => {
    this.client.connect();

    if (this.options.timeout !== 0) {
      this.rtcTimer = setTimeout(() => {
        if (this.cmdPeer?.connectionState === 'connected' ||
          this.subPeer?.connectionState === 'connected' ||
          this.pubPeer?.connectionState === 'connected') {
          return;
        }
        if (this.onTimeout) {
          this.onTimeout();
        }

        console.warn("RTC connection timeout.");
        this.terminate();
      }, this.options.timeout);
    }
  }

  terminate = () => {
    clearTimeout(this.rtcTimer);
    this.cmdPeer?.close();
    this.subPeer?.close();
    this.pubPeer?.close();
    this.client.disconnect();
    this.onConnectionState?.('closed');
    console.debug("PiCamera connections had been terminated.");
  }

  getStatus = (): RTCPeerConnectionState => {
    if (!this.cmdPeer) {
      return 'new';
    }
    return this.cmdPeer.connectionState;
  }

  getRecordingMetadata(param?: string | Date): void {
    if (this.onMetadata) {
      this.cmdPeer?.getRecordingMetadata(param);
    }
  }

  fetchRecordedVideo(path: string): void {
    if (this.onVideoDownloaded) {
      this.cmdPeer?.fetchRecordedVideo(path);
    }
  }

  setCameraProperty = (key: CameraPropertyType, value: CameraPropertyValue) => {
    this.cmdPeer?.setCameraProperty(key, value);
  }

  snapshot = (quality: number = 30) => {
    this.cmdPeer?.snapshot(quality);
  }

  toggleMic = (enabled: boolean = !this.options.isMicOn) => {
    this.cmdPeer?.toggleMic(enabled);
    this.pubPeer?.toggleMic(enabled);
    this.subPeer?.toggleMic(enabled);
  }

  toggleSpeaker = (enabled: boolean = !this.options.isSpeakerOn) => {
    this.cmdPeer?.toggleSpeaker(enabled);
    this.pubPeer?.toggleSpeaker(enabled);
    this.subPeer?.toggleSpeaker(enabled);
  }

  private initializeOptions(userOptions: IPiCameraOptions): IPiCameraOptions {
    const defaultOptions = {
      signaling: 'mqtt',
      mqttProtocol: 'wss',
      mqttPath: '',
      timeout: DEFAULT.SIGNALING_TIMEOUT,
      datachannelOnly: false,
      isMicOn: true,
      isSpeakerOn: true,
      credits: true,
    } as IPiCameraOptions;

    return { ...defaultOptions, ...userOptions };
  }

  private getRtcConfig = (options: IPiCameraOptions): RTCConfiguration => {
    let config: RTCConfiguration = {};
    config.iceServers = [];
    config.iceCandidatePoolSize = 10;
    if (options.stunUrls && options.stunUrls.length > 0) {
      config.iceServers.push({ urls: options.stunUrls });
    }

    if (options.turnUrl && options.turnUsername && options.turnPassword) {
      config.iceServers.push({
        urls: options.turnUrl,
        username: options.turnUsername,
        credential: options.turnPassword,
      });
    }
    return config;
  }

  private CreateCmdPeer = async (conn: MqttClient) => {
    this.cmdPeer = new CommanderPeer({
      options: this.options,
      ...this.getRtcConfig(this.options)
    });

    this.cmdPeer.onStream = (stream) => this.onStream?.(stream);
    this.cmdPeer.onSfuStream = (sid, stream) => this.onSfuStream?.(sid, stream);
    this.cmdPeer.onIceCandidate = (ice) => conn.send('ice', JSON.stringify(ice.candidate));
    this.cmdPeer.onConnectionStateChange = (state) => {
      this.onConnectionState?.(state);
      if (state === "connected" && this.client?.isConnected()) {
        this.client.disconnect();
      } else if (state === "failed") {
        this.terminate();
      }
    };

    this.cmdPeer.onSnapshot = (base64) => this.onSnapshot?.(base64);
    this.cmdPeer.onMetadata = (metadata) => this.onMetadata?.(metadata);
    this.cmdPeer.onProgress = (received, total, type) => this.onProgress?.(received, total, type);
    this.cmdPeer.onVideoDownloaded = (file) => this.onVideoDownloaded?.(file);
    this.cmdPeer.onDatachannel = (dc) => this.onDatachannel?.(dc);

    conn.onIceCandidate = (ice) => this.cmdPeer?.addIceCandidate(ice);
    conn.onAnswer = (sdp) => this.cmdPeer?.setRemoteDescription(sdp);
  }

  private mqttOnConnect = async (conn: MqttClient) => {
    console.debug("Mqtt connected!");

    const offer = await this.cmdPeer?.createOffer();

    if (this.options.codec && offer?.sdp) {
      offer.sdp = keepOnlyCodec(offer.sdp, this.options.codec);
    }

    if (offer) {
      conn.send('sdp', JSON.stringify(offer));
    }
  }

  private setSfuServerEvent(conn: WebSocketClient) {
    conn.onConnect = () => {
      // console.debug("WebSocket connected!");
    };

    conn.onJoin = async (server) => {
      let config: RtcPeerConfig = { options: this.options };
      config.iceServers = [server];

      this.pubPeer = new PublisherPeer(config);
      this.pubPeer.onIceCandidate = (ev) => {
        if (ev.candidate?.candidate) {
          conn.send('tricklePublisher', ev.candidate?.candidate);
        }
      }

      this.subPeer = new SubscriberPeer(config);
      this.subPeer.onStream = (stream) => this.onStream?.(stream);
      this.subPeer.onSfuStream = (sid, stream) => this.onSfuStream?.(sid, stream);
      this.subPeer.onIceCandidate = (ev) => {
        if (ev.candidate?.candidate) {
          conn.send('trickleSubscriber', ev.candidate?.candidate);
        }
      }

      const offer = await this.pubPeer.createOffer();
      conn.send('offer', offer.sdp);

      // conn.publish("addAudioTrack", this.trackId);
    };

    conn.onOffer = async (sdp) => {
      let answer = await this.subPeer?.createAnswer(sdp);
      if (answer) {
        conn.send('answer', answer.sdp);
      }
    };

    conn.onAnswer = async (sdp) => this.pubPeer?.setRemoteDescription(sdp);
    conn.onPublisherIce = async (ice) => this.pubPeer?.addIceCandidate(ice);
    conn.onSubscriberIce = async (ice) => this.subPeer?.addIceCandidate(ice);

    conn.onTrackPublished = () => {
      // let offer = await this.pubPeer?.createOffer();
      // this.pubPeer?.setLocalDescription(offer);
      // if (offer?.sdp) {
      //   conn.publish('offer', offer.sdp);
      // }
    };

    conn.onParticipant = (msg) => this.onParticipant?.(msg);
    conn.onRoomInfo = (msg) => this.onRoomInfo?.(msg);
    conn.onQuility = (msg) => this.onQuility?.(msg);
    conn.onSpeaking = (msg) => this.onSpeaking?.(msg);

    conn.onLeave = async () => conn.disconnect();
  }
}
