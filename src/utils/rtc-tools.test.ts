import { 
  keepOnlyCodec, 
  arrayBufferToString, 
  stringToArrayBuffer, 
  arrayBufferToBase64,
  padZero,
  utf8ArrayToString,
  CodecType 
} from './rtc-tools';

describe('RTC Tools', () => {
  describe('keepOnlyCodec', () => {
    // Sample SDP with multiple video codecs
    const sampleSdp = [
      'v=0\r',
      'o=- 123456 2 IN IP4 127.0.0.1\r',
      's=-\r',
      'c=IN IP4 127.0.0.1\r',
      't=0 0\r',
      'm=video 9 UDP/TLS/RTP/SAVPF 96 98 100 102\r',
      'a=rtpmap:96 H264/90000\r',
      'a=rtcp-fb:96 nack\r',
      'a=fmtp:96 profile-level-id=42e01f;level-asymmetry-allowed=1\r',
      'a=rtpmap:98 VP8/90000\r',
      'a=rtcp-fb:98 nack\r',
      'a=rtpmap:100 VP9/90000\r',
      'a=rtcp-fb:100 nack\r',
      'a=rtpmap:102 AV1/90000\r',
      'a=rtcp-fb:102 nack\r',
      ''
    ].join('\n');

    it('should keep only H264 codec by default', () => {
      const result = keepOnlyCodec(sampleSdp);

      expect(result).toContain('a=rtpmap:96 H264/90000');
      expect(result).not.toContain('a=rtpmap:98 VP8/90000');
      expect(result).not.toContain('a=rtpmap:100 VP9/90000');
      expect(result).not.toContain('a=rtpmap:102 AV1/90000');
      // Check that video line only contains the H264 payload type
      expect(result).toContain('m=video 9 UDP/TLS/RTP/SAVPF 96\r\n');
    });

    it('should keep only specified codec', () => {
      const result = keepOnlyCodec(sampleSdp, 'VP8');

      expect(result).not.toContain('a=rtpmap:96 H264/90000');
      expect(result).toContain('a=rtpmap:98 VP8/90000');
      expect(result).not.toContain('a=rtpmap:100 VP9/90000');
      expect(result).not.toContain('a=rtpmap:102 AV1/90000');
      // Check that video line only contains the VP8 payload type
      expect(result).toContain('m=video 9 UDP/TLS/RTP/SAVPF 98\r\n');
    });

    it('should remove all other codecs except the specified one', () => {
      const result = keepOnlyCodec(sampleSdp, 'VP9');

      expect(result).not.toContain('a=rtpmap:96 H264/90000');
      expect(result).not.toContain('a=rtpmap:98 VP8/90000');
      expect(result).toContain('a=rtpmap:100 VP9/90000');
      expect(result).not.toContain('a=rtpmap:102 AV1/90000');
      // Check that video line only contains the VP9 payload type
      expect(result).toContain('m=video 9 UDP/TLS/RTP/SAVPF 100\r\n');
    });

    it('should return original SDP if only the allowed codec exists', () => {
      const sdpWithOnlyH264 = [
        'v=0\r',
        'o=- 123456 2 IN IP4 127.0.0.1\r',
        's=-\r',
        'c=IN IP4 127.0.0.1\r',
        't=0 0\r',
        'm=video 9 UDP/TLS/RTP/SAVPF 96\r',
        'a=rtpmap:96 H264/90000\r',
        'a=rtcp-fb:96 nack\r',
        'a=fmtp:96 profile-level-id=42e01f;level-asymmetry-allowed=1\r',
        ''
      ].join('\n');

      const result = keepOnlyCodec(sdpWithOnlyH264, 'H264');
      expect(result).toBe(sdpWithOnlyH264);
    });

    it('should handle SDP without video codecs', () => {
      const audioOnlySdp = [
        'v=0\r',
        'o=- 123456 2 IN IP4 127.0.0.1\r',
        's=-\r',
        'c=IN IP4 127.0.0.1\r',
        't=0 0\r',
        'm=audio 9 UDP/TLS/RTP/SAVPF 111\r',
        'a=rtpmap:111 opus/48000/2\r',
        ''
      ].join('\n');

      const result = keepOnlyCodec(audioOnlySdp);
      expect(result).toBe(audioOnlySdp);
    });

    it('should remove all codecs when none match the allowed codec', () => {
      const sdpWithOnlyVP8 = [
        'v=0\r',
        'o=- 123456 2 IN IP4 127.0.0.1\r',
        's=-\r',
        'c=IN IP4 127.0.0.1\r',
        't=0 0\r',
        'm=video 9 UDP/TLS/RTP/SAVPF 98\r',
        'a=rtpmap:98 VP8/90000\r',
        'a=rtcp-fb:98 nack\r',
        ''
      ].join('\n');

      const result = keepOnlyCodec(sdpWithOnlyVP8, 'H264');
      // When all codecs are removed, the result should have an empty video line
      expect(result).toContain('m=video 9 UDP/TLS/RTP/SAVPF\r\n');
    });
  });

  describe('arrayBufferToString', () => {
    it('should convert ArrayBuffer to string correctly', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = arrayBufferToString(buffer);
      expect(result).toBe('Hello');
    });

    it('should handle empty buffer', () => {
      const buffer = new Uint8Array([]);
      const result = arrayBufferToString(buffer);
      expect(result).toBe('');
    });

    it('should handle single character', () => {
      const buffer = new Uint8Array([65]); // "A"
      const result = arrayBufferToString(buffer);
      expect(result).toBe('A');
    });
  });

  describe('stringToArrayBuffer', () => {
    it('should convert string to ArrayBuffer correctly', () => {
      const str = 'Hello';
      const result = stringToArrayBuffer(str);
      expect(result).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it('should handle empty string', () => {
      const str = '';
      const result = stringToArrayBuffer(str);
      expect(result).toEqual(new Uint8Array([]));
    });

    it('should handle single character', () => {
      const str = 'A';
      const result = stringToArrayBuffer(str);
      expect(result).toEqual(new Uint8Array([65]));
    });

    it('should handle special characters', () => {
      const str = 'A!@#$%^&*()';
      const result = stringToArrayBuffer(str);
      const expected = new Uint8Array([65, 33, 64, 35, 36, 37, 94, 38, 42, 40, 41]);
      expect(result).toEqual(expected);
    });
  });

  describe('arrayBufferToBase64', () => {
    it('should convert ArrayBuffer to Base64 correctly', () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = arrayBufferToBase64(buffer);
      expect(result).toBe('SGVsbG8=');
    });

    it('should handle empty buffer', () => {
      const buffer = new Uint8Array([]);
      const result = arrayBufferToBase64(buffer);
      expect(result).toBe('');
    });
  });

  describe('padZero', () => {
    it('should pad single digit numbers', () => {
      expect(padZero(0)).toBe('00');
      expect(padZero(1)).toBe('01');
      expect(padZero(5)).toBe('05');
      expect(padZero(9)).toBe('09');
    });

    it('should not pad two digit numbers', () => {
      expect(padZero(10)).toBe('10');
      expect(padZero(25)).toBe('25');
      expect(padZero(99)).toBe('99');
    });

    it('should handle three digit numbers', () => {
      expect(padZero(100)).toBe('100');
      expect(padZero(123)).toBe('123');
    });
  });

  describe('utf8ArrayToString', () => {
    it('should decode ASCII characters correctly', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = utf8ArrayToString(bytes);
      expect(result).toBe('Hello');
    });

    it('should decode multi-byte UTF-8 correctly', () => {
      // "Hello 世界" in UTF-8 bytes
      const bytes = new Uint8Array([72, 101, 108, 108, 111, 32, 228, 184, 150, 231, 149, 140]);
      const result = utf8ArrayToString(bytes);
      expect(result).toBe('Hello 世界');
    });

    it('should handle empty array', () => {
      const bytes = new Uint8Array([]);
      const result = utf8ArrayToString(bytes);
      expect(result).toBe('');
    });

    it('should handle single character', () => {
      const bytes = new Uint8Array([65]); // "A"
      const result = utf8ArrayToString(bytes);
      expect(result).toBe('A');
    });

    it('should handle 2-byte UTF-8 sequence', () => {
      // Character 'é' in UTF-8: [0xC3, 0xA9] = [195, 169]
      const bytes = new Uint8Array([195, 169]);
      const result = utf8ArrayToString(bytes);
      expect(result).toBe('é');
    });

    it('should handle 3-byte UTF-8 sequence', () => {
      // Character '€' in UTF-8: [0xE2, 0x82, 0xAC] = [226, 130, 172]
      const bytes = new Uint8Array([226, 130, 172]);
      const result = utf8ArrayToString(bytes);
      expect(result).toBe('€');
    });

    it('should handle 4-byte UTF-8 sequence (surrogate pair)', () => {
      // Character represented by the 4-byte UTF-8 sequence
      const bytes = new Uint8Array([0xF0, 0xA0, 0x8C, 0xB3]); // UTF-8 bytes
      const result = utf8ArrayToString(bytes);
      // The function produces a surrogate pair, which is 2 characters in JS
      expect(result).toHaveLength(2);
      expect(result).not.toBe('');
      expect(result).not.toBe('Hello');
    });

    it('should decode another multi-byte UTF-8 sequence correctly', () => {
      // Test with a known correct UTF-8 sequence that produces 'こ'
      const bytes = new Uint8Array([72, 101, 108, 108, 111, 32, 227, 129, 147]); // produces "Hello こ"
      const result = utf8ArrayToString(bytes);
      expect(result).toBe('Hello こ');
    });
  });
});