import { IPiCameraOptions } from "../pi-camera.types";
import { CommandType, Packet, QueryFileResponse, RecordingResponse } from "../proto/packet";
import { DataChannelReceiver } from "../rtc/datachannel-receiver";
import { arrayBufferToBase64 } from "../utils/rtc-tools";

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

export interface RtcPeerConfig extends RTCConfiguration {
  options: IPiCameraOptions;
}

interface ChannelReceiverGroup {
  snapshotReceiver: DataChannelReceiver;
  queryFileReceiver: DataChannelReceiver;
  fileReceiver: DataChannelReceiver;
  customReceiver: DataChannelReceiver;
}

export class RtcPeer {
  onSnapshot?: (base64: string) => void;
  onVideoListLoaded?: (res: QueryFileResponse) => void;
  onProgress?: (received: number, total: number, type: CommandType) => void;
  onVideoDownloaded?: (file: Uint8Array) => void;
  onDatachannel?: (id: ChannelId) => void;
  onMessage?: (data: Uint8Array) => void;
  onRecording?: (res: RecordingResponse) => void;
  onStream?: (stream: MediaStream) => void;
  onSfuStream?: (sid: string, stream: MediaStream) => void;
  onIceCandidate?: ((ev: RTCPeerConnectionIceEvent) => any);
  onConnectionStateChange?: ((ev: RTCPeerConnectionState) => any);
  onOffer?: ((offer: RTCSessionDescriptionInit) => any);
  onAnswer?: ((answer: RTCSessionDescriptionInit) => any);
  onReconnectFailed?: (() => any);

  readonly options: IPiCameraOptions;
  protected peer: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStreamMap: Map<string, MediaStream> = new Map();
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private channelReceivers: Record<ChannelLabel, ChannelReceiverGroup> = {} as Record<ChannelLabel, ChannelReceiverGroup>;
  private messageQueue: Array<{ label: ChannelLabel; buffer: ArrayBuffer }> = [];
  private messageQueueHead = 0;
  private isProcessingQueue = false;
  private yieldChannel: MessageChannel | null = null;

  private readonly MAX_ICE_RESTART_ATTEMPTS = 3;
  private readonly DISCONNECT_RESTART_DELAY_MS = 3000;
  private readonly ICE_RESTART_TIMEOUT_MS = 8000;
  private iceRestartAttempts = 0;
  private reconnectFailed = false;
  private disconnectTimer?: ReturnType<typeof setTimeout>;
  private iceRestartTimer?: ReturnType<typeof setTimeout>;
  private negotiationReady = false;

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
      const state = this.peer.connectionState;
      this.onConnectionStateChange?.(state);

      if (state === "connected") {
        this.clearDisconnectTimer();
        this.clearIceRestartTimer();
        this.iceRestartAttempts = 0;
        this.reconnectFailed = false;
        this.negotiationReady = true;
      } else if (state === "failed") {
        this.clearDisconnectTimer();
        this.tryRestartIce();
      } else if (state === "disconnected") {
        this.clearDisconnectTimer();
        this.disconnectTimer = setTimeout(() => {
          this.disconnectTimer = undefined;
          const currentState = this.peer.connectionState;
          if (currentState === "disconnected" || currentState === "failed") {
            this.tryRestartIce();
          }
        }, this.DISCONNECT_RESTART_DELAY_MS);
      }
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

