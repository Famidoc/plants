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

const GAS_LAST_SYNC_TIME_KEY = 'nian_hua_re_cao_last_synced_time';

function getLastSyncedTime() {
  try {
    return localStorage.getItem(GAS_LAST_SYNC_TIME_KEY) || '';
  } catch (e) {
    return '';
  }
}

function saveLastSyncedTime(timeStr) {
  if (!timeStr) return;
  try {
    localStorage.setItem(GAS_LAST_SYNC_TIME_KEY, timeStr);
  } catch (e) {
    console.error('儲存同步時間失敗:', e);
  }
}

function clearLastSyncedTime() {
  try {
    localStorage.removeItem(GAS_LAST_SYNC_TIME_KEY);
  } catch (e) {}
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

  // 取得本機的最後同步時間與植物總筆數
  const lastSynced = getLastSyncedTime();
  let plantCount = -1;
  if (typeof getStoredPlants === 'function') {
    try {
      const currentPlants = getStoredPlants() || [];
      plantCount = currentPlants.length;
    } catch (e) {}
  }

  // 組裝 URL 參數，並加上隨機數以避免瀏覽器/PWA 快取 GET 請求
  let requestUrl = url;
  try {
    const parsedUrl = new URL(url);
    if (lastSynced) {
      parsedUrl.searchParams.set('last_synced', lastSynced);
    }
    if (plantCount !== -1) {
      parsedUrl.searchParams.set('plant_count', plantCount.toString());
    }
    parsedUrl.searchParams.set('t', Date.now().toString());
    requestUrl = parsedUrl.toString();
  } catch (urlErr) {
    // 備用簡單拼接方式
    const separator = url.indexOf('?') === -1 ? '?' : '&';
    requestUrl = url + separator + 't=' + Date.now();
    if (lastSynced) requestUrl += '&last_synced=' + encodeURIComponent(lastSynced);
    if (plantCount !== -1) requestUrl += '&plant_count=' + plantCount;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 分鐘超時 (300秒)

  let responseText = '';
  try {
    console.log('[GAS Fetch] 開始請求:', requestUrl.substring(0, 80) + '...');
    const response = await fetch(requestUrl, { 
      method: 'GET',
      redirect: 'follow',
      mode: 'cors',
      signal: controller.signal 
    });
    clearTimeout(timeoutId);
    console.log('[GAS Fetch] 收到回應, status:', response.status, 'type:', response.type);
    responseText = await response.text();

    // 如果回傳文字開頭是 HTML，說明 Google Apps Script 還沒完成「首次瀏覽器點擊授權」
    if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE html>')) {
      throw new Error('Google Apps Script 尚未通過初次存取授權。請在手機瀏覽器直接開啟該 API 網址，完成 Google 授權後再回來同步。');
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

      // 儲存本次成功同步的時間戳記
      saveLastSyncedTime(result.updatedAt || new Date().toISOString());

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
    console.error('[GAS Fetch] 失敗:', err.name, err.message);
    if (err.name === 'AbortError') {
      throw new Error('Google 雲端處理 48 筆檔案耗時較長 (超過 5 分鐘)。請確認網路連線後，點擊「⚡ 立即連線同步」重試。');
    }
    if (err.name === 'TypeError') {
      // 顯示真實錯誤訊息幫助診斷，不再一律歸咎 CORS
      throw new Error(`連線失敗 (${err.message})。可能原因：\n① 手機網路不穩或中斷\n② GAS 部署的「誰有存取權」需設為「所有人 (Anyone)」\n③ 請嘗試在手機瀏覽器直接開啟 API 網址確認可存取`);
    }
    throw err;
  }
}
