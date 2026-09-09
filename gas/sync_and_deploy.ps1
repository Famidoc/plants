param([string]$Desc = "更新版本")
Copy-Item -Path "d:\antigravity\plants\assets\google-script.js" -Destination "d:\antigravity\plants\gas\程式碼.js" -Force
node "d:\antigravity\plants\gas\run_clasp.mjs" push
node "d:\antigravity\plants\gas\run_clasp.mjs" deploy -i AKfycbyB5jyXL5gA-8AvGLsRHUEbU-J3gAQPsrjhaiKUy5I3xZ9PivboSfcjV1m1iOHu450 -d $Desc
