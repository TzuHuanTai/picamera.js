import { CmdType, VideoMetadata } from "../rtc/cmd-message";
import { DataChannelReceiver } from "../rtc/datachannel-receiver";
import { IPiCameraOptions } from "../signaling/signaling-client";
import { arrayBufferToBase64, arrayBufferToString, utf8ArrayToString } from "../utils/rtc-tools";

export type ChannelLabel = 'command' | '_lossy' | '_reliable';

export enum ChannelId {
  Command,
  Lossy,
  Reliable
};

export const ChannelLabelMap: Record<ChannelId, ChannelLabel> = {
  [ChannelId.Command]: 'command',
  [ChannelId.Lossy]: '_lossy',
  [ChannelId.Reliable]: '_reliable'
};

export const LabelToChannelIdMap: Record<ChannelLabel, ChannelId> = {
  'command': ChannelId.Command,
  '_lossy': ChannelId.Lossy,
  '_reliable': ChannelId.Reliable
};

export type IpcMode = 'lossy' | 'reliable';

export const IpcModeTable: Record<IpcMode, number> = {
  lossy: ChannelId.Lossy,
  reliable: ChannelId.Reliable
};

export interface RtcPeerConfig extends RTCConfiguration {
  options: IPiCameraOptions;
}

interface ChannelReceiverGroup {
  snapshotReceiver: DataChannelReceiver;
  metadataReceiver: DataChannelReceiver;
  recordingReceiver: DataChannelReceiver;
  customReceiver: DataChannelReceiver;
}

export class RtcPeer {
  onSnapshot?: (base64: string) => void;
  onMetadata?: (metadata: VideoMetadata) => void;
  onProgress?: (received: number, total: number, type: CmdType) => void;
  onVideoDownloaded?: (file: Uint8Array) => void;
  onDatachannel?: (id: ChannelId) => void;
  onMessage?: (msg: string) => void;
  onStream?: (stream: MediaStream) => void;
  onSfuStream?: (sid: string, stream: MediaStream) => void;
  onIceCandidate?: ((ev: RTCPeerConnectionIceEvent) => any);
  onConnectionStateChange?: ((ev: RTCPeerConnectionState) => any);

  readonly options: IPiCameraOptions;
  protected peer: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStreamMap: Map<string, MediaStream> = new Map();
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private channelReceivers: Record<ChannelLabel, ChannelReceiverGroup> = {} as Record<ChannelLabel, ChannelReceiverGroup>;

  // @ts-ignore noUnusedLocals
  private lossyChannel?: RTCDataChannel;
  private reliableChannel?: RTCDataChannel;
  // @ts-ignore noUnusedLocals

