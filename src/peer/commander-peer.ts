import { CameraPropertyKey, CameraPropertyValue } from "../constants/camera-property";
import { arrayBufferToBase64, arrayBufferToString, padZero } from "../utils/rtc-tools";
import { CameraCtrlMessage, CmdMessage, CmdType, MetaCmdMessage, MetadataCmd, VideoMetadata } from "../rtc/cmd-message";
import { DataChannelReceiver } from "../rtc/datachannel-receiver";
import { RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class CommanderPeer extends RtcPeer {

  onSnapshot?: (base64: string) => void;
  onMetadata?: (metadata: VideoMetadata) => void;
  onProgress?: (received: number, total: number, type: CmdType) => void;
  onVideoDownloaded?: (file: Uint8Array) => void;
  onDatachannel?: (cmdDataChannel: RTCDataChannel) => void;

  private cmdDataChannel?: RTCDataChannel;

  constructor(config: RtcPeerConfig) {
    super(config);

    if (!this.options.datachannelOnly) {
      console.debug("Create CommanderPeer with video/audio transceiver.");
      this.createlocalAudioStream();
      this.peer.addTransceiver("video", { direction: "recvonly" });
      this.peer.addTransceiver("audio", { direction: "sendrecv" });
    }
    this.createCmdDataChannel();
    console.debug("CommanderPeer is created.");
  }

  close = () => {
    this.snapshotReceiver.reset();
    this.metadataReceiver.reset();
    this.recordingReceiver.reset();

    if (this.cmdDataChannel) {
      if (this.cmdDataChannel.readyState === 'open') {
        const command = new CmdMessage(CmdType.CONNECT, "false");
        this.cmdDataChannel.send(command.ToString());
      }
      this.cmdDataChannel.close();
      this.cmdDataChannel = undefined;
    }

    this.onSnapshot = undefined;
    this.onMetadata = undefined;
    this.onProgress = undefined;
    this.onVideoDownloaded = undefined;
    this.onDatachannel = undefined;

    super.close();
    console.debug("CommanderPeer is closed.");
  }

  createCmdDataChannel = () => {
    this.cmdDataChannel = super.createDataChannel('cmd_channel', {
      negotiated: true,
      ordered: true,
      id: 0,
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
        case CmdType.SNAPSHOT:
          this.snapshotReceiver.receiveData(body);
          break;
        case CmdType.METADATA:
          this.metadataReceiver.receiveData(body);
          break;
        case CmdType.RECORDING:
          this.recordingReceiver.receiveData(body);
          break;
      }
    };
  }

  getRecordingMetadata = (param?: string | Date) => {
    if (this.cmdDataChannel?.readyState === 'open' && this.onMetadata) {
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
      this.cmdDataChannel.send(command.ToString());
    }
  }

  fetchRecordedVideo = (path: string) => {
    if (this.onVideoDownloaded && this.cmdDataChannel?.readyState === 'open') {
      const command = new CmdMessage(CmdType.RECORDING, path);
      this.cmdDataChannel.send(command.ToString());
    }
  }

  setCameraProperty = (key: CameraPropertyKey, value: CameraPropertyValue) => {
    if (this.cmdDataChannel?.readyState === 'open') {
      const ctl = new CameraCtrlMessage(key, value);
      const command = new CmdMessage(CmdType.CAMERA_CONTROL, JSON.stringify(ctl));
      this.cmdDataChannel.send(command.ToString());
    }
  }

  snapshot = (quality: number = 30) => {
    if (this.onSnapshot && this.cmdDataChannel?.readyState === 'open') {
      quality = Math.max(0, Math.min(quality, 100));
      const command = new CmdMessage(CmdType.SNAPSHOT, String(quality));
      this.cmdDataChannel.send(command.ToString());
    }
  }

  private snapshotReceiver = new DataChannelReceiver((received, body) => {
    if (this.onProgress) {
      this.onProgress(received, body.length, CmdType.SNAPSHOT);
    }

    if (received === body.length && this.onSnapshot) {
      if (this.onSnapshot) {
        this.onSnapshot("data:image/jpeg;base64," + arrayBufferToBase64(body));
      }
    }
  });

  private metadataReceiver = new DataChannelReceiver((received, body) => {
    if (this.onProgress) {
      this.onProgress(received, body.length, CmdType.METADATA);
    }

    if (received === body.length && this.onMetadata) {
      let bodyStr = arrayBufferToString(body);
      let parsedBody = JSON.parse(bodyStr) as VideoMetadata;
      this.onMetadata(parsedBody);
    }
  });

  private recordingReceiver = new DataChannelReceiver((received, body) => {
    if (this.onProgress) {
      this.onProgress(received, body.length, CmdType.RECORDING);
    }

    if (received === body.length && this.onVideoDownloaded) {
      this.onVideoDownloaded(body);
    }
  });
}
