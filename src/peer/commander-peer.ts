import { CameraPropertyKey, CameraPropertyValue } from "../constants/camera-property";
import { padZero } from "../utils/rtc-tools";
import { CameraCtrlMessage, CmdMessage, CmdType, MetaCmdMessage, MetadataCmd, VideoMetadata } from "../rtc/cmd-message";
import { ChannelId, ChannelLabelMap, RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class CommanderPeer extends RtcPeer {

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

    const ipcChannelId = config.options.ipcMode === 'lossy'
      ? ChannelId.Lossy
      : ChannelId.Reliable;

    this.ipcChannel = this.createDataChannel(ipcChannelId);

    console.debug("CommanderPeer is created.");
  }

  close = () => {
    if (this.cmdChannel.readyState === 'open') {
      const command = new CmdMessage(CmdType.CONNECT, "false");
      this.cmdChannel.send(command.ToString());
    }
    this.cmdChannel.close();
    this.ipcChannel?.close();

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
      this.onDataChannelMessage(ChannelLabelMap[channelId], e);
    };

    this.createReceivers(ChannelLabelMap[channelId]);

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
}
