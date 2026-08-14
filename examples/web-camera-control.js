import { CameraControlId, PiCamera } from 'picamera.js';

const camera = new PiCamera({
  uid: 'your-custom-uid',
  mqttHost: 'your.mqtt.cloud',
  mqttPath: '/mqtt',
  mqttPort: 8884,
  mqttUsername: 'hakunamatata',
  mqttPassword: 'Wonderful',
  stunUrls: ['stun:stun1.l.google.com:19302'],
});

camera.onConnectionState = (state) => {
  if (state === 'connected') {
    camera.setCameraControl(CameraControlId.BRIGHTNESS, 0.1);
    camera.setCameraControl(CameraControlId.CONTRAST, 1.2);
  }
};

camera.connect();
