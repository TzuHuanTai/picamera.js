import { DEFAULT } from './index';

describe('Constants', () => {
  describe('DEFAULT', () => {
    test('should have SIGNALING_TIMEOUT constant', () => {
      expect(DEFAULT).toHaveProperty('SIGNALING_TIMEOUT');
      expect(DEFAULT.SIGNALING_TIMEOUT).toBe(10000);
    });

    test('should have the correct SIGNALING_TIMEOUT value', () => {
      expect(DEFAULT.SIGNALING_TIMEOUT).toBe(10000);
    });

    test('should be an object with expected properties', () => {
      expect(typeof DEFAULT).toBe('object');
      expect(Object.keys(DEFAULT)).toContain('SIGNALING_TIMEOUT');
      expect(Object.keys(DEFAULT)).toHaveLength(1);
    });
  });
});