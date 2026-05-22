<p align=center>
    <img src="doc/icon.png" width="200" alt="PiCamera.js">
</p>
<h1 align="center">
    PiCamera.js
</h1>

<p align="center">
    <a href="https://www.npmjs.com/package/picamera.js"><img src="https://img.shields.io/npm/dt/picamera.js.svg?color=yellow" alt="npm downloads"></a>
    <img src="https://img.shields.io/github/v/tag/TzuHuanTai/picamera.js?filter=v*&label=release&color=blue" alt="Release">
</p>

Web and React Native client for [pi-webrtc](https://github.com/TzuHuanTai/RaspberryPi-WebRTC), with TypeScript typings and support for low-latency WebRTC streaming, P2P, SFU, DataChannel control, snapshots, and file transfer.

- Live demo: [PiCamera.js Demo](https://tzuhuantai.github.io/picamera.js/demo/)
- Demo source: [demo/index.html](demo/index.html)

## Quick Start

### Web

```bash
npm install picamera.js
```

Web examples: [examples/web-live-video.html](examples/web-live-video.html)

### React Native

Install and configure [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc), then install `picamera.js`:

```bash
npm install react-native-webrtc picamera.js
```

Before creating a `PiCamera` instance, call `registerGlobals()` once at app startup:

```javascript
import { registerGlobals } from 'react-native-webrtc';

registerGlobals();
```

Minimal example: [examples/react-native-minimal.tsx](examples/react-native-minimal.tsx)

## Contents

- [Examples](#examples)
- [Notes](#notes)
- [API Documentation](#api-documentation)

## Examples
Standalone examples are available in [examples](examples):

- [examples/react-native-minimal.tsx](examples/react-native-minimal.tsx): Minimal React Native setup using `RTCView` and `registerGlobals()`.
- [examples/web-live-video.html](examples/web-live-video.html): Display a live stream in an HTML `<video>` element.
- [examples/web-snapshot.js](examples/web-snapshot.js): Capture a snapshot over the command DataChannel.
- [examples/web-ipc.js](examples/web-ipc.js): Send and receive IPC messages over a DataChannel.
- [examples/web-download-video.js](examples/web-download-video.js): Download the latest recorded video file.
- [examples/web-camera-control.js](examples/web-camera-control.js): Adjust camera settings with public control IDs.
- [examples/web-recording.js](examples/web-recording.js): Start and stop remote recording.
- [examples/web-sfu-video.js](examples/web-sfu-video.js): Play a stream through the SFU server.

For SFU deployment details, see [Broadcasting Live Stream to 1,000+ Viewers via SFU](https://github.com/TzuHuanTai/RaspberryPi-WebRTC/wiki/Advanced-Settings#broadcasting-live-stream-to-1000-viewers-via-sfu).

## Notes

### Notes on local IP or VPN address
When running PiCamera.js on a local network or VPN, set `stunUrls` to `null` or omit it.

### Notes on Mosquitto
When using Mosquitto as your MQTT server, self-signed certificates can cause issues with the PiCamera.js MQTT client. A common setup is to run Mosquitto without SSL and place nginx in front of it.

```
# mosquitto.conf
listener 1883 localhost
allow_anonymous true

listener 1884
protocol websockets
allow_anonymous true
```

Then place nginx between the browser and Mosquitto. This example assumes files are under `/home/pi/src/project` with `run/`, `ssl/`, `logs/`, and `dist/` subdirectories. It serves HTTPS on port 8443 (not 443). Adjust as needed.

```nginx
# nginx.conf
pid /home/pi/src/project/run/nginx.pid;

events {}

http {
  # Map to manage WebSocket upgrade headers
  map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
  }

  # Upstream definition for Mosquitto WebSocket listener
  upstream mosquitto_websocket {
    server localhost:1884;  # Mosquitto WebSocket listener
  }

  # HTTPS server
  server {
    listen 8443 ssl;
    access_log /home/pi/src/project/logs/access.log;
    error_log /home/pi/src/project/logs/error.log;

    ssl_certificate /home/pi/src/project/ssl/server.crt;
    ssl_certificate_key /home/pi/src/project/ssl/server.key;

    location / {
      root /home/pi/src/project/dist/;
      try_files $uri $uri/ =404;
    }

    # Location block for WebSocket proxying to Mosquitto
    location /mqtt {
      proxy_pass http://mosquitto_websocket;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }

  # HTTP server
  server {
    listen 8080;
    access_log /home/pi/src/project/logs/access_http.log;
    error_log /home/pi/src/project/logs/error_http.log;

    location / {
      root /home/pi/src/project/dist/;
      try_files $uri $uri/ =404;
    }

    # Location block for WebSocket proxying to Mosquitto over HTTP
    location /mqtt {
      proxy_pass http://mosquitto_websocket;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto $scheme;
    }
  }
}
```

In this setup, initialize PiCamera.js as:

```javascript
let conn = new PiCamera({
  deviceUid: 'some-unique-uuid',      // must match pi_webrtc's --uid argument
  mqttHost: window.location.hostname, // same host and
  mqttPort: window.location.port,     // port as page itself
  mqttPath: '/mqtt',                  // to match nginx.conf configuration
});
```

### Notes on self-signed certificates
Most browsers require HTTPS for video. With self-signed certificates, you must accept certificate warnings in advance, including for the WebSocket host/port. In the example above, open https://your.mqtt.cloud:8884/ and accept the warning first. If the browser console reports `wss://` certificate errors, open the same endpoint as `https://` and accept it.

## API Documentation

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
  * [onRoomInfo](#onroominfo)
  * [onQuility](#onquility)
  * [onSpeaking](#onspeaking)
  * [onParticipant](#onparticipant)
* [Methods](#methods)
  * [connect](#connect)
  * [terminate](#terminate)
  * [getStatus](#getStatus)
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

## Options

Available flags for initialization.

| Option          | Type       | Default | Description                                                  |
| --------------- | ---------- | ------- | ------------------------------------------------------------ |
| signaling       | `'mqtt' \| 'websocket'` | `mqtt` | The signaling method.                            |
| deviceUid       | `string`   |         | The custom `--uid` provided in the running `pi_webrtc`.      |
| mqttHost        | `string`   |         | The MQTT server host.                                        |
| mqttPath        | `string`   | `/mqtt` | The MQTT server path.                                        |
| mqttPort        | `number`   | `8884`  | The WebSocket port for the MQTT server.                      |
| mqttProtocol    | `string`   | `wss`   | The protocol for the MQTT server.                            |
| mqttUsername    | `string`   |         | The username for the MQTT server.                            |
| mqttPassword    | `string`   |         | The password for the MQTT server.                            |
| websocketUrl    | `string`   |         | The WebSocket URL used to connect to the SFU server.         |
| apiKey          | `string`   |         | The API key used to authenticate with the SFU server.        |
| userId          | `string`   | `(random uuid)` | The user identifier displayed in the room after joining the SFU server. |
| roomId          | `string`   |         | The room ID used to join a session on the SFU server.        |
| stunUrls        | `string[]` |         | An array of STUN server URLs for WebRTC. Leave out or set to null for local network or VPN IP addresses. |
| turnUrls        | `string[]` |         | The TURN server URL for WebRTC.                              |
| turnUsername    | `string`   |         | The username for the TURN server.                            |
| turnPassword    | `string`   |         | The password for the TURN server.                            |
| timeout         | `number`   | `10000` | The connection timeout in milliseconds (`ms`).               |
| datachannelOnly | `boolean`  | `false` | Specifies that the connection is only for data transfer, without media streams. |
| ipcMode         | `string`  |          | Defines the communication mode for the IPC data channel. Accepts `lossy` (UDP-like) or `reliable` (TCP-like) modes. |
| isMicOn         | `boolean`  | `true`  | Enables the local microphone stream by default if the connection is established. |
| isSpeakerOn     | `boolean`  | `true`  | Enables the remote audio stream by default if the connection is established. |
| codec           | `string`   |         | Codecs include `H264`, `VP8`, `VP9`, and `AV1`.              |

## Events
- ### onConnectionState

  `= (state: RTCPeerConnectionState) => {}`

  Emitted when the WebRTC peer connection state changes.

- ### onDatachannel

  `= (id: ChannelId) => {}`

  Emitted when the data channel successfully opens for data communication.

- ### onProgress

  `= (received: number, total: number, type: CommandType) => {}`

  Emitted during DataChannel transfers with received/total progress.

- ### onStream

  `= (stream: MediaStream) => {}`

  Triggered when a media stream is received from either SFU or MQTT.

- ### onSfuStream

  `= (sid: string, stream: MediaStream) => {}`

  Triggered only when a media stream is received from the SFU, delivering both the participant's server-side ID (sid) and the associated MediaStream. 

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

  `.sendText(msg: string)`
  
  If `ipcMode` is set to `reliable`, the message will be retransmitted until successfully delivered. If set to `lossy`, the message may be lost, but with lower latency.

- ### sendData

  `.sendData(binary: Uint8Array)`
  
  Same as `sendText`, but sends in binary format.

- ### toggleMic

  `.toggleMic(enabled?: boolean)`

  Toggles the **local** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.

- ### toggleSpeaker

  `.toggleSpeaker(enabled?: boolean)`

  Toggles the **remote** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.

# License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

Included third-party licenses
mqtt: MIT License
@livekit/protocol: Apache License 2.0
See the NOTICE file for full license texts of third-party dependencies.

Commercial license
If your use case does not permit compliance with the AGPL (e.g., source code disclosure), a commercial license is available.
For more information, please contact: 📧 tzu.huan.tai@gmail.com
