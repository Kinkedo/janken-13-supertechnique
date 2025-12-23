// script.js (安定版：内カメラ/安定性優先)
let desiredMode = "win";
let cameraStream = null;
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

/* 横向き強化（v2.2用） */
function applyForceLandscape() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.remove("force-landscape");
  // 結果だけ横向きは result表示中にクラスで制御
}
window.addEventListener("resize", applyForceLandscape);
window.addEventListener("orientationchange", applyForceLandscape);
applyForceLandscape();

/* iOS対策 */
function waitVideoReady(video) {
  return new Promise(resolve => {
    if (video.readyState >= 2) return resolve();
    const t = setTimeout(() => resolve(), 2500);
    video.onloadedmetadata = () => { clearTimeout(t); resolve(); };
  });
}
async function safePlay(video) { try { await video.play(); } catch (e) {} }

async function startCameraStable(video) {
  // ★安定性優先：外カメラ指定/列挙/掴み直しをしない
  cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = cameraStream;
  await waitVideoReady(video);
  await safePlay(video);
}

async function startCameraAndDetect() {
  const video = document.getElementById("camera");
  if (!video) return;

  setHint("カメラ起動中…");

  try {
    if (!cameraStream) await startCameraStable(video);
    else { video.srcObject = cameraStream; await waitVideoReady(video); await safePlay(video); }
  } catch (err) {
    console.error(err);
    alert("カメラを起動できませんでした。権限/ブラウザ設定を確認してください。");
    document.body.classList.remove("result-only-landscape");
  showScreen("mode-select");
    return;
  }

  if (typeof Hands === "undefined" || typeof Camera === "undefined" || typeof createHandDetector !== "function") {
    alert("手認識ライブラリの読み込みに失敗しました（CDN/回線）");
    document.body.classList.remove("result-only-landscape");
  showScreen("mode-select");
    return;
  }

  detector = createHandDetector(video, {
    warmupMs: 1200,
    stableStreak: 13,
    minIntervalMs: 900,
    onHint: (msg) => setHint(msg),
    onStableHand: (opponentHand) => {
      const my = decideMyHand(opponentHand, desiredMode);
      showResult(my);
    }
  });

  detector.start();
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
  return "rock";
}

function showResult(myHand) {
  if (detector) detector.stop();
  const img = document.getElementById("result-image");
  img.src = `./img/${myHand}.png`;
  document.body.classList.add("result-only-landscape");
  showScreen("result-screen");
}

document.addEventListener("click", () => {
  const result = document.getElementById("result-screen");
  if (result && result.classList.contains("active")) backToStart();
});

function backToStart() {
  if (detector) detector.stop();
  setHint("相手の手を映して…");
  document.body.classList.remove("result-only-landscape");
  showScreen("mode-select");
}
