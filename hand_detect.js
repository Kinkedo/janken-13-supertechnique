// hand_detect.js (v2.7 統合完了版)

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

  // メインの解析ループ
  hands.onResults((results) => {
    if (!running) return;
    const now = Date.now();

    // 手が映っていない場合
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      onHint?.("じゃ～んけ～ん！！");
      streakHand = null;
      streakCount = 0;
      return;
    }

    // ウォームアップ期間
    if (now - startTs < warmupMs) {
      onHint?.("準備中…");
      return;
    }

    // --- 判定ロジックの実行 ---
    const lm = results.multiHandLandmarks[0];
    const hand = runJankenLogic(lm);
    
    if (!hand) {
      onHint?.("もうちょいハッキリ…");
      streakHand = null;
      streakCount = 0;
      return;
    }

    // ヒントの表示（今何に見えているか）
    const handName = hand === "rock" ? "グー" : hand === "scissors" ? "チョキ" : "パー";
    onHint?.(`解析中: ${handName}`);

    // 連続一致チェック
    if (hand === streakHand) {
      streakCount += 1;
    } else {
      streakHand = hand;
      streakCount = 1;
    }

    // 確定判定
    if (streakCount >= stableStreak && (now - lastFireTs) > minIntervalMs) {
      lastFireTs = now;
      onHint?.("確定！");
      onStableHand?.(hand);
      stop(); // 確定したら止める
    }
  });

  // --- ジャンケン判定の中身 ---
  function runJankenLogic(lm) {
    const wrist = lm[0];
    const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    // 指が伸びているか（手首から指先までの距離が、手首から付け根までの1.2倍以上か）
    const isExtended = (mcpIdx, tipIdx) => {
      const dTip = dist(wrist, lm[tipIdx]);
      const dMcp = dist(wrist, lm[mcpIdx]);
      return dTip > dMcp * 1.22; // 1.22倍。ここを大きくするとグー判定がより強くなります。
    };

    const index  = isExtended(5, 8);   // 人差し指
    const middle = isExtended(9, 12);  // 中指
    const ring   = isExtended(13, 16); // 薬指
    const pinky  = isExtended(17, 20); // 小指

    const extCount = [index, middle, ring, pinky].filter(Boolean).length;

    // 【判定1】グー：伸びている指が2本以下
    // 対面だと指が少し浮くので、2本までならグーとみなして安定させる
    if (extCount <= 2) {
      // ただし、人差し指と中指だけが綺麗に立っていればチョキ
      if (index && middle && !ring && !pinky) return "scissors";
      return "rock";
    }

    // 【判定2】チョキ：人差し指と中指が立っている
    if (index && middle && !ring && !pinky) return "scissors";

    // 【判定3】パー：3本以上立っている
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
      console.error("Camera Error:", err);
      alert("カメラの開始に失敗しました。");
    });
    onHint?.("せ～のっ");
  }

  function stop() {
    running = false;
    streakHand = null;
    streakCount = 0;
    if (mpCamera) {
      mpCamera.stop();
      mpCamera = null;
    }
  }

  return { start, stop };
}
