export function addWatermarkToStream(
  stream: MediaStream,
  watermarkText: string
): MediaStream {

  if (!('MediaStreamTrackProcessor' in window) || !('MediaStreamTrackGenerator' in window)) {
    console.warn('Browser does not fully support necessary APIs for watermarking.');
    return stream;
  }
  const videoTrack = stream.getVideoTracks()[0];

  // @ts-ignore
  const trackProcessor = new MediaStreamTrackProcessor({ track: videoTrack });
  // @ts-ignore
  const trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });

  const transformer = new TransformStream({
    async transform(videoFrame, controller) {
      const canvas = new OffscreenCanvas(videoFrame.displayWidth, videoFrame.displayHeight);
      const ctx = canvas.getContext("2d");

      if (!ctx) return;
      ctx.drawImage(videoFrame, 0, 0, canvas.width, canvas.height);

      const fontSize = Math.max(20, canvas.width * 0.05);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(watermarkText, canvas.width - 10, canvas.height - 10);

      const newFrame = new VideoFrame(canvas, { timestamp: videoFrame.timestamp });
      videoFrame.close();
      controller.enqueue(newFrame);
    }
  });

  trackProcessor.readable.pipeThrough(transformer).pipeTo(trackGenerator.writable);

  const processedStream = new MediaStream();
  processedStream.addTrack(trackGenerator);

  stream.getAudioTracks().forEach(audioTrack => {
    processedStream.addTrack(audioTrack);
  });

  return processedStream;
}

export function addWatermarkToImage(
  base64Image: string,
  watermarkText: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Image;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(20, canvas.width * 0.05);
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';

      const padding = 10;
      ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);

      resolve(canvas.toDataURL());
    };

    img.onerror = () => reject(new Error("Failed to load shapshot."));
  });
}