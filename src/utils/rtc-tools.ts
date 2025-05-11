export type CodecType = 'H264' | 'VP8' | 'VP9' | 'AV1';
const ALLOWED_CODEC: CodecType = 'H264';
const ALL_CODECS: CodecType[] = ['H264', 'VP8', 'VP9', 'AV1'];

function removeCodec(orgsdp: string, codec: CodecType): string {
  const internalFunc = (sdp: string) => {
    const codecre = new RegExp('(a=rtpmap:(\\d*) ' + codec + '\/90000\\r\\n)');
    const rtpmaps = sdp.match(codecre);
    if (rtpmaps == null || rtpmaps.length <= 2) {
      return sdp;
    }
    const rtpmap = rtpmaps[2];
    let modsdp = sdp.replace(codecre, "");

    const rtcpre = new RegExp('(a=rtcp-fb:' + rtpmap + '.*\r\n)', 'g');
    modsdp = modsdp.replace(rtcpre, "");

    const fmtpre = new RegExp('(a=fmtp:' + rtpmap + '.*\r\n)', 'g');
    modsdp = modsdp.replace(fmtpre, "");

    const aptpre = new RegExp('(a=fmtp:(\\d*) apt=' + rtpmap + '\\r\\n)');
    const aptmaps = modsdp.match(aptpre);
    let fmtpmap = "";
    if (aptmaps != null && aptmaps.length >= 3) {
      fmtpmap = aptmaps[2];
      modsdp = modsdp.replace(aptpre, "");

      const rtppre = new RegExp('(a=rtpmap:' + fmtpmap + '.*\r\n)', 'g');
      modsdp = modsdp.replace(rtppre, "");
    }

    let videore = /(m=video.*\r\n)/;
    const videolines = modsdp.match(videore);
    if (videolines != null) {
      //If many m=video are found in SDP, this program doesn't work.
      let videoline = videolines[0].substring(0, videolines[0].length - 2);
      const videoelems = videoline.split(" ");
      let modvideoline = videoelems[0];
      videoelems.forEach((videoelem, index) => {
        if (index === 0) return;
        if (videoelem == rtpmap || videoelem == fmtpmap) {
          return;
        }
        modvideoline += " " + videoelem;
      })
      modvideoline += "\r\n";
      modsdp = modsdp.replace(videore, modvideoline);
    }
    return internalFunc(modsdp);
  }
  return internalFunc(orgsdp);
}

/**
 * Remove a specific codec from SDP.
 * @param {string} orgsdp - Original SDP string.
 * @param {string} allowedCodec - Codec to be used.
 * @returns {string} - Modified SDP string.
 */
export function keepOnlyCodec(orgsdp: string, allowedCodec: CodecType = ALLOWED_CODEC): string {
  let modifiedSdp = orgsdp;

  for (const codec of ALL_CODECS) {
    if (codec !== allowedCodec) {
      modifiedSdp = removeCodec(modifiedSdp, codec);
    }
  }

  return modifiedSdp;
}

/**
 * Convert an ArrayBuffer to a string.
 * @param {Uint8Array} buffer - The ArrayBuffer to convert.
 * @returns {string} - The resulting string.
 */
export function arrayBufferToString(buffer: Uint8Array): string {
  return buffer.reduce((acc, curr) => acc + String.fromCharCode(curr), "");
}

/**
 * Convert an ArrayBuffer to a string.
 * @param {string} str - The string to convert.
 * @returns {Uint8Array} - The resulting Uint8Array.
 */
export function stringToArrayBuffer(str: string): Uint8Array {
  const buffer = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buffer[i] = str.charCodeAt(i);
  }
  return buffer;
}

/**
 * Convert an ArrayBuffer to a Base64 string.
 * @param {Uint8Array} buffer - The ArrayBuffer to convert.
 * @returns {string} - The resulting Base64 string.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  return btoa(arrayBufferToString(buffer));
}

export const padZero = (num: number): string => {
  return num.toString().padStart(2, '0');
}

export function utf8ArrayToString(bytes: Uint8Array): string {
  let str = '';
  let i = 0;

  while (i < bytes.length) {
    const byte1 = bytes[i++];

    if (byte1 < 0x80) {
      str += String.fromCharCode(byte1);
    } else if (byte1 < 0xE0) {
      const byte2 = bytes[i++];
      str += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
    } else if (byte1 < 0xF0) {
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      str += String.fromCharCode(
        ((byte1 & 0x0F) << 12) |
        ((byte2 & 0x3F) << 6) |
        (byte3 & 0x3F)
      );
    } else {
      // handle surrogate pairs
      const byte2 = bytes[i++];
      const byte3 = bytes[i++];
      const byte4 = bytes[i++];
      let codePoint =
        ((byte1 & 0x07) << 18) |
        ((byte2 & 0x3F) << 12) |
        ((byte3 & 0x3F) << 6) |
        (byte4 & 0x3F);
      codePoint -= 0x10000;
      str += String.fromCharCode(
        (codePoint >> 10) + 0xd800,
        (codePoint & 0x3ff) + 0xdc00
      );
    }
  }

  return str;
}