  constructor(config: RtcPeerConfig) {
    this.options = config.options;
    this.peer = new RTCPeerConnection(config);
    this.peer.ontrack = (event) => this.handleTrack(event);
    this.peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.onIceCandidate?.(event);
      }
    }
    this.peer.onconnectionstatechange = () => {
      this.onConnectionStateChange?.(this.peer.connectionState);
    }


    this.peer.ondatachannel = (dc) => {
      const channel = dc.channel;
      const label = channel.label as ChannelLabel;
      const channelId = LabelToChannelIdMap[label];

      if (
        (channelId === ChannelId.Lossy && config.options.ipcMode === 'lossy') ||
        (channelId === ChannelId.Reliable && config.options.ipcMode === 'reliable')
      ) {
        if (channelId === ChannelId.Lossy) {
          this.lossyChannel = channel;
        } else if (channelId === ChannelId.Reliable) {
          this.reliableChannel = channel;
        }

        this.createReceivers(label);
        channel.onmessage = (e) => this.onDataChannelMessage(label, e);
      }
    }
  }

  get connectionState() {
    return this.peer.connectionState;
  }

  close() {
    for (const label in this.channelReceivers) {
      const group = this.channelReceivers[label as ChannelLabel];
      group.snapshotReceiver.reset();
      group.metadataReceiver.reset();
      group.recordingReceiver.reset();
      group.customReceiver.reset();
    }
    this.channelReceivers = {} as Record<ChannelLabel, ChannelReceiverGroup>;

    if (this.lossyChannel) {
      this.lossyChannel.onmessage = null;
    }
    if (this.reliableChannel) {
      this.reliableChannel.onmessage = null;
    }
    this.lossyChannel = undefined;
    this.reliableChannel = undefined;

    this.localStream?.getTracks().forEach(track => {
      track.stop();
    });
    this.localStream = undefined;

    this.remoteStreamMap.forEach(stream => {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    });
    this.remoteStreamMap.clear();

    this.peer.close();
    this.peer.ontrack = null;
    this.peer.onicecandidate = null;
    this.peer.onconnectionstatechange = null;

    this.onSnapshot = undefined;
    this.onMetadata = undefined;
    this.onProgress = undefined;
    this.onVideoDownloaded = undefined;
    this.onMessage = undefined;
    this.onStream = undefined;
    this.onIceCandidate = undefined;
    this.onConnectionStateChange = undefined;
    console.debug("webrtc peer is closed.");
  }

  createDataChannel(id: ChannelId, options?: RTCDataChannelInit) {
    return this.peer.createDataChannel(ChannelLabelMap[id], options);
  }

  createOffer = async (options?: RTCOfferOptions) => {
    const offer = await this.peer.createOffer(options);
    await this.peer.setLocalDescription(offer);
    console.debug("createOffer: ", offer);
    return offer;
  }

  createAnswer = async (sd: RTCSessionDescriptionInit) => {
    await this.setRemoteDescription(sd);
    const answer = await this.peer.createAnswer();
    await this.peer.setLocalDescription(answer);
    console.debug("createAnswer: ", answer);
    return answer;
  }

  createlocalAudioStream = async () => {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false,
    });

    this.localStream.getAudioTracks().forEach(track => {
      this.peer.addTrack(track, this.localStream!);
      track.enabled = this.options.isMicOn ?? false;
    });
  }

  setRemoteDescription = async (description: RTCSessionDescriptionInit) => {
    await this.peer.setRemoteDescription(description);
    this.pendingIceCandidates.forEach(candidate => {
      this.peer.addIceCandidate(candidate);
    });
    this.pendingIceCandidates = [];
  }

  addIceCandidate = (candidate: RTCIceCandidateInit) => {
    if (!this.peer.remoteDescription && candidate) {
      this.pendingIceCandidates.push(candidate);
    } else {
      this.peer.addIceCandidate(candidate);
    }
  }

  toggleMic = (enabled: boolean = !this.options.isMicOn) => {
    this.options.isMicOn = enabled;
    this.toggleTrack(enabled, this.localStream);
  };

  toggleSpeaker = (enabled: boolean = !this.options.isSpeakerOn) => {
    this.options.isSpeakerOn = enabled;
    this.remoteStreamMap.forEach((remoteStream) => {
      this.toggleTrack(enabled, remoteStream);
    });
  };

  private toggleTrack = (isOn: boolean, stream?: MediaStream) => {
    stream?.getAudioTracks().forEach((track) => {
      track.enabled = isOn;
    });
  };

  private handleTrack = (event: RTCTrackEvent) => {
    const [sid] = event.streams[0].id.split('|');

    let remoteStream = this.remoteStreamMap.get(sid);

    if (!remoteStream) {
      remoteStream = new MediaStream();
      this.remoteStreamMap.set(sid, remoteStream);
    }

    event.streams[0].getTracks().forEach((track) => {
      remoteStream?.addTrack(track);
      if (track.kind === "audio") {
        track.enabled = this.options.isSpeakerOn ?? false;
      }

      console.debug(`[${sid}] get ${track.kind} tracks => label: ${track.label}, id: ${track.id}`);
    });

    this.onStream?.(remoteStream);
    this.onSfuStream?.(sid, remoteStream);
  }

  protected createReceivers(label: ChannelLabel): void {

    this.channelReceivers[label] = {
      snapshotReceiver: new DataChannelReceiver({
        onProgress: (received, total) => this.onProgress?.(received, total, CmdType.SNAPSHOT),
        onComplete: (body) => this.onSnapshot?.("data:image/jpeg;base64," + arrayBufferToBase64(body))
      }),
      metadataReceiver: new DataChannelReceiver({
        onProgress: (received, total) => this.onProgress?.(received, total, CmdType.METADATA),
        onComplete: (body) => this.onMetadata?.(JSON.parse(arrayBufferToString(body)) as VideoMetadata)
      }),
      recordingReceiver: new DataChannelReceiver({
        onProgress: (received, total) => this.onProgress?.(received, total, CmdType.RECORDING),
        onComplete: (body) => this.onVideoDownloaded?.(body)
      }),
      customReceiver: new DataChannelReceiver({
        onProgress: (received, total) => this.onProgress?.(received, total, CmdType.CUSTOM),
        onComplete: (body) => this.onMessage?.(utf8ArrayToString(body))
      }),
    };
  };

  protected onDataChannelMessage(label: ChannelLabel, event: MessageEvent): void {
    this.dispatchPayload(label, event.data);
  }

  protected dispatchPayload(label: ChannelLabel, packet: Uint8Array) {
    const receivers = this.channelReceivers[label];
    if (!receivers) {
      console.warn(`No receivers found for label: ${label}`);
      return;
    }

    const header = packet[0] as CmdType;
    const body = packet.slice(1);

    switch (header) {
      case CmdType.SNAPSHOT:
        receivers.snapshotReceiver.receiveData(body);
        break;
      case CmdType.METADATA:
        receivers.metadataReceiver.receiveData(body);
        break;
      case CmdType.RECORDING:
        receivers.recordingReceiver.receiveData(body);
        break;
      case CmdType.CUSTOM:
        receivers.customReceiver.receiveData(body);
        break;
    }
  }
}
