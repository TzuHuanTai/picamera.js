import { DataPacket_Kind, UserPacket, DataPacket } from '@livekit/protocol';
import { CmdMessage, CmdType } from "../rtc/cmd-message";
// import { stringToArrayBuffer } from "../utils/rtc-tools";
import { ChannelId, RtcPeer, RtcPeerConfig } from "./rtc-peer";

export class PublisherPeer extends RtcPeer {

  private pubLossyChannel: RTCDataChannel;
  private pubReliableChannel: RTCDataChannel;

  constructor(config: RtcPeerConfig) {
    super(config);
    this.pubReliableChannel = super.createDataChannel(ChannelId.Reliable, { ordered: true });
    this.pubLossyChannel = super.createDataChannel(ChannelId.Lossy, { ordered: true, maxRetransmits: 0 });

    this.pubReliableChannel.onopen = () => {
      this.onDatachannel?.(ChannelId.Reliable);
    }
    this.pubLossyChannel.onopen = () => {
      this.onDatachannel?.(ChannelId.Lossy);
    }

    console.debug("PublisherPeer created.");
  }

  sendMessage = (msg: string) => {
    const command = new CmdMessage(CmdType.CUSTOM, msg);

    // const data = stringToArrayBuffer(command.ToString());
    const data = new TextEncoder().encode(command.ToString());

    const packet = new DataPacket({
      kind: this.options.ipcMode === 'lossy' ? DataPacket_Kind.LOSSY : DataPacket_Kind.RELIABLE,
      value: {
        case: 'user',
        value: new UserPacket({
          payload: data,
          topic: 'ipc_topic',
        })
      }
    });

     const encoded = new Uint8Array(packet.toBinary()).buffer;

    if (this.options.ipcMode === 'lossy') {
      if (this.pubLossyChannel.readyState === 'open') {
        this.pubLossyChannel.send(encoded);
      }
    } else {
      if (this.pubReliableChannel.readyState === 'open') {
        this.pubReliableChannel.send(encoded);
      }
    }
  }
}
