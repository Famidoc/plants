/**
 * 「捻花惹草」花草資料庫與 IndexedDB/Memory 混合持久化模組
 */

let inMemoryPlantsList = null;

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

// 預設示範花草資料庫 (4 筆預設展示花草)
const DEFAULT_PLANT_DATA = [
  {
    id: "plant-1",
    name: "鐵線蕨",
    scientificName: "Adiantum capillus-veneris L. / Adiantum raddianum Presl",
    englishName: "Maidenhair Fern, Delta Maidenhair Fern",
    aliases: ["鐵絲草", "少女髮絲", "鐵線草", "銀杏蕨", "美人蕨"],
    family: "鳳尾蕨科 (Pteridaceae)",
    genus: "鐵線蕨屬 (Adiantum)",
    dateAdded: "20260727",
    locationNote: "九九峰心之芳庭",
    imageUrl: "./assets/images/ferns.jpg",
    petFriendly: true,
    bloomPeriod: "無（蕨類植物不開花，靠孢子繁殖）",
    fruitPeriod: "無",
    sporePeriod: "夏秋季至全年皆可產生孢子囊群",
    morphologyDetails: [
      { label: "葉柄與葉軸", value: "呈黑褐色至紫黑色，細長且具金屬光澤，質地堅硬如鐵絲。" },
      { label: "葉片", value: "薄革質或膜質，鮮綠色，二至三回羽狀複葉，羽片呈扇形或倒卵狀楔形。" }
    ],
    uses: ["觀賞：熱門室內觀葉植物"],
    careNotes: { light: "半陰散射光", humidity: "高空氣濕度", waterQuality: "過濾水" },
    references: []
  },
  {
    id: "plant-2",
    name: "龜背竹",
    scientificName: "Monstera deliciosa Liebm.",
    englishName: "Swiss Cheese Plant, Monstera",
    aliases: ["龜背芋", "蓬萊蕉", "電線蘭"],
    family: "天南星科 (Araceae)",
    genus: "龜背竹屬 (Monstera)",
    dateAdded: "20260720",
    locationNote: "大坑觀音山步道",
    imageUrl: "./assets/images/monstera.jpg",
    petFriendly: false,
    bloomPeriod: "夏季",
    fruitPeriod: "秋季",
    sporePeriod: "無",
    morphologyDetails: [
      { label: "莖幹", value: "粗壯綠色，具明顯環狀葉痕與氣生根。" },
      { label: "葉片", value: "幼葉心形無孔，成葉巨大革質，具羽狀深裂與橢圓形穿孔。" }
    ],
    uses: ["觀賞：客廳與網美空間大型重點觀葉植物"],
    careNotes: { light: "溫和散射光", humidity: "土乾再澆透", waterQuality: "一般水" },
    references: []
  },
  {
    id: "plant-3",
    name: "綠蘿",
    scientificName: "Epipremnum aureum (Linden & André) G.S.Bunting",
    englishName: "Golden Pothos, Devil's Ivy",
    aliases: ["黃金葛", "綠蘿", "萬年青"],
    family: "天南星科 (Araceae)",
    genus: "黃金葛屬 (Epipremnum)",
    dateAdded: "20260715",
    locationNote: "陽明山花卉試驗中心",
    imageUrl: "./assets/images/pothos.jpg",
    petFriendly: false,
    bloomPeriod: "極少開花",
    fruitPeriod: "極少結實",
    sporePeriod: "無",
    morphologyDetails: [
      { label: "葉片", value: "心形綠色葉片，帶有黃色或白色斑紋。" }
    ],
    uses: ["觀賞：垂吊放置、爬牆造景或水培栽培"],
    careNotes: { light: "耐陰性極強", humidity: "水培或土培皆適宜", waterQuality: "自來水" },
    references: []
  },
  {
    id: "plant-4",
    name: "白鶴芋",
    scientificName: "Spathiphyllum kochii Engl. & K.Krause",
    englishName: "Peace Lily, White Sails",
    aliases: ["白掌", "苞葉芋", "和平百合"],
    family: "天南星科 (Araceae)",
    genus: "白鶴芋屬 (Spathiphyllum)",
    dateAdded: "20260710",
    locationNote: "台北典藏植物園特展",
    imageUrl: "./assets/images/peace_lily.jpg",
    petFriendly: false,
    bloomPeriod: "春夏四季皆有機會開花",
    fruitPeriod: "漿果狀",
    sporePeriod: "無",
    morphologyDetails: [
      { label: "葉片", value: "深綠色披針形，具光澤。" },
      { label: "花朵", value: "佛焰苞純白色如白鶴展翅。" }
    ],
    uses: ["觀賞：高雅室內盆栽，寓意「一帆風順」"],
    careNotes: { light: "中等散射光", humidity: "土壤表面微乾即需充足澆水", waterQuality: "靜置水" },
    references: []
  }
];

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
  if (inMemoryPlantsList && inMemoryPlantsList.length > 0 && inMemoryPlantsList !== DEFAULT_PLANT_DATA) {
    return inMemoryPlantsList;
  }
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

  // 2. 寫入 IndexedDB 永久大容量快取 (無 5MB 限制)
  saveToIndexedDB('synced_plants', plants);

  // 3. 盡力寫入 LocalStorage
  try {
    localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(plants));
  } catch (e) {
    console.warn('LocalStorage 容量限制，已改由 IndexedDB 備份。', e);
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
        const oldId = currentList[existingIdx].id;
        currentList[existingIdx] = {
          ...incomingPlant,
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
