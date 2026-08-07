/**
 * Google Drive [捻花惹草] 資料夾自動同步與 GAS API 介接模組
 */

const GAS_SYNC_URL_KEY = 'nian_hua_re_cao_gas_url';

function getSavedGasUrl() {
  return localStorage.getItem(GAS_SYNC_URL_KEY) || '';
}

function saveGasUrl(url) {
  localStorage.setItem(GAS_SYNC_URL_KEY, url.trim());
}

/**
 * 從使用者設定的 Google Apps Script Web App API 同步最新 Google Doc 資料
 */
async function fetchLatestDataFromGAS() {
  const url = getSavedGasUrl();
  if (!url) {
    throw new Error('未設定 API 網址。請先貼入 Google Apps Script Web App 網址。');
  }

  let responseText = '';
  try {
    const response = await fetch(url, { redirect: 'follow' });
    responseText = await response.text();

    // 如果回傳文字開頭是 HTML，說明 Google Apps Script 還沒完成「首次瀏覽器點擊授權」
    if (responseText.trim().startsWith('<') || responseText.includes('<!DOCTYPE html>')) {
      throw new Error('Google Apps Script 尚未通過初次存取授權。請先用瀏覽器直接開啟該 API 網址，點擊「進階」並允許授權！');
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

      if (plants.length === 0 && deletedPlants.length === 0) {
        throw new Error(`已成功連線至 Google Drive (${folderFound})，但目前資料夾內未發現任何 Google Doc 檔案。`);
      }

      return {
        syncMode,
        plants,
        deletedPlants,
        folderFound
      };
    } else {
      throw new Error('回傳 JSON 格式不符合預期 (未包含 plants 陣列)');
    }
  } catch (err) {
    console.error('GAS 同步失敗:', err);
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('CORS 權限阻擋：請至 Google 腳本「部署」設定中，將【誰有存取權】改為【所有人 (Anyone)】並發布新版本！');
    }
    throw err;
  }
}
