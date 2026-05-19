import {
  PiCamera,
  CameraKeyLabels,
  CameraValueLables,
} from './index';

// Import types for type checking (these won't be available at runtime)
import type {
  IPiCameraOptions,
  CameraPropertyKey,
  CameraPropertyValue,
  ChannelId
} from './index';

describe('Index exports', () => {
  test('should export PiCamera class', () => {
    expect(PiCamera).toBeDefined();
    expect(typeof PiCamera).toBe('function');
  });

  test('should export CameraKeyLabels object', () => {
    expect(CameraKeyLabels).toBeDefined();
    expect(typeof CameraKeyLabels).toBe('object');
  });

  test('should export CameraValueLables object', () => {
    expect(CameraValueLables).toBeDefined();
    expect(typeof CameraValueLables).toBe('object');
  });

  test('should be able to reference PiCamera class without error', () => {
    // Testing that PiCamera can be referenced (actual instantiation might require browser environment)
    expect(PiCamera).toBeDefined();
    expect(typeof PiCamera).toBe('function');
  });

  test('should have expected properties in CameraKeyLabels', () => {
    // Check that CameraKeyLabels has properties with numeric keys from CameraPropertyKey enum
    // For example, brightness is at key 14, contrast at 15, saturation at 22
    expect(CameraKeyLabels).toHaveProperty('14'); // BRIGHTNESS
    expect(CameraKeyLabels).toHaveProperty('15'); // CONTRAST
    expect(CameraKeyLabels).toHaveProperty('22'); // SATURATION
    expect(CameraKeyLabels['14']).toBe('Brightness');
    expect(CameraKeyLabels['15']).toBe('Contrast');
    expect(CameraKeyLabels['22']).toBe('Saturation');
  });

  test('should have expected structure in CameraValueLables', () => {
    // Check that CameraValueLables has the nested structure with numeric keys
    expect(CameraValueLables).toHaveProperty('2'); // AE_STATE
    expect(CameraValueLables['2']).toEqual(expect.objectContaining({
      '0': 'Idle',
      '1': 'Searching',
      '2': 'Converged'
    }));
  });
});