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

  // すでにストリームがあれば再利用
  if (cameraStream) {
    video.srcObject = cameraStream;
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }, // 背面カメラ優先
      audio: false
    });
    video.srcObject = cameraStream;
  } catch (err) {
    console.error("カメラの起動に失敗:", err);
    alert("カメラを使えませんでした。ブラウザの設定や権限を確認してください。");
  }
}

// カメラ画面から戻る
function goBack() {
  showScreen("mode-select");
}

// まだ手入力（テスト）
function detectOpponent(hand) {
  opponent = hand;
  myHand = decideMyHand(hand, desiredMode);
  showResult();
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
}
