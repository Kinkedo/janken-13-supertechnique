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

async function startCameraAndAutoDetect() {
  const video = document.getElementById("camera");

  // 利用可能なカメラデバイスを確認する
  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoDevices = devices.filter(device => device.kind === "videoinput");
  const backCamera = videoDevices.find(device => device.label.toLowerCase().includes("back"));

  // バックカメラのデバイスIDを取得
  const deviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;

  // カメラを起動
  try {
    if (!cameraStream) {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });
    }
    video.srcObject = cameraStream;

    // iOS対策：metadata待ち
    await new Promise(resolve => {
      if (video.readyState >= 2) return resolve();
      video.onloadedmetadata = () => resolve();
    });

  } catch (err) {
    console.error("カメラの起動に失敗:", err);
    alert("カメラを使えませんでした。権限やブラウザ設定を確認してください。");
    return;
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
