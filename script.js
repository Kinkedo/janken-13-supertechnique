// script.js (v2.2 修正版)
let desiredMode = "win";
let detector = null;

function selectMode(mode) {
  desiredMode = mode;
  setBadge(mode);
  showScreen("camera-screen");
  startCameraAndDetect();
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function setBadge(mode) {
  const badge = document.getElementById("mode-badge");
  if (!badge) return;
  badge.textContent = (mode === "win") ? "かつ" : (mode === "draw") ? "あいこ" : "まけ";
}

function setHint(msg) {
  const hint = document.getElementById("hint");
  if (hint) hint.textContent = msg;
}

// 画面回転の処理は維持
function applyForceLandscape() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.toggle("force-landscape", isPortrait);
}
window.addEventListener("resize", applyForceLandscape);
window.addEventListener("orientationchange", applyForceLandscape);
applyForceLandscape();

async function startCameraAndDetect() {
  const video = document.getElementById("camera");
  if (!video) return;

  setHint("カメラ起動中…");

  // ライブラリ存在チェック
  if (typeof Hands === "undefined" || typeof Camera === "undefined") {
    alert("ライブラリがまだ読み込まれていません。数秒待ってからやり直してください。");
    showScreen("mode-select");
    return;
  }

  // 以前の detector があれば止める
  if (detector) detector.stop();

  detector = createHandDetector(video, {
    onHint: (msg) => setHint(msg),
    onStableHand: (opponentHand) => {
      const my = decideMyHand(opponentHand, desiredMode);
      showResult(my);
    }
  });

  detector.start(); // ここでカメラが起動する
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
    if (op === "rock") return "paper"; // フォールバック
  }
  return "rock";
}

function showResult(myHand) {
  if (detector) detector.stop();
  const img = document.getElementById("result-image");
  img.src = `./img/${myHand}.png`; //
  showScreen("result-screen");
}

document.addEventListener("click", () => {
  const result = document.getElementById("result-screen");
  if (result && result.classList.contains("active")) backToStart();
});

function backToStart() {
  if (detector) detector.stop();
  setHint("相手の手を映して…");
  showScreen("mode-select");
}
