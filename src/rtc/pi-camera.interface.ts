
import { CodecType } from '../utils/rtc-tools';
import { CameraOptionType, CameraOptionValue } from './camera-options';
import { IMqttConnectionOptions } from '../mqtt/mqtt-client.interface';
import { VideoMetadata } from './message';

export interface IPiCameraOptions extends IMqttConnectionOptions {
  stunUrls: string[];
  turnUrl?: string;
  turnUsername?: string;
  turnPassword?: string;
  timeout?: number;
  datachannelOnly?: boolean;
  isMicOn?: boolean;
  isSpeakerOn?: boolean;
  credits?: boolean;
  codec?: CodecType;
}

export interface IPiCamera {
  // Events
  /**
   * Emitted when the WebRTC peer connection state changes.
   *
   * @param state - The new state of the RTCPeerConnection.
   */
  onConnectionState?: (state: RTCPeerConnectionState) => void;

  /**
   * Emitted when the data channel is successfully opened.
   *
   * @param dataChannel - The opened RTCDataChannel instance for data communication.
   */
  onDatachannel?: (dataChannel: RTCDataChannel | any) => void;

  /**
   * Emitted after calling the `snapshot()` method. This event emits a base64-encoded image 
   * once all image packets are received from the server.
   *
   * @param base64 - The base64 string representing the captured image.
   */
  onSnapshot?: (base64: string) => void;

  /**
   * Emitted when the metadata of a recording file is retrieved.
   *
   * @param metadata - The metadata of the recording file.
   */
  onMetadata?: (metadata: VideoMetadata) => void;

  /**
   * Emitted when the P2P connection cannot be established within the allotted time. 
   * Automatically triggers the `terminate()` function.
   */
  onTimeout?: () => void;

  // Methods
  /**
   * Attaches the remote media stream to the specified media element for playback.
   *
   * @param mediaElement - The HTML video element where the remote media stream will be rendered.
   */
  attach(mediaElement: HTMLVideoElement | any): void;

  /**
   * Start trying to establish the WebRTC connection.
   */
  connect(): void;

  /**
   * Terminates the WebRTC connection.
   */
  terminate(): void;

  /**
   * Retrieves the current connection status.
   */
  getStatus(): RTCPeerConnectionState;

  /**
  * Retrieves metadata of recording files.
  * - If called without arguments, returns metadata of the latest recorded file.
  * - If provided with a file path, returns metadata of up to 8 older recordings before the given file.
  * - If provided with a date, returns metadata of the closest recorded file to that time.
  * 
  * @param path - The path to an existing recorded file; retrieves metadata of up to 8 older recordings before it.
  * @param time - A specific date/time; retrieves metadata of the closest recorded file.
  */
  getRecordingMetadata(): void;
  getRecordingMetadata(path: string): void;
  getRecordingMetadata(time: Date): void;

  /** 
   * Sets the camera option, such as 3A or so.
   * @param key Camera Option Type
   * @param value Value of the Camera Option
   */
  setCameraOption(key: CameraOptionType, value: CameraOptionValue): void;

  /**
   * Requests a snapshot image from the server.
   * 
   * @param quality - The range from `0` to `100`, determines the image quality. The default value is `30`.
   */
  snapshot(quality?: number): void;

  /**
   * Toggles the **local** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.
   * @param enabled 
   */
  toggleMic(enabled?: boolean): void;

  /**
   * Toggles the **remote** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.
   * @param enabled
   */
  toggleSpeaker(enabled?: boolean): void;
}
