import { CameraPropertyKey, CameraPropertyValue } from "../constants/camera-property";
import { arrayBufferToBase64, arrayBufferToString, padZero, utf8ArrayToString } from "../utils/rtc-tools";
import { CameraCtrlMessage, CmdMessage, CmdType, MetaCmdMessage, MetadataCmd, VideoMetadata } from "../rtc/cmd-message";
import { DataChannelReceiver } from "../rtc/datachannel-receiver";
import { ChannelId, RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class CommanderPeer extends RtcPeer {

  onSnapshot?: (base64: string) => void;
  onMetadata?: (metadata: VideoMetadata) => void;
  onProgress?: (received: number, total: number, type: CmdType) => void;
  onVideoDownloaded?: (file: Uint8Array) => void;
  onDatachannel?: (id: ChannelId) => void;
  onMessage?: (msg: string) => void;

  private cmdChannel: RTCDataChannel;
  private ipcChannel?: RTCDataChannel;

  constructor(config: RtcPeerConfig) {
    super(config);

    if (!this.options.datachannelOnly) {
      console.debug("Create CommanderPeer with video/audio transceiver.");
      this.createlocalAudioStream();
      this.peer.addTransceiver("video", { direction: "recvonly" });
      this.peer.addTransceiver("audio", { direction: "sendrecv" });
    }

    this.cmdChannel = this.createDataChannel(ChannelId.Command);
    if (config.options.ipcMode === 'lossy') {
      this.ipcChannel = this.createDataChannel(ChannelId.Lossy);
    } else if (config.options.ipcMode === 'reliable') {
      this.ipcChannel = this.createDataChannel(ChannelId.Reliable);
    }

    console.debug("CommanderPeer is created.");
  }

  close = () => {
    this.snapshotReceiver.reset();
    this.metadataReceiver.reset();
    this.recordingReceiver.reset();

    if (this.cmdChannel.readyState === 'open') {
      const command = new CmdMessage(CmdType.CONNECT, "false");
      this.cmdChannel.send(command.ToString());
    }
    this.cmdChannel.close();
    this.ipcChannel?.close();

    this.onSnapshot = undefined;
    this.onMetadata = undefined;
    this.onProgress = undefined;
    this.onVideoDownloaded = undefined;
    this.onDatachannel = undefined;

    super.close();
    console.debug("CommanderPeer is closed.");
  }

  public createDataChannel = (channelId: ChannelId) => {
    const options: RTCDataChannelInit = {
      id: channelId,
      ordered: true,
      negotiated: true,
    };

    if (channelId === ChannelId.Lossy) {
      options.maxRetransmits = 0;
    }

    const dataChannel = super.createDataChannel(channelId, options);

    dataChannel.binaryType = "arraybuffer";
    dataChannel.onopen = () => this.onDatachannel?.(channelId);

    dataChannel.onmessage = (e) => {
      const packet = new Uint8Array(e.data as ArrayBuffer);
      const header = packet[0] as CmdType;
      const body = packet.slice(1);

      switch (header) {
        case CmdType.SNAPSHOT:
          this.snapshotReceiver.receiveData(body);
          break;
        case CmdType.METADATA:
          this.metadataReceiver.receiveData(body);
          break;
        case CmdType.RECORDING:
          this.recordingReceiver.receiveData(body);
          break;
        case CmdType.CUSTOM:
          this.customReceiver.receiveData(body);
          break;
      }
    };

    return dataChannel;
  }

  getRecordingMetadata = (param?: string | Date) => {
    if (this.cmdChannel.readyState === 'open' && this.onMetadata) {
      let metaCmd: MetaCmdMessage;

      if (param === undefined) {
        metaCmd = new MetaCmdMessage(MetadataCmd.LATEST, "");
      } else if (typeof param === "string") {
        metaCmd = new MetaCmdMessage(MetadataCmd.OLDER, param);
      } else {
        const formattedDate = `${param.getFullYear()}${padZero(param.getMonth() + 1)}${padZero(param.getDate())}` +
          "_" + `${padZero(param.getHours())}${padZero(param.getMinutes())}${padZero(param.getSeconds())}`;
        metaCmd = new MetaCmdMessage(MetadataCmd.SPECIFIC_TIME, formattedDate);
      }

      const command = new CmdMessage(CmdType.METADATA, metaCmd.ToString());
      this.cmdChannel.send(command.ToString());
    }
  }

  fetchRecordedVideo = (path: string) => {
    if (this.onVideoDownloaded && this.cmdChannel.readyState === 'open') {
      const command = new CmdMessage(CmdType.RECORDING, path);
      this.cmdChannel.send(command.ToString());
    }
  }

  setCameraProperty = (key: CameraPropertyKey, value: CameraPropertyValue) => {
    if (this.cmdChannel.readyState === 'open') {
      const ctl = new CameraCtrlMessage(key, value);
      const command = new CmdMessage(CmdType.CAMERA_CONTROL, JSON.stringify(ctl));
      this.cmdChannel.send(command.ToString());
    }
  }

  snapshot = (quality: number = 30) => {
    if (this.onSnapshot && this.cmdChannel.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = new CmdMessage(CmdType.SNAPSHOT, String(quality));
      this.cmdChannel.send(command.ToString());
    }
  }

  sendMessage = (msg: string) => {
    const command = new CmdMessage(CmdType.CUSTOM, msg);
    this.ipcChannel?.send(command.ToString());
  }

  private snapshotReceiver = new DataChannelReceiver({
    onProgress: (received, total) => this.onProgress?.(received, total, CmdType.SNAPSHOT),
    onComplete: (body) => this.onSnapshot?.("data:image/jpeg;base64," + arrayBufferToBase64(body))
  });

  private metadataReceiver = new DataChannelReceiver({
    onProgress: (received, total) => this.onProgress?.(received, total, CmdType.METADATA),
    onComplete: (body) => this.onMetadata?.(JSON.parse(arrayBufferToString(body)) as VideoMetadata)
  });

  private recordingReceiver = new DataChannelReceiver({
    onProgress: (received, total) => this.onProgress?.(received, total, CmdType.RECORDING),
    onComplete: (body) => this.onVideoDownloaded?.(body)
  });

  private customReceiver = new DataChannelReceiver({
    onProgress: (received, total) => this.onProgress?.(received, total, CmdType.CUSTOM),
    onComplete: (body) => this.onMessage?.(utf8ArrayToString(body))
  });
}
