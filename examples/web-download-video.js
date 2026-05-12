import { PiCamera } from 'picamera.js';

const camera = new PiCamera({
  deviceUid: 'your-custom-uid',
  mqttHost: 'your.mqtt.cloud',
  mqttPath: '/mqtt',
  mqttPort: 8884,
  mqttUsername: 'hakunamatata',
  mqttPassword: 'Wonderful',
  datachannelOnly: true,
  stunUrls: ['stun:stun1.l.google.com:19302'],
});

camera.onDatachannel = () => {
  camera.fetchVideoList();
};

camera.onVideoListLoaded = (res) => {
  camera.downloadVideoFile(res.files[0].filepath);
};

camera.onProgress = (received, total, type) => {
  console.log('progress', { received, total, type });
};

camera.onVideoDownloaded = (file) => {
  const blob = new Blob([file], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'video_filename.mp4';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  camera.terminate();
};

camera.connect();
