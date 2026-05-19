import { WebSocketClient, IWebSocketConnectionOptions } from './websocket-client';

// Mock WebSocket globally
const mockWebSocketInstances: any[] = [];
const mockWebSocketSend = jest.fn();
const mockWebSocketClose = jest.fn();

// Create a proper WebSocket mock
const MockWebSocket = jest.fn().mockImplementation((url: string) => {
  const mockWs = {
    url,
    readyState: 0, // CONNECTING
    onopen: null as ((this: WebSocket, ev: Event) => any) | null,
    onmessage: null as ((this: WebSocket, ev: MessageEvent) => any) | null,
    onclose: null as ((this: WebSocket, ev: CloseEvent) => any) | null,
    onerror: null as ((this: WebSocket, ev: Event) => any) | null,
    send: mockWebSocketSend,
    close: mockWebSocketClose,
    binaryType: 'blob',
    bufferedAmount: 0,
    extensions: '',
    protocol: '',
  };

  mockWebSocketInstances.push(mockWs);
  return mockWs;
});

// Add static properties
(MockWebSocket as any).CONNECTING = 0;
(MockWebSocket as any).OPEN = 1;
(MockWebSocket as any).CLOSING = 2;
(MockWebSocket as any).CLOSED = 3;

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mocked-uuid-123'),
  },
});

// Set up the global WebSocket mock
Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
});

// Helper to get last created WebSocket instance
const getLastWebSocket = () => mockWebSocketInstances[mockWebSocketInstances.length - 1];

