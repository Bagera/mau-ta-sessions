const cameraEl = document.querySelector(".camera");
const canvasEl = document.querySelector(".canvas");
let model = null;

console.log("Loading coco-ssd model");
document.body.classList.add("loading");
cocoSsd.load().then(m => {
  model = m;
  console.log("Model loaded, starting camera");
  document.body.classList.remove("loading");
  startCamera();
});

cameraEl.addEventListener("play", () => {
  // Resize canvas to match camera frame sie
  canvasEl.width = cameraEl.videoWidth;
  canvasEl.height = cameraEl.videoHeight;

  console.log(`capturing in ${cameraEl.videoWidth}x${cameraEl.videoHeight}`);
  // Start processing!
  window.requestAnimationFrame(process);
});

// Processes the last frame from camera
function process() {
  // Draw frame to canvas
  var ctx = canvasEl.getContext("2d");
  ctx.drawImage(cameraEl, 0, 0, cameraEl.videoWidth, cameraEl.videoHeight);
  let maxDistance = 0;

  // Run through model
  model.detect(canvasEl).then(predictions => {
    //console.log('Predictions: ', predictions);

    // As a demo, draw each prediction
    let ppl = predictions.filter(prediction => {
      return prediction.class === "person";
    });
    // ppl.forEach((prediction, i) => {
    //   prediction.class += " " + i;
    //   drawPrediction(prediction, ctx);
    // });
    ppl.forEach((person, i) => {
      const head = calcHead(person);
      drawDot(head, ctx);
      if (i < ppl.length - 1) {
        for (let j = i + 1; j < ppl.length; j++) {
          let target = calcHead(ppl[j]);
          // Draw line to next person
          ctx.strokeStyle = "pink";
          ctx.beginPath();
          ctx.moveTo(head[0], head[1]);
          ctx.lineTo(target[0], target[1]);
          ctx.lineWidth = 3;
          ctx.stroke();

          // calculate distance to next person
          let dist = calcDistance(head, target);
          if (dist > maxDistance) {
            maxDistance = dist;
          }
        }
      }
    });
    ctx.fillText(maxDistance, 10, 10);
  });

  // Repeat, if not paused
  if (cameraEl.paused) {
    console.log("Paused processing");
    return;
  }
  window.requestAnimationFrame(process);
}

function calcHead(prediction) {
  const [x, y, width, height] = prediction.bbox;

  return [x + width / 2, y + height * 0.2];
}

function calcDistance(pointA, pointB) {
  const base = pointA[0] - pointB[0];
  const height = pointA[1] - pointB[1];

  return Math.sqrt(Math.pow(base, 2) + Math.pow(height, 2));
}

function drawDot(cords, ctx) {
  ctx.fillStyle = "pink";
  ctx.beginPath();
  ctx.arc(cords[0], cords[1], 5, 0, Math.PI * 2, true);
  ctx.fill();
}

/**
Prediction consists of:
 class (string)
 score (0..1)
 bbox[x1,y1,x2,y2]
*/
function drawPrediction(prediction, canvasContext) {
  // Get bounding box coordinates
  const [x, y, width, height] = prediction.bbox;

  // Draw a white and black offset rectangle around the prediction.
  // Two are used so that rectangle appears in dark or light images

  canvasContext.lineWidth = 1;
  canvasContext.fillStyle = `rgba(0, ${prediction.score * 255}, 0, 0.5)`;
  canvasContext.fillRect(x, y, width, height);
  canvasContext.strokeStyle = "white";
  canvasContext.strokeRect(x, y, width, height);

  // Create a debug string showing prediction
  let msg = prediction.class + " (" + Math.floor(prediction.score * 100) + "%)";

  // Measure how long this will be in pixels
  canvasContext.textBaseline = "top";
  let metrics = canvasContext.measureText(msg);
  let textHeight = 10;

  // Draw rectangle behind text, now we know how wide
  canvasContext.fillStyle = "rgba(0,0,0,0.5)";
  canvasContext.fillRect(
    x,
    y - textHeight - 2,
    metrics.width + 6,
    textHeight + 4
  );

  // Draw text on top of rect
  canvasContext.fillStyle = "white";
  canvasContext.fillText(msg, x + 2, y - textHeight - 1);
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
