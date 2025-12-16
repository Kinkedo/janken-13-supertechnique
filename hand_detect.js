// hand_detect.js
// MediaPipe Hands を使って「rock/scissors/paper」を推定する。
// 使い方：
//   const detector = await createHandDetector(videoEl, (hand)=>{ ... });
//   detector.start();
//   detector.stop();

function createHandDetector(videoEl, onStableHand) {
  // 推定結果の安定化（多数決）
  const history = [];
  const HISTORY_MAX = 15;
  const STABLE_MIN = 8; // 同じ結果がこれ以上なら確定

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
    if (!hand) return;

    history.push(hand);
    if (history.length > HISTORY_MAX) history.shift();

    const stable = getStableHand(history, STABLE_MIN);
    if (stable) {
      onStableHand(stable);
      // 1回確定したら止めたい場合はここで stop してもOK
      // stop();
    }
  });

  function start() {
    if (running) return;
    running = true;

    // MediaPipeのCameraユーティリティで video フレームを hands に流し込む
    mpCamera = new Camera(videoEl, {
      onFrame: async () => {
        if (!running) return;
        await hands.send({ image: videoEl });
      },
      width: 640,
      height: 480
    });
    mpCamera.start();
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

// results から hand を推定（rock/scissors/paper）
function estimateHand(results) {
  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return null;
  const lm = results.multiHandLandmarks[0];

  // 指が伸びているか（超ざっくり判定）
  // yが小さいほど上（画面座標）
  const isExtended = (tip, pip) => lm[tip].y < lm[pip].y;

  const index  = isExtended(8, 6);
  const middle = isExtended(12, 10);
  const ring   = isExtended(16, 14);
  const pinky  = isExtended(20, 18);

  const extendedCount = [index, middle, ring, pinky].filter(Boolean).length;

  // 親指は向きが変わりやすいのでここでは無視（簡略）
  if (extendedCount <= 1) return "rock";
  if (index && middle && !ring && !pinky) return "scissors";
  if (extendedCount >= 3) return "paper";

  // どっちつかずは null で捨てるのもありだが、ここでは近いものへ寄せる
  return (extendedCount === 2) ? "scissors" : "paper";
}

// history の中で stable な手があるか確認
function getStableHand(history, stableMin) {
  const counts = history.reduce((acc, h) => (acc[h] = (acc[h] || 0) + 1, acc), {});
  for (const [k, v] of Object.entries(counts)) {
    if (v >= stableMin) return k; // k: rock/scissors/paper
  }
  return null;
}
