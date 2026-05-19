import { MqttClient } from './mqtt-client';
import mqtt from 'mqtt';

// Mock the mqtt library
jest.mock('mqtt', () => {
  const mockClient = {
    on: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn(),
    connect: jest.fn(),
    unsubscribe: jest.fn(),
    end: jest.fn(),
    connected: false,
    disconnected: false,
  };
  return {
    __esModule: true,
    default: {
      connect: jest.fn(() => mockClient),
    },
  };
});

// Mock crypto.randomUUID to return a predictable value
const mockRandomUUID = jest.fn().mockReturnValue('mocked-uuid');
Object.defineProperty(global.crypto, 'randomUUID', {
  value: mockRandomUUID,
});

describe('MqttClient', () => {
  let originalConsoleDebug: any;
  let originalConsoleWarn: any;
  const mockMqttConnect = mqtt.connect as jest.MockedFunction<typeof mqtt.connect>;
  const mockMqttClient = {
    on: jest.fn(),
    subscribe: jest.fn(),
    publish: jest.fn(),
    connect: jest.fn(),
    unsubscribe: jest.fn(),
    end: jest.fn(),
    connected: false as boolean | undefined,
    disconnected: false,
  };

  beforeAll(() => {
    originalConsoleDebug = console.debug;
    originalConsoleWarn = console.warn;
    console.debug = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.debug = originalConsoleDebug;
    console.warn = originalConsoleWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockMqttConnect as any).mockReturnValue(mockMqttClient);
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
        mqttPath: '/mqtt',
        mqttUsername: 'user',
        mqttPassword: 'pass',
        mqttProtocol: 'mqtt' as const,
      };

      new MqttClient(options);

      expect(mockMqttConnect).toHaveBeenCalledWith({
        host: 'localhost',
        port: 1883,
        path: '/mqtt',
        clientId: 'mocked-uuid',
        username: 'user',
        password: 'pass',
        protocol: 'mqtt',
        keepalive: 20,
        protocolVersion: 5,
        clean: true,
        manualConnect: true,
        reconnectPeriod: 0,
      });
      expect(mockMqttClient.subscribe).toHaveBeenCalledWith('test-device/sdp/mocked-uuid', { qos: 2 });
      expect(mockMqttClient.subscribe).toHaveBeenCalledWith('test-device/ice/mocked-uuid', { qos: 2 });
    });

    it('should generate a random client ID', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      new MqttClient(options);

      expect(mockRandomUUID).toHaveBeenCalled();
    });
  });

  describe('connect', () => {
    it('should set up event listeners and connect the client', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      client.connect();

      expect(mockMqttClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockMqttClient.connect).toHaveBeenCalled();
    });

    it('should call onConnect callback when connected', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      const onConnectSpy = jest.fn();
      client.onConnect = onConnectSpy;

      client.connect();

      // Simulate the connect event
      const connectCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectCallback();

      expect(onConnectSpy).toHaveBeenCalledWith(client);
    });

    it('should handle incoming messages correctly', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      const onIceCandidateSpy = jest.fn();
      const onAnswerSpy = jest.fn();
      client.onIceCandidate = onIceCandidateSpy;
      client.onAnswer = onAnswerSpy;

      client.connect();

      // Simulate message event for ICE candidate
      const messageCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'message')[1];
      const iceCandidate = { candidate: 'test-candidate', sdpMid: '0', sdpMLineIndex: 0 };
      messageCallback(`test-device/ice/mocked-uuid`, JSON.stringify(iceCandidate));

      expect(onIceCandidateSpy).toHaveBeenCalledWith(iceCandidate);

      // Simulate message event for SDP
      const sdp = { type: 'answer' as const, sdp: 'test-sdp' };
      messageCallback(`test-device/sdp/mocked-uuid`, JSON.stringify(sdp));

      expect(onAnswerSpy).toHaveBeenCalledWith(sdp);
    });

    it('should log warning for unknown topic', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      client.connect();

      // Mock console.warn to check if it was called
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Simulate message event for unknown topic
      const messageCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'message')[1];
      messageCallback(`test-device/unknown/mocked-uuid`, 'some-message');

      expect(warnSpy).toHaveBeenCalledWith('Unknown topic: test-device/unknown/mocked-uuid');

      warnSpy.mockRestore();
    });
  });

  describe('send', () => {
    it('should publish message to the correct topic when connected', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      mockMqttClient.connected = true;

      const message = JSON.stringify({ test: 'data' });
      client.send('sdp', message);

      expect(mockMqttClient.publish).toHaveBeenCalledWith('test-device/sdp/mocked-uuid/offer', message);
    });

    it('should warn and not publish when not connected', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      mockMqttClient.connected = false;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      client.send('sdp', 'test-message');

      expect(mockMqttClient.publish).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('Publish failed: client is not connected.');

      warnSpy.mockRestore();
    });
  });

  describe('disconnect', () => {
    it('should unsubscribe from topics and end the connection', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      mockMqttClient.disconnected = false;

      client.disconnect();

      expect(mockMqttClient.unsubscribe).toHaveBeenCalledWith('test-device/sdp/mocked-uuid');
      expect(mockMqttClient.unsubscribe).toHaveBeenCalledWith('test-device/ice/mocked-uuid');
      expect(mockMqttClient.end).toHaveBeenCalledWith(true);
    });

    it('should not unsubscribe or end if already disconnected', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      mockMqttClient.disconnected = true;

      client.disconnect();

      expect(mockMqttClient.unsubscribe).not.toHaveBeenCalled();
      expect(mockMqttClient.end).not.toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return true when client is connected', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      mockMqttClient.connected = true;

      expect(client.isConnected()).toBe(true);
    });

    it('should return false when client is not connected', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);
      mockMqttClient.connected = false;

      expect(client.isConnected()).toBe(false);
    });

    it('should return false when client connected property is undefined', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      // Access the private client property directly to simulate undefined connection state
      const client = new MqttClient(options);
      Object.defineProperty(mockMqttClient, 'connected', {
        value: undefined,
        writable: true,
        configurable: true
      });

      expect(client.isConnected()).toBe(false);
    });
  });

  describe('private getFullTopic method', () => {
    it('should return the correct topic format', () => {
      const options = {
        deviceUid: 'test-device',
        mqttHost: 'localhost',
        mqttPort: 1883,
      };

      const client = new MqttClient(options);

      expect(client['getFullTopic']('sdp')).toBe('test-device/sdp/mocked-uuid');
      expect(client['getFullTopic']('ice')).toBe('test-device/ice/mocked-uuid');
    });
  });
});