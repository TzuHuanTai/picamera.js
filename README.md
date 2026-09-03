<p align=center>
    <img src="docs/icon.png" width="200" alt="JavaScript client SDK for pi-webrtc">
</p>
<h1 align="center">
    JavaScript client SDK for pi-webrtc
</h1>

<p align="center">
    <a href="https://www.npmjs.com/package/@mazupo/client"><img src="https://img.shields.io/npm/dt/@mazupo/client?color=yellow" alt="npm downloads"></a>
    <img src="https://img.shields.io/github/v/tag/mazupo/client-sdk-js?filter=v*&label=release&color=blue" alt="Release">
</p>

Web and React Native client for [pi-webrtc](https://github.com/mazupo/pi-webrtc), with TypeScript typings and support for low-latency WebRTC streaming, P2P, SFU, DataChannel control, snapshots, gamepad input, and file transfer.

- Live demo: [mazupo.github.io/client-sdk-js/demo](https://mazupo.github.io/client-sdk-js/demo/)
- Demo source: [demo/index.html](demo/index.html)

## Quick Start

### For Web

```bash
npm install @mazupo/client
```

```html
<video id="videoElement" autoplay playsinline controls></video>
<script type="module">
  import { PiCamera } from '@mazupo/client';

  const videoRef = document.getElementById('videoElement');
  const camera = new PiCamera({
    uid: 'your-custom-uid',
    mqttHost: 'your.mqtt.cloud',
    mqttPath: '/mqtt',
    mqttPort: 8884,
    mqttUsername: 'hakunamatata',
    mqttPassword: 'Wonderful',
    stunUrls: ['stun:stun1.l.google.com:19302'],
  });

  camera.onStream = (stream) => {
    videoRef.srcObject = stream ?? null;
  };

  camera.connect();
</script>
```

`uid` has to match the `--uid` the device was started with, and the MQTT settings are the broker
both sides talk to.

### For React Native

Install and configure [react-native-webrtc](https://github.com/react-native-webrtc/react-native-webrtc), then install `@mazupo/client`:

```bash
npm install react-native-webrtc @mazupo/client
```

`registerGlobals()` has to run once at app startup, before any `PiCamera` is created:

```tsx
import React, { useEffect, useState } from 'react';
import { RTCView, registerGlobals } from 'react-native-webrtc';
import { PiCamera, RNMediaStream } from '@mazupo/client';

registerGlobals();

export default function App() {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    const camera = new PiCamera({
      uid: 'your-custom-uid',
      mqttHost: 'your.mqtt.cloud',
      mqttPath: '/mqtt',
      mqttPort: 8884,
      mqttUsername: 'hakunamatata',
      mqttPassword: 'Wonderful',
      stunUrls: ['stun:stun1.l.google.com:19302'],
    });

    camera.onStream = (stream) => {
      setStreamUrl((stream as RNMediaStream).toURL());
    };

    camera.connect();

    return () => {
      camera.terminate();
    };
  }, []);

  if (!streamUrl) {
    return null;
  }

  return <RTCView streamURL={streamUrl} style={{ flex: 1 }} />;
}
```

## Contents

- [Migrating from 2.x](MIGRATION.md) — renamed exports, the new wire protocol, and what it means for your device
- [API Documentation](docs/API.md) — options, events, methods

## Examples

- [Live video in a browser](docs/EXAMPLES.md#live-video-in-a-browser) — the full HTML page behind the Quick Start above.
- [Live video in React Native](docs/EXAMPLES.md#live-video-in-react-native) — `RTCView` with `registerGlobals()`.
- [Take a snapshot](docs/EXAMPLES.md#take-a-snapshot) — a still image over the command DataChannel, no video stream.
- [Send and receive IPC messages](docs/EXAMPLES.md#send-and-receive-ipc-messages) — talk to a process on the device.
- [Drive a device with a gamepad](docs/EXAMPLES.md#drive-a-device-with-a-gamepad) — read a controller and send each reading to the device.
- [Gamepad in React](docs/EXAMPLES.md#gamepad-in-react) — `useGamepad` and the `<GamepadView>` overlay.
- [Download a recorded video](docs/EXAMPLES.md#download-a-recorded-video) — list recordings and pull one down.
- [Adjust camera controls](docs/EXAMPLES.md#adjust-camera-controls) — brightness, contrast, and the rest of `CameraControlId`.
- [Start and stop recording](docs/EXAMPLES.md#start-and-stop-recording) — drive the device's on-demand recorder.
- [Play through the LiveKit SFU](docs/EXAMPLES.md#play-through-the-livekit-sfu) — many viewers, one uplink.
- [Pull from the Cloudflare Realtime SFU](docs/EXAMPLES.md#pull-from-the-cloudflare-realtime-sfu) — same, with nothing to host.

# License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full terms,
and [NOTICE](NOTICE) for the third-party components the published bundles include.
