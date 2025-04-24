import { MqttClient } from '../mqtt/mqtt-client';
import {
  arrayBufferToBase64,
  arrayBufferToString,
  keepOnlyCodec,
  padZero
} from '../utils/rtc-tools';
import { CameraCtlMessage, MetaCmdMessage, RtcMessage, VideoMetadata } from './message';
import {
  IPiCamera,
  IPiCameraOptions,
  ISignalingClient,
  CommandType,
  MetadataCommand,
  DataChannelEnum
} from './pi-camera.interface';
import { CameraPropertyType, CameraPropertyValue } from './camera-property';
import { addWatermarkToStream } from '../utils/watermark';
import { DataChannelReceiver } from './datachannel-receiver';
import { WebSocketClient } from '../websocket/websocket-client';
import { TrickleResponse } from '../websocket/websocket-client.interface';

export class PiCamera implements IPiCamera {
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onDatachannel?: (cmdDataChannel: RTCDataChannel) => void;
  onSnapshot?: (base64: string) => void;
  onStream?: (stream: MediaStream | undefined) => void;
  onMetadata?: (metadata: VideoMetadata) => void;
  onProgress?: (received: number, total: number, type: CommandType) => void;
  onVideoDownloaded?: (file: Uint8Array) => void;
  onTimeout?: () => void;

  private options: IPiCameraOptions;
  private client: ISignalingClient;
  private rtcTimer?: NodeJS.Timeout;

  private subPeer?: RTCPeerConnection;
  private pubPeer?: RTCPeerConnection;

  private cmdDataChannel?: RTCDataChannel;
  trackId: string = "";
  private localStream?: MediaStream;
  private remoteStream: MediaStream = new MediaStream();
  private pendingIceCandidates: RTCIceCandidate[] = [];
  private pendingPubIceCandidates: RTCIceCandidate[] = [];
  private pendingSubIceCandidates: RTCIceCandidate[] = [];

  constructor(options: IPiCameraOptions) {
    this.options = this.initializeOptions(options);

    if (this.options.signaling === 'mqtt') {
      this.client = new MqttClient(this.options);
      this.client.onConnect = this.mqttOnConnect;
    } else if (this.options.signaling === 'websocket') {
      this.client = new WebSocketClient(this.options);
      this.InitializeWsSubscriptions(this.client);
      this.client.onConnect = this.wsOnConnect;
    } else {
      throw ("unknow signaling method.")
    }
  }

  connect = () => {
    this.client.connect();

    this.rtcTimer = setTimeout(() => {
      if (this.subPeer?.connectionState === 'connected' ||
        this.subPeer?.connectionState === 'closed'
      ) {
        return;
      }

      if (this.onTimeout) {
        this.onTimeout();
      }

      console.warn("RTC connection timeout.");
      this.terminate();
    }, this.options.timeout);
  }

