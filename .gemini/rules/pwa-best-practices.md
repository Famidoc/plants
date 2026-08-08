# PWA & 響應式開發最佳實踐規則 (PWA & Responsive Best Practices)

## 1. PWA 與快取同步規則 (PWA Cache Purging Rule)
- 每次修改任何 HTML、CSS 或 JS 檔案後，必須同時且同步更新 `sw.js` (CACHE_NAME)、`js/app.js` (ServiceWorker 註冊網址) 與 `index.html` 的 `?v=N` 版本號。

## 2. 手機版面雙重防護規則 (Mobile Layout Dual Enforcement)
- 行動裝置響應式 UI 切換，必須同時實施「CSS `@media (max-width: 768px)` + JS 現場動態檢測與 `style.setProperty` 強制控制」，確保 100% 不受手機快取或視圖縮放影響。

## 3. Git 自動推送規則 (Auto Git Push)
- 完成程式碼修改與驗證後，必須自動執行 `git add .`、寫入 commit 訊息並 `git push` 到 GitHub 遠端。
