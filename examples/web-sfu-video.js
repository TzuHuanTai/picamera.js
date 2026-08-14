import { PiCamera } from 'picamera.js';

const videoRef = document.getElementById('videoElement');
const camera = new PiCamera({
  signaling: 'livekit',
  livekitUrl: 'wss://api.picamera.live',
  livekitKey: 'APIWnQTs4tmUZvA',
  livekitRoom: 'my-first-room',
});

camera.onSfuStream = (_sid, stream) => {
  if (videoRef instanceof HTMLVideoElement) {
    videoRef.srcObject = stream;
  }
};

camera.connect();
