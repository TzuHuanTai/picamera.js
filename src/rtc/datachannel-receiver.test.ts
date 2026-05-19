import { DataChannelReceiver, ReceiverEvent } from './datachannel-receiver';

// Mock the arrayBufferToString function since it's an external dependency
jest.mock('../utils/rtc-tools', () => ({
  arrayBufferToString: jest.fn(),
}));

import { arrayBufferToString } from '../utils/rtc-tools';

describe('DataChannelReceiver', () => {
  let mockOnComplete: jest.Mock;
  let mockOnProgress: jest.Mock;
  let receiverEvent: ReceiverEvent;
  let receiver: DataChannelReceiver;

  beforeEach(() => {
    mockOnComplete = jest.fn();
    mockOnProgress = jest.fn();
    
    receiverEvent = {
      onComplete: mockOnComplete,
      onProgress: mockOnProgress,
    };

    receiver = new DataChannelReceiver(receiverEvent);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect((receiver as any).receivedLength).toBe(0);
      expect((receiver as any).isFirstPacket).toBe(true);
      expect((receiver as any).fileBuffer).toBeInstanceOf(Uint8Array);
      expect((receiver as any).onProgress).toBe(mockOnProgress);
      expect((receiver as any).onComplete).toBe(mockOnComplete);
    });

    it('should initialize with empty fileBuffer', () => {
      const fileBuffer = (receiver as any).fileBuffer as Uint8Array;
      expect(fileBuffer.length).toBe(0);
    });
  });

  describe('receiveData', () => {
    it('should handle first packet by setting file buffer size based on content', () => {
      const fileSize = 100;
      const firstPacket = new Uint8Array([49, 48, 48]); // "100" in ASCII
      (arrayBufferToString as jest.Mock).mockReturnValue(fileSize.toString());

      receiver.receiveData(firstPacket);

      expect(arrayBufferToString).toHaveBeenCalledWith(firstPacket);
      expect((receiver as any).isFirstPacket).toBe(false);
      expect((receiver as any).fileBuffer.length).toBe(fileSize);
    });

    it('should handle subsequent packets by adding data to file buffer', () => {
      // First packet to set size
      const fileSize = 10;
      const firstPacket = new Uint8Array([49, 48]); // "10" in ASCII
      (arrayBufferToString as jest.Mock).mockReturnValue(fileSize.toString());
      receiver.receiveData(firstPacket);

      // Second packet with actual data
      const dataPacket = new Uint8Array([1, 2, 3, 4, 5]);
      receiver.receiveData(dataPacket);

      expect((receiver as any).receivedLength).toBe(5);
      expect(mockOnProgress).toHaveBeenCalledWith(5, 10);
    });

    it('should call onComplete when all data is received', () => {
      // First packet to set size
      const fileSize = 5;
      const firstPacket = new Uint8Array([53]); // "5" in ASCII
      (arrayBufferToString as jest.Mock).mockReturnValue(fileSize.toString());
      receiver.receiveData(firstPacket);

      // Complete the data
      const dataPacket = new Uint8Array([1, 2, 3, 4, 5]);
      receiver.receiveData(dataPacket);

      expect(mockOnComplete).toHaveBeenCalledWith(new Uint8Array([1, 2, 3, 4, 5]));
      expect(mockOnProgress).toHaveBeenCalledWith(5, 5);
    });

    it('should not call onProgress if not provided', () => {
      const receiverWithoutProgress = new DataChannelReceiver({
        onComplete: mockOnComplete,
      });

      // First packet to set size
      const fileSize = 5;
      const firstPacket = new Uint8Array([53]); // "5" in ASCII
      (arrayBufferToString as jest.Mock).mockReturnValue(fileSize.toString());
      receiverWithoutProgress.receiveData(firstPacket);

      // Complete the data
      const dataPacket = new Uint8Array([1, 2, 3, 4, 5]);
      receiverWithoutProgress.receiveData(dataPacket);

      expect(mockOnProgress).not.toHaveBeenCalled();
      expect(mockOnComplete).toHaveBeenCalledWith(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it('should reset when receiving an empty packet', () => {
      (arrayBufferToString as jest.Mock).mockReturnValue('10');

      // First packet to set size
      const firstPacket = new Uint8Array([49, 48]); // "10" in ASCII
      receiver.receiveData(firstPacket);

      // Simulate receiving some data
      const dataPacket = new Uint8Array([1, 2, 3]);
      receiver.receiveData(dataPacket);

      expect((receiver as any).receivedLength).toBe(3);
      expect((receiver as any).isFirstPacket).toBe(false);

      // Reset with empty packet
      const emptyPacket = new Uint8Array([]);
      receiver.receiveData(emptyPacket);

      expect((receiver as any).receivedLength).toBe(0);
      expect((receiver as any).isFirstPacket).toBe(true);
      expect((receiver as any).fileBuffer.length).toBe(0);
    });

    it('should correctly set data in the file buffer', () => {
      const fileSize = 10;
      const firstPacket = new Uint8Array([49, 48]); // "10" in ASCII
      (arrayBufferToString as jest.Mock).mockReturnValue(fileSize.toString());
      receiver.receiveData(firstPacket);

      const dataPacket = new Uint8Array([10, 20, 30]);
      receiver.receiveData(dataPacket);

      // Check that the data was correctly placed in the file buffer
      const fileBuffer = (receiver as any).fileBuffer as Uint8Array;
      expect(fileBuffer[0]).toBe(10);
      expect(fileBuffer[1]).toBe(20);
      expect(fileBuffer[2]).toBe(30);
    });

    it('should handle receiving data in multiple packets', () => {
      const fileSize = 6;
      const firstPacket = new Uint8Array([54]); // "6" in ASCII
      (arrayBufferToString as jest.Mock).mockReturnValue(fileSize.toString());
      receiver.receiveData(firstPacket);

      // Send first part of data
      const dataPacket1 = new Uint8Array([1, 2]);
      receiver.receiveData(dataPacket1);
      expect(mockOnProgress).toHaveBeenCalledWith(2, 6);

      // Send second part of data
      const dataPacket2 = new Uint8Array([3, 4]);
      receiver.receiveData(dataPacket2);
      expect(mockOnProgress).toHaveBeenCalledWith(4, 6);

      // Send final part of data
      const dataPacket3 = new Uint8Array([5, 6]);
      receiver.receiveData(dataPacket3);

      expect(mockOnProgress).toHaveBeenCalledWith(6, 6);
      expect(mockOnComplete).toHaveBeenCalledWith(new Uint8Array([1, 2, 3, 4, 5, 6]));
    });
  });

  describe('reset', () => {
    it('should reset all internal state', () => {
      // Simulate some state
      (receiver as any).receivedLength = 100;
      (receiver as any).isFirstPacket = false;
      (receiver as any).fileBuffer = new Uint8Array([1, 2, 3]);

      receiver.reset();

      expect((receiver as any).receivedLength).toBe(0);
      expect((receiver as any).isFirstPacket).toBe(true);
      expect((receiver as any).fileBuffer.length).toBe(0);
    });
  });
});