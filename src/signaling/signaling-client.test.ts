import { ActionType } from '../pi-camera.types';
import { ISignalingClient } from './signaling-client';

// Mock WebSocket for testing
class MockWebSocket {
  readyState: number;
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(public url: string) {
    this.readyState = MockWebSocket.OPEN;
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }
}

// Mock implementation of the signaling client for testing purposes
class MockSignalingClient implements ISignalingClient<MockWebSocket, ActionType> {
  private connection: MockWebSocket | null = null;
  private connected = false;
  private onConnectCallback?: (conn: MockWebSocket) => void;
  onConnect?: (conn: MockWebSocket) => void;

  constructor(onConnect?: (conn: MockWebSocket) => void) {
    this.onConnect = onConnect;
    this.onConnectCallback = onConnect;
  }

  connect(): void {
    // Create a mock WebSocket connection
    this.connection = new MockWebSocket('ws://localhost:8080');
    this.connected = true;

    if (this.onConnectCallback && this.connection) {
      this.onConnectCallback(this.connection);
    }
  }

  disconnect(): void {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
    this.connected = false;
  }

  send(type: ActionType, message: string): void {
    if (this.isConnected()) {
      // In a real implementation, this would send the message
      // For the mock, we'll just simulate the action
      console.log(`Sending ${type} with message: ${message}`);
    } else {
      throw new Error('Cannot send message when disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected && this.connection?.readyState === MockWebSocket.OPEN;
  }
}

describe('ISignalingClient Interface', () => {
  let signalingClient: MockSignalingClient;

  beforeEach(() => {
    signalingClient = new MockSignalingClient();
  });

  afterEach(() => {
    if (signalingClient.isConnected()) {
      signalingClient.disconnect();
    }
  });

  describe('connect', () => {
    it('should establish a connection', () => {
      expect(signalingClient.isConnected()).toBe(false);
      signalingClient.connect();
      expect(signalingClient.isConnected()).toBe(true);
    });

    it('should call onConnect callback when connection is established', () => {
      const mockCallback = jest.fn();
      const clientWithCallback = new MockSignalingClient(mockCallback);
      
      clientWithCallback.connect();
      
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should close the connection and set connected status to false', () => {
      signalingClient.connect();
      expect(signalingClient.isConnected()).toBe(true);
      
      signalingClient.disconnect();
      expect(signalingClient.isConnected()).toBe(false);
    });

    it('should handle disconnect when not connected', () => {
      // This should not throw an error
      expect(() => signalingClient.disconnect()).not.toThrow();
    });
  });

  describe('send', () => {
    it('should send a message when connected', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      signalingClient.connect();
      expect(() => signalingClient.send('join', 'test message')).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Sending join with message: test message');
      consoleSpy.mockRestore();
    });

    it('should throw an error when trying to send while disconnected', () => {
      expect(() => signalingClient.send('join', 'test message')).toThrow('Cannot send message when disconnected');
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(signalingClient.isConnected()).toBe(false);
    });

    it('should return true when connected', () => {
      signalingClient.connect();
      expect(signalingClient.isConnected()).toBe(true);
    });
  });

  describe('Generic Type Parameters', () => {
    it('should support different client types', () => {
      interface CustomClient {
        id: string;
        status: 'open' | 'closed';
      }

      // Test that the interface works with different client types
      const customSignalingClient: ISignalingClient<CustomClient> = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        send: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
      };

      expect(customSignalingClient.isConnected()).toBe(true);
    });

    it('should support different action types', () => {
      type CustomAction = 'custom_action' | 'another_action';
      
      // Test that the interface works with different action types
      const customSignalingClient: ISignalingClient<WebSocket, CustomAction> = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        send: jest.fn(),
        isConnected: jest.fn().mockReturnValue(true),
      };

      customSignalingClient.send('custom_action', 'test message');
      expect(customSignalingClient.send).toHaveBeenCalledWith('custom_action', 'test message');
    });
  });

  describe('Type Safety', () => {
    it('should enforce correct method signatures', () => {
      // This test ensures that all required methods exist with correct signatures
      expect(typeof signalingClient.connect).toBe('function');
      expect(typeof signalingClient.disconnect).toBe('function');
      expect(typeof signalingClient.send).toBe('function');
      expect(typeof signalingClient.isConnected).toBe('function');

      // Test optional property - it can be undefined since it's optional
      expect(signalingClient.onConnect).toBeUndefined();
    });

    it('should have optional onConnect property that can be set', () => {
      const callback = () => {};
      const clientWithCallback = new MockSignalingClient(callback);
      expect(clientWithCallback.onConnect).toBeDefined();
      expect(typeof clientWithCallback.onConnect).toBe('function');
    });
  });
});