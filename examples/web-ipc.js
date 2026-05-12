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
  ipcMode: 'reliable',
});

camera.onDatachannel = (id) => {
  if (id === ChannelId.Reliable) {
    camera.sendText('Hello! this is picamera.js!');
  }
};

camera.onMessage = (data) => {
  const text = new TextDecoder('utf-8').decode(data);
  console.log(text);
};

camera.connect();
