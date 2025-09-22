import { CodecType } from './utils/rtc-tools';
import { CameraPropertyKey, CameraPropertyValue } from './constants/camera-property';
import { CmdType, VideoMetadata } from './rtc/cmd-message';
import { IMqttConnectionOptions, MqttTopicType } from './signaling/mqtt-client';
import {
  IWebSocketConnectionOptions,
  WebsocketActionType,
  Participant,
  Quality,
  RoomInfo,
  Speaking,
} from './signaling/websocket-client';
import { ChannelId, IpcMode } from './peer/rtc-peer';

export type SignalingType = 'mqtt' | 'websocket';

export interface IPiCameraOptions extends IMqttConnectionOptions, IWebSocketConnectionOptions {
  signaling?: SignalingType;
  stunUrls?: string[];
  turnUrl?: string;
  turnUsername?: string;
  turnPassword?: string;
  timeout?: number;
  datachannelOnly?: boolean;
  ipcMode?: IpcMode;
  isMicOn?: boolean;
  isSpeakerOn?: boolean;
  credits?: boolean;
  codec?: CodecType;
}

export type ActionType = WebsocketActionType | MqttTopicType;

export interface IPiCameraEvents {
  /**
   * Emitted when the WebRTC peer connection state changes.
   *
   * @param state - The new state of the RTCPeerConnection.
   */
  onConnectionState?: (state: RTCPeerConnectionState) => void;

  /**
   * Emitted when the data channel is successfully opened.
   *
   * @param dataChannel - The Id of the opened RTCDataChannel.
   */
  onDatachannel?: (id: ChannelId) => void;

  /**
   * If any data transfer by datachannel, the on progress will give the received/total info.
   * @param received 
   * @param total 
   */
  onProgress?: (received: number, total: number, type: CmdType) => void;

  /**
   * Attaches the remote media stream to the specified media element for playback.
   *
   * @param stream - The HTML video element where the remote media stream will be rendered.
   */
  onStream?: (stream: MediaStream) => void;

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
   * Emitted when a video file is successfully downloaded from the server.
   * @param file 
   * @returns 
   */
  onVideoDownloaded?: (file: Uint8Array) => void;

  /**
 * Emitted when a IPC message is received.
 * 
 * @param msg - The string message received from the remote peer.
 */
  onMessage?: (msg: string) => void;

  /**
   * Emitted when the P2P connection cannot be established within the allotted time. 
   * Automatically triggers the `terminate()` function.
   */
  onTimeout?: () => void;

  /**
   * Emitted when the SFU room information changes.
   * 
   * @param room - The room information, including the room ID and name.
   * @returns 
   */
  onRoomInfo?: (room: RoomInfo) => void;

  /**
   * Emitted when the quality of SFU connections change.
   *
   * @param quality - The new quality settings for the video stream.
   */
  onQuility?: (quality: Quality[]) => void;

  /**
   * Emitted when an SFU participant starts or stops speaking.
   *
   * @param speaking - The list of participants who are currently speaking.
   */
  onSpeaking?: (speaking: Speaking[]) => void;

  /**
   * Emitted when the list of participants in the SFU room changes.
   *
   * @param participant - Update the participants' state currently in the room.
   */
  onParticipant?: (participant: Participant[]) => void;

}

export interface IPiCamera extends IPiCameraEvents {
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
   * Requests a video file from the server.
   * 
   * @param path - The path to the video file.
   */
  fetchRecordedVideo(path: string): void;

  /** 
   * Sets the camera property, such as 3A or so.
   * @param key Camera property type
   * @param value Value of the camera property
   */
  setCameraProperty(key: CameraPropertyKey, value: CameraPropertyValue): void;

  /**
   * Requests a snapshot image from the server.
   * 
   * @param quality - The range from `0` to `100`, determines the image quality. The default value is `30`.
   */
  snapshot(quality?: number): void;

  /**
   * Send a message to the server for IPC.
   * 
   * @param msg - The custom contents.
   */
  sendMessage(msg: string): void;

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
