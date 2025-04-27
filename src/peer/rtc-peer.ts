import { IPiCameraOptions } from "../signaling/signaling-client";

type DataChannelLabel = 'cmd_channel' | '_lossy' | '_reliable';

export interface RtcPeerConfig extends RTCConfiguration {
  options: IPiCameraOptions;
}

export class RtcPeer {
  onStream?: (stream: MediaStream) => void;
  onIceCandidate?: ((ev: RTCPeerConnectionIceEvent) => any);
  onConnectionStateChange?: ((ev: RTCPeerConnectionState) => any);

  readonly options: IPiCameraOptions;
  protected peer: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream?: MediaStream;
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

    this.remoteStream?.getTracks().forEach(track => {
      track.stop();
    });
    this.remoteStream = undefined;

    this.peer.close();
    this.peer.ontrack = null;
    this.peer.onicecandidate = null;
    this.peer.onconnectionstatechange = null;

    this.onStream = undefined;
    this.onIceCandidate = undefined;
    this.onConnectionStateChange = undefined;
    console.debug("webrtc peer is closed.");
  }

  createDataChannel(label: DataChannelLabel, options?: RTCDataChannelInit) {
    return this.peer.createDataChannel(label, options);
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

  private handleTrack = (event: RTCTrackEvent) => {
    if (!this.remoteStream) {
      this.remoteStream = new MediaStream();
    }

    event.streams[0].getTracks().forEach((track) => {
      this.remoteStream?.addTrack(track);
      if (track.kind === "audio") {
        track.enabled = this.options.isSpeakerOn ?? false;
      }

      console.debug(`get ${track.kind} tracks => label: ${track.label}, id: ${track.id}`);
    });

    console.debug(`on stream: `, event.streams[0]);

    this.onStream?.(this.remoteStream);
  }
}
