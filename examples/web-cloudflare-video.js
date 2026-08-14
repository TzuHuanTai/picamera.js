import { PiCamera } from 'picamera.js';

// Pulls whatever the device is publishing into a Cloudflare Realtime SFU. The App ID and Secret
// stay on the device API, so a browser only ever needs its own viewer key.
const videoRef = document.getElementById('videoElement');
const camera = new PiCamera({
  signaling: 'cloudflare',
  apiUrl: 'https://api.picamera.live',
  apiKey: 'your-viewer-api-key',
  uid: 'your-custom-uid',
});

// A device may publish more than one track; each arrives under the name it was published with.
camera.onSfuStream = (trackName, stream) => {
  console.log(`pulled ${trackName}`);
  if (videoRef instanceof HTMLVideoElement) {
    videoRef.srcObject = stream;
  }
};

camera.onError = (err) => {
  console.error(err.message);
};

camera.connect();

// The device may start publishing more tracks later on; nothing pulls them in on its own.
// camera.refresh();
