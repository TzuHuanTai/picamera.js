import {
  IPiCameraOptions,
  SignalingType,
  ActionType,
  IPiCameraEvents,
  IPiCamera,
} from './pi-camera.types';

// These tests verify that the types are properly defined and can be used correctly
describe('PiCamera Types', () => {
  describe('SignalingType', () => {
    it('should be a union of mqtt and websocket', () => {
      const mqtt: SignalingType = 'mqtt';
      const websocket: SignalingType = 'websocket';

      expect(mqtt).toBe('mqtt');
      expect(websocket).toBe('websocket');

      // Verify type only allows these two values
      const signalingTypes: SignalingType[] = ['mqtt', 'websocket'];
      expect(signalingTypes).toContain('mqtt');
      expect(signalingTypes).toContain('websocket');
    });
  });

  describe('IPiCameraOptions', () => {
    it('should have all expected properties', () => {
      const options: IPiCameraOptions = {
        signaling: 'websocket',
        stunUrls: ['stun:stun.l.google.com:19302'],
        turnUrls: 'turn:turn.example.com:3478',
        turnUsername: 'testuser',
        turnPassword: 'testpass',
        timeout: 30000,
        datachannelOnly: false,
        ipcMode: 'lossy', // Must be 'lossy' | 'reliable'
        isMicOn: true,
        isSpeakerOn: true,
        credits: true,
        codec: 'VP8', // Must be 'H264' | 'VP8' | 'VP9' | 'AV1'
      };

      expect(options.signaling).toBe('websocket');
      expect(options.stunUrls).toEqual(['stun:stun.l.google.com:19302']);
      expect(options.turnUsername).toBe('testuser');
      expect(options.timeout).toBe(30000);
      expect(options.datachannelOnly).toBe(false);
      expect(options.ipcMode).toBe('lossy');
      expect(options.isMicOn).toBe(true);
      expect(options.isSpeakerOn).toBe(true);
      expect(options.credits).toBe(true);
      expect(options.codec).toBe('VP8');
    });
  });

  describe('ActionType', () => {
    it('should be a valid type for action strings', () => {
      // This verifies that ActionType can accept action string values
      const action1: ActionType = 'join';
      const action2: ActionType = 'sdp';

      expect(action1).toBe('join');
      expect(action2).toBe('sdp');
    });
  });

  describe('IPiCameraEvents', () => {
    it('should define all event callback types', () => {
      const events: IPiCameraEvents = {
        onConnectionState: (state: RTCPeerConnectionState) => {
          expect(['new', 'connecting', 'connected', 'disconnected', 'failed', 'closed']).toContain(state);
        },
        onDatachannel: (id: import('./peer/rtc-peer').ChannelId) => {
          expect(typeof id).toBe('number'); // ChannelId is an enum
        },
        onProgress: (received: number, total: number, type: import('./rtc/cmd-message').CmdType) => {
          expect(typeof received).toBe('number');
          expect(typeof total).toBe('number');
          expect(typeof type).toBe('number'); // CmdType is an enum
        },
        onStream: (stream: MediaStream) => {
          expect(stream).toBeDefined();
        },
        onSnapshot: (base64: string) => {
          expect(typeof base64).toBe('string');
        },
        onMetadata: (metadata: import('./rtc/cmd-message').VideoMetadata) => {
          expect(metadata).toBeDefined();
        },
        onVideoDownloaded: (file: Uint8Array) => {
          expect(file).toBeInstanceOf(Uint8Array);
        },
        onMessage: (msg: string) => {
          expect(typeof msg).toBe('string');
        },
        onTimeout: () => {
          // Should be called on timeout
        },
        onRoomInfo: (room: any) => {
          expect(room).toBeDefined();
        },
        onQuility: (quality: any[]) => {
          expect(Array.isArray(quality)).toBe(true);
        },
        onSpeaking: (speaking: any[]) => {
          expect(Array.isArray(speaking)).toBe(true);
        },
        onParticipant: (participant: any[]) => {
          expect(Array.isArray(participant)).toBe(true);
        },
      };

      expect(events.onConnectionState).toBeDefined();
      expect(events.onDatachannel).toBeDefined();
      expect(events.onProgress).toBeDefined();
      expect(events.onStream).toBeDefined();
      expect(events.onSnapshot).toBeDefined();
      expect(events.onMetadata).toBeDefined();
      expect(events.onVideoDownloaded).toBeDefined();
      expect(events.onMessage).toBeDefined();
      expect(events.onTimeout).toBeDefined();
      expect(events.onRoomInfo).toBeDefined();
      expect(events.onQuility).toBeDefined();
      expect(events.onSpeaking).toBeDefined();
      expect(events.onParticipant).toBeDefined();
    });
  });

  describe('IPiCamera interface', () => {
    it('should define all required methods', () => {
      // Mock implementation to verify method signatures
      const mockPiCamera: IPiCamera = {
        // Event methods (from IPiCameraEvents)
        onConnectionState: undefined,
        onDatachannel: undefined,
        onProgress: undefined,
        onStream: undefined,
        onSnapshot: undefined,
        onMetadata: undefined,
        onVideoDownloaded: undefined,
        onMessage: undefined,
        onTimeout: undefined,
        onRoomInfo: undefined,
        onQuility: undefined,
        onSpeaking: undefined,
        onParticipant: undefined,
        // Core methods
        connect: () => {},
        terminate: () => {},
        getStatus: (): RTCPeerConnectionState => 'new',
        getRecordingMetadata: (pathOrTime?: string | Date) => {},
        fetchRecordedVideo: (path: string) => {},
        setCameraProperty: (key: import('./constants/camera-property').CameraPropertyKey, value: any) => {}, // Using any for value as it's a complex type
        snapshot: (quality?: number) => {},
        sendMessage: (msg: string) => {},
        toggleMic: (enabled?: boolean) => {},
        toggleSpeaker: (enabled?: boolean) => {},
      };

      expect(typeof mockPiCamera.connect).toBe('function');
      expect(typeof mockPiCamera.terminate).toBe('function');
      expect(typeof mockPiCamera.getStatus).toBe('function');
      expect(typeof mockPiCamera.getRecordingMetadata).toBe('function');
      expect(typeof mockPiCamera.fetchRecordedVideo).toBe('function');
      expect(typeof mockPiCamera.setCameraProperty).toBe('function');
      expect(typeof mockPiCamera.snapshot).toBe('function');
      expect(typeof mockPiCamera.sendMessage).toBe('function');
      expect(typeof mockPiCamera.toggleMic).toBe('function');
      expect(typeof mockPiCamera.toggleSpeaker).toBe('function');
    });

    it('should correctly define overloaded getRecordingMetadata method', () => {
      const mockPiCamera: IPiCamera = {
        // Event methods
        onConnectionState: undefined,
        onDatachannel: undefined,
        onProgress: undefined,
        onStream: undefined,
        onSnapshot: undefined,
        onMetadata: undefined,
        onVideoDownloaded: undefined,
        onMessage: undefined,
        onTimeout: undefined,
        onRoomInfo: undefined,
        onQuility: undefined,
        onSpeaking: undefined,
        onParticipant: undefined,
        // Core methods
        connect: () => {},
        terminate: () => {},
        getStatus: (): RTCPeerConnectionState => 'new',
        getRecordingMetadata: (pathOrTime?: string | Date) => {},
        fetchRecordedVideo: (path: string) => {},
        setCameraProperty: (key: import('./constants/camera-property').CameraPropertyKey, value: any) => {}, // Using any for value as it's a complex type
        snapshot: (quality?: number) => {},
        sendMessage: (msg: string) => {},
        toggleMic: (enabled?: boolean) => {},
        toggleSpeaker: (enabled?: boolean) => {},
      };

      // Test that getRecordingMetadata can be called without arguments
      mockPiCamera.getRecordingMetadata();
      // Test that it can be called with a string
      mockPiCamera.getRecordingMetadata('test-path');
      // Test that it can be called with a date
      mockPiCamera.getRecordingMetadata(new Date());
    });
  });
});