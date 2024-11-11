<p align=center>
    <img src="doc/icon.png" width="200" alt="PiCamera.js">
</p>
<h1 align="center">
    PiCamera.js
</h1>

This package provides the JavaScript client-side implementation for [pi_webrtc](https://github.com/TzuHuanTai/RaspberryPi-WebRTC), a project designed to enable WebRTC-based real-time video and audio streaming on a Raspberry Pi.

# Installation
```
npm install picamera.js
```
# Example
### Live video
Display live streaming on the HTML `<video>` element.
```javascript
import { PiCamera } from 'picamera.js';

let videoRef = document.getElementById('videoElement');

let conn = new PiCamera({
  deviceUid: 'your-custom-uid',
  mqttHost: 'your.mqtt.cloud',
  mqttPath: '/mqtt',
  mqttPort: '8884', // Websocket Port
  mqttUsername: 'hakunamatata',
  mqttPassword: 'Wonderful',
  stunUrls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
});
conn.attach(videoRef);
conn.connect();
```

### Capture a snapshot
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

conn.onDatachannel = (dc) => {
  conn.snapshot();
}

conn.onSnapshot = (image) => {
  // get a base64 image here, then terminate the connection.
  conn.terminate();
}

conn.connect();
```

# API
* [Options](#options)
* [Events](#events)
  * [onConnectionState](#onConnectionState)
  * [onDatachannel](#onDatachannel)
  * [onSnapshot](#onSnapshot)
  * [onTimeout](#onTimeout)
* [Methods](#methods)
  * [attach](#attach)
  * [connect](#connect)
  * [terminate](#terminate)
  * [getStatus](#getStatus)
  * [snapshot](#snapshot)
  * [connect](#connect)
  * [toggleMic](#toggleMic)
  * [toggleSpeaker](#toggleSpeaker)

## Options

Available flags for initialization.

| Option          | Type      | Default | Description                                                                        |
|-----------------|-----------|---------|------------------------------------------------------------------------------------|
| deviceUid       | `string`  |         | The custom `--uid` provided in the running `pi_webrtc`.                            |
| mqttHost        | `string`  |         | The MQTT server host.                                                              |
| mqttPath        | `string`  | `/mqtt` | The MQTT server path.                                                              |
| mqttPort        | `number`  | `8884`  | The WebSocket port for the MQTT server.                                            |
| mqttProtocol    | `string`  | `wss`   | The portocol for the MQTT server.                                                  |
| mqttUsername    | `string`  |         | The username for the MQTT server.                                                  |
| mqttPassword    | `string`  |         | The password for the MQTT server.                                                  |
| stunUrls        | `string[]`|         | An array of STUN server URLs for WebRTC.                                           |
| turnUrl         | `string`  |         | The TURN server URL for WebRTC.                                                    |
| turnUsername    | `string`  |         | The username for the TURN server.                                                  |
| turnPassword    | `string`  |         | The password for the TURN server.                                                  |
| timeout         | `number`  | `10000` | The connection timeout in milliseconds (`ms`).                                     |
| datachannelOnly | `boolean` | `false` | Specifies that the connection is only for data transfer, without media streams.    |
| isMicOn         | `boolean` | `true`  | Enables the local microphone stream by default if the connection is established.   |
| isSpeakerOn     | `boolean` | `true`  | Enables the remote audio stream by default if the connection is established.       |

## Events
- ### onConnectionState

  `= (state: RTCPeerConnectionState) => {}`

  Emitted when the WebRTC peer connection state changes.

- ### onDatachannel

  `= (dataChannel: RTCDataChannel) => {}`

  Emitted when the data channel successfully opens for data communication.

- ### onSnapshot

  `= (image: string) => {}`

  Triggered after calling the `snapshot()` method. Emits a base64-encoded image once all image packets are received from the server.

- ### onTimeout

  `= () => {}`

  Emitted when the P2P connection cannot be established within the allotted time. Automatically calls the `terminate()` function.

## Methods
- ### attach

  `.attach(mediaElement: HTMLVideoElement)`

  Attaches the remote media stream to the specified media element for playback.

  - `mediaElement` - The HTML `<video>` element where the remote media stream will be rendered.

- ### connect

  `.connect()`

  Start trying to establish the WebRTC connection.

- ### terminate

  `.terminate()`

  Terminates the WebRTC connection.

- ### getStatus

  `.getStatus()` 
  
  Retrieves the current connection status.

- ### snapshot

  `.snapshot(quality?: number)`

   Requests a snapshot image from the server.

  - `quality` - The range from `0` to `100`, determines the image quality. The default value is `30`.

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
