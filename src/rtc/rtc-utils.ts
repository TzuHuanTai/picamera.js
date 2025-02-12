export enum CommandType {
  CONNECT,
  SNAPSHOT,
  METADATA,
  RECORD,
  UNKNOWN
};

export enum MetadataCommand {
  LATEST,
  OLDER,
  SPECIFIC_TIME
};

export class RtcMessage {
  type: CommandType;
  message?: string;

  constructor(type: CommandType, message: string | number) {
    this.type = type;
    this.message = typeof message === 'string' ? message : String(message);
  }
}

export class MetaCmdMessage {
  command: MetadataCommand;
  message: string;

  constructor(command: MetadataCommand, message: string = "") {
    this.command = command;
    this.message = message;
  }
}

/**
 * Remove a specific codec from SDP.
 * @param {string} sdp - Original SDP string.
 * @param {string} codec - Codec to be removed.
 * @returns {string} - Modified SDP string.
 */
export function removeCodec(orgsdp: string, codec: string): string {
  const codecRegex = new RegExp(`a=rtpmap:(\\d*) ${codec}/90000\\r\\n`);
  let modifiedSdp = orgsdp.replace(codecRegex, "");

  // Remove associated rtcp-fb, fmtp, and apt lines
  modifiedSdp = modifiedSdp.replace(new RegExp(`a=rtcp-fb:(\\d*) ${codec}.*\\r\\n`, 'g'), '');
  modifiedSdp = modifiedSdp.replace(new RegExp(`a=fmtp:(\\d*) ${codec}.*\\r\\n`, 'g'), '');

  // Handle fmtp apt
  const aptRegex = new RegExp(`a=fmtp:(\\d*) apt=(\\d*)\\r\\n`);
  modifiedSdp = modifiedSdp.replace(aptRegex, '');

  // Process video line modifications
  const videoLineRegex = /m=video.*\r\n/;
  const videoLineMatch = modifiedSdp.match(videoLineRegex);
  if (videoLineMatch) {
    let videoLine = videoLineMatch[0].trim();
    const videoElements = videoLine.split(" ");
    videoLine = videoElements.filter(el => el !== codec).join(" ") + "\r\n";
    modifiedSdp = modifiedSdp.replace(videoLineRegex, videoLine);
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
