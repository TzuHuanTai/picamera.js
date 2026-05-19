import { DataPacket } from "@livekit/protocol";
import { SubscriberPeer } from "./subscriber-peer";
import { RtcPeerConfig, ChannelLabel } from "./rtc-peer";
import { IPiCameraOptions } from "../pi-camera.types";

// Mock WebRTC APIs since they're not available in Node.js test environment
Object.assign(global, {
  RTCPeerConnection: jest.fn().mockImplementation(() => ({
    ontrack: null,
    onicecandidate: null,
    onconnectionstatechange: null,
    ondatachannel: null,
    createDataChannel: jest.fn(),
    createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
    createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-answer-sdp' }),
    setLocalDescription: jest.fn().mockResolvedValue(undefined),
    setRemoteDescription: jest.fn().mockResolvedValue(undefined),
    addIceCandidate: jest.fn().mockResolvedValue(undefined),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    signalingState: 'stable',
    connectionState: 'connected',
    iceConnectionState: 'connected',
    getStats: jest.fn(() => Promise.resolve(new Map())),
    getReceivers: jest.fn(() => []),
    getSenders: jest.fn(() => []),
  })),
  RTCSessionDescription: jest.fn(),
  RTCIceCandidate: jest.fn(),
  URL: {
    createObjectURL: jest.fn(),
    revokeObjectURL: jest.fn(),
  },
  MediaStream: jest.fn(() => ({
    getTracks: jest.fn(() => []),
    getVideoTracks: jest.fn(() => []),
    getAudioTracks: jest.fn(() => []),
    addTrack: jest.fn(),
    removeTrack: jest.fn(),
  })),
  Blob: class {
    constructor() {}
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(10)); }
  },
  navigator: {
    mediaDevices: {
      getUserMedia: jest.fn(),
    }
  }
});

