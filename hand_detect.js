// hand_detect.js (v2.2)

function createHandDetector(videoEl, opts) {
  const {
    onStableHand,
    onHint,
    warmupMs = 1100,
    stableStreak = 12,
    minIntervalMs = 900,
  } = opts || {};

  let running = false;
  let mpCamera = null;

  let streakHand = null;
  let streakCount = 0;

  let startTs = 0;
  let lastFireTs = 0;

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults((results) => {
    if (!running) return;

    const now = Date.now();

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      onHint?.("じゃ～んけ～ん…");
      streakHand = null;
      streakCount = 0;
      return;
    }

    if (now - startTs < warmupMs) {
      onHint?.("じゃ～んけ～ん");
      streakHand = null;
      streakCount = 0;
      return;
    }

    const hand = estimateHandV2(results);
    if (!hand) {
      onHint?.("もうちょい手を大きく…");
      streakHand = null;
      streakCount = 0;
      return;
    }

    onHint?.("解析中…");

    if (hand === streakHand) streakCount += 1;
    else { streakHand = hand; streakCount = 1; }

    if (streakCount >= stableStreak && (now - lastFireTs) > minIntervalMs) {
      lastFireTs = now;
      onHint?.("確定！");
      onStableHand?.(hand);
      stop();
    }
  });

  // hand_detect.js (修正箇所：start関数内)

  function start() {
    if (running) return;
    running = true;

    streakHand = null;
    streakCount = 0;
    startTs = Date.now();
    lastFireTs = 0;

    mpCamera = new Camera(videoEl, {
      onFrame: async () => {
        if (!running) return;
        await hands.send({ image: videoEl });
      },
      width: 1280, // 解像度を少し上げる
      height: 720,
      // 'environment' で外カメラをリクエスト（なければ内側が動く）
      facingMode: "environment" 
    });

    mpCamera.start().catch(err => {
      console.error("Camera Start Error:", err);
      alert("カメラの開始に失敗しました。");
    });
    
    onHint?.("解析開始…");
  }

  function stop() {
    running = false;
    streakHand = null;
    streakCount = 0;
    if (mpCamera) { mpCamera.stop(); mpCamera = null; }
  }

  return { start, stop };
}

function estimateHandV2(results) {
  const lm = results.multiHandLandmarks[0];
  const handedness = (results.multiHandedness && results.multiHandedness[0] && results.multiHandedness[0].label) || "Right";

  const isExtended = (tip, pip) => lm[tip].y < lm[pip].y;

  const index  = isExtended(8, 6);
  const middle = isExtended(12, 10);
  const ring   = isExtended(16, 14);
  const pinky  = isExtended(20, 18);

  const thumbTip = lm[4], thumbIp = lm[3];
  const thumb = (handedness === "Right") ? (thumbTip.x > thumbIp.x) : (thumbTip.x < thumbIp.x);

  const count = [thumb, index, middle, ring, pinky].filter(Boolean).length;

  if (count <= 1) return "rock";
  if (index && middle && !ring && !pinky) return "scissors";
  if (count >= 4) return "paper";

  return null;
}
