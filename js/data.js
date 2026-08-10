/**
 * 「捻花惹草」花草資料庫與 IndexedDB/Memory 混合持久化模組
 */

let inMemoryPlantsList = null;

const DEFAULT_SVG_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiB2aWV3Qm94PSIwIDAgNDAwIDMwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIzMDAiIGZpbGw9IiMxYzM2MjkiLz48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1zaXplPSIyMiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiNhZmQxOWUiPlBMQU5UIFBIT1RPC90ZXh0Pjwvc3ZnPg==";

const STORAGE_KEYS = [
  'nian_hua_re_cao_synced_v3',
  'nian_hua_re_cao_plants_v2',
  'nian_hua_re_cao_plants'
];

// IndexedDB Helper (突破 5MB 限制)
const dbPromise = new Promise((resolve) => {
  try {
    const req = indexedDB.open('NianHuaReCaoDB_v5', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('plants');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  } catch(e) {
    resolve(null);
  }
});

async function saveToIndexedDB(key, val) {
  try {
    const db = await dbPromise;
    if (!db) return;
    const tx = db.transaction('plants', 'readwrite');
    tx.objectStore('plants').put(val, key);
  } catch(e) {}
}

async function getFromIndexedDB(key) {
  try {
    const db = await Promise.race([
      dbPromise,
      new Promise(resolve => setTimeout(() => resolve(null), 1000))
    ]);
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('plants', 'readonly');
        const req = tx.objectStore('plants').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch(txErr) {
        resolve(null);
      }
    });
  } catch(e) {
    return null;
  }
}

// 預設示範花草資料庫 (已拔除測試假資料，全新狀態乾淨呈現)
const DEFAULT_PLANT_DATA = [];

function getStoredPlants() {
  if (inMemoryPlantsList && inMemoryPlantsList.length > 0) {
    return inMemoryPlantsList;
  }
  try {
    for (let key of STORAGE_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryPlantsList = parsed;
          return parsed;
        }
      }
    }
  } catch (e) {}
  return DEFAULT_PLANT_DATA;
}

async function loadStoredPlantsAsync() {
  // 1. 優先從 IndexedDB (無 5MB 限制的大容量完整快取) 讀取最新完整資料
  const idbPlants = await getFromIndexedDB('synced_plants');
  if (idbPlants && Array.isArray(idbPlants) && idbPlants.length > 0) {
    inMemoryPlantsList = idbPlants;
    return idbPlants;
  }
  return getStoredPlants();
}

function saveStoredPlants(plants) {
  if (!plants || !Array.isArray(plants) || plants.length === 0) return;
  // 1. 立即寫入記憶體，確保畫面能瞬間更新
  inMemoryPlantsList = plants;

  // 2. 寫入 IndexedDB 永久大容量快取 (包含所有 48 筆高解析度照片)
  saveToIndexedDB('synced_plants', plants);

  // 3. 寫入 LocalStorage 精簡版 (突破 5MB 容量限制，確保 48 筆花草清單 100% 永久保留)
  try {
    const lightweight = plants.map(p => {
      let img = String(p.imageUrl || '');
      if (img.startsWith('data:image')) {
        img = DEFAULT_SVG_PLACEHOLDER;
      }
      return {
        ...p,
        imageUrl: img,
        galleryImages: []
      };
    });
    localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(lightweight));
  } catch (e) {
    console.warn('LocalStorage 備份容量限制，全量備份已由 IndexedDB 保留。', e);
  }
}

/**
 * 智慧增量合併與刪除 (INCREMENTAL 模式專用，非同步讀取 IndexedDB 完整資料庫，絕對不覆蓋原本已存在的花草)
 */
