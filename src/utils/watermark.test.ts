import { addWatermarkToStream, addWatermarkToImage } from './watermark';

// Mock the window object and browser APIs that are used in the watermark utility
Object.defineProperty(global, 'window', {
  value: {
    MediaStreamTrackProcessor: class MockTrackProcessor {
      readable: any;

      constructor(options: any) {
        this.readable = {
          pipeThrough: jest.fn().mockReturnThis(),
          pipeTo: jest.fn(),
        };
      }
    },
    MediaStreamTrackGenerator: class MockTrackGenerator {
      kind: string;

      constructor(options: any) {
        this.kind = options.kind;
      }
    },
  },
  writable: true,
});

// Mock the browser APIs that are used in the watermark utility
Object.defineProperty(global, 'OffscreenCanvas', {
  value: class MockOffscreenCanvas {
    width: number;
    height: number;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }

    getContext() {
      return {
        drawImage: jest.fn(),
        fillText: jest.fn(),
        font: '',
        fillStyle: '',
        textAlign: '',
        textBaseline: '',
      };
    }
  },
  writable: true,
});

Object.defineProperty(global, 'VideoFrame', {
  value: class MockVideoFrame {
    timestamp: number;
    displayWidth: number;
    displayHeight: number;

    constructor(canvas: any, options?: any) {
      this.timestamp = options?.timestamp || 0;
      this.displayWidth = canvas.width;
      this.displayHeight = canvas.height;
    }

    close() {}
  },
  writable: true,
});

// Mock the MediaStreamTrackProcessor and MediaStreamTrackGenerator
Object.defineProperty(global, 'MediaStreamTrackProcessor', {
  value: class MockTrackProcessor {
    readable: any;

    constructor(options: any) {
      this.readable = {
        pipeThrough: jest.fn().mockReturnThis(),
        pipeTo: jest.fn(),
      };
    }
  },
  writable: true,
});

Object.defineProperty(global, 'MediaStreamTrackGenerator', {
  value: class MockTrackGenerator {
    kind: string;

    constructor(options: any) {
      this.kind = options.kind;
    }
  },
  writable: true,
});

Object.defineProperty(global, 'TransformStream', {
  value: class MockTransformStream {
    readable: any;
    writable: any;

    constructor(transformer: any) {
      this.readable = {
        pipeTo: jest.fn(),
      };
      this.writable = {};
    }
  },
  writable: true,
});

Object.defineProperty(global, 'MediaStream', {
  value: class MockMediaStream {
    tracks: any[];

    constructor(tracks = []) {
      this.tracks = tracks;
    }

    getVideoTracks() {
      return this.tracks.filter((track: any) => track.kind === 'video');
    }

    getAudioTracks() {
      return this.tracks.filter((track: any) => track.kind === 'audio');
    }

    addTrack(track: any) {
      this.tracks.push(track);
    }
  },
  writable: true,
});

// Mock Image for addWatermarkToImage
const mockImageConstructor = jest.fn().mockImplementation(() => {
  // Create a mock image object with necessary properties
  const img = {
    src: '',
    onload: null,
    onerror: null,
    width: 800,
    height: 600,
    complete: true
  };

  // Simulate loading behavior
  Object.defineProperty(img, 'src', {
    set: function(value) {
      this._src = value;
      // Simulate async loading
      setTimeout(() => {
        if (this.onload) this.onload();
      }, 0);
    },
    get: function() {
      return this._src;
    }
  });

  return img;
});
(global as any).Image = mockImageConstructor;

