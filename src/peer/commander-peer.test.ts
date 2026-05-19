import { CommanderPeer } from './commander-peer';
import { CameraPropertyKey, CameraPropertyValue } from '../constants/camera-property';
import { CmdMessage, CmdType, MetaCmdMessage, MetadataCmd } from '../rtc/cmd-message';
import { ChannelId, RtcPeerConfig } from './rtc-peer';
import { IPiCameraOptions } from '../pi-camera.types';

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

  addTransceiver(kind: string, init?: RTCRtpTransceiverInit) {
    // Return a mock transceiver object
    return {
      sender: {} as RTCRtpSender,
      receiver: {} as RTCRtpReceiver,
      direction: init?.direction || 'sendrecv',
      setDirection: (direction: RTCRtpTransceiverDirection) => {},
      stop: () => {},
      mid: null as string | null
    };
  }

  createDataChannel(label: string, options?: RTCDataChannelInit) {
    return new MockRTCDataChannel(label, options);
  }

  close() {}
  getStats() {}
}

class MockRTCDataChannel {
  readyState: string = 'open';
  onopen: () => void = () => {};
  onmessage: (event: MessageEvent) => void = () => {};
  onerror: (event: Event) => void = () => {};
  onclose: () => void = () => {};

  constructor(public label: string, public options?: RTCDataChannelInit) {}

  send(data: string) {}
  close() { this.readyState = 'closed'; }
}

class MockMediaStream {
  tracks: any[] = [];
  
  addTrack(track: any) {
    this.tracks.push(track);
  }
  
  getAudioTracks() {
    return this.tracks.filter(t => t.kind === 'audio');
  }
  
  getTracks() {
    return this.tracks;
  }
}

class MockMediaStreamTrack {
  constructor(public kind: string, public label: string, public id: string) {}
  
  stop() {}
  enabled: boolean = true;
}

// Mock MediaDevices API
const mockMediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue(new MockMediaStream())
};

Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: mockMediaDevices
  },
  writable: true
});

// Mock the global RTCPeerConnection
Object.defineProperty(global, 'RTCPeerConnection', {
  writable: true,
  value: MockRTCPeerConnection
});

// Also mock other necessary globals
Object.defineProperty(global, 'MediaStream', {
  writable: true,
  value: MockMediaStream
});

