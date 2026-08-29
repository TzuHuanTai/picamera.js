# API Documentation

* [Data channels](#data-channels)
* [Options](#options)
* [Events](#events)
  * [onConnectionState](#onConnectionState)
  * [onDatachannel](#onDatachannel)
  * [onProgress](#onprogress)
  * [onStream](#onstream)
  * [onSfuStream](#onsfustream)
  * [onSnapshot](#onSnapshot)
  * [onVideoListLoaded](#onVideoListLoaded)
  * [onVideoDownloaded](#onvideodownloaded)
  * [onMessage](#onmessage)
  * [onRecording](#onrecording)
  * [onTimeout](#onTimeout)
  * [onError](#onerror)
  * [onRoomInfo](#onroominfo)
  * [onQuility](#onquility)
  * [onSpeaking](#onspeaking)
  * [onParticipant](#onparticipant)
  * [onDeviceSession](#ondevicesession)
* [Methods](#methods)
  * [connect](#connect)
  * [terminate](#terminate)
  * [getStatus](#getStatus)
  * [refresh](#refresh)
  * [fetchVideoList](#fetchVideoList)
  * [downloadVideoFile](#downloadVideoFile)
  * [setCameraControl](#setCameraControl)
  * [snapshot](#snapshot)
  * [startRecording](#startrecording)
  * [stopRecording](#stoprecording)
  * [sendText](#sendText)
  * [sendData](#sendData)
  * [toggleMic](#toggleMic)
  * [toggleSpeaker](#toggleSpeaker)

## Data channels

Four channels, each with one job. `onDatachannel` reports each one as a `ChannelRole`.

| Role | Label | SCTP id | Ordered | Reliability | Carries |
| --- | --- | --- | --- | --- | --- |
| `ChannelRole.Command` | `command` | 0 | yes | reliable | Requests, and small responses such as `onRecording` |
| `ChannelRole.Stream` | `stream` | 1 | **no** | reliable | Everything chunked: snapshots, video lists, file transfers |
| `ChannelRole.Lossy` | `_lossy` | 2 | no | may drop | IPC, UDP-like |
| `ChannelRole.Reliable` | `_reliable` | 3 | yes | reliable | IPC, TCP-like |

On the `mqtt` path the four are **negotiated out-of-band** on those fixed SCTP ids: both sides
open them locally, so `ondatachannel` never fires and the ids have to match the device's. Over
`livekit` the SFU opens its own reserved channels in-band instead, and only `_lossy` / `_reliable`
exist there. The `cloudflare` path has no data channels at all.

Because a negotiated channel opens as soon as the SCTP association is up, whether or not the
device opened its side, `onDatachannel` fires for all four on the `mqtt` path even when the device
is running without `--enable-ipc`. It reports that the channel is usable locally, not that anything
is listening on the other end.

Splitting bulk content onto its own channel is what keeps a multi-megabyte `downloadVideoFile()`
from blocking the commands issued while it runs — a snapshot requested mid-transfer comes back
without waiting for the file. Because `stream` is unordered and several streams are in flight at
once, every request carries a `request_id` that the device echoes on the matching answer.

Nothing on a stream says what its body is: `request_id` names the request it answers, and the
channel it arrived on says whether it is an answer at all or an IPC payload. The client keeps the
pending-request map that turns one into the other, so `onProgress` can report overlapping
transfers separately and each completed body is parsed as what was actually asked for.

## Options

Available flags for initialization.

| Option          | Type       | Default | Description                                                  |
| --------------- | ---------- | ------- | ------------------------------------------------------------ |
| signaling       | `'mqtt' \| 'livekit' \| 'cloudflare'` | `mqtt` | Which backend the device is reachable through. |
| uid             | `string`   |         | The custom `--uid` provided in the running `pi_webrtc`. Used by `mqtt` and `cloudflare`. |
| mqttHost        | `string`   |         | The MQTT server host.                                        |
| mqttPath        | `string`   | `/mqtt` | The MQTT server path.                                        |
| mqttPort        | `number`   | `8884`  | The WebSocket port for the MQTT server.                      |
| mqttProtocol    | `string`   | `wss`   | The protocol for the MQTT server.                            |
| mqttUsername    | `string`   |         | The username for the MQTT server.                            |
| mqttPassword    | `string`   |         | The password for the MQTT server.                            |
| livekitUrl      | `string`   |         | The WebSocket URL of the LiveKit relay. Matches `pi_webrtc`'s `--livekit-url`. |
| livekitKey      | `string`   |         | The key LiveKit issued, matching `pi_webrtc`'s `--livekit-key`. Not the same as `apiKey`. |
| livekitRoom     | `string`   |         | The room to join. Matches `pi_webrtc`'s `--livekit-room`.    |
| userId          | `string`   | `(random uuid)` | The user identifier displayed in the room after joining the SFU server. |
| apiUrl          | `string`   |         | Base URL of the picamera device API, which fronts both SFU backends. |
| apiKey          | `string`   |         | The device API's viewer key, sent as `Authorization: Bearer`. |
| stunUrls        | `string[]` |         | An array of STUN server URLs for WebRTC. Leave out or set to null for local network or VPN IP addresses. |
| turnUrls        | `string[]` |         | The TURN server URL for WebRTC.                              |
| turnUsername    | `string`   |         | The username for the TURN server.                            |
| turnPassword    | `string`   |         | The password for the TURN server.                            |
| timeout         | `number`   | `10000` | The connection timeout in milliseconds (`ms`).               |
| datachannelOnly | `boolean`  | `false` | Specifies that the connection is only for data transfer, without media streams. |
| isMicOn         | `boolean`  | `true`  | Enables the local microphone stream by default if the connection is established. |
| isSpeakerOn     | `boolean`  | `true`  | Enables the remote audio stream by default if the connection is established. |
| codec           | `string`   |         | Codecs include `H264`, `VP8`, `VP9`, and `AV1`.              |

## Events
- ### onConnectionState

  `= (state: RTCPeerConnectionState) => {}`

  Emitted when the WebRTC peer connection state changes.

- ### onDatachannel

  `= (role: ChannelRole) => {}`

  Emitted when the data channel successfully opens for data communication.

- ### onProgress

  `= (received: number, total: number, type: RequestType, requestId?: string) => {}`

  Emitted during DataChannel transfers with received/total progress. `requestId` says which request the bytes belong to, so overlapping transfers can be told apart.

- ### onStream

  `= (stream: MediaStream) => {}`

  Triggered when a media stream is received from either SFU or MQTT.

- ### onSfuStream

  `= (sid: string, stream: MediaStream) => {}`

  Triggered only when a media stream is received from the SFU, delivering both the participant's server-side ID (sid) and the associated MediaStream. On the `cloudflare` path there are no participants, so the first argument is the name of the track that was pulled.

- ### onSnapshot

  `= (base64: string) => {}`

  Emitted after calling the `snapshot()` method. This event emits a base64-encoded image once all image packets are received from the server.

- ### onVideoListLoaded

  `= (res: QueryFileResponse) => {}`

  Emitted when the metadata of a recording file is retrieved.

- ### onVideoDownloaded

  `= (file: Uint8Array) => {}`

  Emitted when a video file is successfully downloaded from the server.

- ### onTimeout

  `= () => {}`

  Emitted when the P2P connection cannot be established within the allotted time. Automatically calls the `terminate()` function.

- ### onError

  `= (err: Error) => {}`

  Emitted when signaling fails for a reason worth putting in front of a user — a device that has never reported a session, one that is registered but not publishing, a track the SFU refused. Distinct from `onTimeout`, which only says the peer never came up.

- ### onDeviceSession

  `= (session: DeviceSession) => {}`

  Emitted on the `cloudflare` path once the device's session record has been read, before the peer is built. Cloudflare mints a new session id on every device reconnect, so this is the only place the current one is visible.

- ### onMessage

  `= (msg: Uint8Array) => {}`

  Emitted when an IPC message is received from the server.

- ### onRecording

  `= (res: RecordingResponse) => {}`

  Emitted when the server responds to a `startRecording()` or `stopRecording()` command.

  - `res.isRecording` — `true` if recording has started, `false` if it has stopped.
  - `res.filepath` — The active recording file path.

- ### onRoomInfo

  `= (participant: RoomInfo) => {}`

  Emitted when the SFU room information changes.

- ### onQuility

  `= (quality: Quality[]) => {}`

  Emitted when SFU connection quality changes.

- ### onSpeaking

  `= (speaking: Speaking[]) => {}`

  Emitted when an SFU participant starts or stops speaking.

- ### onParticipant

  `= (participant: Participant[]) => {}`

  Emitted when the list of participants in the SFU room changes.

## Methods

- ### connect

  `.connect()`

  Starts establishing the WebRTC connection.

- ### terminate

  `.terminate()`

  Terminates the WebRTC connection.

- ### getStatus

  `.getStatus()` 
  
  Retrieves the current connection status.

- ### refresh

  `.refresh(): Promise<number>`

  Pulls whatever the device has started publishing since the connection was established, and resolves to how many tracks that was. Rejects if the SFU refuses. Only the `cloudflare` path has anything to re-read; elsewhere new tracks arrive on their own and this resolves to `0`.

- ### fetchVideoList

  `.fetchVideoList(options?: { param?: string | Date, mode?: VideoMode })`

  Retrieves recording file metadata.

  If called without arguments, returns metadata of the latest recorded file.

  If `param` is a file path (string), returns metadata of up to 8 older recordings before the given file.

  If `param` is a date, returns metadata of the closest recorded file to that time.

  - `param` - (optional) A file path (`string`) or a `Date`; controls pagination/filtering.
  - `mode` - (optional) Filters results to the specified `VideoMode`.

- ### downloadVideoFile

  `.downloadVideoFile(path: string)` 
  
  Requests a video file from the server.

  - `path` - The path to the video file.

- ### setCameraControl

  `.setCameraControl(key: CameraControlId, value: CameraControlValue)`
  
  Sets camera properties (for example, 3A controls).

- ### snapshot

  `.snapshot(quality?: number)`

   Requests a snapshot image from the server.

  - `quality` - The range from `0` to `100`, determines the image quality. The default value is `30`.

- ### startRecording

  `.startRecording()`

  Sends a `START_RECORDING` command to the server via the command DataChannel. The server response is delivered via `onRecording`.

- ### stopRecording

  `.stopRecording()`

  Sends a `STOP_RECORDING` command to the server via the command DataChannel. The server response is delivered via `onRecording`.

- ### sendText

  `.sendText(msg: string, mode?: 'lossy' | 'reliable')`
  
  Sends an IPC message. `mode` is chosen per message and defaults to `reliable`, which retransmits until delivered; `lossy` may drop the message but has lower latency. Both channels are open whenever the device runs with `--enable-ipc`. Payloads over 64 KB are chunked and are only accepted on `reliable`.

- ### sendData

  `.sendData(binary: Uint8Array, mode?: 'lossy' | 'reliable')`
  
  Same as `sendText`, but sends in binary format.

- ### toggleMic

  `.toggleMic(enabled?: boolean)`

  Toggles the **local** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.

- ### toggleSpeaker

  `.toggleSpeaker(enabled?: boolean)`

  Toggles the **remote** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.

---

Back to the [README](../README.md).
