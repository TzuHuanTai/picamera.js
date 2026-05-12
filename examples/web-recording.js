import { ChannelId, PiCamera } from 'picamera.js';

const camera = new PiCamera({
  deviceUid: 'your-custom-uid',
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
    camera.startRecording();
    setTimeout(() => camera.stopRecording(), 10000);
  }
};

camera.onRecording = (res) => {
  console.log('isRecording:', res.isRecording);
  console.log('filepath:', res.filepath);
};

camera.connect();
