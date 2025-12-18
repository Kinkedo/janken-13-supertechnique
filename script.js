// script.js (v2.2)
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

/* 横向き強化：縦持ちでも横UIにする */
function applyForceLandscape() {
  const isPortrait = window.matchMedia("(orientation: portrait)").matches;
  document.body.classList.toggle("force-landscape", isPortrait);
}
window.addEventListener("resize", applyForceLandscape);
window.addEventListener("orientationchange", applyForceLandscape);
applyForceLandscape();

/* 外カメラ優先 */
async function startCameraPreferBack(video) {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false
    });
    video.srcObject = cameraStream;
    await waitVideoReady(video);
    return;
  } catch (e) {}

  cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = cameraStream;
  await waitVideoReady(video);

  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter(d => d.kind === "videoinput");

  const back = cams.find(d => /back|rear|environment/i.test(d.label)) || cams[cams.length - 1];
  if (!back) return;

  stopTracks(cameraStream);
  cameraStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: back.deviceId } },
    audio: false
  });
  video.srcObject = cameraStream;
  await waitVideoReady(video);
}

function stopTracks(stream) {
  if (!stream) return;
  for (const t of stream.getTracks()) t.stop();
}

function waitVideoReady(video) {
  return new Promise(resolve => {
    if (video.readyState >= 2) return resolve();
    video.onloadedmetadata = () => resolve();
  });
}

async function startCameraAndDetect() {
  const video = document.getElementById("camera");
  if (!video) return;

  setHint("カメラ起動中…");

  try {
    if (!cameraStream) await startCameraPreferBack(video);
    else { video.srcObject = cameraStream; await waitVideoReady(video); }
  } catch (err) {
    console.error(err);
    alert("カメラを起動できませんでした。権限/ブラウザ設定を確認してください。");
    showScreen("mode-select");
    return;
  }

  if (typeof Hands === "undefined" || typeof Camera === "undefined" || typeof createHandDetector !== "function") {
    alert("手認識ライブラリの読み込みに失敗しました（CDN/回線）");
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

  showScreen("result-screen");
}

/* 結果画面：タップで最初に戻る */
document.addEventListener("click", () => {
  const result = document.getElementById("result-screen");
  if (result && result.classList.contains("active")) backToStart();
});

function backToStart() {
  if (detector) detector.stop();
  setHint("相手の手を映して…");
  showScreen("mode-select");
}
