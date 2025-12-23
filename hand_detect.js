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

// hand_detect.js の estimateHandV2 関数を差し替え

function estimateHandV2(results) {
  const lm = results.multiHandLandmarks[0];
  if (!lm) return null;

  // 指が伸びているか判定する補助関数
  // 付け根(base)から中間関節(mid)までの距離より、
  // 付け根(base)から指先(tip)までの距離が長ければ「伸びている」と判定
  const isExtended = (baseIdx, midIdx, tipIdx) => {
    const getDist = (p1, p2) => {
      return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    };
    const distBaseToMid = getDist(lm[baseIdx], lm[midIdx]);
    const distBaseToTip = getDist(lm[baseIdx], lm[tipIdx]);
    // 指先が中間関節より外側にあれば伸びている（1.2倍などのマージンを置くとより正確）
    return distBaseToTip > distBaseToMid * 1.1;
  };

  // 各指の判定 (0:手首, 5,9,13,17:各指の付け根)
  const index  = isExtended(5, 6, 8);   // 人差し指
  const middle = isExtended(9, 10, 12); // 中指
  const ring   = isExtended(13, 14, 16);// 薬指
  const pinky  = isExtended(17, 18, 20);// 小指

  // 親指だけは特殊（横に開いているかどうかで判定することが多い）
  // 簡易的に他の指と同様の距離判定にするか、今回は無視してもジャンケンは成立します
  const thumb = isExtended(2, 3, 4);

  // ジャンケンの形を判定
  // チョキ：人差し指と中指だけが伸びている
  if (index && middle && !ring && !pinky) {
    return "scissors";
  }
  // パー：4本以上伸びている（親指は不安定なので除外気味に判定）
  if (index && middle && ring && pinky) {
    return "paper";
  }
  // グー：どの指も伸びていない
  if (!index && !middle && !ring && !pinky) {
    return "rock";
  }

  return null;
}
