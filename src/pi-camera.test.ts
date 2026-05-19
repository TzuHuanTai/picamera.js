import { PiCamera } from './pi-camera';
import { MqttClient } from './signaling/mqtt-client';
import { WebSocketClient } from './signaling/websocket-client';
import { CommanderPeer } from './peer/commander-peer';
import { SubscriberPeer } from './peer/subscriber-peer';
import { PublisherPeer } from './peer/publisher-peer';
import { DEFAULT } from './constants';
import { SignalingType } from './pi-camera.types';

// Mock all dependencies
jest.mock('./signaling/mqtt-client');
jest.mock('./signaling/websocket-client');
jest.mock('./peer/commander-peer');
jest.mock('./peer/subscriber-peer');
jest.mock('./peer/publisher-peer');

describe('PiCamera', () => {
  let mockMqttClient: any;
  let mockWebSocketClient: any;
  let mockCommanderPeer: any;
  let mockSubscriberPeer: any;
  let mockPublisherPeer: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock objects with proper method stubs
    mockMqttClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(),
      onConnect: null,
      onIceCandidate: null,
      onAnswer: null,
      send: jest.fn(),
    };

    mockWebSocketClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onConnect: null,
      onJoin: null,
      onOffer: null,
      onAnswer: null,
      onPublisherIce: null,
      onSubscriberIce: null,
      onTrackPublished: null,
      onParticipant: null,
      onRoomInfo: null,
      onQuility: null,
      onSpeaking: null,
      onLeave: null,
      send: jest.fn(),
    };

    mockCommanderPeer = {
      createOffer: jest.fn(),
      setRemoteDescription: jest.fn(),
      addIceCandidate: jest.fn(),
      snapshot: jest.fn(),
      toggleMic: jest.fn(),
      toggleSpeaker: jest.fn(),
      sendMessage: jest.fn(),
      setCameraProperty: jest.fn(),
      getRecordingMetadata: jest.fn(),
      fetchRecordedVideo: jest.fn(),
      close: jest.fn(),
      connectionState: 'new',
      onStream: null,
      onSfuStream: null,
      onIceCandidate: null,
      onConnectionStateChange: null,
      onSnapshot: null,
      onMetadata: null,
      onProgress: null,
      onVideoDownloaded: null,
      onDatachannel: null,
      onMessage: null,
    };

    mockSubscriberPeer = {
      createAnswer: jest.fn(),
      setRemoteDescription: jest.fn(),
      addIceCandidate: jest.fn(),
      toggleMic: jest.fn(),
      toggleSpeaker: jest.fn(),
      close: jest.fn(),
      connectionState: 'new',
      onMessage: null,
      onStream: null,
      onSfuStream: null,
      onIceCandidate: null,
    };

    mockPublisherPeer = {
      createOffer: jest.fn(),
      setRemoteDescription: jest.fn(),
      addIceCandidate: jest.fn(),
      toggleMic: jest.fn(),
      toggleSpeaker: jest.fn(),
      sendMessage: jest.fn(),
      close: jest.fn(),
      connectionState: 'new',
    };

    // Set up basic mock implementations
    (MqttClient as jest.Mock).mockImplementation(() => mockMqttClient);
    (WebSocketClient as jest.Mock).mockImplementation(() => mockWebSocketClient);
    (CommanderPeer as jest.Mock).mockImplementation(() => mockCommanderPeer);
    (SubscriberPeer as jest.Mock).mockImplementation(() => mockSubscriberPeer);
    (PublisherPeer as jest.Mock).mockImplementation(() => mockPublisherPeer);

    // Setup basic mock return values
    mockCommanderPeer.createOffer.mockResolvedValue({ sdp: 'fake-sdp' } as any);
    mockCommanderPeer.setRemoteDescription.mockResolvedValue();
    mockCommanderPeer.addIceCandidate.mockReturnValue();
    mockCommanderPeer.snapshot.mockReturnValue();
    mockCommanderPeer.toggleMic.mockReturnValue();
    mockCommanderPeer.toggleSpeaker.mockReturnValue();
    mockCommanderPeer.sendMessage.mockReturnValue();
    mockCommanderPeer.setCameraProperty.mockReturnValue();
    mockCommanderPeer.getRecordingMetadata.mockReturnValue();
    mockCommanderPeer.fetchRecordedVideo.mockReturnValue();
    mockCommanderPeer.close.mockReturnValue();

    mockSubscriberPeer.createAnswer.mockResolvedValue({ sdp: 'fake-answer-sdp' } as any);
    mockSubscriberPeer.setRemoteDescription.mockResolvedValue();
    mockSubscriberPeer.addIceCandidate.mockReturnValue();
    mockSubscriberPeer.toggleMic.mockReturnValue();
    mockSubscriberPeer.toggleSpeaker.mockReturnValue();
    mockSubscriberPeer.close.mockReturnValue();

    mockPublisherPeer.createOffer.mockResolvedValue({ sdp: 'fake-pub-offer-sdp' } as any);
    mockPublisherPeer.setRemoteDescription.mockResolvedValue();
    mockPublisherPeer.addIceCandidate.mockReturnValue();
    mockPublisherPeer.toggleMic.mockReturnValue();
    mockPublisherPeer.toggleSpeaker.mockReturnValue();
    mockPublisherPeer.sendMessage.mockReturnValue();
    mockPublisherPeer.close.mockReturnValue();

    mockMqttClient.connect.mockReturnValue();
    mockMqttClient.disconnect.mockReturnValue();
    mockMqttClient.isConnected.mockReturnValue(true);

    mockWebSocketClient.connect.mockReturnValue();
    mockWebSocketClient.disconnect.mockReturnValue();
  });

  describe('constructor', () => {
    it('should initialize with default options when no options provided', () => {
      const camera = new PiCamera({});

      expect((camera as any).options.signaling).toBe('mqtt');
      expect((camera as any).options.timeout).toBe(DEFAULT.SIGNALING_TIMEOUT);
      expect((camera as any).options.isMicOn).toBe(true);
      expect((camera as any).options.isSpeakerOn).toBe(true);
    });

    it('should use provided options when given', () => {
      const customOptions = {
        signaling: 'websocket' as SignalingType,
        timeout: 10000,
        isMicOn: false,
        isSpeakerOn: false,
      };

      const camera = new PiCamera(customOptions);

      expect((camera as any).options.signaling).toBe('websocket');
      expect((camera as any).options.timeout).toBe(10000);
      expect((camera as any).options.isMicOn).toBe(false);
      expect((camera as any).options.isSpeakerOn).toBe(false);
    });

    it('should create MqttClient when signaling is mqtt', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      
      expect(MqttClient).toHaveBeenCalledTimes(1);
      expect((camera as any).client).toBe(mockMqttClient);
    });

    it('should create WebSocketClient when signaling is websocket', () => {
      const camera = new PiCamera({ signaling: 'websocket' });
      
      expect(WebSocketClient).toHaveBeenCalledTimes(1);
      expect((camera as any).client).toBe(mockWebSocketClient);
    });

    it('should throw error for unknown signaling method', () => {
      expect(() => {
        new PiCamera({ signaling: 'unknown' as any });
      }).toThrow("unknow signaling method.");
    });

    it('should set up CommanderPeer when using MQTT signaling', () => {
      new PiCamera({ signaling: 'mqtt' });
      
      expect(CommanderPeer).toHaveBeenCalledTimes(1);
      expect(mockMqttClient.onConnect).toBeDefined();
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should call client.connect', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      camera.connect();
      
      expect(mockMqttClient.connect).toHaveBeenCalledTimes(1);
    });

    it('should set up timeout when options.timeout is not 0', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const camera = new PiCamera({ signaling: 'mqtt', timeout: 5000 });
      
      camera.connect();
      
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 5000);
      
      setTimeoutSpy.mockRestore();
    });

    it('should not set up timeout when options.timeout is 0', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const camera = new PiCamera({ signaling: 'mqtt', timeout: 0 });
      
      camera.connect();
      
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      
      setTimeoutSpy.mockRestore();
    });

    it('should call onTimeout and terminate if timeout occurs and no connections are established', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const camera = new PiCamera({ signaling: 'mqtt', timeout: 5000 });
      (camera as any).cmdPeer = { connectionState: 'disconnected', close: jest.fn() };
      (camera as any).subPeer = { connectionState: 'disconnected', close: jest.fn() };
      (camera as any).pubPeer = { connectionState: 'disconnected', close: jest.fn() };
      
      let timeoutCalled = false;
      camera.onTimeout = () => {
        timeoutCalled = true;
      };
      
      camera.connect();
      
      // Advance timers to trigger timeout
      jest.advanceTimersByTime(5000);
      
      expect(timeoutCalled).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith("RTC connection timeout.");
      
      consoleSpy.mockRestore();
    });

    it('should not call onTimeout if at least one connection is established', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const camera = new PiCamera({ signaling: 'mqtt', timeout: 5000 });
      (camera as any).cmdPeer = { connectionState: 'connected', close: jest.fn() };
      (camera as any).subPeer = { connectionState: 'disconnected', close: jest.fn() };
      (camera as any).pubPeer = { connectionState: 'disconnected', close: jest.fn() };
      
      let timeoutCalled = false;
      camera.onTimeout = () => {
        timeoutCalled = true;
      };
      
      camera.connect();
      
      // Advance timers to trigger timeout
      jest.advanceTimersByTime(5000);
      
      expect(timeoutCalled).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('terminate', () => {
    it('should clear timeout, close all peers, disconnect client, and call onConnectionState', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      (camera as any).subPeer = mockSubscriberPeer;
      (camera as any).pubPeer = mockPublisherPeer;
      
      let connectionState: RTCPeerConnectionState | null = null;
      camera.onConnectionState = (state) => {
        connectionState = state;
      };
      
      // Set up a timeout 
      camera.connect();
      
      camera.terminate();
      
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(mockCommanderPeer.close).toHaveBeenCalledTimes(1);
      expect(mockSubscriberPeer.close).toHaveBeenCalledTimes(1);
      expect(mockPublisherPeer.close).toHaveBeenCalledTimes(1);
      expect(mockMqttClient.disconnect).toHaveBeenCalledTimes(1);
      expect(connectionState).toBe('closed');
      expect(consoleSpy).toHaveBeenCalledWith("PiCamera connections had been terminated.");
      
      clearTimeoutSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should handle terminate when peers are undefined', () => {
      const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
      const camera = new PiCamera({ signaling: 'mqtt' });
      // Don't set the peers, they remain undefined
      
      camera.terminate();
      
      expect(mockMqttClient.disconnect).toHaveBeenCalledTimes(1);
      
      consoleSpy.mockRestore();
    });
  });

  describe('getStatus', () => {
    it('should return "new" when cmdPeer is undefined', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      // cmdPeer is undefined by default
      
      const status = camera.getStatus();
      
      expect(status).toBe('new');
    });

    it('should return cmdPeer connection state when cmdPeer exists', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = { connectionState: 'connected' };
      
      const status = camera.getStatus();
      
      expect(status).toBe('connected');
    });
  });

  describe('getRecordingMetadata', () => {
    it('should call cmdPeer.getRecordingMetadata when onMetadata is defined', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      
      camera.onMetadata = jest.fn();
      camera.getRecordingMetadata('some-param');
      
      expect(mockCommanderPeer.getRecordingMetadata).toHaveBeenCalledWith('some-param');
    });

    it('should not call cmdPeer.getRecordingMetadata when onMetadata is not defined', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      
      // onMetadata is undefined by default
      camera.getRecordingMetadata('some-param');
      
      expect(mockCommanderPeer.getRecordingMetadata).not.toHaveBeenCalled();
    });
  });

  describe('fetchRecordedVideo', () => {
    it('should call cmdPeer.fetchRecordedVideo when onVideoDownloaded is defined', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      
      camera.onVideoDownloaded = jest.fn();
      camera.fetchRecordedVideo('/path/to/video.mp4');
      
      expect(mockCommanderPeer.fetchRecordedVideo).toHaveBeenCalledWith('/path/to/video.mp4');
    });

    it('should not call cmdPeer.fetchRecordedVideo when onVideoDownloaded is not defined', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      
      // onVideoDownloaded is undefined by default
      camera.fetchRecordedVideo('/path/to/video.mp4');
      
      expect(mockCommanderPeer.fetchRecordedVideo).not.toHaveBeenCalled();
    });
  });

  describe('setCameraProperty', () => {
    it('should call cmdPeer.setCameraProperty if cmdPeer exists', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      
      camera.setCameraProperty(14, 0); // 14 is CameraPropertyKey.BRIGHTNESS, 0 is a valid value
      
      expect(mockCommanderPeer.setCameraProperty).toHaveBeenCalledWith(14, 0);
    });

    it('should not throw if cmdPeer does not exist', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      // cmdPeer is undefined by default
      
      expect(() => {
        camera.setCameraProperty(14, 0); // 14 is CameraPropertyKey.BRIGHTNESS, 0 is a valid value
      }).not.toThrow();
    });
  });

  describe('snapshot', () => {
    it('should call cmdPeer.snapshot with default quality when no quality provided', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      
      camera.snapshot();
      
      expect(mockCommanderPeer.snapshot).toHaveBeenCalledWith(30);
    });

    it('should call cmdPeer.snapshot with provided quality', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      
      camera.snapshot(75);
      
      expect(mockCommanderPeer.snapshot).toHaveBeenCalledWith(75);
    });
  });

  describe('sendMessage', () => {
    it('should call cmdPeer.sendMessage and pubPeer.sendMessage', () => {
      const camera = new PiCamera({ signaling: 'websocket' });
      (camera as any).cmdPeer = mockCommanderPeer;
      (camera as any).pubPeer = mockPublisherPeer;
      
      camera.sendMessage('test message');
      
      expect(mockCommanderPeer.sendMessage).toHaveBeenCalledWith('test message');
      expect(mockPublisherPeer.sendMessage).toHaveBeenCalledWith('test message');
    });

    it('should not throw when cmdPeer or pubPeer are undefined', () => {
      const camera = new PiCamera({ signaling: 'websocket' });
      // Both peers are undefined by default
      
      expect(() => {
        camera.sendMessage('test message');
      }).not.toThrow();
    });
  });

  describe('toggleMic', () => {
    it('should toggle mic on all peers', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      (camera as any).pubPeer = mockPublisherPeer;
      (camera as any).subPeer = mockSubscriberPeer;
      
      camera.toggleMic(true);
      
      expect(mockCommanderPeer.toggleMic).toHaveBeenCalledWith(true);
      expect(mockPublisherPeer.toggleMic).toHaveBeenCalledWith(true);
      expect(mockSubscriberPeer.toggleMic).toHaveBeenCalledWith(true);
    });

    it('should toggle mic with default value (opposite of isMicOn) when no parameter provided', () => {
      const camera = new PiCamera({ signaling: 'mqtt', isMicOn: true });
      (camera as any).cmdPeer = mockCommanderPeer;
      (camera as any).pubPeer = mockPublisherPeer;
      (camera as any).subPeer = mockSubscriberPeer;
      
      camera.toggleMic();
      
      expect(mockCommanderPeer.toggleMic).toHaveBeenCalledWith(false); // opposite of true
      expect(mockPublisherPeer.toggleMic).toHaveBeenCalledWith(false);
      expect(mockSubscriberPeer.toggleMic).toHaveBeenCalledWith(false);
    });
  });

  describe('toggleSpeaker', () => {
    it('should toggle speaker on all peers', () => {
      const camera = new PiCamera({ signaling: 'mqtt' });
      (camera as any).cmdPeer = mockCommanderPeer;
      (camera as any).pubPeer = mockPublisherPeer;
      (camera as any).subPeer = mockSubscriberPeer;
      
      camera.toggleSpeaker(true);
      
      expect(mockCommanderPeer.toggleSpeaker).toHaveBeenCalledWith(true);
      expect(mockPublisherPeer.toggleSpeaker).toHaveBeenCalledWith(true);
      expect(mockSubscriberPeer.toggleSpeaker).toHaveBeenCalledWith(true);
    });

    it('should toggle speaker with default value (opposite of isSpeakerOn) when no parameter provided', () => {
      const camera = new PiCamera({ signaling: 'mqtt', isSpeakerOn: false });
      (camera as any).cmdPeer = mockCommanderPeer;
      (camera as any).pubPeer = mockPublisherPeer;
      (camera as any).subPeer = mockSubscriberPeer;
      
      camera.toggleSpeaker();
      
      expect(mockCommanderPeer.toggleSpeaker).toHaveBeenCalledWith(true); // opposite of false
      expect(mockPublisherPeer.toggleSpeaker).toHaveBeenCalledWith(true);
      expect(mockSubscriberPeer.toggleSpeaker).toHaveBeenCalledWith(true);
    });
  });

  describe('private methods', () => {
    it('should properly initialize options with defaults', () => {
      const camera = new PiCamera({ signaling: 'mqtt', timeout: 5000 });
      const options = (camera as any).initializeOptions({ timeout: 5000 });
      
      expect(options.signaling).toBe('mqtt'); // default
      expect(options.timeout).toBe(5000); // from input
      expect(options.isMicOn).toBe(true); // default
      expect(options.isSpeakerOn).toBe(true); // default
    });

    it('should create correct RTC config with STUN server', () => {
      const camera = new PiCamera({ 
        signaling: 'mqtt',
        stunUrls: ['stun:stun.example.com:19302']
      });
      const config = (camera as any).getRtcConfig({
        stunUrls: ['stun:stun.example.com:19302']
      });
      
      expect(config.iceServers).toEqual([
        { urls: ['stun:stun.example.com:19302'] }
      ]);
      expect(config.iceCandidatePoolSize).toBe(10);
    });

    it('should create correct RTC config with TURN server', () => {
      const camera = new PiCamera({ 
        signaling: 'mqtt',
        turnUrls: ['turn:turn.example.com:3478'],
        turnUsername: 'username',
        turnPassword: 'password'
      });
      const config = (camera as any).getRtcConfig({
        turnUrls: ['turn:turn.example.com:3478'],
        turnUsername: 'username',
        turnPassword: 'password'
      });
      
      expect(config.iceServers).toEqual([
        {
          urls: ['turn:turn.example.com:3478'],
          username: 'username',
          credential: 'password',
        }
      ]);
    });

    it('should create RTC config with both STUN and TURN servers', () => {
      const camera = new PiCamera({ 
        signaling: 'mqtt',
        stunUrls: ['stun:stun.example.com:19302'],
        turnUrls: ['turn:turn.example.com:3478'],
        turnUsername: 'username',
        turnPassword: 'password'
      });
      const config = (camera as any).getRtcConfig({
        stunUrls: ['stun:stun.example.com:19302'],
        turnUrls: ['turn:turn.example.com:3478'],
        turnUsername: 'username',
        turnPassword: 'password'
      });
      
      expect(config.iceServers).toEqual([
        { urls: ['stun:stun.example.com:19302'] },
        {
          urls: ['turn:turn.example.com:3478'],
          username: 'username',
          credential: 'password',
        }
      ]);
    });
  });
});