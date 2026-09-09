# 捻花惹草 (plants) 專案維護規則

1. **自動 Push GitHub**：每次修改代碼並通過測試後，主動執行 `git add`、提交 Commit 並 `git push origin main`。
2. **自動部署 GAS**：只要 `assets/google-script.js` 有變動，主動執行 `powershell -File gas\sync_and_deploy.ps1 -Desc "版本說明"`，將程式碼推送到 Google 雲端並更新 Web App 部署。
