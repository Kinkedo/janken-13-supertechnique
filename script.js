let desiredMode = "win"; // win / draw / lose
let opponent = null;
let myHand = null;
let cameraStream = null;

// モード選択 → カメラ画面へ
function selectMode(mode) {
  desiredMode = mode;
  showScreen("camera-screen");
  startCamera();
}

// 画面切り替え
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// カメラ起動
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

// カメラ画面から戻る
function goBack() {
  showScreen("mode-select");
  if (window._handDetector) window._handDetector.stop();
}



// じゃんけんロジック
function decideMyHand(op, mode) {
  if (mode === "win") {
    if (op === "rock") return "paper";
    if (op === "scissors") return "rock";
    if (op === "paper") return "scissors";
  }
  if (mode === "draw") return op;
  if (mode === "lose") {
    if (op === "rock") return "scissors";
    if (op === "scissors") return "paper";
    if (op === "paper") return "rock";
  }
}

// 結果表示
function showResult() {
  const img = document.getElementById("result-image");
  const text = document.getElementById("result-text");

  img.src = `./img/${myHand}.png`;
  text.textContent = `あなた：${handName(myHand)}　／　あいて：${handName(opponent)}`;

  showScreen("result-screen");
}

function handName(h) {
  if (h === "rock") return "グー";
  if (h === "scissors") return "チョキ";
  if (h === "paper") return "パー";
}

// 最初からやり直し
function restart() {
  opponent = null;
  myHand = null;
  showScreen("mode-select");
  if (window._handDetector) window._handDetector.stop();
}
