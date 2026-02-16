import {
  CommandType,
  DisconnectRequest,
  Packet,
  QueryFileRequest,
  QueryFileType
} from "../proto/packet";
import { CameraControlId } from "../proto/camera_control";
import { CameraControlValue } from "../constants/camera-property";
import { padZero } from "../utils/rtc-tools";
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

    if (config.options.ipcMode) {
      const ipcChannelId = config.options.ipcMode === 'lossy'
        ? ChannelId.Lossy
        : ChannelId.Reliable;
      this.ipcChannel = this.createDataChannel(ipcChannelId);
    }

    console.debug("CommanderPeer is created.");
  }

  close = () => {
    if (this.cmdChannel.readyState === 'open') {
      const packet = Packet.create({
        type: CommandType.DISCONNECT,
        disconnectionRequest: DisconnectRequest.create()
      });
      const binary = Packet.encode(packet).finish();

      this.cmdChannel.send(binary);
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

  fetchVideoList = (param?: string | Date) => {
    if (this.cmdChannel.readyState === 'open' && this.onVideoListLoaded) {
      let queryRequest = QueryFileRequest.create();

      if (param === undefined) {
        queryRequest.type = QueryFileType.LATEST_FILE;
      } else if (typeof param === "string") {
        queryRequest.type = QueryFileType.BEFORE_FILE;
        queryRequest.parameter = param;
      } else {
        const formattedDate = `${param.getFullYear()}${padZero(param.getMonth() + 1)}${padZero(param.getDate())}` +
          "_" + `${padZero(param.getHours())}${padZero(param.getMinutes())}${padZero(param.getSeconds())}`;
        queryRequest.type = QueryFileType.BEFORE_TIME;
        queryRequest.parameter = formattedDate;
      }

      const binary = Packet.encode(Packet.create({
        type: CommandType.QUERY_FILE,
        queryFileRequest: queryRequest
      })).finish();
      this.cmdChannel.send(binary);
    }
  }

  downloadVideoFile = (path: string) => {
    if (this.onVideoDownloaded && this.cmdChannel.readyState === 'open') {
      const command = Packet.create({
        type: CommandType.TRANSFER_FILE,
        transferFileRequest: {
          filepath: path
        }
      });
      const binary = Packet.encode(command).finish();
      this.cmdChannel.send(binary);
    }
  }

  setCameraControl = (key: CameraControlId, value: CameraControlValue) => {
    if (this.cmdChannel.readyState === 'open') {
      const command = Packet.create({
        type: CommandType.CONTROL_CAMERA,
        controlCameraRequest: {
          id: key,
          value: value,
        }
      });
      const binary = Packet.encode(command).finish();
      this.cmdChannel.send(binary);
    }
  }

  snapshot = (quality: number = 30) => {
    if (this.onSnapshot && this.cmdChannel.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = Packet.create({
        type: CommandType.TAKE_SNAPSHOT,
        takeSnapshotRequest: { quality: quality }
      });
      const binary = Packet.encode(command).finish();

      this.cmdChannel.send(binary);
    }
  }

  sendText = (msg: string) => {
    this.sendData(new TextEncoder().encode(msg));
  }

  sendData = (binary: Uint8Array) => {
    if (this.ipcChannel?.readyState === 'open') {
      const custom_command = Packet.create({
        type: CommandType.CUSTOM,
        customCommand: binary
      });

      const data = Packet.encode(custom_command).finish();

      this.ipcChannel.send(data);
    }
  }
}