  terminate = () => {
    clearTimeout(this.rtcTimer);

    this.snapshotReceiver.reset();
    this.metadataReceiver.reset();
    this.recordingReceiver.reset();

    if (this.cmdDataChannel) {
      if (this.cmdDataChannel.readyState === 'open') {
        const command = new RtcMessage(CommandType.CONNECT, "false");
        this.cmdDataChannel.send(command.ToString());
      }
      this.cmdDataChannel.close();
      this.cmdDataChannel = undefined;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.info("stop local track:", track.id);
      });
      this.localStream = undefined;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => {
        track.stop();
        this.remoteStream.removeTrack(track);
      });

      if (this.onStream) {
        this.onStream(this.remoteStream);
      }
    }

    if (this.subPeer) {
      this.subPeer.close();
      this.subPeer = undefined;
    }

    if (this.pubPeer) {
      this.pubPeer.close();
      this.pubPeer = undefined;
    }

    if (this.client) {
      this.client.disconnect();
    }

    if (this.onConnectionState) {
      this.onConnectionState('closed');
    }
  }

  getStatus = (): RTCPeerConnectionState => {
    if (!this.subPeer) {
      return 'new';
    }
    return this.subPeer.connectionState;
  }

  getRecordingMetadata(param?: string | Date): void {
    if (this.onMetadata && this.cmdDataChannel?.readyState === 'open') {
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
      this.cmdDataChannel.send(command.ToString());
    }
  }

  fetchRecordedVideo(path: string): void {
    if (this.onVideoDownloaded && this.cmdDataChannel?.readyState === 'open') {
      const command = new RtcMessage(CommandType.RECORDING, path);
      this.cmdDataChannel.send(command.ToString());
    }
  }

  setCameraProperty = (key: CameraPropertyType, value: CameraPropertyValue) => {
    if (this.cmdDataChannel?.readyState === 'open') {
      const ctl = new CameraCtlMessage(key, value);
      const command = new RtcMessage(CommandType.CAMERA_CONTROL, JSON.stringify(ctl));
      this.cmdDataChannel.send(command.ToString());
    }
  }

  snapshot = (quality: number = 30) => {
    if (this.onSnapshot && this.cmdDataChannel?.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = new RtcMessage(CommandType.SNAPSHOT, String(quality));
      this.cmdDataChannel.send(command.ToString());
    }
  }

  toggleMic = (enabled: boolean = !this.options.isMicOn) => {
    this.options.isMicOn = enabled;
    this.toggleTrack(this.options.isMicOn, this.localStream);
  };

  toggleSpeaker = (enabled: boolean = !this.options.isSpeakerOn) => {
    this.options.isSpeakerOn = enabled;
    this.toggleTrack(this.options.isSpeakerOn, this.remoteStream);
  };

  private toggleTrack = (isOn: boolean, stream?: MediaStream) => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = isOn;
    });
  };

  private initializeOptions(userOptions: IPiCameraOptions): IPiCameraOptions {
    const defaultOptions = {
      signaling: 'mqtt',
      mqttProtocol: 'wss',
      mqttPath: '',
      timeout: 10000,
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

  private createCmdPeer = async (): Promise<RTCPeerConnection> => {
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

      peer.ontrack = (e) => {
        e.streams[0].getTracks().forEach((track) => {
          this.remoteStream?.addTrack(track);
          if (track.kind === "audio") {
            track.enabled = this.options.isSpeakerOn ?? false;
          }
        });

        if (this.onStream) {
          this.onStream(this.options.credits ?
            addWatermarkToStream(
              this.remoteStream, 'github.com/TzuHuanTai'
            ) : this.remoteStream);
        }
      };
    }

    this.cmdDataChannel = peer.createDataChannel('cmd_channel', {
      negotiated: true,
      ordered: true,
      id: DataChannelEnum.Command,
    });
    this.cmdDataChannel.binaryType = "arraybuffer";
    this.cmdDataChannel.onopen = () => {
      if (this.onDatachannel && this.cmdDataChannel) {
        this.onDatachannel(this.cmdDataChannel);
      }
    };

    this.cmdDataChannel.onmessage = e => {
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
        case CommandType.RECORDING:
          this.recordingReceiver.receiveData(body);
          break;
      }
    };

    peer.onconnectionstatechange = () => {
      if (this.onConnectionState) {
        this.onConnectionState(peer.connectionState);
      }

      if (peer.connectionState === "connected" && this.client?.isConnected()) {
        this.client.disconnect();
      } else if (peer.connectionState === "failed") {
        this.terminate();
      }
    };

    return peer;
  }

  private createSubPeer = async (config: RTCConfiguration): Promise<RTCPeerConnection> => {
    const peer = new RTCPeerConnection(config);

    peer.onconnectionstatechange = (ev) => {
      console.debug(`sub peer onconnectionstatechange: ${peer.connectionState}`);
    }

    peer.ontrack = (e) => {
      e.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
        if (track.kind === "audio") {
          track.enabled = this.options.isSpeakerOn ?? false;
        }
      });

      console.debug(`on sub track: ${e.track.id}`);

      if (this.onStream) {
        this.onStream(this.remoteStream);
      }
    };

    console.debug(`sub peer is created`);

    return peer;
  }

  private createPubPeer = async (config: RTCConfiguration): Promise<RTCPeerConnection> => {
    const peer = new RTCPeerConnection(config);

    // this.localStream = await navigator.mediaDevices.getUserMedia({
    //   audio: {
    //     echoCancellation: true,
    //     noiseSuppression: true,
    //     autoGainControl: true
    //   },
    //   video: false,
    // });

    // this.localStream.getAudioTracks().forEach(track => {
    //   this.trackId = track.id;
    //   console.info("add local audio track:", track.id);
    //   peer.addTrack(track, this.localStream!);
    //   track.enabled = this.options.isMicOn ?? false;
    // });

    peer.onconnectionstatechange = (ev) => {
      console.debug(`pub peer onconnectionstatechange: ${peer.connectionState}`);
    }

    console.debug(`pub peer create data channels`);
    peer.createDataChannel('_lossy', {
      ordered: true,
      maxRetransmits: 0,
    });
    peer.createDataChannel('_reliable', {
      ordered: true,
    });

    console.debug(`pub peer is created`);

    return peer;
  }

  private mqttOnConnect = async (conn: ISignalingClient) => {
    console.debug("Mqtt connected!");
    clearTimeout(this.rtcTimer);

    this.createCmdPeer().then(async peer => {

      conn.subscribe('sdp', (sdp) => {
        this.handleSdpMessage(peer, sdp);
      });
      conn.subscribe('ice', (ice) => {
        this.handleIceMessage(peer, ice);
      });

      const offer = await peer.createOffer({});

      if (this.options.codec && offer.sdp) {
        offer.sdp = keepOnlyCodec(offer.sdp, this.options.codec);
      }

      peer.setLocalDescription(offer);
      peer.onicecandidate = (e) => {
        if (e.candidate && conn.isConnected()) {
          conn.publish('ice', JSON.stringify(e.candidate));
        }
      }
      conn.publish('sdp', JSON.stringify(offer));

      this.subPeer = peer;
    });
  }

  private wsOnConnect = (conn: ISignalingClient) => {
    console.debug("Websocket connected!");
    clearTimeout(this.rtcTimer);
  }

  private InitializeWsSubscriptions(conn: ISignalingClient) {
    conn.subscribe('join', async (msg) => {
      console.debug("InitializeWsSubscriptions join message:", msg);
      let servers: RTCIceServer = JSON.parse(msg);
      let config: RTCConfiguration = {};
      config.iceServers = [];
      config.iceServers.push(servers);

      this.pubPeer = await this.createPubPeer(config);
      this.pubPeer.onicecandidate = (ev) => {
        if (ev.candidate?.candidate) {
          conn.publish('tricklePublisher', ev.candidate?.candidate);
        }
      }

      config = {};
      config.iceServers = [];
      config.iceServers.push(servers);
      this.subPeer = await this.createSubPeer(config);
      this.subPeer.onicecandidate = (ev) => {
        if (ev.candidate?.candidate) {
          conn.publish('trickleSubscriber', ev.candidate?.candidate);
        }
      }

      let offer = await this.pubPeer!.createOffer();
      this.pubPeer!.setLocalDescription(offer);
      if (offer.sdp) {
        conn.publish('offer', offer.sdp);
      }

      // conn.publish("addAudioTrack", this.trackId);
    });

    conn.subscribe('offer', async (sdp) => {
      this.subPeer!.setRemoteDescription({ type: "offer", sdp: sdp } as RTCSessionDescriptionInit);
      let answer = await this.subPeer?.createAnswer();
      this.subPeer!.setLocalDescription(answer);
      if (answer?.sdp) {
        conn.publish('answer', answer.sdp);
      }
    });

    conn.subscribe('answer', async (sdp) => {
      this.pubPeer!.setRemoteDescription({ type: "answer", sdp: sdp } as RTCSessionDescriptionInit);
      console.debug("pubPeer set remote description:", this.pubPeer?.signalingState);
    });

    conn.subscribe('trackPublished', async () => {
      // let offer = await this.pubPeer?.createOffer();
      // this.pubPeer?.setLocalDescription(offer);
      // if (offer?.sdp) {
      //   conn.publish('offer', offer.sdp);
      // }
    });

    conn.subscribe('trickle', async (msg) => {
      let trickle = TrickleResponse.fromJson(msg);
      if (trickle.target === 'PUBLISHER') {
        if (this.pubPeer?.remoteDescription) {
          this.pubPeer.addIceCandidate(trickle.candidateInit);

          while (this.pendingPubIceCandidates.length > 0) {
            const cacheIce = this.pendingPubIceCandidates.shift();
            if (cacheIce) {
              this.pubPeer.addIceCandidate(cacheIce);
            }
          }
        } else {
          this.pendingPubIceCandidates.push(new RTCIceCandidate(trickle.candidateInit));
        }
      } else if (trickle.target === 'SUBSCRIBER') {
        if (this.subPeer?.remoteDescription) {
          this.subPeer.addIceCandidate(trickle.candidateInit);

          while (this.pendingSubIceCandidates.length > 0) {
            const cacheIce = this.pendingSubIceCandidates.shift();
            if (cacheIce) {
              this.subPeer.addIceCandidate(cacheIce);
            }
          }
        } else {
          this.pendingSubIceCandidates.push(new RTCIceCandidate(trickle.candidateInit));
        }
      }
    });

    conn.subscribe('leave', async () => {
      conn.disconnect();
    });
  }

  private snapshotReceiver = new DataChannelReceiver((received, body) => {
    if (this.onProgress) {
      this.onProgress(received, body.length, CommandType.SNAPSHOT);
    }

    if (received === body.length && this.onSnapshot) {
      if (this.onSnapshot) {
        this.onSnapshot("data:image/jpeg;base64," + arrayBufferToBase64(body));
      }
    }
  });

  private metadataReceiver = new DataChannelReceiver((received, body) => {
    if (this.onProgress) {
      this.onProgress(received, body.length, CommandType.METADATA);
    }

    if (received === body.length && this.onMetadata) {
      let bodyStr = arrayBufferToString(body);
      let parsedBody = JSON.parse(bodyStr) as VideoMetadata;
      this.onMetadata(parsedBody);
    }
  });

  private recordingReceiver = new DataChannelReceiver((received, body) => {
    if (this.onProgress) {
      this.onProgress(received, body.length, CommandType.RECORDING);
    }

    if (received === body.length && this.onVideoDownloaded) {
      this.onVideoDownloaded(body);
    }
  });

  private handleSdpMessage = (pc: RTCPeerConnection, message: string) => {
    const sdp = JSON.parse(message) as RTCSessionDescription;
    pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  private handleIceMessage = (pc: RTCPeerConnection, message: string) => {
    const ice = JSON.parse(message) as RTCIceCandidate;
    if (pc.remoteDescription) {
      pc.addIceCandidate(new RTCIceCandidate(ice));

      while (this.pendingIceCandidates.length > 0) {
        const cacheIce = this.pendingIceCandidates.shift();
        if (cacheIce) {
          pc.addIceCandidate(new RTCIceCandidate(cacheIce));
        }
      }
    } else {
      this.pendingIceCandidates.push(ice);
    }
  }
}
