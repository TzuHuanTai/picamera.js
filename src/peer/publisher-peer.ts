import { DataPacket_Kind, UserPacket, DataPacket } from '@livekit/protocol';
import { ChannelId, RtcPeer, RtcPeerConfig } from "./rtc-peer";
import { CommandType, Packet } from '../proto/packet';

export class PublisherPeer extends RtcPeer {

  private pubLossyChannel: RTCDataChannel;
  private pubReliableChannel: RTCDataChannel;

  constructor(config: RtcPeerConfig) {
    super(config);
    this.pubReliableChannel = super.createDataChannel(ChannelId.Reliable, { ordered: true });
    this.pubLossyChannel = super.createDataChannel(ChannelId.Lossy, { ordered: false, maxRetransmits: 0 });

    this.pubReliableChannel.onopen = () => {
      this.onDatachannel?.(ChannelId.Reliable);
    }
    this.pubLossyChannel.onopen = () => {
      this.onDatachannel?.(ChannelId.Lossy);
    }

    console.debug("PublisherPeer created.");
  }

  sendText = (msg: string) => {
    this.sendData(new TextEncoder().encode(msg));
  }

  sendData = (binary: Uint8Array) => {
    const custom_command = Packet.create({
      type: CommandType.CUSTOM,
      customCommand: binary
    });

    const data = Packet.encode(custom_command).finish();

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

    const encoded = new Uint8Array(packet.toBinary());

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
