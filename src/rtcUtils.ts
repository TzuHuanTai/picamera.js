export enum CommandType {
  CONNECT,
  SNAPSHOT,
  METADATA,
  RECORD,
  UNKNOWN
};

export class RtcMessage {
  type: CommandType;
  message?: string;

  constructor(type: CommandType, message: string | number) {
    this.type = type;
    if (typeof message === 'string') {
      this.message = message;
    } else if (typeof message === 'number') {
      this.message = String(message);
    }
  }

  ToString(): string {
    return JSON.stringify(this);
  }
}

export class MetaCmdMessage {
  command: MetadataCommand;
  message: string;
  constructor(command: MetadataCommand, message: string = "") {
    this.command = command;
    this.message = message;
  }

  ToString(): string {
    return JSON.stringify(this);
  }
}

export enum MetadataCommand {
  LATEST,
  OLDER,
  SPECIFIC_TIME
};

/**
 * Remove a specific codec from SDP.
 * @param {string} sdp - Original SDP string.
 * @param {string} codec - Codec to be removed.
 * @returns {string} - Modified SDP string.
 */
export function removeCodec(orgsdp: string, codec: string): string {
  const internalFunc = (sdp: string): string => {
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
        if (videoelem === rtpmap || videoelem === fmtpmap) {
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
  const binary = arrayBufferToString(buffer);
  return btoa(binary);
}

export function generateUid(length: number): string {
  if (length < 1 || length > 23) {
    throw new Error('Length must be between 1 and 23 characters.');
  }
  const timestamp = Date.now().toString(36);
  const randomLength = length - timestamp.length;
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = timestamp;
  for (let i = 0; i < randomLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}
