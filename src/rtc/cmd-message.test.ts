import { 
  CmdType, 
  MetadataCmd, 
  CmdMessage, 
  MetaCmdMessage, 
  CameraCtrlMessage,
  VideoMetadata 
} from './cmd-message';

describe('CmdType enum', () => {
  it('should have correct enum values', () => {
    expect(CmdType.CONNECT).toBe(0);
    expect(CmdType.SNAPSHOT).toBe(1);
    expect(CmdType.METADATA).toBe(2);
    expect(CmdType.RECORDING).toBe(3);
    expect(CmdType.CAMERA_CONTROL).toBe(4);
    expect(CmdType.BROADCAST).toBe(5);
    expect(CmdType.CUSTOM).toBe(6);
  });
});

describe('MetadataCmd enum', () => {
  it('should have correct enum values', () => {
    expect(MetadataCmd.LATEST).toBe(0);
    expect(MetadataCmd.OLDER).toBe(1);
    expect(MetadataCmd.SPECIFIC_TIME).toBe(2);
  });
});

describe('CmdMessage class', () => {
  it('should create an instance with type and string message', () => {
    const cmd = new CmdMessage(CmdType.CONNECT, 'test message');
    expect(cmd.type).toBe(CmdType.CONNECT);
    expect(cmd.message).toBe('test message');
  });

  it('should create an instance with type and number message', () => {
    const cmd = new CmdMessage(CmdType.SNAPSHOT, 123);
    expect(cmd.type).toBe(CmdType.SNAPSHOT);
    expect(cmd.message).toBe('123');
  });

  it('should convert to JSON string with ToString method', () => {
    const cmd = new CmdMessage(CmdType.METADATA, 'metadata request');
    const jsonString = cmd.ToString();
    const parsed = JSON.parse(jsonString);
    
    expect(parsed.type).toBe(CmdType.METADATA);
    expect(parsed.message).toBe('metadata request');
  });

  it('should handle empty string message', () => {
    const cmd = new CmdMessage(CmdType.CUSTOM, '');
    expect(cmd.type).toBe(CmdType.CUSTOM);
    expect(cmd.message).toBe('');
  });
});

describe('MetaCmdMessage class', () => {
  it('should create an instance with command and message', () => {
    const metaCmd = new MetaCmdMessage(MetadataCmd.LATEST, 'latest metadata');
    expect(metaCmd.command).toBe(MetadataCmd.LATEST);
    expect(metaCmd.message).toBe('latest metadata');
  });

  it('should create an instance with default empty message', () => {
    const metaCmd = new MetaCmdMessage(MetadataCmd.OLDER);
    expect(metaCmd.command).toBe(MetadataCmd.OLDER);
    expect(metaCmd.message).toBe('');
  });

  it('should convert to JSON string with ToString method', () => {
    const metaCmd = new MetaCmdMessage(MetadataCmd.SPECIFIC_TIME, 'specific time request');
    const jsonString = metaCmd.ToString();
    const parsed = JSON.parse(jsonString);
    
    expect(parsed.command).toBe(MetadataCmd.SPECIFIC_TIME);
    expect(parsed.message).toBe('specific time request');
  });
});

describe('CameraCtrlMessage class', () => {
  it('should create an instance with key and value', () => {
    // Since we don't have access to specific CameraPropertyKey and CameraPropertyValue types,
    // we'll use generic values that would typically be valid
    const ctrlMessage = new CameraCtrlMessage('brightness' as any, 50 as any);
    expect(ctrlMessage.key).toBe('brightness');
    expect(ctrlMessage.value).toBe(50);
  });

  it('should create an instance with string value', () => {
    const ctrlMessage = new CameraCtrlMessage('resolution' as any, '1080p' as any);
    expect(ctrlMessage.key).toBe('resolution');
    expect(ctrlMessage.value).toBe('1080p');
  });

  it('should create an instance with boolean value', () => {
    const ctrlMessage = new CameraCtrlMessage('autoFocus' as any, true as any);
    expect(ctrlMessage.key).toBe('autoFocus');
    expect(ctrlMessage.value).toBe(true);
  });
});

describe('VideoMetadata type', () => {
  it('should be a valid type structure', () => {
    const metadata: VideoMetadata = {
      duration: '00:01:30',
      image: 'data:image/png;base64,...',
      path: '/path/to/video.mp4'
    };

    expect(metadata.duration).toBe('00:01:30');
    expect(metadata.image).toBe('data:image/png;base64,...');
    expect(metadata.path).toBe('/path/to/video.mp4');
  });
});

// Additional tests to ensure proper functionality
describe('CmdMessage edge cases', () => {
  it('should handle special characters in message', () => {
    const specialMessage = 'special chars: !@#$%^&*()_+{}:"|>?<';
    const cmd = new CmdMessage(CmdType.CUSTOM, specialMessage);
    expect(cmd.message).toBe(specialMessage);
    
    // Test that it can be stringified and parsed correctly
    const jsonString = cmd.ToString();
    const parsed = JSON.parse(jsonString);
    expect(parsed.message).toBe(specialMessage);
  });

  it('should handle numeric values properly', () => {
    const cmd1 = new CmdMessage(CmdType.BROADCAST, 999999);
    expect(cmd1.message).toBe('999999');
    
    const cmd2 = new CmdMessage(CmdType.BROADCAST, 0);
    expect(cmd2.message).toBe('0');
  });
});

describe('MetaCmdMessage edge cases', () => {
  it('should handle special characters in message', () => {
    const specialMessage = 'special chars: !@#$%^&*()_+{}:"|>?<';
    const metaCmd = new MetaCmdMessage(MetadataCmd.LATEST, specialMessage);
    expect(metaCmd.message).toBe(specialMessage);
    
    // Test that it can be stringified and parsed correctly
    const jsonString = metaCmd.ToString();
    const parsed = JSON.parse(jsonString);
    expect(parsed.message).toBe(specialMessage);
  });
});