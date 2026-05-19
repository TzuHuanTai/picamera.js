import { RtcPeer, ChannelId, ChannelLabel, IpcMode } from './rtc-peer';
import { CmdType, VideoMetadata } from '../rtc/cmd-message';
import { DataChannelReceiver } from '../rtc/datachannel-receiver';

// Mock the DataChannelReceiver
jest.mock('../rtc/datachannel-receiver', () => ({
  DataChannelReceiver: jest.fn().mockImplementation(() => ({
    receiveData: jest.fn(),
    reset: jest.fn()
  }))
}));

// Mock the rtc-tools functions
jest.mock('../utils/rtc-tools', () => ({
  arrayBufferToBase64: jest.fn().mockReturnValue('mocked-base64'),
  arrayBufferToString: jest.fn().mockReturnValue('{"duration":"10s","image":"test.jpg","path":"/video/test.mp4"}'),
  utf8ArrayToString: jest.fn().mockReturnValue('mocked-utf8-string')
}));

// Set up a mock environment that provides the necessary browser globals
Object.assign(global, {
  MediaStream: jest.fn().mockImplementation(() => ({
    addTrack: jest.fn(),
    getTracks: jest.fn().mockReturnValue([])
  })),
  RTCSessionDescription: jest.fn(),
  RTCIceCandidate: jest.fn(),
  RTCPeerConnection: null, // Will be mocked in beforeEach
  navigator: {
    mediaDevices: null // Will be mocked in beforeEach
  }
});

