<p align=center>
    <img src="doc/icon.png" width="200" alt="PiCamera.js">
</p>
<h1 align="center">
    PiCamera.js
</h1>

This package provides the JavaScript client-side implementation for [pi_webrtc](https://github.com/TzuHuanTai/RaspberryPi-WebRTC), a project designed to enable WebRTC-based real-time video and audio streaming on a Raspberry Pi.

# Demo

Try it out: https://tzuhuantai.github.io/PiCamera.js/demo/

You can find the source code here: [index.html](demo/index.html)

# Installation

```
npm install picamera.js
```

# Example

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
      stunUrls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    });
    conn.attach(videoRef);
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

  conn.onDatachannel = (dc) => {
    conn.snapshot();
  }

  conn.onSnapshot = (image) => {
    // get a base64 image here, then terminate the connection.
    conn.terminate();
  }

  conn.connect();
  ```

- ### Set camera options while streaming.

  This example only set auto-focus and auto white balance. Other options see `CameraOptionType`.

  ```javascript
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

  // click the button with onclick="setAwb()" when it's connected
  setAwb = () => {
    conn.setCameraOption(CameraOptionType.AWB_MODE, AwbModeEnum.AwbCloudy);
  }

  // click the button with onclick="setCameraOption()" when it's connected
  setAf = () => {
    conn.setCameraOption(CameraOptionType.AF_MODE, AfModeEnum.AfModeContinuous);
  }
  ```

# Notes on local IP or VPN address
When running PiCamera.js over a local network or a VPN, set `stunUrls` to `null` or leave it out of the configuration altogether.

# Notes on Mosquitto
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

# Notes on self-signed certificates

Most browsers require https for video to work. When using self-signed certificates, you first need to accept the browser's warning about the certificate. You also need to do this explicitly for the websocket host/port. In the above example, you would have to open https://your.mqtt.cloud:8884/ and accept the warning before the example works. Keep on eye on the browser's console to pick up on errors about self-signed certificates and open the `wss://` URLs it complains about as `https://` to accept the self-signed certificates.

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

| Option          | Type       | Default | Description                                                  |
| --------------- | ---------- | ------- | ------------------------------------------------------------ |
| deviceUid       | `string`   |         | The custom `--uid` provided in the running `pi_webrtc`.      |
| mqttHost        | `string`   |         | The MQTT server host.                                        |
| mqttPath        | `string`   | `/mqtt` | The MQTT server path.                                        |
| mqttPort        | `number`   | `8884`  | The WebSocket port for the MQTT server.                      |
| mqttProtocol    | `string`   | `wss`   | The portocol for the MQTT server.                            |
| mqttUsername    | `string`   |         | The username for the MQTT server.                            |
| mqttPassword    | `string`   |         | The password for the MQTT server.                            |
| stunUrls        | `string[]` |         | An array of STUN server URLs for WebRTC. Leave out or set to null for local network or VPN IP addresses. |
| turnUrl         | `string`   |         | The TURN server URL for WebRTC.                              |
| turnUsername    | `string`   |         | The username for the TURN server.                            |
| turnPassword    | `string`   |         | The password for the TURN server.                            |
| timeout         | `number`   | `10000` | The connection timeout in milliseconds (`ms`).               |
| datachannelOnly | `boolean`  | `false` | Specifies that the connection is only for data transfer, without media streams. |
| isMicOn         | `boolean`  | `true`  | Enables the local microphone stream by default if the connection is established. |
| isSpeakerOn     | `boolean`  | `true`  | Enables the remote audio stream by default if the connection is established. |
| credits         | `boolean`  | `true`  | Show watermark to run it under credits.                      |
| codec           | `string`   | `VP8`   | Codecs include `H264`, `VP8`, `VP9`, and `AV1`.              |

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

- ### setCameraOption

  `.setCameraOption(key: CameraOptionType, value: CameraOptionValue)` 
  
  Sets the camera option, such as 3A or so.

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
