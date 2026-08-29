import { DataPacket_Kind, UserPacket, DataPacket } from '@livekit/protocol';
import { ChannelRole, IpcMode, ipcModeToRole, roleInit, RtcPeer, RtcPeerConfig } from "./rtc-peer";
import { Packet } from '../proto/packet';

export class PublisherPeer extends RtcPeer {

  constructor(config: RtcPeerConfig) {
    super(config);

    // LiveKit opens channels in-band, and on the SFU path the publisher is the side that opens
    // them — so these are created here, not negotiated.
    this.registerChannel(
      ChannelRole.Reliable,
      super.createDataChannel(ChannelRole.Reliable, roleInit(ChannelRole.Reliable))
    );
    this.registerChannel(
      ChannelRole.Lossy,
      super.createDataChannel(ChannelRole.Lossy, roleInit(ChannelRole.Lossy))
    );

    console.debug("PublisherPeer created.");
  }

  sendText = (msg: string, mode: IpcMode = 'reliable') => {
    this.sendData(new TextEncoder().encode(msg), mode);
  }

  sendData = (binary: Uint8Array, mode: IpcMode = 'reliable') => {
    const data = Packet.encode(Packet.create({ raw: binary })).finish();

    const packet = new DataPacket({
      kind: mode === 'lossy' ? DataPacket_Kind.LOSSY : DataPacket_Kind.RELIABLE,
      value: {
        case: 'user',
        value: new UserPacket({
          payload: data,
          topic: 'ipc_topic',
        })
      }
    });

    this.sendOn(ipcModeToRole(mode), new Uint8Array(packet.toBinary()));
  }
}
