import { IPiCameraOptions } from "../signaling/signaling-client";

type ChannelLabel = 'command' | '_lossy' | '_reliable';

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

export type IpcMode = 'lossy' | 'reliable';

export const IpcModeTable: Record<IpcMode, number> = {
  lossy: ChannelId.Lossy,
  reliable: ChannelId.Reliable
};

export interface RtcPeerConfig extends RTCConfiguration {
  options: IPiCameraOptions;
}

export class RtcPeer {
  onStream?: (stream: MediaStream) => void;
  onSfuStream?: (sid: string, stream: MediaStream) => void;
  onIceCandidate?: ((ev: RTCPeerConnectionIceEvent) => any);
  onConnectionStateChange?: ((ev: RTCPeerConnectionState) => any);

  readonly options: IPiCameraOptions;
  protected peer: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStreamMap: Map<string, MediaStream> = new Map();
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

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
  }

  get connectionState() {
    return this.peer.connectionState;
  }

  close() {
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
}
