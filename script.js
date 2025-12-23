let desiredMode = "win";
let detector = null;

function selectMode(mode) {
  desiredMode = mode;
  showScreen("camera-screen");
  // 画面遷移を最優先し、少し遅らせてカメラを起動（衝突回避）
  setTimeout(startCameraAndDetect, 300);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if(target) target.classList.add('active');
}

async function startCameraAndDetect() {
  const video = document.getElementById("camera");
  const hint = document.getElementById("hint");

  // ライブラリ確認
  if (typeof Hands === "undefined" || typeof Camera === "undefined") {
    alert("ライブラリを読み込み中です。もう一度ボタンを押してください。");
    goBack();
    return;
  }

  if (detector) detector.stop();

  detector = createHandDetector(video, {
    onHint: (msg) => { if(hint) hint.textContent = msg; },
    onStableHand: (opponentHand) => {
      const my = decideMyHand(opponentHand, desiredMode);
      showResult(my);
    }
  });

  try {
    detector.start();
  } catch (err) {
    console.error(err);
    alert("カメラが使えません。ブラウザの設定を確認してください。");
    goBack();
  }
}

function decideMyHand(op, mode) {
  if (mode === "win") {
    if (op === "rock") return "paper";
    if (op === "scissors") return "rock";
    return "scissors";
  }
  if (mode === "draw") return op;
  if (mode === "lose") {
    if (op === "rock") return "scissors";
    if (op === "scissors") return "paper";
    return "rock";
  }
  return "rock";
}

// --- showResult 関数を書き換え ---
function showResult(myHand) {
  if (detector) detector.stop();
  
  const img = document.getElementById("result-image");
  img.src = `./img/${myHand}.png`;

  // 結果表示時だけ回転用クラスを付与
  document.body.classList.add("result-only-landscape");
  showScreen("result-screen");
}

// --- goBack 関数（または戻る処理）を書き換え ---
function goBack() {
  if (detector) detector.stop();
  
  // モード選択に戻るときに回転用クラスを除去
  document.body.classList.remove("result-only-landscape");
  showScreen("mode-select");
}

// 結果画面タップで戻る
document.addEventListener("click", () => {
  if (document.getElementById("result-screen").classList.contains("active")) {
    goBack();
  }
});