describe('SubscriberPeer', () => {
  let config: RtcPeerConfig;
  let subscriberPeer: SubscriberPeer;

  beforeEach(() => {
    config = {
      options: {
        signaling: 'websocket',
        stunUrls: ['stun:stun.example.com'],
        timeout: 30000,
        datachannelOnly: false,
        ipcMode: 'reliable',
        isMicOn: true,
        isSpeakerOn: true,
        credits: true,
        codec: 'H264'
      } as IPiCameraOptions,
      iceServers: []
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should call super with the provided config', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();

      const newSubscriberPeer = new SubscriberPeer(config);

      expect(consoleSpy).toHaveBeenCalledWith('SubscriberPeer created.');
      consoleSpy.mockRestore();
    });
  });

  describe('onDataChannelMessage', () => {
    beforeEach(() => {
      subscriberPeer = new SubscriberPeer(config);

      // Manually set up the channel receivers to avoid "No receivers found" warnings
      (subscriberPeer as any).channelReceivers = {
        'command': {
          snapshotReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          metadataReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          recordingReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          customReceiver: { receiveData: jest.fn(), reset: jest.fn() },
        },
        '_lossy': {
          snapshotReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          metadataReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          recordingReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          customReceiver: { receiveData: jest.fn(), reset: jest.fn() },
        },
        '_reliable': {
          snapshotReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          metadataReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          recordingReceiver: { receiveData: jest.fn(), reset: jest.fn() },
          customReceiver: { receiveData: jest.fn(), reset: jest.fn() },
        }
      };

      // Create a spy on the parent class dispatchPayload method since super.dispatchPayload is called
      jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(subscriberPeer)), 'dispatchPayload').mockImplementation();
    });

    it('should handle ArrayBuffer data correctly', async () => {
      // Mock the DataPacket.fromBinary method to return a mock data packet
      const mockPayload = new Uint8Array([1, 2, 3, 4]);
      const mockUserPacket = { payload: mockPayload, topic: 'test-topic' };
      const mockDataPacket = {
        value: {
          case: 'user',
          value: mockUserPacket
        }
      };
      
      const fromBinarySpy = jest.spyOn(DataPacket, 'fromBinary').mockReturnValue(mockDataPacket as any);

      const buffer = new ArrayBuffer(10); // dummy buffer
      const messageEvent: MessageEvent = {
        data: buffer,
      } as MessageEvent;

      const label: ChannelLabel = 'command';

      await subscriberPeer.onDataChannelMessage(label, messageEvent);

      expect(fromBinarySpy).toHaveBeenCalledWith(new Uint8Array(buffer));
      expect((subscriberPeer as any).dispatchPayload).toHaveBeenCalledWith(label, mockPayload);
    });

    it('should handle Blob data correctly', async () => {
      // Mock the DataPacket.fromBinary method to return a mock data packet  
      const mockPayload = new Uint8Array([5, 6, 7, 8]);
      const mockUserPacket = { payload: mockPayload, topic: 'test-topic' };
      const mockDataPacket = {
        value: {
          case: 'user',
          value: mockUserPacket
        }
      };
      
      const fromBinarySpy = jest.spyOn(DataPacket, 'fromBinary').mockReturnValue(mockDataPacket as any);

      const buffer = new ArrayBuffer(10); // dummy buffer
      const blob = new Blob([buffer]);
      Object.defineProperty(blob, 'arrayBuffer', {
        value: jest.fn().mockResolvedValue(buffer),
        writable: true
      });
      
      const messageEvent: MessageEvent = {
        data: blob,
      } as MessageEvent;

      const label: ChannelLabel = 'command';

      await subscriberPeer.onDataChannelMessage(label, messageEvent);

      expect(fromBinarySpy).toHaveBeenCalledWith(new Uint8Array(buffer));
      expect((subscriberPeer as any).dispatchPayload).toHaveBeenCalledWith(label, mockPayload);
    });

    it('should log error and return for unsupported data type', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const messageEvent: MessageEvent = {
        data: 'unsupported string data',
      } as MessageEvent;

      const label: ChannelLabel = 'command';

      await subscriberPeer.onDataChannelMessage(label, messageEvent);

      expect(consoleSpy).toHaveBeenCalledWith('unsupported data type', 'unsupported string data');
      expect((subscriberPeer as any).dispatchPayload).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should not dispatch payload if DataPacket value case is not user', async () => {
      // Mock the DataPacket.fromBinary method to return a data packet that doesn't have case 'user'
      const mockDataPacket = {
        value: {
          case: 'speaker',
          value: {
            speakers: [],
          }
        }
      };
      
      jest.spyOn(DataPacket, 'fromBinary').mockReturnValue(mockDataPacket as any);

      const buffer = new ArrayBuffer(10); // dummy buffer
      const messageEvent: MessageEvent = {
        data: buffer,
      } as MessageEvent;

      const label: ChannelLabel = 'command';

      await subscriberPeer.onDataChannelMessage(label, messageEvent);

      expect((subscriberPeer as any).dispatchPayload).not.toHaveBeenCalled();
    });

    it('should handle empty payload correctly', async () => {
      // Mock the DataPacket.fromBinary method to return a mock data packet with empty payload
      const mockPayload = new Uint8Array([]); // empty payload
      const mockUserPacket = { payload: mockPayload, topic: 'test-topic' };
      const mockDataPacket = {
        value: {
          case: 'user',
          value: mockUserPacket
        }
      };
      
      const fromBinarySpy = jest.spyOn(DataPacket, 'fromBinary').mockReturnValue(mockDataPacket as any);

      const buffer = new ArrayBuffer(10); // dummy buffer
      const messageEvent: MessageEvent = {
        data: buffer,
      } as MessageEvent;

      const label: ChannelLabel = 'command';

      await subscriberPeer.onDataChannelMessage(label, messageEvent);

      expect(fromBinarySpy).toHaveBeenCalledWith(new Uint8Array(buffer));
      expect((subscriberPeer as any).dispatchPayload).toHaveBeenCalledWith(label, mockPayload);
    });
  });
});