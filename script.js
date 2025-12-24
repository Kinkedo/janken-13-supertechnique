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
// --- バイナリ・エフェクト（ハッキング演出）を動かす ---
function startBinaryEffect() {
  const canvas = document.getElementById('binary-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const fontSize = 16;
  const columns = canvas.width / fontSize;
  const drops = Array(Math.floor(columns)).fill(1);

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // 緑色
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
      const text = Math.floor(Math.random() * 2); // 0か1
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }
  setInterval(draw, 33);
}

// 既存の selectMode 関数をハックして、エフェクトを開始させる
const originalSelectMode = selectMode;
selectMode = function(mode) {
  originalSelectMode(mode);
  startBinaryEffect();
};
