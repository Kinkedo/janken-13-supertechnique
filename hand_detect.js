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

  // --- ここが重要：結果を受け取った時の処理 ---
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

    // ここで新しい判定関数を呼び出すように修正しました
    const hand = internalEstimateHand(results.multiHandLandmarks[0]);
    
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

  // 内部判定ロジック
  function internalEstimateHand(lm) {
    const wrist = lm[0];
    const dist = (p1, p2) => Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
    
    const isExtended = (mcpIdx, tipIdx) => {
      const dTip = dist(wrist, lm[tipIdx]);
      const dMcp = dist(wrist, lm[mcpIdx]);
      return dTip > dMcp * 1.20; // 1.2倍でグー判定を安定化
    };

    const index  = isExtended(5, 8);
    const middle = isExtended(9, 12);
    const ring   = isExtended(13, 16);
    const pinky  = isExtended(17, 18, 20);

    const extCount = [index, middle, ring, pinky].filter(Boolean).length;

    // グー：指が2本以下ならグー（対面の浮き対策）
    if (extCount <= 2) {
      if (index && middle && !ring && !pinky) return "scissors"; // 綺麗なチョキは優先
      return "rock";
    }
    // チョキ
    if (index && middle && !ring && !pinky) return "scissors";
    // パー
    if (extCount >= 3) return "paper";

    return null;
  }

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
      width: 1280,
      height: 720,
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
