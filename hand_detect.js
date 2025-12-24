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

// hand_detect.js (v2.5 グー認識強化パッチ)

/* --- 距離ベースの指伸び判定（しきい値を1.2に上げてグーを出しやすくする） --- */
function isFingerExtendedByDistance(lm, mcp, tip) {
  const wrist = lm[0];
  const dist = (p1, p2) => Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
  
  const dTip = dist(wrist, lm[tip]);
  const dMcp = dist(wrist, lm[mcp]);
  
  // 以前の1.12から1.2に引き上げ。
  // これにより、中途半端な指の浮きで「伸びている」と判定されにくくなります。
  return dTip > dMcp * 1.20; 
}

function estimateHandByDistance(lm) {
  // 4本の指の状態を取得
  const index  = isFingerExtendedByDistance(lm, 5, 8);
  const middle = isFingerExtendedByDistance(lm, 9, 12);
  const ring   = isFingerExtendedByDistance(lm, 13, 16);
  const pinky  = isFingerExtendedByDistance(lm, 17, 20);

  const extCount = [index, middle, ring, pinky].filter(Boolean).length;

  // --- ジャンケン判定ロジック ---

  // 【グー強化】指が1本、または2本までなら「グー」とみなす（遊びを持たせる）
  // 対面だと人差し指が浮きやすいため、これくらいが丁度いいです。
  if (extCount <= 2) {
    // ただし、人差し指と中指だけが綺麗に起きている場合はチョキを優先
    if (index && middle && !ring && !pinky) {
       return "scissors";
    }
    return "rock";
  }

  // 【チョキ】人差し指と中指が起きている
  if (index && middle && !ring && !pinky) {
    return "scissors";
  }

  // 【パー】3本以上起きている
  if (extCount >= 3) {
    return "paper";
  }

  return null;
}

/* --- 手の品質チェック（frontness等は既存のものを継承） --- */
// (createHandDetector内の hands.onResults で上記関数を呼び出すようにしてください)