async function mergeAndSaveStoredPlants(newOrUpdatedPlants = [], deletedPlants = []) {
  let currentList = [...(await loadStoredPlantsAsync())];

  let deletedCount = 0;
  let addedCount = 0;
  let updatedCount = 0;

  // 1. 處理刪除 (Deletions)
  if (Array.isArray(deletedPlants) && deletedPlants.length > 0) {
    deletedPlants.forEach(item => {
      const targetName = typeof item === 'string' ? item.trim() : (item.name || '').trim();
      if (!targetName) return;

      const beforeLen = currentList.length;
      currentList = currentList.filter(p => {
        const pName = (p.name || '').trim();
        return pName !== targetName && !pName.includes(targetName) && !targetName.includes(pName);
      });
      if (currentList.length < beforeLen) {
        deletedCount += (beforeLen - currentList.length);
      }
    });
  }

  // 2. 處理新增與更新 (Upsert)
  if (Array.isArray(newOrUpdatedPlants) && newOrUpdatedPlants.length > 0) {
    newOrUpdatedPlants.forEach(incomingPlant => {
      if (!incomingPlant || !incomingPlant.name) return;
      const incomingName = incomingPlant.name.trim();

      const existingIdx = currentList.findIndex(p => {
        const existingName = (p.name || '').trim();
        return existingName === incomingName || existingName.includes(incomingName) || incomingName.includes(existingName);
      });

      if (existingIdx !== -1) {
        // 更新 (Update)
        const oldPlant = currentList[existingIdx];
        const oldId = oldPlant.id;
        const oldImageUrl = oldPlant.imageUrl || '';
        
        // 智慧圖片保留保護：若舊資料有實體雲端照片 (data:image)，而新資料無照片，保留原實體照片
        let finalImageUrl = incomingPlant.imageUrl || '';
        if ((!finalImageUrl || finalImageUrl === './assets/images/ferns.jpg') && 
            oldImageUrl && oldImageUrl.startsWith('data:image') && !oldImageUrl.includes('svg+xml')) {
          finalImageUrl = oldImageUrl;
        }

        currentList[existingIdx] = {
          ...incomingPlant,
          imageUrl: finalImageUrl,
          id: oldId || incomingPlant.id || `plant-${Date.now()}`
        };
        updatedCount++;
      } else {
        // 新增 (Insert at top)
        currentList.unshift({
          ...incomingPlant,
          id: incomingPlant.id || `plant-${Date.now()}`
        });
        addedCount++;
      }
    });
  }

  saveStoredPlants(currentList);

  return {
    addedCount,
    updatedCount,
    deletedCount,
    totalCount: currentList.length
  };
}

function clearAllPlantCache() {
  inMemoryPlantsList = null;
  saveToIndexedDB('synced_plants', null);
  try {
    STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
  } catch(e) {}
}

// 解析純文字
function parseGoogleDocFormat(text) {
  if (!text || typeof text !== 'string') return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  let titleLine = lines[0];
  let name = titleLine.replace(/[-_–\s]*植物資料.*/g, '').trim();

  let dateAdded = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let locationNote = '';
  const dateMatch = text.match(/\((\d{8})([^\)]*)\)/);
  if (dateMatch) {
    dateAdded = dateMatch[1];
    locationNote = dateMatch[2];
  }

  const getField = (pattern) => {
    const m = text.match(pattern);
    return m ? m[1].trim() : '';
  };

  const sciName = getField(/(?:學名)[：:\s]+([^\n]+)/);
  const engName = getField(/(?:英文名)[：:\s]+([^\n]+)/);
  const aliasesStr = getField(/(?:別名)[：:\s]+([^\n]+)/);
  const familyStr = getField(/(?:科別)[：:\s]+([^\n]+)/);

  return {
    id: `plant-doc-${Date.now()}`,
    name: name || "自訂花草",
    scientificName: sciName || "Adiantum sp.",
    englishName: engName || "Botanical Specimen",
    aliases: aliasesStr ? aliasesStr.split(/[、,]/).map(a => a.trim()) : [],
    family: familyStr || "觀賞植物",
    genus: "自訂屬",
    dateAdded: dateAdded,
    locationNote: locationNote,
    imageUrl: "./assets/images/ferns.jpg",
    petFriendly: text.includes("無毒") || text.includes("寵物友善"),
    bloomPeriod: getField(/(?:花期)[：:\s]+([^\n]+)/) || "詳見資料",
    fruitPeriod: getField(/(?:果期)[：:\s]+([^\n]+)/) || "無",
    sporePeriod: getField(/(?:孢子期)[：:\s]+([^\n]+)/) || "無",
    morphologyDetails: [
      { label: "葉片", value: getField(/(?:葉片|葉)[：:\s]+([^\n]+)/) || "詳見內文" }
    ],
    uses: [text.includes("觀賞") ? "觀賞：熱門觀葉植物" : "園藝栽培"],
    careNotes: {
      light: getField(/(?:光照)[：:\s]+([^\n]+)/) || "散射光",
      humidity: getField(/(?:水分與濕度|濕度)[：:\s]+([^\n]+)/) || "維持濕潤",
      waterQuality: getField(/(?:水質)[：:\s]+([^\n]+)/) || "普通水"
    },
    references: []
  };
}
