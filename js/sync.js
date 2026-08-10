/**
 * Google Drive [捻花惹草] 資料夾自動同步與 GAS API 介接模組
 */

const GAS_SYNC_URL_KEY = 'nian_hua_re_cao_gas_url';

function cleanGasUrl(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  
  // 清理 Line/iOS 貼上時帶有的隱形零寬字元 (\u200B) 與 Non-breaking space (\u00A0)
  str = str.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();

  // 安全地清理所有首尾引號與符號 (確保 100% 跨平台不報錯)
  while (str.length > 0 && (str.startsWith("'") || str.startsWith('"') || str.startsWith('「') || str.startsWith('’') || str.startsWith('“') || str.startsWith('`'))) {
    str = str.substring(1).trim();
  }
  while (str.length > 0 && (str.endsWith("'") || str.endsWith('"') || str.endsWith('」') || str.endsWith('’') || str.endsWith('”') || str.endsWith('`'))) {
    str = str.substring(0, str.length - 1).trim();
  }

  if (str && !str.startsWith('http://') && !str.startsWith('https://')) {
    str = 'https://' + str;
  }
  return str;
}

function getSavedGasUrl() {
  try {
    let raw = localStorage.getItem(GAS_SYNC_URL_KEY) || '';
    if (!raw) {
      try { raw = sessionStorage.getItem(GAS_SYNC_URL_KEY) || ''; } catch(e) {}
    }
    return cleanGasUrl(raw);
  } catch (e) {
    console.error('getSavedGasUrl LocalStorage 讀取例外:', e);
    try {
      const raw = sessionStorage.getItem(GAS_SYNC_URL_KEY) || '';
      return cleanGasUrl(raw);
    } catch(e2) {
      return '';
    }
  }
}

async function getSavedGasUrlAsync() {
  let url = getSavedGasUrl();
  if (!url && typeof getFromIndexedDB === 'function') {
    try {
      const idbUrl = await getFromIndexedDB('gas_api_url');
      if (idbUrl && typeof idbUrl === 'string') {
        url = cleanGasUrl(idbUrl);
        if (url) {
          try { localStorage.setItem(GAS_SYNC_URL_KEY, url); } catch(e) {}
          try { sessionStorage.setItem(GAS_SYNC_URL_KEY, url); } catch(e) {}
        }
      }
    } catch (e) {}
  }
  return url;
}

function saveGasUrl(url) {
  if (!url || typeof url !== 'string') return;
  const cleaned = cleanGasUrl(url);
  // ⚡ 關鍵修復：僅當網址有效長度 > 10 (有效 URL) 時才寫入，絕不因為 blur 或空輸入框誤刪已存網址！
  if (cleaned && cleaned.length > 10 && cleaned.startsWith('http')) {
    try {
      localStorage.setItem(GAS_SYNC_URL_KEY, cleaned);
    } catch (e) {
      console.error('saveGasUrl LocalStorage 寫入失敗:', e);
    }
    if (typeof saveToIndexedDB === 'function') {
      saveToIndexedDB('gas_api_url', cleaned);
    }
    try { sessionStorage.setItem(GAS_SYNC_URL_KEY, cleaned); } catch(e) {}
  }
}

function forceRemoveGasUrl() {
  try {
    localStorage.removeItem(GAS_SYNC_URL_KEY);
  } catch(e) {}
  if (typeof saveToIndexedDB === 'function') {
    saveToIndexedDB('gas_api_url', null);
  }
  try { sessionStorage.removeItem(GAS_SYNC_URL_KEY); } catch(e) {}
}

/**
 * 從使用者設定的 Google Apps Script Web App API 同步最新 Google Doc 資料
 */
async function fetchLatestDataFromGAS() {
  const url = await getSavedGasUrlAsync();
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
