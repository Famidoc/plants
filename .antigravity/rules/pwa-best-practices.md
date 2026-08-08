# PWA & 響應式開發最佳實踐規則 (PWA & Responsive Best Practices)

## 1. PWA 與快取同步規則 (PWA Cache Purging Rule)
- 每次修改任何 HTML、CSS 或 JS 檔案後，**必須同時且同步更新**以下三個檔案的版本號（如 v31 ➔ v32）：
  1. `sw.js`：更新 `CACHE_NAME` 與 `ASSETS_TO_CACHE` 清單中的版本號。
  2. `js/app.js`：更新 `navigator.serviceWorker.register('./sw.js?v=N')` 的版本號。
  3. `index.html`：更新所有 `<link>` 與 `<script>` 標籤的 `?v=N` 版本號。
- 絕不能只修改 `index.html` 而遺漏 `sw.js` 或 `app.js`，否則手機 PWA 會讀取本地舊快取。

## 2. 手機版面雙重防護規則 (Mobile Layout Dual Enforcement)
- 手機/行動裝置的響應式元件（如手機燈箱下拉選單）：
  - **不要只依賴 CSS `@media (max-width: ...)`**（避免因手機視圖 DPI 縮放、PWA 視窗解析度或舊 CSS 快取而失靈）。
  - **必須實施「CSS + JS 雙重防護」**：在元件開啟/渲染事件（如 `openPlantDetailModal`）中，使用 JavaScript 現場檢測 `window.innerWidth <= 768` 或觸控能力，強制以 JS `style.setProperty('display', ..., 'important')` 控制顯示。

## 3. Git 自動推送規則 (Auto Git Push)
- 完成程式碼修改與驗證後，必須自動執行 `git add .`、寫入明確的 `git commit` 說明並 `git push` 到 GitHub 遠端倉庫。
