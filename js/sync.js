/**
 * Google Drive [捻花惹草] 資料夾自動同步與 GAS API 介接模組
 */

function cleanGasUrl(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  // 去除首尾的單引號、雙引號、全形引號與多餘空白
  str = str.replace(/^['"’‘“"「\s]+|['"’‘“"」\s]+$/g, '').trim();

  // 若開頭缺少 https://script.google.com/macros/s/，自動補充完美 URL
  if (str && !str.startsWith('http://') && !str.startsWith('https://')) {
    if (str.startsWith('AKfycb') || str.includes('/exec') || str.includes('macros/s/')) {
      const cleanPath = str.replace(/^macros\/s\//, '').replace(/^\/macros\/s\//, '');
      str = 'https://script.google.com/macros/s/' + cleanPath;
    } else {
      str = 'https://' + str;
    }
  }
  return str;
}

function getSavedGasUrl() {
  const raw = localStorage.getItem(GAS_SYNC_URL_KEY) || '';
  return cleanGasUrl(raw);
}

function saveGasUrl(url) {
  const cleaned = cleanGasUrl(url);
  if (cleaned) {
    localStorage.setItem(GAS_SYNC_URL_KEY, cleaned);
  }
}

/**
 * 從使用者設定的 Google Apps Script Web App API 同步最新 Google Doc 資料
 */
async function fetchLatestDataFromGAS() {
  const url = getSavedGasUrl();
  if (!url) {
    throw new Error('未設定 API 網址。請先貼入 Google Apps Script Web App 網址。');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  let responseText = '';
  try {
    const response = await fetch(url, { 
      redirect: 'follow',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    responseText = await response.text();

    // 如果回傳文字開頭是 HTML，說明 Google Apps Script 還沒完成「首次瀏覽器點擊授權」
    if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE html>')) {
      throw new Error('Google Apps Script 尚未通過初次存取授權。請在手機瀏覽器開啟該 API 網址授權！');
    }

    const result = JSON.parse(responseText);
    
    if (result.error) {
      throw new Error(`GAS 傳回錯誤：${result.error}`);
    }

    if (result && (Array.isArray(result.plants) || Array.isArray(result.deletedPlants))) {
      const plants = result.plants || [];
      const deletedPlants = result.deletedPlants || [];
      const syncMode = result.syncMode || 'FULL';
      const folderFound = result.folderFound || 'Google Drive';

      return {
        syncMode: syncMode,
        folderFound: folderFound,
        plants: plants,
        deletedPlants: deletedPlants,
        debugLog: result.debugLog || []
      };
    } else {
      throw new Error('傳回資料格式不符合預期 (缺少 plants 陣列)');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('GAS Fetch 失敗:', err);
    if (err.name === 'AbortError') {
      throw new Error('Google 雲端處理 48 筆檔案耗時較長 (超過 2 分鐘)。請點擊「⚡ 立即連線同步」重試。');
    }
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('CORS 權限阻擋：請至 Google 腳本「部署」設定中，將【誰有存取權】改為【所有人 (Anyone)】並發布新版本！');
    }
    throw err;
  }
}