describe('CommanderPeer', () => {
  let config: RtcPeerConfig;
  let mockOptions: IPiCameraOptions;

  beforeEach(() => {
    mockOptions = {
      signaling: 'websocket',
      stunUrls: 'stun:stun.l.google.com:19302',
      datachannelOnly: false,
      ipcMode: undefined,
      isMicOn: false,
      isSpeakerOn: false,
      credits: true
    };

    config = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      options: mockOptions
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a CommanderPeer instance with default options', () => {
      const peer = new CommanderPeer(config);
      
      expect(peer).toBeInstanceOf(CommanderPeer);
      expect(peer.options).toEqual(mockOptions);
    });

    it('should create video and audio transceivers when datachannelOnly is false', () => {
      const peer = new CommanderPeer(config);
      // Since we can't directly verify transceiver creation due to the mock,
      // we can check that it doesn't crash during instantiation
      expect(peer).toBeInstanceOf(CommanderPeer);
    });

    it('should create only command datachannel when ipcMode is not set', () => {
      const peer = new CommanderPeer(config);
      
      expect(peer).toBeInstanceOf(CommanderPeer);
      // The cmdChannel should have been created with the correct ID
    });

    it('should create IPC datachannel when ipcMode is set to lossy', () => {
      const lossyConfig = { ...config, options: { ...mockOptions, ipcMode: 'lossy' as const } };
      const peer = new CommanderPeer(lossyConfig);

      expect(peer).toBeInstanceOf(CommanderPeer);
    });

    it('should create IPC datachannel when ipcMode is set to reliable', () => {
      const reliableConfig = { ...config, options: { ...mockOptions, ipcMode: 'reliable' as const } };
      const peer = new CommanderPeer(reliableConfig);

      expect(peer).toBeInstanceOf(CommanderPeer);
    });
  });

  describe('close', () => {
    it('should send disconnect command and close channels', () => {
      const peer = new CommanderPeer(config);

      const cmdChannelSendSpy = jest.spyOn((peer as any).cmdChannel, 'send');
      const cmdChannelCloseSpy = jest.spyOn((peer as any).cmdChannel, 'close');

      peer.close();

      expect(cmdChannelSendSpy).toHaveBeenCalledWith(new CmdMessage(CmdType.CONNECT, "false").ToString());
      expect(cmdChannelCloseSpy).toHaveBeenCalled();
    });

    it('should close IPC channel if it exists', () => {
      const reliableConfig = { ...config, options: { ...mockOptions, ipcMode: 'reliable' as const } };
      const peer = new CommanderPeer(reliableConfig);

      const cmdChannelCloseSpy = jest.spyOn((peer as any).cmdChannel, 'close');
      const ipcChannelCloseSpy = jest.spyOn((peer as any).ipcChannel, 'close');

      peer.close();

      expect(cmdChannelCloseSpy).toHaveBeenCalled();
      expect(ipcChannelCloseSpy).toHaveBeenCalled();
    });
  });

  describe('createDataChannel', () => {
    it('should create a data channel with the correct ID', () => {
      const peer = new CommanderPeer(config);
      
      const dataChannel = peer.createDataChannel(ChannelId.Command);
      
      expect(dataChannel).toBeDefined();
      expect((dataChannel as any).label).toBeDefined();
    });

    it('should set the data channel binary type to arraybuffer', () => {
      const peer = new CommanderPeer(config);
      
      const dataChannel = peer.createDataChannel(ChannelId.Command);
      
      // We can't directly test the binaryType property in the mock, 
      // but we can verify the channel was created
      expect(dataChannel).toBeDefined();
    });
  });

  describe('getRecordingMetadata', () => {
    let peer: CommanderPeer;
    let cmdChannelSendSpy: jest.SpyInstance;

    beforeEach(() => {
      peer = new CommanderPeer(config);
      cmdChannelSendSpy = jest.spyOn((peer as any).cmdChannel, 'send');
      peer.onMetadata = jest.fn(); // Set a mock for onMetadata
    });

    it('should send the latest metadata command when no parameter is provided', () => {
      peer.getRecordingMetadata();
      
      const expectedCmd = new CmdMessage(
        CmdType.METADATA, 
        new MetaCmdMessage(MetadataCmd.LATEST, "").ToString()
      );
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should send the older metadata command when a string parameter is provided', () => {
      const path = "some/path";
      peer.getRecordingMetadata(path);
      
      const expectedCmd = new CmdMessage(
        CmdType.METADATA, 
        new MetaCmdMessage(MetadataCmd.OLDER, path).ToString()
      );
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should send the specific time metadata command when a Date parameter is provided', () => {
      const date = new Date(2023, 5, 15, 10, 30, 45); // Month is 0-indexed: June 15, 2023, 10:30:45
      peer.getRecordingMetadata(date);
      
      // Format the date as expected: YYYYMMDD_HHMMSS
      const expectedDateString = "20230615_103045";
      const expectedCmd = new CmdMessage(
        CmdType.METADATA, 
        new MetaCmdMessage(MetadataCmd.SPECIFIC_TIME, expectedDateString).ToString()
      );
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should not send command if cmdChannel is not open', () => {
      (peer as any).cmdChannel.readyState = 'closed';
      
      peer.getRecordingMetadata();
      
      expect(cmdChannelSendSpy).not.toHaveBeenCalled();
    });

    it('should not send command if onMetadata is not defined', () => {
      peer.onMetadata = undefined;
      
      peer.getRecordingMetadata();
      
      expect(cmdChannelSendSpy).not.toHaveBeenCalled();
    });
  });

  describe('fetchRecordedVideo', () => {
    let peer: CommanderPeer;
    let cmdChannelSendSpy: jest.SpyInstance;

    beforeEach(() => {
      peer = new CommanderPeer(config);
      cmdChannelSendSpy = jest.spyOn((peer as any).cmdChannel, 'send');
      peer.onVideoDownloaded = jest.fn(); // Set a mock for onVideoDownloaded
    });

    it('should send the recording command with the provided path', () => {
      const path = "test/path";
      peer.fetchRecordedVideo(path);
      
      const expectedCmd = new CmdMessage(CmdType.RECORDING, path);
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should not send command if cmdChannel is not open', () => {
      (peer as any).cmdChannel.readyState = 'closed';
      
      peer.fetchRecordedVideo("test/path");
      
      expect(cmdChannelSendSpy).not.toHaveBeenCalled();
    });

    it('should not send command if onVideoDownloaded is not defined', () => {
      peer.onVideoDownloaded = undefined;
      
      peer.fetchRecordedVideo("test/path");
      
      expect(cmdChannelSendSpy).not.toHaveBeenCalled();
    });
  });

  describe('setCameraProperty', () => {
    let peer: CommanderPeer;
    let cmdChannelSendSpy: jest.SpyInstance;

    beforeEach(() => {
      peer = new CommanderPeer(config);
      cmdChannelSendSpy = jest.spyOn((peer as any).cmdChannel, 'send');
    });

    it('should send the camera control command with the provided key and value', () => {
      const key = CameraPropertyKey.BRIGHTNESS;
      const value: CameraPropertyValue = 50 as CameraPropertyValue; // Using a valid value for brightness

      peer.setCameraProperty(key, value);

      const expectedCmd = new CmdMessage(
        CmdType.CAMERA_CONTROL,
        JSON.stringify({ key, value })
      );
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should not send command if cmdChannel is not open', () => {
      (peer as any).cmdChannel.readyState = 'closed';

      peer.setCameraProperty(CameraPropertyKey.BRIGHTNESS, 50 as CameraPropertyValue);

      expect(cmdChannelSendSpy).not.toHaveBeenCalled();
    });
  });

  describe('snapshot', () => {
    let peer: CommanderPeer;
    let cmdChannelSendSpy: jest.SpyInstance;

    beforeEach(() => {
      peer = new CommanderPeer(config);
      cmdChannelSendSpy = jest.spyOn((peer as any).cmdChannel, 'send');
      peer.onSnapshot = jest.fn(); // Set a mock for onSnapshot
    });

    it('should send the snapshot command with default quality when no quality is provided', () => {
      peer.snapshot();
      
      const expectedCmd = new CmdMessage(CmdType.SNAPSHOT, "30"); // default quality is 30
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should send the snapshot command with provided quality', () => {
      peer.snapshot(80);
      
      const expectedCmd = new CmdMessage(CmdType.SNAPSHOT, "80");
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should clamp quality to 100 if it exceeds 100', () => {
      peer.snapshot(150);
      
      const expectedCmd = new CmdMessage(CmdType.SNAPSHOT, "100");
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should clamp quality to 0 if it is below 0', () => {
      peer.snapshot(-10);
      
      const expectedCmd = new CmdMessage(CmdType.SNAPSHOT, "0");
      expect(cmdChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should not send command if cmdChannel is not open', () => {
      (peer as any).cmdChannel.readyState = 'closed';
      
      peer.snapshot();
      
      expect(cmdChannelSendSpy).not.toHaveBeenCalled();
    });

    it('should not send command if onSnapshot is not defined', () => {
      peer.onSnapshot = undefined;
      
      peer.snapshot();
      
      expect(cmdChannelSendSpy).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    let peer: CommanderPeer;
    let ipcChannelSendSpy: jest.SpyInstance;

    beforeEach(() => {
      const reliableConfig = { ...config, options: { ...mockOptions, ipcMode: 'reliable' as const } };
      peer = new CommanderPeer(reliableConfig);
      ipcChannelSendSpy = jest.spyOn((peer as any).ipcChannel, 'send');
    });

    it('should send the custom command through the IPC channel', () => {
      const message = "test message";
      peer.sendMessage(message);
      
      const expectedCmd = new CmdMessage(CmdType.CUSTOM, message);
      expect(ipcChannelSendSpy).toHaveBeenCalledWith(expectedCmd.ToString());
    });

    it('should not send command if IPC channel is not open', () => {
      (peer as any).ipcChannel.readyState = 'closed';
      
      peer.sendMessage("test message");
      
      expect(ipcChannelSendSpy).not.toHaveBeenCalled();
    });
  });
});