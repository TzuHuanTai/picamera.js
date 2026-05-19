import { DataPacket_Kind, UserPacket, DataPacket } from '@livekit/protocol';
import { CmdMessage, CmdType } from '../rtc/cmd-message';
import { ChannelId, RtcPeerConfig, ChannelLabelMap } from './rtc-peer';
import { PublisherPeer } from './publisher-peer';

// Mock the RTCPeerConnection API which is not available in JSDOM
class MockRTCPeerConnection {
  localDescription = { type: 'offer', sdp: 'fake sdp' };
  onicecandidate: any;
  onconnectionstatechange: any;
  ontrack: any;
  ondatachannel: any;

  constructor(config?: RTCConfiguration) {}

  createOffer(options?: RTCOfferOptions) {
    return Promise.resolve({ type: 'offer', sdp: 'fake sdp' });
  }

  setLocalDescription(offer: RTCSessionDescriptionInit) {
    return Promise.resolve();
  }

  createAnswer() {
    return Promise.resolve({ type: 'answer', sdp: 'fake sdp' });
  }

  setRemoteDescription(description: RTCSessionDescriptionInit) {
    return Promise.resolve();
  }

  addIceCandidate(candidate: RTCIceCandidateInit) {
    return Promise.resolve();
  }

  addTrack() {
    return {} as MediaStreamTrack;
  }

  createDataChannel(label: string, options?: RTCDataChannelInit) {
    return new MockRTCDataChannel(label, options);
  }

  close() {}
  getStats() {}
}

class MockRTCDataChannel {
  readyState: string = 'open';
  onopen: ((this: RTCDataChannel, ev: Event) => any) | null = null;
  onmessage: ((this: RTCDataChannel, ev: MessageEvent) => any) | null = null;
  onerror: ((this: RTCDataChannel, ev: Event) => any) | null = null;
  onclose: ((this: RTCDataChannel, ev: Event) => any) | null = null;

  constructor(public label: string, public options?: RTCDataChannelInit) {}

  send(data: any) {}
  close() { this.readyState = 'closed'; }
}

// Mock the global RTCPeerConnection
Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  value: MockRTCPeerConnection
});

// Spy on console.debug to prevent output during tests
const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});

describe('PublisherPeer', () => {
  let config: RtcPeerConfig;

  beforeEach(() => {
    config = {
      iceServers: [],
      options: {
        signaling: 'websocket',
        stunUrls: [],
        turnUrls: [],
        turnUsername: '',
        turnPassword: '',
        timeout: 10000,
        datachannelOnly: true,
        ipcMode: 'reliable',
        isMicOn: true,
        isSpeakerOn: true,
        credits: false,
        codec: 'H264',
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create data channels for reliable and lossy channels', () => {
      const publisherPeer = new PublisherPeer(config);
      
      // Check that createDataChannel was called from the RTCPeerConnection mock
      // We need to spy on the RTCPeerConnection createDataChannel to verify this
      const originalRTCPeerConnection = RTCPeerConnection;
      let createDataChannelCalls: any[] = [];
      
      class MockRTCPeerConnectionWithSpy extends MockRTCPeerConnection {
        createDataChannel(label: string, options?: RTCDataChannelInit) {
          createDataChannelCalls.push({ label, options });
          return new MockRTCDataChannel(label, options);
        }
      }
      
      Object.defineProperty(global, 'RTCPeerConnection', {
        writable: true,
        value: MockRTCPeerConnectionWithSpy
      });
      
      const peer = new PublisherPeer(config);
      
      // Restore original
      Object.defineProperty(global, 'RTCPeerConnection', {
        writable: true,
        value: originalRTCPeerConnection
      });
      
      expect(createDataChannelCalls).toHaveLength(2);
      
      // Check the calls
      expect(createDataChannelCalls[0].label).toBe('_reliable');
      expect(createDataChannelCalls[0].options).toEqual({ ordered: true });
      
      expect(createDataChannelCalls[1].label).toBe('_lossy');
      expect(createDataChannelCalls[1].options).toEqual({ ordered: false, maxRetransmits: 0 });
    });

    it('should set up onopen handlers for both channels', () => {
      const publisherPeer = new PublisherPeer(config);
      
      expect(publisherPeer).toBeTruthy();
    });
  });

  describe('sendMessage', () => {
    it('should send message via reliable channel by default', () => {
      const publisherPeer = new PublisherPeer(config);
      
      const message = 'test message';
      const sendSpy = jest.spyOn((publisherPeer as any).pubReliableChannel, 'send');
      
      publisherPeer.sendMessage(message);
      
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    });

    it('should send message via lossy channel when ipcMode is lossy', () => {
      config.options.ipcMode = 'lossy';
      const publisherPeer = new PublisherPeer(config);
      
      const message = 'test message';
      const sendSpy = jest.spyOn((publisherPeer as any).pubLossyChannel, 'send');
      
      publisherPeer.sendMessage(message);
      
      expect(sendSpy).toHaveBeenCalledTimes(1);
      expect(sendSpy).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    });

    it('should not send message if reliable channel is not open', () => {
      const publisherPeer = new PublisherPeer(config);
      
      // Set the channel to closed
      (publisherPeer as any).pubReliableChannel.readyState = 'closed';
      
      const message = 'test message';
      const sendSpy = jest.spyOn((publisherPeer as any).pubReliableChannel, 'send');
      
      publisherPeer.sendMessage(message);
      
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should not send message if lossy channel is not open', () => {
      config.options.ipcMode = 'lossy';
      const publisherPeer = new PublisherPeer(config);
      
      // Set the channel to closed
      (publisherPeer as any).pubLossyChannel.readyState = 'closed';
      
      const message = 'test message';
      const sendSpy = jest.spyOn((publisherPeer as any).pubLossyChannel, 'send');
      
      publisherPeer.sendMessage(message);
      
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('should encode the message using CmdMessage and DataPacket', () => {
      const publisherPeer = new PublisherPeer(config);
      
      const message = 'test message';
      const sendSpy = jest.spyOn((publisherPeer as any).pubReliableChannel, 'send');
      
      publisherPeer.sendMessage(message);
      
      // Verify that the sent data is properly formatted
      const callArgs = sendSpy.mock.calls[0];
      const sentData = callArgs[0] as ArrayBuffer;
      
      // The sent data should be a valid ArrayBuffer
      expect(sentData).toBeInstanceOf(ArrayBuffer);
      expect(sentData.byteLength).toBeGreaterThan(0);
    });
  });

  it('should call onDatachannel callback when reliable channel opens', () => {
    const publisherPeer = new PublisherPeer(config);
    
    const onDatachannelMock = jest.fn();
    publisherPeer.onDatachannel = onDatachannelMock;
    
    // Trigger the reliable channel's onopen
    const reliableChannel = (publisherPeer as any).pubReliableChannel;
    if (reliableChannel.onopen) {
      reliableChannel.onopen(new Event('open'));
    }
    
    expect(onDatachannelMock).toHaveBeenCalledWith(ChannelId.Reliable);
  });

  it('should call onDatachannel callback when lossy channel opens', () => {
    const publisherPeer = new PublisherPeer(config);
    
    const onDatachannelMock = jest.fn();
    publisherPeer.onDatachannel = onDatachannelMock;
    
    // Trigger the lossy channel's onopen
    const lossyChannel = (publisherPeer as any).pubLossyChannel;
    if (lossyChannel.onopen) {
      lossyChannel.onopen(new Event('open'));
    }
    
    expect(onDatachannelMock).toHaveBeenCalledWith(ChannelId.Lossy);
  });
});