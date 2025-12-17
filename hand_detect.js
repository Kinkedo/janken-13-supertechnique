// hand_detect.js
// MediaPipe Hands を使って rock/scissors/paper を推定する（簡易版）

function createHandDetector(videoEl, onStableHand, onStatus) {
  const history = [];
  const HISTORY_MAX = 12;
  const STABLE_MIN = 7;

  let running = false;
  let mpCamera = null;

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.6
  });

  hands.onResults((results) => {
    if (!running) return;

    const hand = estimateHand(results);
    if (!hand) {
      onStatus?.("手が見えない/不安定");
      return;
    }

    onStatus?.(`検出: ${hand}`);

    history.push(hand);
    if (history.length > HISTORY_MAX) history.shift();

    const stable = getStableHand(history, STABLE_MIN);
    if (stable) {
      onStatus?.(`確定: ${stable}`);
      onStableHand(stable);
      // 1回確定したら止める（誤連続遷移防止）
      stop();
    }
  });

  function start() {
    if (running) return;
    running = true;
    history.length = 0;

    mpCamera = new Camera(videoEl, {
      onFrame: async () => {
        if (!running) return;
        await hands.send({ image: videoEl });
      },
      width: 640,
      height: 480
    });

    mpCamera.start();
    onStatus?.("起動中…");
  }

  function stop() {
    running = false;
    history.length = 0;
    if (mpCamera) {
      mpCamera.stop();
      mpCamera = null;
    }
  }

  return { start, stop };
}

function estimateHand(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return null;
  const lm = results.multiHandLandmarks[0];

  // 指が伸びているか（超簡易）
  const isExtended = (tip, pip) => lm[tip].y < lm[pip].y;

  const index  = isExtended(8, 6);
  const middle = isExtended(12, 10);
  const ring   = isExtended(16, 14);
  const pinky  = isExtended(20, 18);

  const extendedCount = [index, middle, ring, pinky].filter(Boolean).length;

  if (extendedCount <= 1) return "rock";
  if (index && middle && !ring && !pinky) return "scissors";
  if (extendedCount >= 3) return "paper";

  return "scissors";
}

function getStableHand(history, stableMin) {
  const counts = {};
  for (const h of history) counts[h] = (counts[h] || 0) + 1;
  for (const [k, v] of Object.entries(counts)) {
    if (v >= stableMin) return k;
  }
  return null;
}
