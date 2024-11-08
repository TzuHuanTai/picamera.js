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
For the sake of simplicity, let's put the subscriber and the publisher in the same file:

```javascript
import { PiCamera } from 'picamera.js';

let videoElement = document.getElementById('videoElement');

let conn = new PiCamera({
  deviceId: 'your-custom-uid',
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

# License

This project is licensed under the [AGPL-3.0-only](https://www.gnu.org/licenses/agpl-3.0.html) license. Under this license, anyone is free to use, modify, and distribute the code, but any use in network services or any modifications require the source code to be made public.

### Commercial License

If your use case does not permit source code disclosure or you have other licensing requirements, a commercial license is available. This option exempts you from AGPL's source code sharing requirements and provides dedicated support. The commercial license also includes optional features, such as removing the watermark or enabling additional existing functionalities.

For more information, please contact:
📧 Email: [tzu.huan.tai@gmail.com](mailto:tzu.huan.tai@gmail.com)
