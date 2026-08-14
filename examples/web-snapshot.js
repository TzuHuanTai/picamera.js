import { ChannelId, PiCamera } from 'picamera.js';

const camera = new PiCamera({
  uid: 'your-custom-uid',
  mqttHost: 'your.mqtt.cloud',
  mqttPath: '/mqtt',
  mqttPort: 8884,
  mqttUsername: 'hakunamatata',
  mqttPassword: 'Wonderful',
  stunUrls: ['stun:stun1.l.google.com:19302'],
  datachannelOnly: true,
});

camera.onDatachannel = (id) => {
  if (id === ChannelId.Command) {
    camera.snapshot();
  }
};

camera.onSnapshot = (base64Image) => {
  console.log(base64Image);
  camera.terminate();
};

camera.connect();
