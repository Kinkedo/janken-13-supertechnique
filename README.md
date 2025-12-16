# じゃんけんハッキング（Web版）— Windows + VS Code で作る（GitHub Pages想定）

このセットは **コピペで動く** 最小構成です。

## できること（現時点）
- 起動 → 「かつ / あいこ / まけ」選択
- カメラ起動（スマホで権限許可）
- ※まだ手認識は未実装：相手の手はボタンで選んでテスト
- 勝ち/あいこ/負けに合わせて、出すべき手の画像を全画面表示

---

## フォルダ構成
```
janken-hack-web/
  index.html
  style.css
  script.js
  img/
    rock.png
    scissors.png
    paper.png
```

### 画像について
`img/` に以下の3つを用意してください（自作/拾い画像OK）
- `rock.png`（グー）
- `scissors.png`（チョキ）
- `paper.png`（パー）

---

## ローカルで動かす（会社PCでもOK）
**重要：`file://` 直開きだとカメラが動かないことがあります。**  
ローカルサーバで開くのが確実です。

### A) VS Code の拡張「Live Server」を使う（簡単）
1. VS Code の拡張機能で **Live Server** を入れる
2. このフォルダを VS Code で開く
3. `index.html` を右クリック → **Open with Live Server**
4. `http://localhost:xxxx` が開く

### B) Python が入っているなら（拡張なし）
このフォルダでターミナルを開いて：
```bash
python -m http.server 8000
```
ブラウザで `http://localhost:8000` を開く

---

## スマホで動かす
- iPhone/Android で URL を開く（GitHub Pages など **HTTPS** が理想）
- カメラ権限が出たら **許可**
- 「かつ/あいこ/まけ」→ カメラ画面 → テストボタン → 結果全画面

---

## 公開（GitHub Pages 想定・導入手順まとめ）
※アップロード方法は後でOK。要点だけ：

1. GitHub にリポジトリ作成（例：`janken-hack-web`）
2. このフォルダ内容をリポジトリのルートへ置く（`index.html` が直下）
3. GitHub で `Settings` → `Pages`
4. `Build and deployment` で
   - Source: `Deploy from a branch`
   - Branch: `main` / folder: `/ (root)`
5. 表示された URL をスマホで開く

---

## 次のステップ
次は **MediaPipe Hands（Web）で手を自動認識**して、
ボタンなしで「グー/チョキ/パー」を推定 → 自動で結果表示にします。

詳しくは `NEXT_STEPS.md` を見てください。
