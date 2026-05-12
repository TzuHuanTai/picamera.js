import { PiCamera } from 'picamera.js';

const videoRef = document.getElementById('videoElement');
const camera = new PiCamera({
  signaling: 'websocket',
  websocketUrl: 'wss://free1-api.picamera.live',
  apiKey: 'APIz3LVTsM2bmNi',
  roomId: 'the-room-name',
});

camera.onSfuStream = (_sid, stream) => {
  if (videoRef instanceof HTMLVideoElement) {
    videoRef.srcObject = stream;
  }
};

camera.connect();
