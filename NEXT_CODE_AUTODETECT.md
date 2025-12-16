# 次のコード（自動認識版 / MediaPipe Hands）

このMDは「成功した場合の次のコード」です。自宅でコピペして進めてください。

---

## 1) `index.html` の変更点（CDNスクリプトを追加）

`</body>` の直前で **`script.js` より前** に、以下を追加します。

```html
<!-- MediaPipe Hands (CDN) -->
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>

<!-- 自動手認識ロジック -->
<script src="hand_detect.js"></script>
```

最終的に `script` の並びはこんなイメージ：

```html
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js"></script>
<script src="hand_detect.js"></script>
<script src="script.js"></script>
```

---

## 2) `hand_detect.js`（新規作成）

同じフォルダに `hand_detect.js` を新規で作り、以下をコピペ。

```javascript
// hand_detect.js
// MediaPipe Hands を使って「rock/scissors/paper」を推定する。
// 使い方：
//   const detector = await createHandDetector(videoEl, (hand)=>{ ... });
//   detector.start();
//   detector.stop();

function createHandDetector(videoEl, onStableHand) {
  // 推定結果の安定化（多数決）
  const history = [];
  const HISTORY_MAX = 10;
  const STABLE_MIN = 6; // 同じ結果がこれ以上なら確定

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
```

---

## 3) `script.js` の変更（自動認識を起動）

あなたが今持っている `script.js` に「自動認識」を追加します。  
以下の `startCamera()` を、この版に置き換えてください（他はそのままでOK）。

```javascript
async function startCamera() {
  const video = document.getElementById("camera");

  if (cameraStream) {
    video.srcObject = cameraStream;
  } else {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      video.srcObject = cameraStream;
    } catch (err) {
      console.error("カメラの起動に失敗:", err);
      alert("カメラを使えませんでした。ブラウザの設定や権限を確認してください。");
      return;
    }
  }

  // ---- ここから自動認識 ----
  // hand_detect.js の createHandDetector を使う
  // すでに detector が動いている場合は再利用する
  if (!window._handDetector) {
    window._handDetector = createHandDetector(video, (stableHand) => {
      // 既に結果画面なら無視（多重遷移防止）
      const resultScreen = document.getElementById("result-screen");
      if (resultScreen.classList.contains("active")) return;

      // stableHand: "rock"|"scissors"|"paper"
      detectOpponent(stableHand);
    });
  }

  window._handDetector.start();
}
```

### 戻る・やり直し時に止める（おすすめ）
`goBack()` と `restart()` に以下を追加すると、無駄な推論が止まって軽くなります。

```javascript
if (window._handDetector) window._handDetector.stop();
```

---

## 4) 動作確認
- HTTPS で開く（GitHub Pages はOK）
- カメラ許可
- 手を映す
- 数秒で安定判定したら勝手に結果画面に遷移します

---

## うまくいかない時の調整
- `HISTORY_MAX` を 15 に増やす
- `STABLE_MIN` を 8 に上げる（安定重視）/ 4 に下げる（速度重視）
- `minDetectionConfidence` を 0.5〜0.7 で調整