describe('RtcPeer', () => {
  let rtcPeer: RtcPeer;
  let mockConfig: any;
  let mockPeerConnection: any;
  let mockMediaDevices: any;

  beforeEach(() => {
    // Mock MediaDevices
    mockMediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({
        getTracks: jest.fn().mockReturnValue([{ stop: jest.fn(), enabled: true, kind: 'audio', label: 'mock-audio-track', id: 'track-id' }])
      })
    };

    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true
    });

    // Mock RTCPeerConnection
    mockPeerConnection = {
      createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
      createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
      setRemoteDescription: jest.fn().mockResolvedValue(undefined),
      addIceCandidate: jest.fn().mockResolvedValue(undefined),
      close: jest.fn(),
      addTrack: jest.fn(),
      ontrack: null,
      onicecandidate: null,
      onconnectionstatechange: null,
      ondatachannel: null,
      connectionState: 'new' as RTCPeerConnectionState
    };

    const MockRTCPeerConnection = jest.fn().mockImplementation(() => mockPeerConnection);
    (MockRTCPeerConnection as any).generateCertificate = jest.fn().mockResolvedValue({});
    global.RTCPeerConnection = MockRTCPeerConnection as any;

    mockConfig = {
      options: {
        ipcMode: 'reliable' as IpcMode,
        isMicOn: false,
        isSpeakerOn: false
      }
    };

    rtcPeer = new RtcPeer(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with the provided config', () => {
      expect(rtcPeer.options).toEqual(mockConfig.options);
      expect(RTCPeerConnection).toHaveBeenCalledWith(mockConfig);
    });

    it('should set up event handlers', () => {
      expect(mockPeerConnection.ontrack).toBeDefined();
      expect(mockPeerConnection.onicecandidate).toBeDefined();
      expect(mockPeerConnection.onconnectionstatechange).toBeDefined();
      expect(mockPeerConnection.ondatachannel).toBeDefined();
    });
  });

  describe('connectionState', () => {
    it('should return peer connection state', () => {
      expect(rtcPeer.connectionState).toBe('new');
    });
  });

  describe('close', () => {
    it('should reset all channel receivers', () => {
      // Mock receivers that should be reset
      const mockReceiver = {
        reset: jest.fn()
      };
      
      // Set up receivers to test
      (rtcPeer as any).channelReceivers = {
        command: {
          snapshotReceiver: mockReceiver,
          metadataReceiver: mockReceiver,
          recordingReceiver: mockReceiver,
          customReceiver: mockReceiver
        },
        _lossy: {
          snapshotReceiver: mockReceiver,
          metadataReceiver: mockReceiver,
          recordingReceiver: mockReceiver,
          customReceiver: mockReceiver
        },
        _reliable: {
          snapshotReceiver: mockReceiver,
          metadataReceiver: mockReceiver,
          recordingReceiver: mockReceiver,
          customReceiver: mockReceiver
        }
      };
      
      rtcPeer.close();
      
      expect(mockReceiver.reset).toHaveBeenCalledTimes(12); // 3 channels * 4 receivers each
    });

    it('should close data channels if they exist', () => {
      const mockLossyChannel = { onmessage: jest.fn() };
      const mockReliableChannel = { onmessage: jest.fn() };
      
      (rtcPeer as any).lossyChannel = mockLossyChannel;
      (rtcPeer as any).reliableChannel = mockReliableChannel;
      
      rtcPeer.close();
      
      expect(mockLossyChannel.onmessage).toBeNull();
      expect(mockReliableChannel.onmessage).toBeNull();
      expect((rtcPeer as any).lossyChannel).toBeUndefined();
      expect((rtcPeer as any).reliableChannel).toBeUndefined();
    });

    it('should stop local stream tracks', () => {
      const mockTrack = { stop: jest.fn(), enabled: true };
      const mockLocalStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack])
      };
      
      (rtcPeer as any).localStream = mockLocalStream as any;
      
      rtcPeer.close();
      
      expect(mockTrack.stop).toHaveBeenCalled();
      expect((rtcPeer as any).localStream).toBeUndefined();
    });

    it('should stop remote stream tracks', () => {
      const mockTrack = { stop: jest.fn(), enabled: true };
      const mockRemoteStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack])
      };
      
      (rtcPeer as any).remoteStreamMap.set('test-sid', mockRemoteStream as any);
      
      rtcPeer.close();
      
      expect(mockTrack.stop).toHaveBeenCalled();
      expect((rtcPeer as any).remoteStreamMap.size).toBe(0);
    });

    it('should close the peer connection', () => {
      rtcPeer.close();
      
      expect(mockPeerConnection.close).toHaveBeenCalled();
    });
  });

  describe('createDataChannel', () => {
    it('should create a data channel with correct label', () => {
      const mockDataChannel = { label: 'test-label' };
      mockPeerConnection.createDataChannel = jest.fn().mockReturnValue(mockDataChannel);
      
      const result = rtcPeer.createDataChannel(ChannelId.Command);
      
      expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith('command', undefined);
      expect(result).toBe(mockDataChannel);
    });
  });

  describe('createOffer', () => {
    it('should create and set offer', async () => {
      const mockOffer = { type: 'offer', sdp: 'mock-sdp' };
      mockPeerConnection.createOffer.mockResolvedValue(mockOffer);
      
      const result = await rtcPeer.createOffer();
      
      expect(mockPeerConnection.createOffer).toHaveBeenCalledWith(undefined);
      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(mockOffer);
      expect(result).toBe(mockOffer);
    });
  });

  describe('createAnswer', () => {
    it('should set remote description and create answer', async () => {
      const mockSd = { type: 'offer' as RTCSdpType, sdp: 'mock-sdp' };
      const mockAnswer = { type: 'answer' as RTCSdpType, sdp: 'mock-answer-sdp' };
      
      const setRemoteSpy = jest.spyOn(rtcPeer, 'setRemoteDescription');
      mockPeerConnection.createAnswer.mockResolvedValue(mockAnswer);
      
      const result = await rtcPeer.createAnswer(mockSd);
      
      expect(setRemoteSpy).toHaveBeenCalledWith(mockSd);
      expect(mockPeerConnection.createAnswer).toHaveBeenCalled();
      expect(mockPeerConnection.setLocalDescription).toHaveBeenCalledWith(mockAnswer);
      expect(result).toBe(mockAnswer);
    });
  });

  describe('createlocalAudioStream', () => {
    it('should create local audio stream and add tracks', async () => {
      const mockTrack = { stop: jest.fn(), enabled: true };
      const mockLocalStream = {
        getTracks: jest.fn().mockReturnValue([mockTrack]),
        getAudioTracks: jest.fn().mockReturnValue([mockTrack])
      };
      
      mockMediaDevices.getUserMedia.mockResolvedValue(mockLocalStream);

      await rtcPeer.createlocalAudioStream();

      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false,
      });
      expect(mockPeerConnection.addTrack).toHaveBeenCalledWith(mockTrack, mockLocalStream);
      expect(mockTrack.enabled).toBe(false); // because isMicOn is false by default
    });
  });

  describe('setRemoteDescription', () => {
    it('should set remote description and add pending ice candidates', async () => {
      const mockSd = { type: 'offer' as RTCSdpType, sdp: 'mock-sdp' };
      const mockCandidate = { candidate: 'candidate' };
      (rtcPeer as any).pendingIceCandidates = [mockCandidate];

      await rtcPeer.setRemoteDescription(mockSd);

      expect(mockPeerConnection.setRemoteDescription).toHaveBeenCalledWith(mockSd);
      expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledWith(mockCandidate);
      expect((rtcPeer as any).pendingIceCandidates).toHaveLength(0);
    });
  });

  describe('addIceCandidate', () => {
    it('should add ice candidate immediately if remote description exists', () => {
      mockPeerConnection.remoteDescription = { type: 'offer' };
      
      const mockCandidate = { candidate: 'candidate' };
      rtcPeer.addIceCandidate(mockCandidate);
      
      expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledWith(mockCandidate);
    });

    it('should store ice candidate if no remote description exists', () => {
      mockPeerConnection.remoteDescription = null;
      
      const mockCandidate = { candidate: 'candidate' };
      rtcPeer.addIceCandidate(mockCandidate);
      
      expect(mockPeerConnection.addIceCandidate).not.toHaveBeenCalled();
      expect((rtcPeer as any).pendingIceCandidates).toContain(mockCandidate);
    });
  });

  describe('toggleMic', () => {
    it('should toggle mic state', () => {
      rtcPeer.toggleMic(true);
      expect((rtcPeer as any).options.isMicOn).toBe(true);
    });

    it('should toggle to opposite if no parameter provided', () => {
      (rtcPeer as any).options.isMicOn = false;
      rtcPeer.toggleMic();
      expect((rtcPeer as any).options.isMicOn).toBe(true);
    });
  });

  describe('toggleSpeaker', () => {
    it('should toggle speaker state', () => {
      rtcPeer.toggleSpeaker(true);
      expect((rtcPeer as any).options.isSpeakerOn).toBe(true);
    });

    it('should toggle to opposite if no parameter provided', () => {
      (rtcPeer as any).options.isSpeakerOn = false;
      rtcPeer.toggleSpeaker();
      expect((rtcPeer as any).options.isSpeakerOn).toBe(true);
    });
  });

  describe('private methods', () => {
    describe('handleTrack', () => {
      it('should handle incoming tracks correctly', () => {
        const mockStream = {
          id: 'stream-id|extra',
          getTracks: jest.fn().mockReturnValue([{ kind: 'audio', enabled: true, stop: jest.fn() }])
        };
        const mockEvent = {
          streams: [mockStream]
        } as unknown as RTCTrackEvent;

        const onStreamSpy = jest.fn();
        rtcPeer.onStream = onStreamSpy;

        const onSfuStreamSpy = jest.fn();
        rtcPeer.onSfuStream = onSfuStreamSpy;

        (rtcPeer as any).handleTrack(mockEvent);

        expect(onStreamSpy).toHaveBeenCalled();
        expect(onSfuStreamSpy).toHaveBeenCalledWith('stream-id', expect.objectContaining({
          addTrack: expect.any(Function),
          getTracks: expect.any(Function)
        }));
      });
    });

    describe('createReceivers', () => {
      it('should create receiver groups for the given label', () => {
        const label: ChannelLabel = 'command';
        (rtcPeer as any).createReceivers(label);

        expect((rtcPeer as any).channelReceivers[label]).toBeDefined();
        expect(DataChannelReceiver).toHaveBeenCalledTimes(4); // snapshot, metadata, recording, custom receivers
      });
    });

    describe('onDataChannelMessage', () => {
      it('should dispatch payload when receiving message', () => {
        const mockPacket = new Uint8Array([CmdType.SNAPSHOT, 1, 2, 3]);
        const mockEvent = { data: mockPacket.buffer } as MessageEvent;

        const dispatchSpy = jest.spyOn(rtcPeer as any, 'dispatchPayload');
        (rtcPeer as any).onDataChannelMessage('command', mockEvent);

        expect(dispatchSpy).toHaveBeenCalledWith('command', mockPacket);
      });
    });

    describe('dispatchPayload', () => {
      it('should dispatch payload to the correct receiver based on cmd type', () => {
        const mockReceivers = {
          snapshotReceiver: { receiveData: jest.fn() },
          metadataReceiver: { receiveData: jest.fn() },
          recordingReceiver: { receiveData: jest.fn() },
          customReceiver: { receiveData: jest.fn() }
        };

        (rtcPeer as any).channelReceivers = {
          command: mockReceivers
        };

        const mockPacket = new Uint8Array([CmdType.SNAPSHOT, 1, 2, 3]);
        (rtcPeer as any).dispatchPayload('command', mockPacket);

        expect(mockReceivers.snapshotReceiver.receiveData).toHaveBeenCalledWith(
          new Uint8Array([1, 2, 3]) // body without header
        );
      });

      it('should handle metadata type correctly', () => {
        const mockReceivers = {
          metadataReceiver: { receiveData: jest.fn() }
        };
        (rtcPeer as any).channelReceivers = {
          command: mockReceivers
        };

        const mockPacket = new Uint8Array([CmdType.METADATA, 1, 2, 3]);
        (rtcPeer as any).dispatchPayload('command', mockPacket);

        expect(mockReceivers.metadataReceiver.receiveData).toHaveBeenCalledWith(
          new Uint8Array([1, 2, 3]) // body without header
        );
      });

      it('should handle recording type correctly', () => {
        const mockReceivers = {
          recordingReceiver: { receiveData: jest.fn() }
        };
        (rtcPeer as any).channelReceivers = {
          command: mockReceivers
        };

        const mockPacket = new Uint8Array([CmdType.RECORDING, 1, 2, 3]);
        (rtcPeer as any).dispatchPayload('command', mockPacket);

        expect(mockReceivers.recordingReceiver.receiveData).toHaveBeenCalledWith(
          new Uint8Array([1, 2, 3]) // body without header
        );
      });

      it('should handle custom type correctly', () => {
        const mockReceivers = {
          customReceiver: { receiveData: jest.fn() }
        };
        (rtcPeer as any).channelReceivers = {
          command: mockReceivers
        };

        const mockPacket = new Uint8Array([CmdType.CUSTOM, 1, 2, 3]);
        (rtcPeer as any).dispatchPayload('command', mockPacket);

        expect(mockReceivers.customReceiver.receiveData).toHaveBeenCalledWith(
          new Uint8Array([1, 2, 3]) // body without header
        );
      });

      it('should warn if no receivers found for label', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        const mockPacket = new Uint8Array([CmdType.SNAPSHOT, 1, 2, 3]);
        (rtcPeer as any).dispatchPayload('command', mockPacket);

        expect(consoleSpy).toHaveBeenCalledWith('No receivers found for label: command');
        consoleSpy.mockRestore();
      });
    });
  });

  describe('event handlers', () => {
    it('should have optional event handlers defined', () => {
      expect(rtcPeer.onSnapshot).toBeUndefined();
      expect(rtcPeer.onMetadata).toBeUndefined();
      expect(rtcPeer.onProgress).toBeUndefined();
      expect(rtcPeer.onVideoDownloaded).toBeUndefined();
      expect(rtcPeer.onDatachannel).toBeUndefined();
      expect(rtcPeer.onMessage).toBeUndefined();
      expect(rtcPeer.onStream).toBeUndefined();
      expect(rtcPeer.onSfuStream).toBeUndefined();
      expect(rtcPeer.onIceCandidate).toBeUndefined();
      expect(rtcPeer.onConnectionStateChange).toBeUndefined();
    });
  });
});