describe('watermark utility functions', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('addWatermarkToStream', () => {
    it('should return original stream if browser does not support necessary APIs', () => {
      // Temporarily remove the APIs to test fallback
      const originalWindow = global.window;

      // Replace window with a version that doesn't have the required APIs
      Object.defineProperty(global, 'window', {
        value: {
          // Don't include MediaStreamTrackProcessor and MediaStreamTrackGenerator
        },
        writable: true,
      });

      const mockStream = {
        getVideoTracks: jest.fn().mockReturnValue([{
          id: 'test-video-track',
          kind: 'video'
        }]),
        getAudioTracks: jest.fn().mockReturnValue([]),
        addTrack: jest.fn()
      } as any;

      const result = addWatermarkToStream(mockStream, 'Test Watermark');
      expect(result).toBe(mockStream);

      // Restore the original window
      Object.defineProperty(global, 'window', {
        value: originalWindow,
        writable: true,
      });
    });

    it('should process video stream with watermark when APIs are supported', () => {
      const mockVideoTrack = {
        id: 'test-video-track',
        kind: 'video'
      };
      
      const mockAudioTrack = {
        id: 'test-audio-track',
        kind: 'audio'
      };
      
      const mockStream = {
        getVideoTracks: jest.fn().mockReturnValue([mockVideoTrack]),
        getAudioTracks: jest.fn().mockReturnValue([mockAudioTrack]),
        addTrack: jest.fn()
      } as any;

      const result = addWatermarkToStream(mockStream, 'Test Watermark');
      
      // Verify that video track was retrieved
      expect(mockStream.getVideoTracks).toHaveBeenCalled();
      
      // Verify that the new stream was created
      expect(result).toBeDefined();
    });

    it('should add audio tracks to the processed stream', () => {
      const mockVideoTrack = {
        id: 'test-video-track',
        kind: 'video'
      };

      const mockAudioTrack = {
        id: 'test-audio-track',
        kind: 'audio'
      };

      const mockStream = {
        getVideoTracks: jest.fn().mockReturnValue([mockVideoTrack]),
        getAudioTracks: jest.fn().mockReturnValue([mockAudioTrack]),
        addTrack: jest.fn()
      } as any;

      const result = addWatermarkToStream(mockStream, 'Test Watermark');

      // Verify that audio tracks were added to the result stream
      // The original stream's audio tracks should be added to the processed stream
      const resultAudioTracks = result.getAudioTracks();
      expect(resultAudioTracks).toContain(mockAudioTrack);
    });
  });

  describe('addWatermarkToImage', () => {
    it('should add watermark to image successfully', async () => {
      // Setup mock image that fires onload
      const img = new Image();
      Object.defineProperty(img, 'complete', { value: true });
      Object.defineProperty(img, 'width', { value: 800 });
      Object.defineProperty(img, 'height', { value: 600 });
      
      // Replace Image constructor to return our mocked image
      const mockImageConstructor = jest.fn().mockImplementation(() => {
        const img = {
          src: '',
          onload: null as any,
          onerror: null as any,
          width: 800,
          height: 600,
          complete: true,
        };
        
        // Simulate onload after setting src
        Object.defineProperty(img, 'src', {
          set: function(value) {
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 0);
          },
          get: () => '',
        });
        
        return img as any;
      });

      const originalImage = (global as any).Image;
      (global as any).Image = mockImageConstructor as any;

      // Mock canvas and context
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: jest.fn().mockReturnValue({
          drawImage: jest.fn(),
          fillText: jest.fn(),
          font: '',
          fillStyle: '',
          textAlign: '',
          textBaseline: '',
        }),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
      };
      
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation((tag) => {
        if (tag === 'canvas') {
          return mockCanvas as any;
        }
        return originalCreateElement.call(document, tag);
      });
      
      const result = await addWatermarkToImage('data:image/png;base64,test', 'Test Watermark');
      
      expect(result).toBe('data:image/png;base64,test');

      // Restore original implementations
      (global as any).Image = originalImage;
      document.createElement = originalCreateElement;
    });

    it('should reject with error when image fails to load', async () => {
      // Setup mock image that fires onerror
      const mockImageConstructor = jest.fn().mockImplementation(() => {
        const img = {
          src: '',
          onload: null as any,
          onerror: null as any,
          width: 800,
          height: 600,
          complete: false,
        };
        
        // Simulate onerror after setting src
        Object.defineProperty(img, 'src', {
          set: function(value) {
            setTimeout(() => {
              if (this.onerror) this.onerror();
            }, 0);
          },
          get: () => '',
        });
        
        return img as any;
      });
      
      const originalImage = global.Image;
      (global as any).Image = mockImageConstructor as any;

      await expect(addWatermarkToImage('invalid-image', 'Test Watermark'))
        .rejects.toThrow('Failed to load shapshot.');

      // Restore original implementation
      (global as any).Image = originalImage;
    });

    it('should set proper context properties for watermark', async () => {
      // Setup mock image that fires onload
      const mockImageConstructor = jest.fn().mockImplementation(() => {
        const img = {
          src: '',
          onload: null as any,
          onerror: null as any,
          width: 800,
          height: 600,
          complete: true,
        };
        
        Object.defineProperty(img, 'src', {
          set: function(value) {
            setTimeout(() => {
              if (this.onload) this.onload();
            }, 0);
          },
          get: () => '',
        });
        
        return img as any;
      });
      
      const originalImage = (global as any).Image;
      (global as any).Image = mockImageConstructor as any;
      
      const mockContext = {
        drawImage: jest.fn(),
        fillText: jest.fn(),
        font: '',
        fillStyle: '',
        textAlign: '',
        textBaseline: '',
      };
      
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: jest.fn().mockReturnValue(mockContext),
        toDataURL: jest.fn().mockReturnValue('data:image/png;base64,test'),
      };
      
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn().mockImplementation((tag) => {
        if (tag === 'canvas') {
          return mockCanvas as any;
        }
        return originalCreateElement.call(document, tag);
      });
      
      await addWatermarkToImage('data:image/png;base64,test', 'Test Watermark');
      
      // Verify that context properties were properly set
      expect(mockContext.font).toBeTruthy();
      expect(mockContext.fillStyle).toBe('rgba(255, 255, 255, 0.5)');
      expect(mockContext.textAlign).toBe('right');
      expect(mockContext.textBaseline).toBe('bottom');
      
      // Verify that fillText was called with proper parameters
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'Test Watermark',
        800 - 10, // canvas.width - padding
        600 - 10  // canvas.height - padding
      );
      
      // Restore original implementations
      (global as any).Image = originalImage;
      document.createElement = originalCreateElement;
    });
  });
});

// Mock document.createElement if running in Node environment
if (typeof document === 'undefined') {
  // Define document in global scope if it doesn't exist
  Object.defineProperty(global, 'document', {
    value: {
      createElement: jest.fn()
    },
    writable: true
  });
}