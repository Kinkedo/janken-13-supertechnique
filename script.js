let desiredMode = "win";
let opponent = null;
let myHand = null;
let cameraStream = null;

function selectMode(mode) {
  desiredMode = mode;
  showScreen("camera-screen");
  startCameraAndAutoDetect();
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function setAutoStatus(msg) {
  const el = document.getElementById("auto-status");
  if (el) el.textContent = msg;
}

async function startCamera() {
  const video = document.getElementById("camera");

  // すでにストリームがあれば再利用
  if (cameraStream) {
    video.srcObject = cameraStream;
    return;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === "videoinput");
    const backCamera = videoDevices.find(device => device.label.toLowerCase().includes("back"));

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: backCamera
        ? { deviceId: { exact: backCamera.deviceId } } // 外カメラを明示的に選択
        : { facingMode: "environment" }, // ラベルでBackが見つからなかった場合のフォールバック
      audio: false
    });

    video.srcObject = cameraStream;
  } catch (err) {
    console.error("カメラの起動に失敗:", err);
    alert("カメラを使えませんでした。ブラウザの設定や権限を確認してください。");
  }
}

  // 後続の処理（変更なし）
  if (typeof createHandDetector !== "function") {
    setAutoStatus("hand_detect.js 読み込み失敗（ファイル名/場所/順番）");
    return;
  }
  if (typeof Hands === "undefined" || typeof Camera === "undefined") {
    setAutoStatus("MediaPipe未ロード（CDNがブロック/読込順）");
    return;
  }

  if (!window._handDetector) {
    window._handDetector = createHandDetector(
      video,
      (stableHand) => {
        if (document.getElementById("result-screen").classList.contains("active")) return;
        detectOpponent(stableHand);
      },
      (status) => setAutoStatus(status)
    );
  }

  setAutoStatus("判定中…（手を映してね）");
  window._handDetector.start();
}
function goBack() {
  if (window._handDetector) window._handDetector.stop();
  setAutoStatus("待機中…");
  showScreen("mode-select");
}

function detectOpponent(hand) {
  opponent = hand;
  myHand = decideMyHand(hand, desiredMode);
  showResult();
}

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

function showResult() {
  if (window._handDetector) window._handDetector.stop();

  const img = document.getElementById("result-image");
  const text = document.getElementById("result-text");

  img.src = `./img/${myHand}.png`;
  text.textContent = `あなた：${handName(myHand)} ／ あいて：${handName(opponent)}`;

  showScreen("result-screen");
}

function handName(h) {
  if (h === "rock") return "グー";
  if (h === "scissors") return "チョキ";
  if (h === "paper") return "パー";
  return h;
}

function restart() {
  if (window._handDetector) window._handDetector.stop();
  setAutoStatus("待機中…");
  opponent = null;
  myHand = null;
  showScreen("mode-select");
}