        channel.binaryType = "arraybuffer";
        this.createReceivers(label);
        channel.onmessage = (e) => this.onDataChannelMessage(label, e);
      }
    }

    this.peer.onnegotiationneeded = async () => {
      try {
        if (!this.negotiationReady) {
          console.debug("onnegotiationneeded: skipped before initial offer is sent");
          return;
        }

        if (this.peer.signalingState !== "stable") {
          console.debug("signaling state is not `stable`:", this.peer.signalingState);
          return;
        }

        console.debug("onnegotiationneeded: creating offer");
        this.createOffer();

      } catch (err) {
        console.error("Error during negotiationneeded:", err);
      }
    };

    if (typeof MessageChannel !== 'undefined') {
      this.yieldChannel = new MessageChannel();
      this.yieldChannel.port1.onmessage = () => this.drainQueue();
    }
  }

  get connectionState() {
    return this.peer.connectionState;
  }

  close() {
    for (const label in this.channelReceivers) {
      const group = this.channelReceivers[label as ChannelLabel];
      group.snapshotReceiver.reset();
      group.queryFileReceiver.reset();
      group.fileReceiver.reset();
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

    this.clearDisconnectTimer();
    this.clearIceRestartTimer();
    this.iceRestartAttempts = 0;
    this.reconnectFailed = false;
    this.negotiationReady = false;

    this.onSnapshot = undefined;
    this.onVideoListLoaded = undefined;
    this.onProgress = undefined;
    this.onVideoDownloaded = undefined;
    this.onMessage = undefined;
    this.onRecording = undefined;
    this.onStream = undefined;
    this.onIceCandidate = undefined;
    this.onConnectionStateChange = undefined;
    this.onReconnectFailed = undefined;

    this.messageQueue = [];
    this.messageQueueHead = 0;
    this.isProcessingQueue = false;
    this.yieldChannel?.port1.close();
    this.yieldChannel?.port2.close();
    this.yieldChannel = null;
    console.debug("webrtc peer is closed.");
  }

  createDataChannel(id: ChannelId, options?: RTCDataChannelInit) {
    return this.peer.createDataChannel(ChannelLabelMap[id], options);
  }

  createOffer = async (options?: RTCOfferOptions) => {
    const offer = await this.peer.createOffer(options);
    await this.peer.setLocalDescription(offer);
    console.debug("createOffer: ", offer);
    this.onOffer?.(offer);
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

  notifySignalingReconnected = (): void => {
    const state = this.peer.connectionState;
    if (state !== "disconnected" && state !== "failed") {
      return;
    }
    console.debug("Signaling reconnected, retrying ICE restart immediately.");
    this.clearDisconnectTimer();
    this.tryRestartIce();
  }

  private tryRestartIce(): void {
    if (this.reconnectFailed || this.peer.connectionState === "closed") {
      return;
    }
    if (this.iceRestartAttempts >= this.MAX_ICE_RESTART_ATTEMPTS) {
      this.reconnectFailed = true;
      console.warn(`ICE restart failed after ${this.MAX_ICE_RESTART_ATTEMPTS} attempts, giving up.`);
      this.onReconnectFailed?.();
      return;
    }
    this.iceRestartAttempts++;
    console.log(`ICE restart attempt ${this.iceRestartAttempts}/${this.MAX_ICE_RESTART_ATTEMPTS}...`);
    this.peer.restartIce();

    this.clearIceRestartTimer();
    this.iceRestartTimer = setTimeout(() => {
      this.iceRestartTimer = undefined;
      const state = this.peer.connectionState;
      if (state !== "connected" && state !== "closed") {
        this.tryRestartIce();
      }
    }, this.ICE_RESTART_TIMEOUT_MS);
  }

  private clearDisconnectTimer(): void {
    if (this.disconnectTimer !== undefined) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = undefined;
    }
  }

  private clearIceRestartTimer(): void {
    if (this.iceRestartTimer !== undefined) {
      clearTimeout(this.iceRestartTimer);
      this.iceRestartTimer = undefined;
    }
  }

  /**
   * Which remote stream an incoming track belongs to. LiveKit encodes the participant sid in the
   * stream id; an SFU that hands tracks over without a stream to group them by has to say so
   * some other way.
   */
  protected getStreamKey(event: RTCTrackEvent): string {
    const streamId = event.streams[0]?.id;
    if (streamId) {
      const [sid] = streamId.split('|');
      return sid;
    }
    return event.transceiver.mid ?? event.track.id;
  }

  private handleTrack = (event: RTCTrackEvent) => {
    const sid = this.getStreamKey(event);

    let remoteStream = this.remoteStreamMap.get(sid);

    if (!remoteStream) {
      remoteStream = new MediaStream();
      this.remoteStreamMap.set(sid, remoteStream);
    }

    // A track can arrive without a stream to group it with, in which case it is the whole payload.
    const tracks = event.streams[0] ? event.streams[0].getTracks() : [event.track];

    tracks.forEach((track) => {
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
        onProgress: (received, total) => this.onProgress?.(received, total, CommandType.TAKE_SNAPSHOT),
        onComplete: (body) => this.onSnapshot?.("data:image/jpeg;base64," + arrayBufferToBase64(body))
      }),
      queryFileReceiver: new DataChannelReceiver({
        onProgress: (received, total) => this.onProgress?.(received, total, CommandType.QUERY_FILE),
        onComplete: (body) => {
          const decoded = QueryFileResponse.decode(body);
          this.onVideoListLoaded?.(decoded);
        }
      }),
      fileReceiver: new DataChannelReceiver({
        onProgress: (received, total) => this.onProgress?.(received, total, CommandType.TRANSFER_FILE),
        onComplete: (body) => this.onVideoDownloaded?.(body)
      }),
      customReceiver: new DataChannelReceiver({
        onProgress: (received, total) => this.onProgress?.(received, total, CommandType.CUSTOM),
        onComplete: (body) => this.onMessage?.(body)
      }),
    };
  };

  private scheduleYield(): void {
    if (this.yieldChannel) {
      this.yieldChannel.port2.postMessage(null);
    } else {
      setTimeout(() => this.drainQueue(), 0);
    }
  }

  protected onDataChannelMessage(label: ChannelLabel, event: MessageEvent): void {
    this.messageQueue.push({ label, buffer: event.data as ArrayBuffer });
    if (!this.isProcessingQueue) {
      this.isProcessingQueue = true;
      this.scheduleYield();
    }
  }

  private drainQueue(): void {
    const deadline = performance.now() + 5; // 5 ms budget per slice
    const queue = this.messageQueue;
    while (this.messageQueueHead < queue.length) {
      const { label, buffer } = queue[this.messageQueueHead++];
      this.dispatchPayload(label, new Uint8Array(buffer));
      if (performance.now() >= deadline) {
        this.scheduleYield(); // yield, resume on next task
        return;
      }
    }
    // Fully drained — compact to release references and reset head
    this.messageQueue = [];
    this.messageQueueHead = 0;
    this.isProcessingQueue = false;
  }

  protected dispatchPayload(label: ChannelLabel, data: Uint8Array) {
    const packet = Packet.decode(data);

    const receivers = this.channelReceivers[label];
    if (!receivers) {
      console.warn(`No receivers found for label: ${label}`);
      return;
    }

    switch (packet.type) {
      case CommandType.TAKE_SNAPSHOT:
        receivers.snapshotReceiver.receiveData(packet);
        break;
      case CommandType.QUERY_FILE:
        receivers.queryFileReceiver.receiveData(packet);
        break;
      case CommandType.TRANSFER_FILE:
        receivers.fileReceiver.receiveData(packet);
        break;
      case CommandType.CUSTOM:
        receivers.customReceiver.receiveData(packet);
        break;
      case CommandType.START_RECORDING:
      case CommandType.STOP_RECORDING:
        if (packet.recordingResponse) {
          this.onRecording?.(packet.recordingResponse);
        }
        break;
    }
  }
}
