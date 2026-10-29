# Smart English 免費英文學習系統（第一階段本機試用版）

IELTS、日常生活及職場英文學習 Web App。所有資料只儲存在這部電腦，不使用雲端資料庫，也沒有登入功能。

> ⚠️ 這是**本機試用版**：只適合在自己電腦（及屋企 Wi-Fi）使用，不適合多人同時使用，也不可以直接部署到沒有永久檔案儲存的雲端環境。

---

## 1. 啟動及停止

### 最簡單：雙擊啟動
| 用途 | 做法 |
|---|---|
| 只在這部電腦使用 | 雙擊 `start-app.bat`，瀏覽器會自動開啟 http://localhost:3000 |
| 讓手機／平板經屋企 Wi-Fi 使用 | 雙擊 `start-app-wifi.bat`，視窗會顯示手機要輸入的網址（例如 `http://192.168.1.23:3000`） |
| 停止系統 | 在黑色視窗按 `Ctrl + C`，或直接關閉該視窗 |

- 第一次啟動會先自動建置，大約需要一分鐘。
- 使用期間請保持黑色視窗開啟。
- Wi-Fi 模式下，Windows 防火牆可能彈出視窗，請只勾選「私人網路」。同一個 Wi-Fi 的任何人都可以開啟系統，請不要在公共 Wi-Fi 使用。

### 用指令啟動（進階）
```bash
npm run build
```
```bash
npm start
```
程式碼有更新後，必須重新執行 `npm run build`（或刪除 `.next` 資料夾後再雙擊 `start-app.bat`）。

---

## 2. 資料儲存位置及備份

所有資料都在專案內的 **`data` 資料夾**（例如 `C:\SMARTLEARNINGENG\data`），首次啟動時會自動建立：

| 檔案 | 內容 |
|---|---|
| `vocabulary.json` | 生字（兩位學習者共用） |
| `articles.json` | 文章（日後由老師筆記整理加入） |
| `reading-exercises.json` | Reading Lab 題目（日後由老師筆記整理加入） |
| `learning-resources.json` | YouTube／BBC 網址資源庫 |
| `learner-progress.json` | 每位學習者的收藏、待重溫、已掌握、錯題、答對及答錯次數 |
| `practice-records.json` | 所有練習紀錄 |
| `settings.json` | 學習者名稱、Gemini 設定 |
| `images/` | Diagram Labelling 題目用的圖片 |

**備份（重要）：** 這**不是雲端備份**。請每星期把整個 `data` 資料夾複製到 USB 或另一個位置。

**還原：** 先停止系統，用備份的 `data` 資料夾覆蓋現有的，然後重新啟動。每次儲存時，上一個版本會保留為 `.bak`（例如 `vocabulary.json.bak`），可以用作緊急還原。

`data` 資料夾不會提交到 Git，所以 Git 不是資料備份。

---

## 3. 可選功能：Gemini 查字

在文章點選生字時，查詢次序是：**文章生字表 → 你的生字庫 → Gemini → 由你自行輸入**。不設定 Gemini 也可以正常使用。

1. 到 Google AI Studio 用 Google 帳戶申請免費 API key。
2. 在專案資料夾建立 `.env.local` 檔案，內容只有一行：`GEMINI_API_KEY=你的key`
3. 重新啟動系統。

- **請不要在該 Google 專案啟用付款（Billing）**，這樣就不會產生費用；超出免費額度時，查詢只會暫時失敗。
- 免費版 Gemini 收到的內容可能被 Google 用於改進產品。可以在「設定」頁關閉「傳送文章原句」，只傳送選取的字詞。
- 如需更換模型，可以在 `.env.local` 加上 `GEMINI_MODEL=模型名稱`。

---

## 4. 功能一覽

| 功能 | 頁面 |
|---|---|
| 首頁統計、三大分類 | `/`、`/categories/ielts`、`/categories/daily`、`/categories/workplace` |
| 生字庫（新增、修改、刪除、搜尋、篩選、收藏、待重溫、已掌握、匯出 Word） | `/vocabulary` |
| 單字卡（篩選、上一個／下一個、記得／未記得、進度） | `/vocabulary/cards` |
| 7 種生字練習（英選中、中選英、填充、例句閱讀、English Definition Quiz、重溫、錯題重做） | `/practice` |
| 文章閱讀（逐句及全文播放、暫停／繼續／重播／停止、語速、點字查詢及儲存） | `/articles` |
| Reading Practice Lab（Sentence Completion、Flow-chart、Diagram Labelling、Matching、Multiple Choice） | `/reading-lab` |
| 聽寫 Dictation（逐字對比） | `/dictation` |
| 跟讀 Shadowing（錄音重聽，不評分；錄音不存檔） | `/shadowing` |
| 練習歷史（詳細答案、重新練習、重做錯題、匯出 Word） | `/history` |
| 資源庫（YouTube／BBC 網址及筆記） | `/resources` |
| 設定（學習者名稱、語音、Gemini、示範資料、備份說明） | `/settings` |

未完成功能會在介面上標示「尚未推出（第二階段）」：IELTS Listening、Writing、Speaking。

---

## 5. 開發者資訊

- 技術：Next.js 16（App Router）、TypeScript、Tailwind CSS、Zod、docx、Vitest
- 架構：`UI（src/app、src/features、src/components）→ API（src/app/api）→ Service（src/services）→ Repository（src/repositories）→ data/*.json`
- 瀏覽器不會直接讀寫檔案；所有寫入都經伺服器處理，並使用暫存檔再改名的方式，避免寫到一半損壞。
- 教材 JSON 格式：見 [docs/content-format.md](docs/content-format.md)

```bash
npm test
```
```bash
npm run lint
```
```bash
npm run typecheck
```
