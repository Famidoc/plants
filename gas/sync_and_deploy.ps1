param([string]$Desc = "更新版本")
node -e "const fs = require('fs'); fs.copyFileSync('d:/antigravity/plants/assets/google-script.js', 'd:/antigravity/plants/gas/' + '\u7a0b\u5f0f\u78bc.js'); console.log('Successfully copied to gas/\u7a0b\u5f0f\u78bc.js');"
node "d:\antigravity\plants\gas\run_clasp.mjs" push
node "d:\antigravity\plants\gas\run_clasp.mjs" deploy -i AKfycbyB5jyXL5gA-8AvGLsRHUEbU-J3gAQPsrjhaiKUy5I3xZ9PivboSfcjV1m1iOHu450 -d $Desc