describe('WebSocketClient', () => {
  let wsClient: WebSocketClient;
  let originalConsole: { [key: string]: any };

  // Store original console methods to restore later
  beforeAll(() => {
    originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };
    
    // Mock console methods to avoid noise in test output
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
  });

  afterAll(() => {
    // Restore original console methods
    Object.assign(console, originalConsole);
  });

  beforeEach(() => {
    mockWebSocketInstances.length = 0; // Clear instances array
    mockWebSocketSend.mockClear();
    mockWebSocketClose.mockClear();
  });

  afterEach(() => {
    // Clean up the client after each test
    if (wsClient && wsClient['client']) {
      wsClient.disconnect();
    }
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with provided options', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
        apiKey: 'test-api-key',
        userId: 'test-user-id',
        roomId: 'test-room-id',
      };

      wsClient = new WebSocketClient(options);

      expect(wsClient['url']).toBe('wss://test.example.com');
      expect(wsClient['apiKey']).toBe('test-api-key');
      expect(wsClient['userId']).toBe('test-user-id');
      expect(wsClient['roomId']).toBe('test-room-id');
    });

    it('should generate a random userId if not provided', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
        apiKey: 'test-api-key',
      };

      wsClient = new WebSocketClient(options);

      expect(wsClient['userId']).toBe('mocked-uuid-123');
    });
  });

  describe('connect', () => {
    it('should create WebSocket with correct URL and parameters', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
        apiKey: 'test-api-key',
        userId: 'test-user-id',
        roomId: 'test-room-id',
      };

      wsClient = new WebSocketClient(options);
      wsClient.connect();

      expect(MockWebSocket).toHaveBeenCalledWith('wss://test.example.com/rtc?apiKey=test-api-key&userId=test-user-id&roomId=test-room-id');
    });

    it('should call onConnect when WebSocket opens', () => {
      const onConnectSpy = jest.fn();
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      wsClient.onConnect = onConnectSpy;

      wsClient.connect();

      // Get the WebSocket instance and simulate opening
      const ws = getLastWebSocket();
      ws.readyState = 1; // OPEN
      if (ws.onopen) {
        ws.onopen(new Event('open'));
      }

      expect(onConnectSpy).toHaveBeenCalledWith(wsClient);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should send a message when connected', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      wsClient.connect();

      // Simulate connection
      const ws = getLastWebSocket();
      ws.readyState = 1; // OPEN

      wsClient.send('join', 'test-message');

      expect(mockWebSocketSend).toHaveBeenCalledWith(JSON.stringify({ action: 'join', message: 'test-message' }));
    });

    it('should not send a message when not connected', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      // Don't connect, so WebSocket is not in OPEN state

      wsClient.send('join', 'test-message');

      expect(mockWebSocketSend).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Publish failed: client is not connected.');
    });
  });

  describe('disconnect', () => {
    it('should send leave message and close connection', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      wsClient.connect();

      // Simulate connection
      const ws = getLastWebSocket();
      ws.readyState = 1; // OPEN

      wsClient.disconnect();

      expect(mockWebSocketSend).toHaveBeenCalledWith(JSON.stringify({ action: 'leave', message: '' }));
      expect(mockWebSocketClose).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      // Don't connect, so client is undefined initially

      expect(() => wsClient.disconnect()).not.toThrow();
    });
  });

  describe('isConnected', () => {
    it('should return true when WebSocket is in OPEN state', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      wsClient.connect();

      const ws = getLastWebSocket();
      ws.readyState = 1; // OPEN

      expect(wsClient.isConnected()).toBe(true);
    });

    it('should return false when WebSocket is not in OPEN state', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      wsClient.connect();

      const ws = getLastWebSocket();
      ws.readyState = 3; // CLOSED

      expect(wsClient.isConnected()).toBe(false);
    });

    it('should return false when WebSocket is undefined', () => {
      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      // Don't connect so client remains undefined

      expect(wsClient.isConnected()).toBe(false);
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      wsClient = new WebSocketClient({
        websocketUrl: 'wss://test.example.com',
      });
      wsClient.connect();
    });

    it('should handle "join" message and start ping interval', () => {
      const onJoinSpy = jest.fn();
      wsClient.onJoin = onJoinSpy;
      jest.useFakeTimers();

      const event = {
        data: JSON.stringify({ action: 'join', message: '{"urls": ["stun:stun.example.com"]}' })
      } as MessageEvent;

      // Spy on startPingInterval
      const startPingIntervalSpy = jest.spyOn(wsClient as any, 'startPingInterval');

      // Call handleMessage directly to test
      wsClient['handleMessage'](event);

      expect(onJoinSpy).toHaveBeenCalledWith({ urls: ["stun:stun.example.com"] });
      expect(startPingIntervalSpy).toHaveBeenCalled();
    });

    it('should handle "offer" message', () => {
      const onOfferSpy = jest.fn();
      wsClient.onOffer = onOfferSpy;

      const event = {
        data: JSON.stringify({ action: 'offer', message: 'test-sdp-offer' })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onOfferSpy).toHaveBeenCalledWith({ type: "offer", sdp: 'test-sdp-offer' });
    });

    it('should handle "answer" message', () => {
      const onAnswerSpy = jest.fn();
      wsClient.onAnswer = onAnswerSpy;

      const event = {
        data: JSON.stringify({ action: 'answer', message: 'test-sdp-answer' })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onAnswerSpy).toHaveBeenCalledWith({ type: "answer", sdp: 'test-sdp-answer' });
    });

    it('should handle "trickle" message for publisher', () => {
      const onPublisherIceSpy = jest.fn();
      wsClient.onPublisherIce = onPublisherIceSpy;

      const event = {
        data: JSON.stringify({ 
          action: 'trickle', 
          message: JSON.stringify({ 
            target: 'PUBLISHER', 
            candidateInit: { candidate: 'test-candidate', sdpMid: '1', sdpMLineIndex: 0 } 
          }) 
        })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onPublisherIceSpy).toHaveBeenCalledWith({
        candidate: 'test-candidate',
        sdpMid: '1',
        sdpMLineIndex: 0
      });
    });

    it('should handle "trickle" message for subscriber', () => {
      const onSubscriberIceSpy = jest.fn();
      wsClient.onSubscriberIce = onSubscriberIceSpy;

      const event = {
        data: JSON.stringify({ 
          action: 'trickle', 
          message: JSON.stringify({ 
            target: 'SUBSCRIBER', 
            candidateInit: { candidate: 'test-candidate', sdpMid: '2', sdpMLineIndex: 1 } 
          }) 
        })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onSubscriberIceSpy).toHaveBeenCalledWith({
        candidate: 'test-candidate',
        sdpMid: '2',
        sdpMLineIndex: 1
      });
    });

    it('should handle "trackPublished" message', () => {
      const onTrackPublishedSpy = jest.fn();
      wsClient.onTrackPublished = onTrackPublishedSpy;

      const event = {
        data: JSON.stringify({ action: 'trackPublished', message: '' })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onTrackPublishedSpy).toHaveBeenCalled();
    });

    it('should handle "roomInfo" message', () => {
      const onRoomInfoSpy = jest.fn();
      wsClient.onRoomInfo = onRoomInfoSpy;

      const roomInfo = { sid: 'room123', name: 'Test Room' };
      const event = {
        data: JSON.stringify({ action: 'roomInfo', message: JSON.stringify(roomInfo) })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onRoomInfoSpy).toHaveBeenCalledWith(roomInfo);
    });

    it('should handle "quality" message', () => {
      const onQualitySpy = jest.fn();
      wsClient.onQuility = onQualitySpy; // Note: typo in original - "onQuility"

      const quality = [{ sid: 'participant123', score: 5 }];
      const event = {
        data: JSON.stringify({ action: 'quality', message: JSON.stringify(quality) })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onQualitySpy).toHaveBeenCalledWith(quality);
    });

    it('should handle "speaking" message', () => {
      const onSpeakingSpy = jest.fn();
      wsClient.onSpeaking = onSpeakingSpy;

      const speaking = [{ sid: 'participant123', level: 75 }];
      const event = {
        data: JSON.stringify({ action: 'speaking', message: JSON.stringify(speaking) })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onSpeakingSpy).toHaveBeenCalledWith(speaking);
    });

    it('should handle "participant" message', () => {
      const onParticipantSpy = jest.fn();
      wsClient.onParticipant = onParticipantSpy;

      const participants = [
        { sid: 'participant123', id: 'user1', state: 'ACTIVE' as const }
      ];
      const event = {
        data: JSON.stringify({ action: 'participant', message: JSON.stringify(participants) })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onParticipantSpy).toHaveBeenCalledWith(participants);
    });

    it('should handle "leave" message and clear ping interval', () => {
      const onLeaveSpy = jest.fn();
      wsClient.onLeave = onLeaveSpy;
      jest.useFakeTimers();

      // Spy on clearPingInterval
      const clearPingIntervalSpy = jest.spyOn(wsClient as any, 'clearPingInterval');

      const event = {
        data: JSON.stringify({ action: 'leave', message: '' })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      expect(onLeaveSpy).toHaveBeenCalled();
      expect(clearPingIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('ping interval', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it('should start ping interval on join message', () => {
      mockWebSocketSend.mockClear(); // Clear previous calls

      const options: IWebSocketConnectionOptions = {
        websocketUrl: 'wss://test.example.com',
      };

      wsClient = new WebSocketClient(options);
      wsClient.connect();

      // Simulate connection
      const ws = getLastWebSocket();
      ws.readyState = 1; // OPEN

      const event = {
        data: JSON.stringify({ action: 'join', message: '{"urls": ["stun:stun.example.com"]}' })
      } as MessageEvent;

      wsClient['handleMessage'](event);

      // Advance timers to trigger the ping
      jest.advanceTimersByTime(5000);

      // Expect that 'ping' was sent
      expect(mockWebSocketSend).toHaveBeenCalledWith(JSON.stringify({ action: 'ping', message: '' }));
    });

    it('should clear ping interval when disconnected', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      wsClient = new WebSocketClient({
        websocketUrl: 'wss://test.example.com',
      });
      wsClient.connect();

      // Simulate the ping interval being set
      wsClient['startPingInterval']();

      // Simulate WebSocket onclose being called (should clear interval)
      const ws = getLastWebSocket();
      if (ws.onclose) {
        ws.onclose({} as CloseEvent);
      }

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});