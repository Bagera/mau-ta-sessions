// @ts-nocheck
const cameraEl = document.querySelector(".camera");
const canvasEl = document.querySelector(".canvas");
const offscreenCanvasEl = document.querySelector(".offscreenCanvas");
const delayBtn = document.querySelector(".delay");
const offscreenCtx = offscreenCanvasEl.getContext("2d");
const ctx = canvasEl.getContext("2d");

document.body.classList.add("loading");

let frameBuffer = [];
let delay = false;
startCamera();

delayBtn.onclick = evt => {
  evt.preventDefault();
  delay = !delay;
};

cameraEl.addEventListener("play", () => {
  document.body.classList.remove("loading");

  // Set the offscreen canvas to be same size as video feed
  offscreenCanvasEl.width = cameraEl.videoWidth;
  offscreenCanvasEl.height = cameraEl.videoHeight;

  // Set the drawing canvas to be same size too
  canvasEl.width = cameraEl.videoWidth;
  canvasEl.height = cameraEl.videoHeight;

  // Call 'renderFrame' now that the stream has started
  window.requestAnimationFrame(renderFrame);
});

// Demonstrates a mediated rendering of video frames
function renderFrame() {
  let oldFrame;

  // 1. Capture to offscreen buffer
  offscreenCtx.drawImage(cameraEl, 0, 0);

  // 2. Read the pixel data from this buffer
  let frame = offscreenCtx.getImageData(
    0,
    0,
    offscreenCanvasEl.width,
    offscreenCanvasEl.height
  );

  const totalPixels = frame.data.length / 4; // Get total number of pixels by dividing by 4 (since each pixel uses 4 values)
  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex++) {
    // Save each color channel of the pixel
    const r = frame.data[pixelIndex * 4 + 0];
    const g = frame.data[pixelIndex * 4 + 1];
    const b = frame.data[pixelIndex * 4 + 2];

    // Calculate the "blueishness" of the pixel
    const blueishness = b - (r + g) / 2;

    if (blueishness < 40) {
      // If it's not blue we make the pixel transparent
      frame.data[pixelIndex * 4 + 3] = 0;
    } else {
      // If it's blue enough we set it to pink
      frame.data[pixelIndex * 4 + 0] = 255;
      frame.data[pixelIndex * 4 + 2] = 128;
    }
  }

  // Add the frame to our buffer array to be able to delay the rendering
  frameBuffer.push(frame);
  if (frameBuffer.length > 30) {
    // Remove the oldest frames and save it for later
    oldFrame = frameBuffer.shift();
  }

  // Draw the camera picture to the screen
  ctx.drawImage(cameraEl, 0, 0);

  if (delay && oldFrame) {
    // Write our old modified frame back to the buffer and
    // draw buffer to the visible canvas
    offscreenCtx.putImageData(oldFrame, 0, 0);
    ctx.drawImage(offscreenCanvasEl, 0, 0);
  } else if (!delay) {
    // Write our modified frame back to the buffer and
    // draw buffer to the visible canvas
    offscreenCtx.putImageData(frame, 0, 0);
    ctx.drawImage(offscreenCanvasEl, 0, 0);
  }

  // Repeat!
  window.requestAnimationFrame(renderFrame);
}

// ------------------------

// Reports outcome of trying to get the camera ready
function cameraReady(err) {
  if (err) {
    console.log("Camera not ready: " + err);
    return;
  }
  console.log("Camera ready");
}

// Tries to get the camera ready, and begins streaming video to the cameraEl element.
function startCamera() {
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;
  if (!navigator.getUserMedia) {
    cameraReady("getUserMedia not supported");
    return;
  }
  navigator.getUserMedia(
    { video: true },
    stream => {
      try {
        cameraEl.srcObject = stream;
      } catch (error) {
        cameraEl.srcObject = window.URL.createObjectURL(stream);
      }
      cameraReady();
    },
    error => {
      cameraReady(error);
    }
  );
}
