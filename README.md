<p align=center>
    <img src="doc/icon.png" width="200" alt="PiCamera.js">
</p>
<h1 align="center">
    PiCamera.js
</h1>

JavaScript client for [pi-webrtc](https://github.com/TzuHuanTai/RaspberryPi-WebRTC) — stream low-latency video/audio from Raspberry Pi using native WebRTC with hardware H.264 (V4L2) or OpenH264.

Supports P2P, SFU, DataChannel control, and snapshot/file transfer over WebRTC.

## Installation

```
npm install picamera.js
```

## Usage

Check out the online demo: [Live Demo](https://tzuhuantai.github.io/picamera.js/demo/)

You can also view the demo source code here: [index.html](demo/index.html).

### Examples:
- [Live video](#live-video)
- [Capture a snapshot only](#capture-a-snapshot-only)
- [Send message for IPC via DataChannel](#send-message-for-ipc-via-datachannel)
- [Download the latest video record](#download-the-latest-video-record)
- [Set camera properties while streaming](#set-camera-properties-while-streaming)
- [Watch videos via the SFU server](#watch-videos-via-the-sfu-server)

### Notes:
- [Local IP or VPN address](#notes-on-local-ip-or-vpn-address)
- [Mosquitto](#notes-on-mosquitto)
- [Self-signed certificates](#notes-on-self-signed-certificates)

## API

[API Documentation](#api-documentation)

## Example

These examples show how to use individual features separately.

- ### Live video

  Display live streaming on the HTML `<video>` element.

  ```html
  <video id="videoElement"></video>
  <script type="module">
    import { PiCamera } from 'picamera.js';

    let videoRef = document.getElementById('videoElement');

    let conn = new PiCamera({
      deviceUid: 'your-custom-uid',
      mqttHost: 'your.mqtt.cloud',
      mqttPath: '/mqtt',
      mqttPort: '8884', // Websocket Port
      mqttUsername: 'hakunamatata',
      mqttPassword: 'Wonderful',
      stunUrls: ["stun:stun1.l.google.com:19302"],
    });
    conn.onStream = (stream) => {
      videoRef.srcObject = stream ?? null;
    };
    conn.connect();
  </script>
  ```

- ### Capture a snapshot only

  Use webrtc datachannel to get the snapshot image only.

  ```javascript
  let conn = new PiCamera({
    deviceUid: 'your-custom-uid',
    mqttHost: 'your.mqtt.cloud',
    mqttPath: '/mqtt',
    mqttPort: '8884', // Websocket Port
    mqttUsername: 'hakunamatata',
    mqttPassword: 'Wonderful',
    stunUrls: ["stun:stun1.l.google.com:19302"],
    datachannelOnly: true,
  });

  conn.onDatachannel = (id) => {
    // on connected to remote datachannel
    if (id === ChannelId.Command)
      conn.snapshot();
  }

  conn.onSnapshot = (image) => {
    // get a base64 image here, then terminate the connection.
    conn.terminate();
  }

  conn.connect();
  ```

- ### Send message for IPC via DataChannel

  Use WebRTC DataChannel to send messages to a Unix domain socket on the Raspberry Pi. This allows sending custom messages for inter-process communication (IPC).

  ```javascript
  let conn = new PiCamera({
    deviceUid: 'your-custom-uid',
    mqttHost: 'your.mqtt.cloud',
    mqttPath: '/mqtt',
    mqttPort: '8884', // Websocket Port
    mqttUsername: 'hakunamatata',
    mqttPassword: 'Wonderful',
    stunUrls: ["stun:stun1.l.google.com:19302"],
    datachannelOnly: true,
    ipcMode: 'reliable'
  });

  conn.onDatachannel = (id) => {
    // on connected to remote datachannel
    if (id === ChannelId.Reliable)
      conn.sendMessage('Hello Reliable Channel!');
  }

  conn.onMessage = (msg) => {
    // get a response msg here.
    conn.terminate();
  }

  conn.connect();
  ```

- ### Download the latest video record

  ```javascript
  let conn = new PiCamera({
    deviceUid: 'your-custom-uid',
    mqttHost: 'your.mqtt.cloud',
    mqttPath: '/mqtt',
    mqttPort: '8884', // Websocket Port
    mqttUsername: 'hakunamatata',
    mqttPassword: 'Wonderful',
    datachannelOnly: true,
    stunUrls: ["stun:stun1.l.google.com:19302"],
  });

  conn.onDatachannel = () => {
    // connected to remote datachannel and request the latest file.
    conn.getRecordingMetadata();
  }

  conn.onMetadata = (metadata) => {
    // retrieved the file's metadata and request download the target.
    conn.fetchRecordedVideo(metadata.path);
  }

  conn.onProgress = (recv, total) => {
    // show up downloading progress of the datachannel.
  }

  conn.onVideoDownloaded = (file) => {
    // the file is completely downloaded.
    const blob = new Blob([file], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video_filename.mp4';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    conn.terminate();
  }

  conn.connect();
  ```

- ### Set camera properties while streaming

  This example only set auto-focus and auto white balance. Other properties see `CameraPropertyKey`.

  ```javascript
  let videoRef = document.getElementById('videoElement');

  let conn = new PiCamera({
    deviceUid: 'your-custom-uid',
    mqttHost: 'your.mqtt.cloud',
    mqttPath: '/mqtt',
    mqttPort: '8884', // Websocket Port
    mqttUsername: 'hakunamatata',
    mqttPassword: 'Wonderful',
    stunUrls: ["stun:stun1.l.google.com:19302"],
  });
    
  conn.onStream = (stream) => {
    videoRef.srcObject = stream ?? null;
  };
  conn.connect();

  // click the button with onclick="setAwb()" when it's connected
  setAwb = () => {
    conn.setCameraProperty(CameraPropertyKey.AWB_MODE, AwbModeEnum.AwbCloudy);
  }

  // click the button with onclick="setAf()" when it's connected
  setAf = () => {
    conn.setCameraProperty(CameraPropertyKey.AF_MODE, AfModeEnum.AfModeContinuous);
  }
  ```

- ### Watch videos via the SFU server

  This example demonstrates how to watch a live stream through an SFU server.
For more details, see [Broadcasting Live Stream to 1,000+ Viewers via SFU](https://github.com/TzuHuanTai/RaspberryPi-WebRTC/wiki/Advanced-Settings#broadcasting-live-stream-to-1000-viewers-via-sfu).
  ```javascript
  let videoRef = document.getElementById('videoElement');

  let conn = new PiCamera({
    signaling: 'websocket',
    websocketUrl: 'wss://free1-api.picamera.live',
    apiKey: 'APIz3LVTsM2bmNi',
    roomId: 'the-room-name'
  });

  conn.onSfuStream = (sid, stream) => {
    videoRef.srcObject = stream;
  };

  conn.connect();
  ```

## Notes on local IP or VPN address
When running PiCamera.js over a local network or a VPN, set `stunUrls` to `null` or leave it out of the configuration altogether.

## Notes on Mosquitto
When running Mosquitto as your own MQTT server, we have experienced problems running Mosquitto with self-signed certificates with the MQTT client in PiCamera.js. Instead, run Mosquitto without SSL and then interpose nginx. For example:

```
# mosquitto.conf
listener 1883 localhost
allow_anonymous true

listener 1884
protocol websockets
allow_anonymous true
```

Then interpose nginx's between the browser and Mosquitto. (This example assumes that the project files live in `/home/pi/src/project`, for example, with `run/` and `ssl/` and `logs/` and `dist/` subdirectories). It will run the secure port on 8443 (**not standard port 443!**). Change as you see fit -- this is for documentation purposes only.

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

This example would require PiCamera.js to be initialized as

```javascript
let conn = new PiCamera({
  deviceUid: 'some-unique-uuid',      // must match pi_webrtc's --uid argument
  mqttHost: window.location.hostname, // same host and
  mqttPort: window.location.port,     // port as page itself
  mqttPath: '/mqtt',                  // to match nginx.conf configuration
});
```

## Notes on self-signed certificates

Most browsers require https for video to work. When using self-signed certificates, you first need to accept the browser's warning about the certificate. You also need to do this explicitly for the websocket host/port. In the above example, you would have to open https://your.mqtt.cloud:8884/ and accept the warning before the example works. Keep on eye on the browser's console to pick up on errors about self-signed certificates and open the `wss://` URLs it complains about as `https://` to accept the self-signed certificates.

## API Documentation

* [Options](#options)
* [Events](#events)
  * [onConnectionState](#onConnectionState)
  * [onDatachannel](#onDatachannel)
  * [onProgress](#onprogress)
  * [onStream](#onstream)
  * [onSfuStream](#onsfustream)
  * [onSnapshot](#onSnapshot)
  * [onMetadata](#onmetadata)
  * [onVideoDownloaded](#onvideodownloaded)
  * [onMessage](#onmessage)
  * [onTimeout](#onTimeout)
  * [onRoomInfo](#onroominfo)
  * [onQuility](#onquility)
  * [onSpeaking](#onspeaking)
  * [onParticipant](#onparticipant)
* [Methods](#methods)
  * [connect](#connect)
  * [terminate](#terminate)
  * [getStatus](#getStatus)
  * [getRecordingMetadata](#getrecordingmetadata)
  * [fetchRecordedVideo](#fetchrecordedvideo)
  * [setCameraProperty](#setcameraproperty)
  * [snapshot](#snapshot)
  * [sendMessage](#sendmessage)
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
| mqttProtocol    | `string`   | `wss`   | The portocol for the MQTT server.                            |
| mqttUsername    | `string`   |         | The username for the MQTT server.                            |
| mqttPassword    | `string`   |         | The password for the MQTT server.                            |
| websocketUrl    | `string`   |         | The WebSocket URL used to connect to the SFU server.         |
| apiKey          | `string`   |         | The API key used to authenticate with the SFU server.        |
| userId          | `string`   | `(random uuid)` | The user identifier displayed in the room after joining the SFU server. |
| roomId          | `string`   |         | The room ID used to join a session on the SFU server.        |
| stunUrls        | `string[]` |         | An array of STUN server URLs for WebRTC. Leave out or set to null for local network or VPN IP addresses. |
| turnUrl         | `string`   |         | The TURN server URL for WebRTC.                              |
| turnUsername    | `string`   |         | The username for the TURN server.                            |
| turnPassword    | `string`   |         | The password for the TURN server.                            |
| timeout         | `number`   | `10000` | The connection timeout in milliseconds (`ms`).               |
| datachannelOnly | `boolean`  | `false` | Specifies that the connection is only for data transfer, without media streams. |
| ipcMode         | `string`  |          | Defines the communication mode for `sendMessage()` in IPC (inter-process communication). Accepts `lossy` (UDP-like) or `reliable` (TCP-like) modes. |
| isMicOn         | `boolean`  | `true`  | Enables the local microphone stream by default if the connection is established. |
| isSpeakerOn     | `boolean`  | `true`  | Enables the remote audio stream by default if the connection is established. |
| credits         | `boolean`  | `true`  | Show watermark to run it under credits.                      |
| codec           | `string`   |         | Codecs include `H264`, `VP8`, `VP9`, and `AV1`.              |

## Events
- ### onConnectionState

  `= (state: RTCPeerConnectionState) => {}`

  Emitted when the WebRTC peer connection state changes.

- ### onDatachannel

  `= (id: ChannelId) => {}`

  Emitted when the data channel successfully opens for data communication.

- ### onProgress

  `= (received: number, total: number, type: CmdType) => {}`

  If any data transfer by datachannel, the on progress will give the received/total info.

- ### onStream

  `= (stream: MediaStream) => {}`

  Triggered when a media stream is received from either SFU or MQTT.

- ### onSfuStream

  `= (sid: string, stream: MediaStream) => {}`

  Triggered only when a media stream is received from the SFU, delivering both the participant's server-side ID (sid) and the associated MediaStream. 

- ### onSnapshot

  `= (base64: string) => {}`

  Emitted after calling the `snapshot()` method. This event emits a base64-encoded image once all image packets are received from the server.

- ### onMetadata

  `= (metadata: VideoMetadata) => {}`

  Emitted when the metadata of a recording file is retrieved.

- ### onVideoDownloaded

  `= (file: Uint8Array) => {}`

  Emitted when a video file is successfully downloaded from the server.

- ### onTimeout

  `= () => {}`

  Emitted when the P2P connection cannot be established within the allotted time. Automatically calls the `terminate()` function.

- ### onMessage

  `= (msg: string) => {}`

  Read IPC message from server.

- ### onRoomInfo

  `= (participant: RoomInfo) => {}`

  Emitted when the SFU room information changes.

- ### onQuility

  `= (quality: Quality[]) => {}`

  Emitted when the quality of SFU connections change.

- ### onSpeaking

  `= (speaking: Speaking[]) => {}`

  Emitted when an SFU participant starts or stops speaking.

- ### onParticipant

  `= (participant: Participant[]) => {}`

  Emitted when the list of participants in the SFU room changes.

## Methods

- ### connect

  `.connect()`

  Start trying to establish the WebRTC connection.

- ### terminate

  `.terminate()`

  Terminates the WebRTC connection.

- ### getStatus

  `.getStatus()` 
  
  Retrieves the current connection status.

- ### getRecordingMetadata

  `.getRecordingMetadata()`

  `.getRecordingMetadata(path: string)`

  `.getRecordingMetadata(time: Date)`

  Retrieves metadata of recording files.

  If called without arguments, returns metadata of the latest recorded file.

  If provided with a file path, returns metadata of up to 8 older recordings before the given file.

  If provided with a date, returns metadata of the closest recorded file to that time.

  - path - The path to an existing recorded file; retrieves metadata of up to 8 older recordings before it.
  - time - A specific date/time; retrieves metadata of the closest recorded file.

- ### fetchRecordedVideo

  `.fetchRecordedVideo(path: string)` 
  
  Requests a video file from the server.

  - `path` - The path to the video file.

- ### setCameraProperty

  `.setCameraProperty(key: CameraPropertyKey, value: CameraPropertyValue)` 
  
  Sets camera properties, such as 3A or so.

- ### snapshot

  `.snapshot(quality?: number)`

   Requests a snapshot image from the server.

  - `quality` - The range from `0` to `100`, determines the image quality. The default value is `30`.

- ### sendMessage

  `.(msg: string)`
  
  If `ipcMode` is set to `reliable`, the message will be retransmitted until successfully delivered. If set to `lossy`, the message may be lost, but with lower latency.

- ### toggleMic

  `.toggleMic(enabled?: boolean)`

  Toggles the **local** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.

- ### toggleSpeaker

  `.toggleSpeaker(enabled?: boolean)`

  Toggles the **remote** audio stream on or off. If an argument is provided, it will force the state to the specified value, otherwise, the current state will be toggled.

# License

This project is licensed under the [AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.html) license. Under this license, anyone is free to use, modify, and distribute the code, but any use in network services or any modifications require the source code to be made public. Commercial usage without source code disclosure is not permitted.

### Commercial License

If your use case does not permit source code disclosure or you have other licensing requirements, a commercial license is available. This option exempts you from the AGPL's source code sharing requirements and includes dedicated support. The commercial license also enables optional features, such as removing watermarks or unlocking additional functionalities.

For more information, please contact:
📧 Email: [tzu.huan.tai@gmail.com](mailto:tzu.huan.tai@gmail.com)
