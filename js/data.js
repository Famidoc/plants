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
      new Promise(resolve => setTimeout(() => resolve(null), 4000))
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
const DEFAULT_PLANT_DATA = [
  {
    "id": "plant-jxopeqofx",
    "name": "葦草蘭",
    "scientificName": "Arundina graminifolia (D. Don) Hochr.",
    "englishName": "Bamboo Orchid",
    "aliases": [
      "鳥仔花",
      "葦葉蘭",
      "草蘭",
      "竹葉蘭",
      "禾葉蘭"
    ],
    "family": "蘭科 (Orchidaceae) / 葦草蘭屬 (Arundina)",
    "dateAdded": "20260817",
    "locationNote": "@九九峰心之芳庭",
    "imageUrl": "https://drive.google.com/thumbnail?id=1gpARkGtu4t9rSQaxoTsl-m9bJM1o8U53&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（約 6 月至 11 月）",
    "fruitPeriod": "秋季至冬季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "地生蘭，株高可達 1-2 公尺；莖直立叢生，呈竹節狀，質地堅硬，具抱莖葉鞘。"
      },
      {
        "label": "葉片",
        "value": "葉互生，狹長披針形或線形，長 10-20 公分，形似竹葉或禾草。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生總狀花序；萼片與花瓣為淡粉紅色，唇瓣呈喇叭狀，邊緣波狀皺褶，顏色鮮豔紫紅，喉部黃色具紅色斑紋，型如小鳥飛翔。"
      },
      {
        "label": "根系 / 根莖",
        "value": "具地下根莖，根肉質粗壯，常叢生。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照，日照充足開花繁盛。",
      "humidity": "喜濕潤環境，生長期保持介質濕潤，忌積水與長期乾旱。",
      "waterQuality": "/ 土壤：喜排水良好、富含有機質的腐植土或砂質壤土。"
    },
    "references": [
      {
        "title": "農業知識入口網 - 葦草蘭",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=289"
      },
      {
        "title": "維基百科 - 葦草蘭",
        "url": "https://zh.wikipedia.org/zh-tw/%E8%8B%81%E8%8D%89%E5%85%B0"
      },
      {
        "title": "認識植物 - 葦草蘭",
        "url": "http://kplant.biodiv.tw/%E8%8B%81%E8%8D%89%E5%85%B0/%E8%8B%81%E8%8D%89%E5%85%B0.htm"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1gpARkGtu4t9rSQaxoTsl-m9bJM1o8U53&sz=w1000",
        "caption": "(20260817@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-wzz3zicc4",
    "name": "使君子",
    "scientificName": "Combretum indicum (L.) DeFilipps",
    "englishName": "Rangoon Creeper",
    "aliases": [
      "留球子",
      "留求子",
      "史君子",
      "四君子",
      "病疳子",
      "仰光藤",
      "索子果"
    ],
    "family": "使君子科 (Combretaceae) / 使君子屬 (Combretum)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1F9mTgrWkDEgwCvWHT-l3DvkKXiHKI1be&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "5月至10月（夏秋季節盛開）",
    "fruitPeriod": "7月至11月",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "落葉攀緣性藤本灌木，幼嫩部分被銹色短柔毛，葉柄硬化成刺狀攀援。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，長橢圓形 or 卵狀長橢圓形，全緣，先端漸尖。"
      },
      {
        "label": "花朵 / 果實",
        "value": "繖房狀穗狀花序懸垂，花色「一日三變」（初開白、轉粉紅、變深紅），具濃香；果實橄欖狀，有5條縱稜（橫切面五角星形）。"
      },
      {
        "label": "根系",
        "value": "根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照與溫暖環境。",
      "humidity": "生長期保持適度水分，耐乾旱。",
      "waterQuality": "/ 土壤：喜肥沃排水良好的壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 使君子",
        "url": "https://zh.wikipedia.org/zh-tw/%E4%BD%BF%E5%90%9B%E5%AD%90"
      },
      {
        "title": "臺北市政府 - 一日三變使君子",
        "url": "http://www.gov.taipei/ct.asp?xItem=336141427&ctNode=5158&mp=100001"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1F9mTgrWkDEgwCvWHT-l3DvkKXiHKI1be&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1yhcfU24CZaOiy_Y2Jap3VNneR_4Pkpnd&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-mst6psxg7",
    "name": "小葉南洋杉",
    "scientificName": "Araucaria heterophylla (Salisb.) Franco",
    "englishName": "Norfolk Island Pine, Star Pine",
    "aliases": [
      "小葉南洋杉",
      "諾福克南洋杉",
      "細葉南洋杉",
      "異葉杉"
    ],
    "family": "南洋杉科 (Araucariaceae) / 南洋杉屬 (Araucaria)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1JLaOXB98MoSf28_s6Ekb33ebj9745EUc&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季（雌雄異株或同株，雄球花圓柱形，雌球花卵球形）",
    "fruitPeriod": "秋季至翌年（大型木質球果，近球形，直徑 10–15 公分，種子具翅）",
    "sporePeriod": "無（裸子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠大喬木，株高可達 30–60 公尺；樹幹通直高聳，樹皮暗灰色呈薄片狀剝落；側枝輪生，水平開展形成對稱的完美寶塔形樹冠。"
      },
      {
        "label": "葉片",
        "value": "具「二型葉」（幼樹與側枝葉鑽形或針狀，微彎，長 1–1.5 公分，柔軟鮮綠；老樹與花果枝葉寬卵形或三角狀卵形，緊密覆瓦狀排列）。"
      },
      {
        "label": "花朵 / 球花",
        "value": "雄球花簇生枝頂，深黃褐色；雌球花單生，由多數螺旋排列苞鱗組成。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深長，側根發達粗壯，抗風力與抗海風鹽霧能力極佳。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜充足全日照，幼株盆栽可耐明亮散射光。",
      "humidity": "耐旱忌積水，採乾透澆透原則，避免土壤長期積水爛根。",
      "waterQuality": "/ 土壤：喜土層深厚、排水良好的微酸性砂質壤土，耐海風與鹽鹼。"
    },
    "references": [
      {
        "title": "維基百科 - 異葉南洋杉",
        "url": "https://zh.wikipedia.org/zh-tw/%E5%BC%82%E5%8F%B6%E5%8D%97%E6%B4%8B%E6%9D%89"
      },
      {
        "title": "Araucaria heterophylla - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Araucaria_heterophylla"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1JLaOXB98MoSf28_s6Ekb33ebj9745EUc&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-5uinnzo8u",
    "name": "台東漆",
    "scientificName": "Semecarpus gigantifolia Vidal",
    "englishName": "Giant-leaf Marking Nut, Large-leaved Marking Nut",
    "aliases": [
      "大葉漆",
      "大葉肉托果",
      "臺東漆樹",
      "紅果漆"
    ],
    "family": "漆樹科 (Anacardiaceae) / 台東漆屬 (Semecarpus)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1plB6ymLAQC6AYBxPzCbVYtr8dsmf1Wxe&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "4月至7月（春末至夏季開花��頂生圓錐花序密布乳白星狀小花）",
    "fruitPeriod": "6月至10月（核果橢圓形，下部具肉質膨大之果托，成熟時轉為紫黑色或鮮朱紅色）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠大喬木，株高可達 10–20 公尺；樹皮灰褐色，樹冠濃密呈圓傘狀；枝幹受損會分泌乳白色汁液，接觸空氣後迅速氧化變黑。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，常螺旋狀簇生於枝端；葉片厚革質，長披針形至倒卵狀長橢圓形，長達 20–50 公分，寬 6–12 公分，全緣，側脈顯著隆起，葉面深綠光滑。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生大型圓錐花序，長 15–30 公分；花小，雜性或單性，花冠 5 裂，乳白色或淡黃色；核果斜卵形，下接肉質膨大之杯狀果托。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根粗壯深紮，抗風力與耐旱性極強，為優良防風林木。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，耐強光高溫。",
      "humidity": "耐旱耐鹽霧，採乾透澆透原則，忌盆土長期積水。",
      "waterQuality": "/ 土壤：對土壤適應力極強，耐貧瘠、抗海風與鹽鹼土。"
    },
    "references": [
      {
        "title": "台灣植物資訊整合查詢系統 - 台東漆",
        "url": "https://tai2.ntu.edu.tw/species/552%20005%2001%200"
      },
      {
        "title": "維基百科 - 台東漆",
        "url": "https://zh.wikipedia.org/zh-tw/%E5%8F%B0%E6%9D%B1%E6%BC%86"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1plB6ymLAQC6AYBxPzCbVYtr8dsmf1Wxe&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1fqo4KkGDPvMGlUb9hJyN9h3i6ZNU5-uc&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-bj6gezq9j",
    "name": "平伏莖白花菜",
    "scientificName": "Cleome rutidosperma DC.",
    "englishName": "Fringed Spider Flower, Blue Spiderflower",
    "aliases": [
      "藍花白花菜",
      "成功白花菜",
      "皺子白花菜",
      "伏莖白花菜"
    ],
    "family": "醉蝶花科 (Cleomaceae) / 白花菜屬 (Cleome)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1arJQY1f35SByUFbG41CQ0_JfievZngiX&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（春末至秋季最盛，以夏季最為常見）",
    "fruitPeriod": "全年（長角狀線形蒴果，種子表面具橫肋皺紋）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生草本，株高約 20–70 公分；莖多自基部分枝，伏臥或斜昇，具稜角，被柔毛或散生微小皮刺。"
      },
      {
        "label": "葉片",
        "value": "掌狀三出複葉（3 小葉），互生；小葉倒卵狀披��形或橢圓形，長 1.5–3.5 公分，全緣或具微鋸齒，被疏毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於上部葉腋，具長梗；花瓣 4 枚，淺紫藍色至粉紫色，4 枚花瓣向上偏聚排列；雄蕊 6 枚，雌雄蕊柄顯著伸出。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根直立，鬚根多，具極強拓殖力。"
      }
    ],
    "uses": [
      "園藝栽培"
    ],
    "careNotes": {
      "light": "極喜全日照至半日照環境。",
      "humidity": "耐旱亦耐濕，適應力強。",
      "waterQuality": "/ 土壤：對土壤適應力極強，常見於路旁、荒地及田埂。"
    },
    "references": [
      {
        "title": "維基百科 - 平伏莖白花菜",
        "url": "https://zh.wikipedia.org/wiki/%E5%B9%B3%E4%BC%8F%E8%8C%8E%E7%99%BD%E8%8A%B1%E8%8F%9C"
      },
      {
        "title": "Cleome rutidosperma - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Cleome_rutidosperma"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1arJQY1f35SByUFbG41CQ0_JfievZngiX&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-sx87hfopf",
    "name": "倒地鈴",
    "scientificName": "Cardiospermum halicacabum L.",
    "englishName": "Balloon Vine, Heartseed Vine, Love in a Puff",
    "aliases": [
      "風船葛",
      "燈籠草",
      "心子藤",
      "包袱草",
      "假苦瓜",
      "白心子藤"
    ],
    "family": "無患子科 (Sapindaceae) / 倒地鈴屬 (Cardiospermum)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Nc9_Y_Ax2PfzEWzlHRsUGvaAITCGnomv&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（7月–11月，花小白色）",
    "fruitPeriod": "夏末至冬季（8月–翌年1月，中空膨大如氣囊之倒卵狀球形蒴果，黑色種子具白色心形假種皮斑紋）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生或多年生草質攀援藤本，長 1–3 公尺；莖細長具縱稜與微柔毛，具腋生二歧卷鬚攀緣。"
      },
      {
        "label": "葉片",
        "value": "二回三出複葉，互生；小葉卵形至披針形，長 2–5 公分，羽狀深裂或具不規則粗鋸齒，葉面綠色，葉背被疏柔毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生少花聚傘花序，花梗基部具 2 條卷鬚；花小，左右對稱，花瓣 4 枚，白色，內側具鱗片狀附屬物。"
      },
      {
        "label": "果實 / 根系",
        "value": "膜質膨大氣囊狀蒴果，三稜狀倒卵圓形，直徑約 2–3 公分；熟時草綠色轉淡黃褐色，每室含 1 粒黑色種子，種子具白色心形圖樣；主根細長。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，日光充足則生長旺盛、結實累累。",
      "humidity": "喜溫暖濕潤，採乾透澆透原則，耐旱力佳。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 倒地鈴",
        "url": "https://zh.wikipedia.org/wiki/%E5%80%92%E5%9C%B0%E9%93%83"
      },
      {
        "title": "Cardiospermum halicacabum - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Cardiospermum_halicacabum"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Nc9_Y_Ax2PfzEWzlHRsUGvaAITCGnomv&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-6bta9kqz5",
    "name": "烏蘞莓",
    "scientificName": "Causonis japonica (Thunb.) Raf. (異名: Cayratia japonica (Thunb.) Gagnep.)",
    "englishName": "Bushkiller, Japanese Cayratia",
    "aliases": [
      "虎葛",
      "五爪龍",
      "五葉藤",
      "母豬藤",
      "赤車使者",
      "烏蘞藤"
    ],
    "family": "葡萄科 (Vitaceae) / 烏蘞莓屬 (Causonis / Cayratia)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1nl_V8Msgx-xGtvit9UxTwqsEaYFkVboB&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "5月至9月（夏秋季節開花，二歧聚傘花序）",
    "fruitPeriod": "7月至11月（球形漿果，成熟時由綠轉紫黑色）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草質或木質藤本；莖蔓具縱棱，無毛或微被毛；具與葉對生的分枝卷鬚攀緣。"
      },
      {
        "label": "葉片",
        "value": "鳥足狀 5 小葉複葉（中央小葉最大，兩側小葉基部分裂出側小葉），互生；小葉卵形至橢圓形，葉緣具圓鈍鋸齒，深綠色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生大型二歧聚傘花序，分枝呈珊瑚狀；花極小，淡黃綠色或白綠色，4 裂；花盤肉質發達，初開時鮮黃色或橙紅色，後轉粉白色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "具塊狀肉質根或匍匐根莖，蔓延繁殖力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半日照至全日照環境，林緣、灌叢或路旁潮濕處常見。",
      "humidity": "喜濕潤環境，耐旱耐濕性均佳。",
      "waterQuality": "/ 土壤：對土壤要求不嚴，以富含有機質之濕潤壤土生長最旺。"
    },
    "references": [
      {
        "title": "維基百科 - 烏蘞莓",
        "url": "https://zh.wikipedia.org/wiki/%E7%83%8F%E8%98%9E%E8%8E%93"
      },
      {
        "title": "Causonis japonica - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Causonis_japonica"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1nl_V8Msgx-xGtvit9UxTwqsEaYFkVboB&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-wlmb1auz4",
    "name": "馬蜂橙",
    "scientificName": "Citrus hystrix DC.",
    "englishName": "Kaffir Lime, Makrut Lime, Combava, Porcupine Orange",
    "aliases": [
      "箭葉橙",
      "泰國檸檬",
      "泰國青檸",
      "痲瘋柑",
      "箭葉青檸",
      "馬蜂柑"
    ],
    "family": "芸香科 (Rutaceae) / 柑橘屬 (Citrus)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1GPmKfCCeEFmKQ4r811GIqcoj30w6QUsw&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "3月至6月（春季開花，小花白色或淡粉色，芳香）",
    "fruitPeriod": "7月至翌年2月（球形或卵形柑果，果皮粗糙具密集瘤狀皺褶）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木或小喬木，株高 2–5 公尺；枝幹具銳刺，分枝密集。"
      },
      {
        "label": "葉片",
        "value": "單身複葉，最具特徵之「雙生翼葉」（葉柄具寬翼，與葉身等長或稍小，相連呈倒葫蘆形或倒心形），厚革質，揉碎散發強烈檸檬香茅精油香氣。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生短總狀花序或單生；花瓣 4–5 枚，白色，背面微帶紫紅暈，花香濃郁。"
      },
      {
        "label": "果實 / 根系",
        "value": "柑果球形，果皮厚且極度粗糙凹凸，滿布瘤狀疙瘩；果汁量少酸澀；根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，陽光充足則葉片香氣濃郁、果實結實纍纍。",
      "humidity": "喜溫暖濕潤，採乾透澆透原則，忌盆土積水爛根。",
      "waterQuality": "/ 土壤：喜疏鬆肥沃、排水良好之微酸性砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 箭葉橙",
        "url": "https://zh.wikipedia.org/zh-tw/%E7%AE%AD%E5%8F%B6%E6%A9%99"
      },
      {
        "title": "Citrus hystrix - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Citrus_hystrix"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1GPmKfCCeEFmKQ4r811GIqcoj30w6QUsw&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1ANLmT3kRE3EsADFrC1O5eANHmLoQv3YU&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-ep27v7clh",
    "name": "野牽牛",
    "scientificName": "Ipomoea obscura (L.) Ker Gawl.",
    "englishName": "Small White Morning Glory, Obscure Morning Glory",
    "aliases": [
      "姬牽牛",
      "小花假牽牛",
      "暗色牽牛",
      "小牽牛",
      "野薯"
    ],
    "family": "旋花科 (Convolvulaceae) / 番薯屬 (Ipomoea)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1UW2l__CJAsd0lbhogHBXszr6PNJ_nD4-&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（以春末至秋季5月–11月最盛，晨開午後閉合）",
    "fruitPeriod": "夏季至冬季（球形或卵形蒴果，種子被黑褐色短茸毛）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生或多年生纏繞性草質藤本；莖細長圓柱形，具微柔毛或近無毛，長 1–3 公尺。"
      },
      {
        "label": "葉片",
        "value": "��葉互生，心形或圓心形，長 3–8 公分，寬 2–6 公分，全緣，先端漸尖或驟尖，基部深心形，兩面被疏柔毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生或 2–3 朵腋生；花冠漏斗狀/鐘狀，小型（花徑約 2–3 公分），花冠呈乳白色、淡黃色或乳黃色，喉部具鮮明之「深紫褐色/紫紅色」圓心圓環。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根發達，藤蔓節處著地易萌生不定根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，日光充足則花開繁盛。",
      "humidity": "耐旱性強，生長季保持土壤適度濕潤即可。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "Ipomoea obscura - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Ipomoea_obscura"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1UW2l__CJAsd0lbhogHBXszr6PNJ_nD4-&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-ymbsqdhv6",
    "name": "紫薇",
    "scientificName": "Lagerstroemia indica L.",
    "englishName": "Crape Myrtle, Crepe Myrtle",
    "aliases": [
      "百日紅",
      "滿堂紅",
      "怕癢樹",
      "猴不爬",
      "紫荊花（俗稱）",
      "小葉紫薇"
    ],
    "family": "千屈菜科 (Lythraceae) / 紫薇屬 (Lagerstroemia)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1R-vb55hXNXe0yrGYn1N1PzQDgYlutVJw&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（6月–10月，花期長達百日，故名「百日紅」）",
    "fruitPeriod": "秋季至冬季（9月–12月，木質近球形蒴果，種子具翅）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉灌木或小喬木，株高 3–7 公尺；樹幹樹皮薄而光滑，灰褐色或紅褐色，老皮片狀剝落；枝幹光滑，觸摸或微晃枝幹樹梢即顫動，故稱「怕癢樹」。"
      },
      {
        "label": "葉片",
        "value": "單葉互生或近對生，倒卵形、橢圓形或卵形，長 3–7 公分，全緣，近無柄或葉柄極短，秋季葉片轉紅黃色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生大型圓錐花序，長 10–20 公分；花瓣 6 枚，邊緣極度皺褶波狀，具細長爪；花色鮮豔豐富，有粉紅、紫紅、大紅、白等色；雄蕊多數（外側 6 枚較長）。"
      },
      {
        "label": "果實 / 根系",
        "value": "蒴果球形，直徑約 0.9–1.5 公分（明顯大於九芎之小果）；主根深長，鬚根發達，耐修剪。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，陽光充足方能繁花似錦。",
      "humidity": "喜溫暖濕潤，耐旱性佳，忌低窪積水。",
      "waterQuality": "/ 土壤：適應性廣，喜肥沃、排水良好之砂質壤土或微酸性土壤。"
    },
    "references": [
      {
        "title": "維基百科 - 紫薇",
        "url": "https://zh.wikipedia.org/wiki/%E7%B4%AB%E8%96%87"
      },
      {
        "title": "Lagerstroemia indica - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Lagerstroemia_indica"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1R-vb55hXNXe0yrGYn1N1PzQDgYlutVJw&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-5r3w6jfzc",
    "name": "紫藤",
    "scientificName": "Wisteria sinensis (Sims) Sweet / Wisteria floribunda (Willd.) DC.",
    "englishName": "Chinese Wisteria, Japanese Wisteria, Purple Vine",
    "aliases": [
      "藤蘿",
      "朱藤",
      "葛花",
      "葛藤",
      "紫藤花",
      "黃環"
    ],
    "family": "豆科 (Fabaceae) / 紫藤屬 (Wisteria)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1FNcbnTPHqwrQftpAZEld1Iqvspod1s3b&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "3月至5月（春季盛開，成串下垂的紫色蝶形花序宛如紫色瀑布）",
    "fruitPeriod": "6月至11月（長條形木質莢果，密被絨毛）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "大型落葉木質攀援藤本，主幹粗壯木質化，長達十餘公尺；莖蔓具強烈纏繞性（中國紫藤多為右旋逆時針，日本紫藤多為左旋順時針）。"
      },
      {
        "label": "葉片",
        "value": "奇數羽狀複葉，互生；小葉 7–13 枚，卵狀披針形或卵形，長 5–10 公分，先端漸尖，幼葉被微柔毛，成熟後平滑鮮綠。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生總狀花序，懸垂生長，長達 15–40 公分；花冠蝶形，淡紫色、藍紫色或深紫色，芳香濃郁；旗瓣大且反折，翼瓣與龍骨瓣包覆雄蕊。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深長，側根發達，具固氮根瘤菌。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜充足全日照，光照充足花芽分化旺盛。",
      "humidity": "喜濕潤但耐旱，掌握乾透澆透，忌根部排水不良積水。",
      "waterQuality": "/ 土壤：喜土層深厚、肥沃且排水良好之微酸性至中性砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 紫藤",
        "url": "https://zh.wikipedia.org/zh-tw/%E7%B4%AB%E8%97%A4"
      },
      {
        "title": "Wisteria - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Wisteria"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1FNcbnTPHqwrQftpAZEld1Iqvspod1s3b&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1kYAvk9NfU8wU73ocpFvBLbP1yerhop2f&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-8plnsvtbu",
    "name": "落葵",
    "scientificName": "Basella alba L. (異名: Basella rubra L.)",
    "englishName": "Malabar Spinach, Ceylon Spinach, Vine Spinach, Indian Spinach",
    "aliases": [
      "皇宮菜",
      "胭脂菜",
      "木耳菜",
      "藤葵",
      "天葵",
      "豆腐菜",
      "越南菠菜"
    ],
    "family": "落葵科 (Basellaceae) / 落葵屬 (Basella)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1-x8IdrjL2t42_QgRMaSe9lcQwRPBDsqR&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（6月–10月，肉質穗狀花序）",
    "fruitPeriod": "秋季至冬季（8月–12月，肉質漿果狀核果，成熟時呈紫黑色多汁）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生或多年生肉質攀援草質藤本；莖綠色或紫紅色，肉質光滑多汁，長可達 2–6 公尺。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，卵形、心形或近圓形，長 5–12 公分，全緣，肉質肥厚，質地黏滑光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生穗狀花序，長 5–15 公分；花小無花梗，無花瓣，肉質花被片 5 裂，淡粉紅色、紫紅色或白綠色，開花時宿存包被子房且不完全展開。"
      },
      {
        "label": "果實 / 根系",
        "value": "漿果狀肉質果實，球形，成熟時由綠轉黑紫色，汁液如鮮紅胭脂染料；淺根性，鬚根發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，耐熱耐高溫。",
      "humidity": "喜濕潤環境，生長旺盛期需水充足，保持土壤濕潤。",
      "waterQuality": "/ 土壤：喜疏鬆肥沃、富含有機質且保水良好之壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 落葵",
        "url": "https://zh.wikipedia.org/wiki/%E8%90%BD%E8%91%B5"
      },
      {
        "title": "Basella alba - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Basella_alba"
      },
      {
        "title": "農業知識入口網 - 皇宮菜 (落葵)",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=332"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1-x8IdrjL2t42_QgRMaSe9lcQwRPBDsqR&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-cpq6ep4lf",
    "name": "銀合歡",
    "scientificName": "Leucaena leucocephala (Lam.) de Wit",
    "englishName": "River Tamarind, Lead Tree, White Leadtree, Ipil-ipil",
    "aliases": [
      "白合歡",
      "白球花",
      "臭菁仔",
      "銀合歡樹",
      "假相思"
    ],
    "family": "豆科 (Fabaceae / Mimosoideae) / 銀合歡屬 (Leucaena)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道-",
    "imageUrl": "https://drive.google.com/thumbnail?id=1M_8kA5ivO-M66o_d1WqCS8-zfc3OztV9&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "4月至10月（夏秋盛開，乳白色絨球狀頭狀花序）",
    "fruitPeriod": "6月至翌年2月（扁平帶狀長條形莢果，結實數量龐大）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉或半常綠灌木或小喬木，株高 3–8 公尺；分枝多，樹皮灰褐色，生長繁殖速度極快。"
      },
      {
        "label": "葉片",
        "value": "二回偶數羽狀複葉，互生；羽片 4–9 對，小葉 10–20 對，條狀披針形，長 8–15 毫米，先端銳尖，基部偏斜，夜間或雨天閉合。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頭狀花序單生或數個腋生，呈白色圓球狀，直徑 2–3 公分；花絲多數細長外露呈毛球狀；莢果長條���平，長 10–18 公分，成熟時變褐色裂開。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根粗深，具強大固氮根瘤菌，根系會分泌含羞草素抑制周圍其他植物生長（化感作用）。"
      }
    ],
    "uses": [
      "園藝栽培"
    ],
    "careNotes": {
      "light": "極喜全日照，抗旱、抗熱、耐貧瘠性極強。",
      "humidity": "",
      "waterQuality": "對水分土壤要求極低，耐乾旱與石灰質土。"
    },
    "references": [
      {
        "title": "維基百科 - 銀合歡",
        "url": "https://zh.wikipedia.org/zh-tw/%E9%93%B6%E5%90%88%E6%AC%A2"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1M_8kA5ivO-M66o_d1WqCS8-zfc3OztV9&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-4d900e594",
    "name": "龍船花",
    "scientificName": "Clerodendrum paniculatum L.",
    "englishName": "Pagoda Flower, Orange Clerodendrum",
    "aliases": [
      "圓錐大青",
      "寶塔花",
      "紅花大青",
      "金鳳花",
      "百靈草",
      "龍船花樹"
    ],
    "family": "唇形科 (Lamiaceae / 傳統馬鞭草科 Verbenaceae) / 大青屬 (Clerodendrum)",
    "dateAdded": "20260814",
    "locationNote": "@霧峰省諮議會後山步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1rVPQQaXu1foQyiAMM9izKuh0V9AF6IOm&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "5月至11月（端午節前後盛開，花期極長，故名「龍船花」）",
    "fruitPeriod": "秋季至冬季（8月–翌年1月，球形核果，熟時由綠轉��黑色）",
    "sporePeriod": "無（被子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–2.5 公尺；莖直立，小枝四稜形，具溝槽，髓部發達。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，大型，廣卵形或近圓形，長 15–30 公分，葉緣掌狀 3–7 淺裂，基部心形，葉面深綠，葉背密布微小腺點。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生大型金字塔形/寶塔狀圓錐花序，長達 20–45 公分；花冠高腳碟狀，鮮亮橙紅色或朱紅色，5 裂；4 枚雄蕊與花柱極度伸出花冠外（長達 3–4 公分），色澤艷麗奪目。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深，側根發達，萌蘗力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，耐熱耐高溫。",
      "humidity": "喜溫暖濕潤環境，生長季保持土壤適度濕潤，避免長期乾旱。",
      "waterQuality": "/ 土壤：適應力強，喜富含有機質、排水良好的砂質壤土。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1rVPQQaXu1foQyiAMM9izKuh0V9AF6IOm&sz=w1000",
        "caption": "(20260814@霧峰省諮議會後山步道)"
      }
    ]
  },
  {
    "id": "plant-3umgiz2i8",
    "name": "貓鬚草",
    "scientificName": "Orthosiphon aristatus (Blume) Miq.",
    "englishName": "Cat's Whisker, Java Tea",
    "aliases": [
      "化石��",
      "腎茶",
      "貓鬚公",
      "貓須草",
      "爪哇茶"
    ],
    "family": "唇形科 (Lamiaceae) / 貓鬚草屬 (Orthosiphon)",
    "dateAdded": "20260812",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1jqmNGB2sbOxVPyVgqY67oqbqdUtwqCXO&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "5月–11月（盛花期夏秋，氣候溫暖環境可全年開花）",
    "fruitPeriod": "7月–12月（小堅果卵形，表面具網紋）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本，株高 30–100 公分；莖直立，四稜形，基部木質化，常帶紫紅色，被逆生短柔毛。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，卵形至菱狀卵形，長 2–8 公分，寬 1–5 公分，先端漸尖，基部楔形，葉緣具粗鋸齒，兩面被腺點或短柔毛；葉柄長 0.5–3 公分。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "輪傘花序組成頂生假總狀花序；花萼鐘形，二唇形；花冠淡紫色至紫藍色，二唇形；最顯著特徵為 4 枚雄蕊與花柱極度伸出花冠外（長達 3–6 公分），形如貓的鬚髯。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系發達，鬚根多，具良好環境適應力。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，陽光充足則植株強健、開花繁茂。",
      "humidity": "喜溫暖濕潤環境，耐濕性佳，生長季需定期澆水保持土壤濕潤，避免長期乾旱。",
      "waterQuality": "/ 土壤：適應力強，喜疏鬆肥沃、排水良好的砂質壤土或腐殖土。"
    },
    "references": [
      {
        "title": "維基百科 - 貓鬚草",
        "url": "https://zh.wikipedia.org/wiki/%E8%B2%93%E9%AC%9A%E8%8D%89"
      },
      {
        "title": "Orthosiphon aristatus - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Orthosiphon_aristatus"
      },
      {
        "title": "農業知識入口網 - 貓鬚草",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=457"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1jqmNGB2sbOxVPyVgqY67oqbqdUtwqCXO&sz=w1000",
        "caption": "(20260812@台中市南區花之道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1EpI8S6Nkq2uDYcD2UNs6CsjjE8sgUcEo&sz=w1000",
        "caption": "(20260812@台中巿南區花之道)"
      }
    ]
  },
  {
    "id": "plant-bj2bq88pw",
    "name": "葫蘆竹",
    "scientificName": "Bambusa ventricosa McClure",
    "englishName": "Buddha's Belly Bamboo",
    "aliases": [
      "佛肚竹",
      "佛竹",
      "羅漢竹",
      "佛爺竹"
    ],
    "family": "禾本科 (Poaceae) / 簕竹屬 (Bambusa)",
    "dateAdded": "20260809",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=114mDBnwboktCiG9Uwrm-OYi8-wm_kJyw&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "罕見開花（竹類植物大多數十年開花一次，開花後常枯死）",
    "fruitPeriod": "罕見結實（穎果）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "竿高 2–5 公尺，直徑 2–5 公分；節間短而膨大呈葫蘆狀/佛肚狀，基部及中部節間尤為顯著，綠色或黃綠色；分枝多，常於竿中下部開始分枝。"
      },
      {
        "label": "葉片",
        "value": "葉片披針形，長 9–18 公分，寬 1–2 公分，先端漸尖，基部楔形，表面深綠色，背面帶白粉與微毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "假小穗叢生於無葉枝條之節上；花極少見。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下莖為合軸叢生型（合軸粗短型），根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，光照充足株型更緊密。",
      "humidity": "喜濕潤但忌積水；盆栽欲保持「佛肚」形態，可在新筍抽長時適度控水限制節間伸長。",
      "waterQuality": "/ 土壤：喜疏鬆肥���、排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 佛肚竹",
        "url": "https://zh.wikipedia.org/zh-tw/%E4%BD%9B%E8%82%9A%E7%AB%B9"
      },
      {
        "title": "農業知識入口網 - 葫蘆竹",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=312"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=114mDBnwboktCiG9Uwrm-OYi8-wm_kJyw&sz=w1000",
        "caption": "(20260809)"
      }
    ]
  },
  {
    "id": "plant-msrfbaumj",
    "name": "睡蓮",
    "scientificName": "Nymphaea spp. (如 Nymphaea tetragona Georgi)",
    "englishName": "Water Lily",
    "aliases": [
      "水浮蓮",
      "睡蓮花",
      "睡浮蓮",
      "水華",
      "子午蓮"
    ],
    "family": "睡蓮科 (Nymphaeaceae) / 睡蓮屬 (Nymphaea)",
    "dateAdded": "20260808",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1NStLIY5ZV5M3q_uzJNI2A91eGLkk0KCa&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季至秋季（約 5 月至 10 月，盛花期為夏季）",
    "fruitPeriod": "秋季（約 8 月至 11 月）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "水生草本植物，具塊狀或蔓延狀之地下根莖，葉柄細長柔韌，具通氣組織。"
      },
      {
        "label": "葉片",
        "value": "浮水葉，近圓形、卵形或心形，基部具深缺刻，全緣或具波狀齒，葉面光滑具蠟質，深綠有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生，浮於水面或挺出水面；花瓣多數，呈輻射狀排列，花色豐富（白、粉、紅、黃、紫等）；花朵常有晝開夜合之習性。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根莖紮於水底泥土中，鬚根發達，吸收水底養分。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，每日需至少 4–6 小時直射陽光以促進花芽分化與開花。",
      "humidity": "需常年浸於水中，水深宜保持在 30–60 公分，維持水質清潔避免藻類過度滋生。",
      "waterQuality": "/ 土壤：水底宜使用肥沃、黏性較高之塘泥、腐植土或黏質壤土，忌鬆散易漂浮之介質。"
    },
    "references": [
      {
        "title": "維基百科 - 睡蓮",
        "url": "https://zh.wikipedia.org/zh-tw/%E7%9D%A1%E8%8E%B2"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1NStLIY5ZV5M3q_uzJNI2A91eGLkk0KCa&sz=w1000",
        "caption": "(20260808)"
      }
    ]
  },
  {
    "id": "plant-iowll5h2w",
    "name": "凌霄花",
    "scientificName": "Campsis grandiflora (SW.) K. Schum.",
    "englishName": "Chinese Trumpet Vine",
    "aliases": [
      "紫葳",
      "女葳花",
      "紫葳華",
      "墮胎花",
      "白狗腸",
      "過路蜈蚣"
    ],
    "family": "紫葳科 (Bignoniaceae) / 凌霄屬 (Campsis)",
    "dateAdded": "20260806",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1U-JCBbxLAU4nO1ivCP1ttw4PySx8k32L&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "5月至8月（夏季盛開）",
    "fruitPeriod": "8月至10月",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "落葉木質藤本植物，具氣生根，攀援生長可達數公尺至十餘米。"
      },
      {
        "label": "葉片",
        "value": "奇數羽狀複葉對生，小葉5-9片，卵形至卵狀披針形，葉緣具粗鋸齒。"
      },
      {
        "label": "花朵 / 果實",
        "value": "聚繖或圓錐花序，花冠大呈漏斗狀鐘形，鮮豔橘紅色或橙黃色；果實為長紡錘形蒴果。"
      },
      {
        "label": "根系",
        "value": "主根發達，莖節具氣生根附著攀爬。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照與溫暖環境，極耐半陰。",
      "humidity": "耐旱耐貧瘠，生長期保持適度濕潤，冬季落葉期控水。",
      "waterQuality": "/ 土壤：適應性強，耐貧瘠土壤。"
    },
    "references": [
      {
        "title": "農業知識入口網 — 凌霄花",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=64"
      },
      {
        "title": "維基百科 — 凌霄",
        "url": "https://zh.wikipedia.org/zh-tw/%E5%87%8C%E9%9C%84"
      },
      {
        "title": "林業試驗所 — 台北植物園好花共賞：凌霄花",
        "url": "https://www.tfri.gov.tw/News_Content.aspx?n=7658&sms=12314&s=1390"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1U-JCBbxLAU4nO1ivCP1ttw4PySx8k32L&sz=w1000",
        "caption": "(20260806)"
      }
    ]
  },
  {
    "id": "plant-zp3t46cx9",
    "name": "血藤",
    "scientificName": "Mucuna macrocarpa Wall.",
    "englishName": "Large-fruit Mucuna, Rusty-leaf Mucuna",
    "aliases": [
      "大果油麻藤",
      "青山龍",
      "烏血藤",
      "大血藤",
      "青山龍藤",
      "串天癀"
    ],
    "family": "豆科 (Fabaceae) / 血藤屬 (Mucuna)",
    "dateAdded": "20260806",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1wSSdKsu52Z9RR6WjrjczRKlS8kPoBHup&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季（約 3 月至 5 月，花期短暫，單花期約數天，整株集中盛開約 2~3 週）",
    "fruitPeriod": "夏末至秋季（約 8 月至 11 月，結出大型扁平厚實的木質莢果，長可達 30~60 公分）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生常綠大型木質藤本植物。蔓莖粗大可達數十公分，切斷或受傷時會流出鮮紅色的汁液，氧化後變為暗紅色如血液，因而得名「血藤」。"
      },
      {
        "label": "葉片",
        "value": "三出複葉，互生；小葉革質，呈長橢圓形或卵狀長橢圓形，全緣，頂生小葉較大，葉背常有微毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "蝶形花冠，呈總狀花序自老莖或懸垂的藤蔓上簇生（幹生花），成串下垂如風鈴或飛雀（俗稱禾雀花）。花冠深紫紅色或暗紅紫色，基部花萼杯狀、淺黃綠色或象牙白色。花朵散發特殊氣味以吸引蝙蝠或昆蟲前來傳粉。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系發達，木質莖具強勁攀緣能力，可攀附高大樹木生長至林冠層。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半日照至全日照環境，幼苗耐陰，成株需要充足陽光以促進開花與結實。",
      "humidity": "喜溫暖潮濕環境，耐濕耐旱力皆強，生長季保持介質微濕潤即可。",
      "waterQuality": "/ 土壤：對土壤要求不嚴，以排水良好、富含有機質之砂質壤土最佳。"
    },
    "references": [
      {
        "title": "國立自然科學博物館 — 血藤",
        "url": "https://www.nmns.edu.tw/ch/exhibitions/galleries/botanical-garden/flowers/Theme-000602/"
      },
      {
        "title": "台灣景觀植物介紹 — 血藤",
        "url": "https://tlpg.hsiliu.org.tw/plant/view/880"
      },
      {
        "title": "維基百科 — 血藤",
        "url": "https://zh.wikipedia.org/zh-tw/%E8%A1%80%E8%97%A4"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1wSSdKsu52Z9RR6WjrjczRKlS8kPoBHup&sz=w1000",
        "caption": "(20260806)"
      }
    ]
  },
  {
    "id": "plant-2p5nj0g6h",
    "name": "梔子花",
    "scientificName": "Gardenia jasminoides J. Ellis",
    "englishName": "Cape Jasmine, Gardenia",
    "aliases": [
      "黃梔花",
      "山黃梔",
      "山梔子",
      "木丹",
      "鮮支",
      "越桃",
      "水橫枝"
    ],
    "family": "茜草科 (Rubiaceae) / 梔子屬 (Gardenia)",
    "dateAdded": "20260805",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1XVA0LiMnyWYN2dbGYGn32l6ACab0vQLP&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "4月至6���（春末夏初）",
    "fruitPeriod": "5月至翌年1月",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "常綠灌木 or 小喬木，高可達 2-3 公尺。"
      },
      {
        "label": "葉片",
        "value": "葉對生或3葉輪生，革質深綠有光澤，倒卵形至長橢圓形。"
      },
      {
        "label": "花朵 / 果實",
        "value": "花單生頂生或葉腋，潔白轉乳黃，濃香；單瓣品種結黃橙色卵形漿果（具5-8條縱稜）。"
      },
      {
        "label": "根系",
        "value": "主根深，側根發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜溫暖濕潤、全日照或半日照。",
      "humidity": "保持土壤濕潤，避免長期積水。",
      "waterQuality": "/ 土壤：喜微酸性、富含有機質且排水良好土壤。"
    },
    "references": [
      {
        "title": "國立自然科學博物館 - 山黃梔",
        "url": "https://www.nmns.edu.tw/ch/exhibitions/galleries/botanical-garden/flowers/Theme-F00636/"
      },
      {
        "title": "農業知識入口網 - 梔子花",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=77"
      },
      {
        "title": "維基百科 - 梔子",
        "url": "https://zh.wikipedia.org/zh-tw/%E6%A0%80%E5%AD%90"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1XVA0LiMnyWYN2dbGYGn32l6ACab0vQLP&sz=w1000",
        "caption": "(20260805)"
      }
    ]
  },
  {
    "id": "plant-wxbtqz2xi",
    "name": "猴尾柱",
    "scientificName": "Cleistocactus colademononis",
    "englishName": "Monkey's Tail Cactus",
    "aliases": [
      "硬毛猴尾柱",
      "猴尾掌",
      "猴尾巴",
      "九尾狐仙人掌"
    ],
    "family": "仙人掌科 (Cactaceae) / 管花柱屬 (Cleistocactus)",
    "dateAdded": "20260805",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=12bDavLnnpKhSwMVMpeUU6ZNkpoIGbu5H&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（盛夏最繁茂）",
    "fruitPeriod": "夏末至秋季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "多肉質柱狀莖，長大後呈懸垂性（可達 1.5-2.5 公尺）。"
      },
      {
        "label": "刺與絨毛",
        "value": "莖部密佈長而柔軟的白色毛狀刺（長4-12公分），外觀如動物絨毛尾巴，觸感軟。"
      },
      {
        "label": "花朵 / 果實",
        "value": "朱紅或玫紅色兩性花，自刺座橫向伸出；果實為小紅球果隱於毛刺中。"
      },
      {
        "label": "根系",
        "value": "淺根性淺生根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜光照，忌夏季高溫烈日直射，宜置明亮散光通風處。",
      "humidity": "秉持「乾透澆透」，冬季低溫控水休眠。",
      "waterQuality": "/ 土壤：透氣排水優良的多肉顆粒介質。"
    },
    "references": [
      {
        "title": "Wikipedia - Cleistocactus colademononis",
        "url": "https://en.wikipedia.org/wiki/Cleistocactus_colademononis"
      },
      {
        "title": "World of Succulents - Cleistocactus colademononis",
        "url": "https://worldofsucculents.com/cleistocactus-colademononis/"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=12bDavLnnpKhSwMVMpeUU6ZNkpoIGbu5H&sz=w1000",
        "caption": "(20260805)"
      }
    ]
  },
  {
    "id": "plant-k5vurgfxs",
    "name": "千屈菜",
    "scientificName": "Lythrum salicaria Linn.",
    "englishName": "Purple Loosestrife, Spiked Loosestrife",
    "aliases": [
      "千禧花",
      "美麗千屈菜",
      "水柳",
      "水枝柳",
      "水檳榔",
      "敗毒草",
      "對葉蓮"
    ],
    "family": "千屈菜科 (Lythraceae) / 千屈菜屬 (Lythrum)",
    "dateAdded": "20260805",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=16UDAp-4HWuVrBQG_55t-ehebDW9Nx05c&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "6月至10月（盛花期7月至9月）",
    "fruitPeriod": "8月至11月",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "多年生草本，株高 40-120 公分，莖直立，近四稜形，多分枝。"
      },
      {
        "label": "葉片",
        "value": "葉披針形，對生或3葉輪生，無柄，形清秀如柳葉。"
      },
      {
        "label": "花朵 / 果實",
        "value": "頂生長穗狀花序，紫紅 or 粉紫色小花密集；結卵形小蒴果。"
      },
      {
        "label": "根系",
        "value": "具宿根及發達根系。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照及濕潤環境。",
      "humidity": "喜高濕度，適合水邊栽培。",
      "waterQuality": "/ 土壤：水濕土壤 or 淺水池。"
    },
    "references": [
      {
        "title": "臺北新花漾 - 千屈菜簡介",
        "url": "https://parks.gov.taipei/parks/m3/pkl_parks_m3s2C.php?sid=230"
      },
      {
        "title": "農業知識入口網 - 千屈菜圖鑑",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=16UDAp-4HWuVrBQG_55t-ehebDW9Nx05c&sz=w1000",
        "caption": "(20260805)"
      }
    ]
  },
  {
    "id": "plant-3slt3xvxj",
    "name": "美洲含羞草",
    "scientificName": "Mimosa diplotricha (或 Mimosa invisa)",
    "englishName": "Giant Sensitive Plant, Nile Cabbage",
    "aliases": [
      "巴西含羞草",
      "刺含羞草",
      "大假含羞草"
    ],
    "family": "豆科 (Fabaceae) / 含羞草屬 (Mimosa)",
    "dateAdded": "20260805",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1FwxmEpjEzVWDhnqNg5labMVrUa_KAU4R&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（夏秋最盛）",
    "fruitPeriod": "秋季至冬季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "多年生蔓性木質草本，莖四稜形帶四排銳利倒鉤刺。"
      },
      {
        "label": "葉片",
        "value": "二回羽狀複葉，羽片3-9對，小葉細小且對生，受觸碰會閉合。"
      },
      {
        "label": "花朵 / 果實",
        "value": "球狀頭狀花序粉紅色；莢果簇生具硬刺毛。"
      },
      {
        "label": "根系",
        "value": "具固氮根瘤。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜充足陽光。",
      "humidity": "耐旱力極強。",
      "waterQuality": "/ 土壤：適應力強，注意避免無限制擴散。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1FwxmEpjEzVWDhnqNg5labMVrUa_KAU4R&sz=w1000",
        "caption": "(20260805)"
      }
    ]
  },
  {
    "id": "plant-guf6f1o02",
    "name": "銀絨野牡丹",
    "scientificName": "Pleroma heteromallum (D. Don) D. Don / Tibouchina heteromalla",
    "englishName": "Silver-leafed Princess Flower, Large Glory Bush",
    "aliases": [
      "銀葉野牡丹",
      "銀毛野牡丹",
      "銀絨蒂牡丹"
    ],
    "family": "野牡丹科 (Melastomataceae) / 蒂牡丹屬 (Pleroma / Tibouchina)",
    "dateAdded": "20260727",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Y0Q3qzRe2ndqc97fJ4dfjDrB9FXwcE5d&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（約 6 月至 11 月）",
    "fruitPeriod": "秋季至冬季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "莖部 / 葉柄",
        "value": "常綠灌木，株高可達 1.5–3 公尺；全株枝條與嫩莖密被銀白色柔毛，質感細緻。"
      },
      {
        "label": "葉片",
        "value": "葉對生，卵狀心形或廣卵形，長 10–20 公分，葉面具濃厚銀灰色天鵝絨質感，葉脈 5–7 條深陷，葉背密被銀白色絨毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生圓錐花序；花冠鮮紫藍色或藍紫色，5 瓣，花徑約 4–5 公分，雄蕊長伸且彎曲如爪。"
      },
      {
        "label": "根系 / 根莖",
        "value": "鬚根系發達，根系開展良好。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，陽光充足則銀毛光澤更佳、開花繁茂。",
      "humidity": "喜溫暖濕潤環境，保持介質適度濕潤，採「乾透澆透」原則，忌長期積水不排水。",
      "waterQuality": "/ 土壤：喜肥沃、富含有機質且排水良好的微酸性腐植土或砂質壤土。"
    },
    "references": [
      {
        "title": "福星花園：銀絨野牡丹",
        "url": "https://bruce0342.blogspot.com/2020/10/blog-post_20.html"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Y0Q3qzRe2ndqc97fJ4dfjDrB9FXwcE5d&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-c0kih4p5k",
    "name": "金英樹",
    "scientificName": "Galphimia gracilis Bartl. (同物異名: Thryallis gracilis)",
    "englishName": "Gold Shower, Thryallis, Rain of Gold",
    "aliases": [
      "金英花",
      "黃虎尾寮",
      "金虎尾"
    ],
    "family": "金虎尾科 (Malpighiaceae) / 金英樹屬 (Galphimia)",
    "dateAdded": "20260727",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=18KlXYHV6fwqhwKl-EB59dwQIect9RdkT&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（盛夏至秋初開花最旺）",
    "fruitPeriod": "秋季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–2 公尺；枝條纖細，嫩枝微帶紅褐色。"
      },
      {
        "label": "葉片",
        "value": "葉對生，長橢圓形或卵形，長 2–5 公分，全緣，葉面平滑鮮綠。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生總狀花序；花冠鮮黃色，5 瓣，雄蕊花絲初期鮮紅後轉黃，花期長且盛開時如黃金雨。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系發達，分枝多，適應力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，陽光充足則開花繁茂。",
      "humidity": "採「乾透澆透」原則，忌長期積水不排水。",
      "waterQuality": "/ 土壤：喜排水良好、富含有機質之砂質壤土或腐植土。"
    },
    "references": [
      {
        "title": "農業知識入口網--金英樹",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=134"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=18KlXYHV6fwqhwKl-EB59dwQIect9RdkT&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-u3d6ioxfv",
    "name": "立鶴花",
    "scientificName": "Thunbergia erecta (Bentham) T. Anderson",
    "englishName": "King's Mantle, Bush Clock Vine",
    "aliases": [
      "立立鶴花",
      "直立山牽牛",
      "金魚木",
      "假朝顏"
    ],
    "family": "爵床科 (Acanthaceae) / 鄧伯花屬 (Thunbergia)",
    "dateAdded": "20260727",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1OUSou75gfq6FKGSCBriOusa1Wpqn7h3L&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "全年（盛花期為春季至秋季）",
    "fruitPeriod": "夏秋季節（蒴果喙狀）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高約 1–2 公尺，莖直立，分枝多，枝條細長微下垂。"
      },
      {
        "label": "葉片",
        "value": "葉對生，長卵形或披針形，葉緣波狀或有淺齒，深綠色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於葉腋，花冠漏斗狀，5 裂，花色深紫藍色或純白色，喉部鮮黃色，形似立鶴抬頭姿態。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，日照充足開花繁茂。",
      "humidity": "喜高溫多濕，生長期保持土壤濕潤，耐旱耐剪。",
      "waterQuality": "/ 土壤：肥沃且排水良好的砂質壤土。"
    },
    "references": [
      {
        "title": "農業知識入口網 - 立鶴花",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=27"
      },
      {
        "title": "維基百科 - 直立山牽牛",
        "url": "https://zh.wikipedia.org/zh-tw/%E7%9B%B4%E7%AB%8B%E5%B1%B1%E7%89%B5%E7%89%9B"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1OUSou75gfq6FKGSCBriOusa1Wpqn7h3L&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-dckr1m3z2",
    "name": "射干",
    "scientificName": "Iris domestica (L.) Goldblatt & Mabb. (同物異名：Belamcanda chinensis)",
    "englishName": "Blackberry Lily, Leopard Lily",
    "aliases": [
      "烏扇",
      "烏吹",
      "草薑",
      "鬼扇",
      "鳳翼",
      "扁竹",
      "冷水丹"
    ],
    "family": "鳶尾科 (Iridaceae) / 鳶尾屬 (Iris)（傳統分類為射干屬 Belamcanda）",
    "dateAdded": "20260727",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1X3pnAUQ_lVmgwyQvzw1Kt0-yALykpxZW&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季（約 6 月至 8 月）",
    "fruitPeriod": "夏末至秋季（約 8 月至 10 月）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "莖部 / 葉柄",
        "value": "多年生草本，株高約 60–120 公分；莖直立，實心，基部具抱莖之葉鞘。"
      },
      {
        "label": "葉片",
        "value": "葉互生，兩列排列成扁平扇狀，劍形或長披針形，長 20–60 公分，全緣，平行脈。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生二歧狀分枝聚傘花序；花被片 6 枚，橙黃色或橘紅色，散生深紅色或紫褐色斑點；花謝後扭轉捲曲；蒴果倒卵形，成熟時裂開露出如黑莓般光亮的黑色種子。"
      },
      {
        "label": "根莖 / 根系",
        "value": "具橫走之鮮黃色或黃褐色肉質根莖，鬚根發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，陽光充足則開花更繁茂。",
      "humidity": "耐旱性佳，忌長期積水，採「乾透澆透」原則。",
      "waterQuality": "/ 土壤：喜排水良好���富含有機質之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 射干",
        "url": "https://zh.wikipedia.org/zh-tw/%E5%B0%84%E5%B9%B2"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1X3pnAUQ_lVmgwyQvzw1Kt0-yALykpxZW&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-5diex3y47",
    "name": "粉萼鼠尾草",
    "scientificName": "Salvia farinacea Benth.",
    "englishName": "Mealycup Sage, Mealy Sage, Blue Sage",
    "aliases": [
      "粉藍鼠尾草",
      "藍鼠尾草",
      "修長鼠尾草",
      "藍花鼠尾草",
      "美洲鼠尾草"
    ],
    "family": "唇形科 (Lamiaceae) / 鼠尾草屬 (Salvia)",
    "dateAdded": "20260727",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1eBjwwJFXhWqCu3oloNDpbR0GSZDjiyQZ&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季至秋季（約 4 月至 10 月，溫暖地區可全年開花）",
    "fruitPeriod": "夏末至秋季（約 7 月至 11 月）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本（常作一年生栽培），株高約 30-80 公分；莖直立，近四稜形，分枝多，被白色粉狀短絨毛。"
      },
      {
        "label": "葉片",
        "value": "葉對生，長橢圓狀披針形，葉緣具細鋸齒或波狀齒，葉面鮮綠色，葉背微被白粉毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "輪傘花序組成頂生穗狀花序，長達 15-30 公分；花萼鐘狀，密被���紫色絨毛（呈粉狀感）；花冠唇形，藍紫色或紫水晶色。"
      },
      {
        "label": "根系 / 根莖",
        "value": "具發達主根及多數鬚根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，光照充足花色更豔麗、株型緊湊。",
      "humidity": "喜乾燥至中等濕度，極耐旱，忌積水爛根；採「乾透澆透」原則。",
      "waterQuality": "/ 土壤：喜排水良好、富含有機質之砂質壤土，耐微鹼性土壤。"
    },
    "references": [
      {
        "title": "維基百科 - 粉萼鼠尾草",
        "url": "https://zh.wikipedia.org/zh-tw/%E7%B2%89%E8%90%BC%E9%BC%A0%E5%B0%BE%E8%8D%89"
      },
      {
        "title": "認識植物 - 粉萼鼠尾草",
        "url": "http://kplant.biodiv.tw/%E7%B2%89%E8%90%BC%E9%BC%A0%E5%B0%BE%E8%8D%89/%E7%B2%89%E8%90%BC%E9%BC%A0%E5%B0%BE%E8%8D%89.htm"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1eBjwwJFXhWqCu3oloNDpbR0GSZDjiyQZ&sz=w1000",
        "caption": "(20260727)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1UnzOwxuluLb1OI1B3LKGSTKX8H61LxPI&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-ye9dtwt6k",
    "name": "彩葉草",
    "scientificName": "Coleus scutellarioides (L.) Benth.",
    "englishName": "Coleus, Painted Nettle",
    "aliases": [
      "五彩蘇",
      "錦紫蘇",
      "小鞘蕊花",
      "洋紫蘇",
      "五色草",
      "變葉草"
    ],
    "family": "唇形科 (Lamiaceae) / 鞘蕊花屬 (Coleus)",
    "dateAdded": "20260727",
    "locationNote": "@九九峰心之芳庭",
    "imageUrl": "https://drive.google.com/thumbnail?id=1TTep3-0QWf9hp1JtrbHMZqiMBocndZ1C&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（溫暖地區全年開花）",
    "fruitPeriod": "��季至冬季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "多年生草本，株高 30-90 公分，莖四方形，微被毛，基部木質化。"
      },
      {
        "label": "葉片",
        "value": "葉對生，心形或卵形，葉緣鋸齒狀，葉面鮮豔多色斑紋（紅、紫、黃、綠、粉）。"
      },
      {
        "label": "花朵 / 果實",
        "value": "頂生總狀花序，花小唇形，淡紫或藍紫色。"
      },
      {
        "label": "根系",
        "value": "鬚根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜陽光充足，光照充足葉色更鮮豔。",
      "humidity": "保持土壤濕潤，不耐積水與低溫凍害（<10℃）。",
      "waterQuality": "/ 土壤：肥沃疏鬆土壤，適時摘心促進分枝。"
    },
    "references": [
      {
        "title": "農業知識入口網 - 彩葉草",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=14612"
      },
      {
        "title": "台灣生物多樣性網路 - 小鞘蕊花",
        "url": "https://www.tbn.org.tw/taxa/bcd37921-89ac-4c04-b5fc-06e1b61fef7a"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1TTep3-0QWf9hp1JtrbHMZqiMBocndZ1C&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1IIpBC4urluUoTHbtMkJpHu7zLcvPRxea&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1bwRpu-sN5bRc-Fh82cdsqgx25fPTjZG6&sz=w1000",
        "caption": "(20260727@九九峰���之芳庭)"
      }
    ]
  },
  {
    "id": "plant-nkd2g11wg",
    "name": "美麗月見草",
    "scientificName": "Oenothera speciosa",
    "englishName": "Pink Evening Primrose, Showy Evening Primrose",
    "aliases": [
      "粉花月見草",
      "粉月見草",
      "待宵草",
      "晝月見草",
      "美麗待宵草"
    ],
    "family": "柳葉菜科 (Onagraceae) / 月見草屬 (Oenothera)",
    "dateAdded": "20260727",
    "locationNote": "@九九峰心之芳庭",
    "imageUrl": "https://drive.google.com/thumbnail?id=1l51j-sWFfX9v8WMR9H5T-UHDCP9u-ovY&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "4月至11月（盛花期5月至8月）",
    "fruitPeriod": "6月至11月",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "多年生草本植物，株高約 30-50 公分，莖直立或斜升。"
      },
      {
        "label": "葉片",
        "value": "葉互生，披針形至倒披針形，邊緣具不規則鋸齒 or 羽狀深裂。"
      },
      {
        "label": "花朵 / 果實",
        "value": "花單生於莖頂葉腋，花冠杯狀，4瓣，初開淡粉紅白轉濃粉紅，柱頭深裂呈十字星形。"
      },
      {
        "label": "根系",
        "value": "具地下走莖，擴展力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜光照充足環境，晝間亦開花。",
      "humidity": "耐旱性強，介質乾透再澆透。",
      "waterQuality": "/ 土壤：排水良好的砂質壤土。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1l51j-sWFfX9v8WMR9H5T-UHDCP9u-ovY&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-3uwodfnn3",
    "name": "鐵線蕨",
    "scientificName": "Adiantum capillus-veneris L. / Adiantum raddianum Presl",
    "englishName": "Maidenhair Fern, Delta Maidenhair Fern",
    "aliases": [
      "鐵絲草",
      "少女髮絲",
      "鐵線草",
      "銀杏蕨",
      "美人蕨"
    ],
    "family": "鳳尾蕨科 (Pteridaceae) / 鐵線蕨屬 (Adiantum)",
    "dateAdded": "20260727",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1sKJYpw87O1a8sGIKwL-qtu020DhwEeL1&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "無（蕨類植物不開花，靠孢子繁殖）",
    "fruitPeriod": "無",
    "sporePeriod": "夏秋季至全年皆可產生孢子囊群",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸",
        "value": "呈黑褐色至紫黑色，細長且具金屬光澤，質地堅硬如鐵絲。"
      },
      {
        "label": "葉片",
        "value": "薄革質或膜質，鮮綠色，二至三回羽狀複葉，羽片呈扇形或倒卵狀楔形，邊緣有小鋸齒或淺裂。"
      },
      {
        "label": "孢子囊群",
        "value": "著生於葉片背面邊緣反卷形成的假孢膜內，呈圓形或腎形。"
      },
      {
        "label": "根莖",
        "value": "根狀莖短而橫走，密被褐色薄膜質鱗片。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半陰與明亮散射光，切忌強光直射。",
      "humidity": "喜高空氣濕度（60%-80%），保持介質濕潤但切勿積水。",
      "waterQuality": "對自來水氯���敏感，建議靜置去氯或使用過濾水。"
    },
    "references": [
      {
        "title": "臺北典藏植物園 - 鐵線蕨",
        "url": "https://www.future.url.tw/plant/view/456"
      },
      {
        "title": "台灣植物資訊整合查詢系統 - 鐵線蕨",
        "url": "https://tai2.ntu.edu.tw/species/120%20002%2002%200"
      },
      {
        "title": "維基百科 - 鐵線蕨",
        "url": "https://zh.wikipedia.org/zh-tw/%E9%90%B5%E7%B7%9A%E8%95%A8"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1sKJYpw87O1a8sGIKwL-qtu020DhwEeL1&sz=w1000",
        "caption": "(20260727)"
      }
    ]
  },
  {
    "id": "plant-agvjo1cm7",
    "name": "豬毛蒿",
    "scientificName": "Artemisia scoparia",
    "englishName": "Redstem Wormwood",
    "aliases": [
      "假蒿",
      "因陳",
      "茵蔯",
      "草茵陳"
    ],
    "family": "菊科 (Asteraceae) / 蒿屬 (Artemisia)",
    "dateAdded": "20260727",
    "locationNote": "@九九峰心之芳庭",
    "imageUrl": "https://drive.google.com/thumbnail?id=1aVVrQ6lFGb81P_jH8rJ97qkb-S5PYcjE&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "7月至10月",
    "fruitPeriod": "8月至11月",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "一二年或多年生草本，株高 40-100 公分，莖直立且分枝多，紫色或紅褐色。"
      },
      {
        "label": "葉片",
        "value": "葉片極細裂呈線狀或絲狀，輕盈毛絨狀，具青草精油氣味。"
      },
      {
        "label": "花朵 / 果實",
        "value": "頭狀花序極小，多數生於枝端形成圓錐花序；瘦果長圓形。"
      },
      {
        "label": "根��",
        "value": "主根直立深紮。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照及乾燥向陽環境。",
      "humidity": "耐旱忌積水，保持介質排水良好。",
      "waterQuality": "/ 土壤：耐貧瘠砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 豬毛蒿",
        "url": "https://zh.wikipedia.org/zh-tw/%E7%8C%AA%E6%AF%9B%E8%92%BF"
      },
      {
        "title": "農業知識入口網 - 茵蔯蒿",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=27371"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1aVVrQ6lFGb81P_jH8rJ97qkb-S5PYcjE&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1sC6GXKgwHvrR5bbIPB9hiv2NOOsBjlw2&sz=w1000",
        "caption": "(20260727@九九峰心之芳庭)"
      }
    ]
  },
  {
    "id": "plant-6q8loxpxx",
    "name": "重瓣朱槿",
    "scientificName": "Hibiscus rosa-sinensis L. 'Rubro-plenus'",
    "englishName": "Double Red Hibiscus, China Rose",
    "aliases": [
      "扶桑",
      "佛桑",
      "大紅花",
      "重瓣扶桑"
    ],
    "family": "錦葵科 (Malvaceae) / 木槿屬 (Hibiscus)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Xs5nQgtkkEZVhL77WwTJ4aAyXq61go6C&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "全年（盛花期為春末至秋季）",
    "fruitPeriod": "秋季（蒴果罕見結實）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖��",
        "value": "常綠灌木，株高 1–3 公尺，莖直立，分枝多，木質化。"
      },
      {
        "label": "葉片",
        "value": "葉互生，廣卵形或狹卵形，長 5–10 公分，葉緣具粗鋸齒，深綠色具光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於上部葉腋，重瓣（多層花瓣疊生），鮮紅色，花冠直徑可達 10–15 公分，雄蕊柱與花柱特化融入重瓣花瓣中。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深紮，鬚根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，陽光充足則開花繁茂。",
      "humidity": "喜溫暖濕潤，採「乾透澆透」原則，忌長期積水。",
      "waterQuality": "/ 土壤：排水良好、富含有機質之微酸性砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 朱槿",
        "url": "https://zh.wikipedia.org/zh-tw/%E6%9C%B1%E6%A7%BF"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Xs5nQgtkkEZVhL77WwTJ4aAyXq61go6C&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-vfneoc75o",
    "name": "紫茉莉",
    "scientificName": "Mirabilis jalapa L.",
    "englishName": "Marvel of Peru, Four O'Clock",
    "aliases": [
      "煮飯花",
      "胭脂花",
      "晚香花",
      "洗澡花",
      "水粉花"
    ],
    "family": "紫茉莉科 (Nyctaginaceae) / 紫茉莉屬 (Mirabilis)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Y-Ktfrf2e5AQcauU9qE_530DdZW56wjf&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（約 6 月至 11 月）",
    "fruitPeriod": "夏末至冬季（約 8 月至 12 月）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本（常作一年生栽培），株高 50–100 公分，莖直立，節部膨大，分枝多。"
      },
      {
        "label": "葉片",
        "value": "葉對生，卵形或三角狀卵形，全緣，基部截形或心形。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生聚傘花序；無花瓣，花萼呈花冠狀（高腳碟狀），長約 3–5 公分，紫紅色、黃色、白色或雜色；常於傍晚開花，次晨閉合。"
      },
      {
        "label": "根莖 / 根系",
        "value": "具塊狀肉質根，形如黑薯。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境。",
      "humidity": "極易栽培，耐旱性佳，保持土壤適度濕潤。",
      "waterQuality": "/ 土壤：適應力極強，各種土壤皆可生長。"
    },
    "references": [
      {
        "title": "紫茉莉--維基百科",
        "url": "https://zh.wikipedia.org/wiki/%E7%B4%AB%E8%8C%89%E8%8E%89"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Y-Ktfrf2e5AQcauU9qE_530DdZW56wjf&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1JhFuYidlgg49uZovGmhatqArBPwGojVO&sz=w1000",
        "caption": "(20260707@大坑四號步道)"
      }
    ]
  },
  {
    "id": "plant-06gnjnc9l",
    "name": "金露花",
    "scientificName": "Duranta erecta L.",
    "englishName": "Golden Dewdrop, Pigeon Berry, Skyflower",
    "aliases": [
      "小葉金露花",
      "臺灣連翹",
      "金露木",
      "假連翹"
    ],
    "family": "馬鞭草科 (Verbenaceae) / 金露花屬 (Duranta)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1K0XwsLz1-2OzlJSluXJVL-eFbyxDwMBW&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春夏至秋季（4月–10月，溫暖地區全年開花）",
    "fruitPeriod": "夏末至冬季（成熟漿果呈亮麗橘黃色，如金色露滴）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木或小喬木，株高 2–5 公尺，枝條下垂，常具腋生銳刺。"
      },
      {
        "label": "葉片",
        "value": "葉對生，卵狀橢圓形，長 3–7 公分，葉緣前半部具鋸齒，鮮綠色有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "總狀花序腋生或頂生，成串下垂；花冠筒狀，淡紫色或紫藍色，5 裂，邊緣具微毛。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深，鬚根發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，光照越強開花越繁茂。",
      "humidity": "耐旱性強，採乾透澆透原則。",
      "waterQuality": "/ 土壤：適應力極強，排水良好之土壤即可。"
    },
    "references": [
      {
        "title": "維基百科 - 假連翹",
        "url": "https://zh.wikipedia.org/zh-tw/%E5%81%87%E8%BF%9E%E7%BF%B9"
      },
      {
        "title": "農業知識入口網 - 金露花",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=50"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1K0XwsLz1-2OzlJSluXJVL-eFbyxDwMBW&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1GkynlL60vhUjnm-79kqQE4nbdsBgCBAE&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1dd-2pmYNvtPo-BVU-UMcCej_YQpDF2SH&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-54bbwx8ru",
    "name": "薑黃",
    "scientificName": "Curcuma longa L.",
    "englishName": "Turmeric, Indian Saffron",
    "aliases": [
      "黃薑",
      "寶鼎香",
      "乙金",
      "毛薑黃",
      "郁金"
    ],
    "family": "薑科 (Zingiberaceae) / 薑黃屬 (Curcuma)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=15sWOIYz6h2WRdXPGzvGCs_eRIvE4Y-XG&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（約 8 月至 10 月）",
    "fruitPeriod": "秋季（罕見結實）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本，株高 1–1.5 公尺；假莖由葉鞘重疊而成，地下具發達��大的肉質根莖（塊莖呈橙黃色，具濃郁芳香）。"
      },
      {
        "label": "葉片",
        "value": "葉基生，大型，長圓形或狹橢圓形，長 30–50 公分，寬 10–18 公分，先端漸尖，葉柄長呈鞘狀。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "穗狀花序自假莖抽出；苞片呈綠色或上部微帶淡粉紅色，淡黃色真花藏於苞片內；花冠管狀，唇瓣黃色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下根莖分枝呈手指狀，斷面呈鮮豔橙黃色，富含薑黃素（Curcumin）；鬚根末端常膨大成紡錘狀塊根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照（高溫溫暖環境）。",
      "humidity": "生長季需保持土壤濕潤，排水需良好；冬季落葉休眠期需控水乾爽防根莖腐爛。",
      "waterQuality": "/ 土壤：喜肥沃、排水良好且富含有機質之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 薑黃",
        "url": "https://zh.wikipedia.org/zh-tw/%E5%A7%9C%E9%BB%84"
      },
      {
        "title": "農業知識入口網 - 薑黃",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=37248"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=15sWOIYz6h2WRdXPGzvGCs_eRIvE4Y-XG&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-wuj9qif2t",
    "name": "鐵釘蘭",
    "scientificName": "Papilionanthe teres (Roxb.) Lindl.",
    "englishName": "Pencil Orchid, Terete-leaved Vanda",
    "aliases": [
      "棒葉萬代蘭",
      "圓葉萬代蘭",
      "棒葉蘭",
      "圓柱葉萬代蘭"
    ],
    "family": "蘭科 (Orchidaceae) / 鳳蝶蘭屬 (Papilionanthe)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1NQyP2kW7VjqVow7Wbo4lkOWkPwPSrD8Q&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春末至夏季（5月–8月）",
    "fruitPeriod": "秋季（蒴果長柱狀）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "附生或地生攀援蘭花，莖細長直立或攀援，可達 1–2 公尺，具多數氣生根。"
      },
      {
        "label": "葉片",
        "value": "葉互生，肉質呈圓柱形（棒狀/鉛筆狀/硬如鐵釘），長 10–20 公分，直徑約 3–5 毫米，先端漸尖，極耐旱。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "總狀花序側生，具 2–6 朵花；花大而美麗，直徑 5–10 公分，花瓣粉紅色至紫紅色，唇瓣 3 裂，中裂片深紫紅色，基部具黃色斑點與距。"
      },
      {
        "label": "根莖 / 根系",
        "value": "粗壯發達之氣生根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜強日光（全日照至高強度散射光），光照不足不易開花。",
      "humidity": "喜高空氣濕度，採「高濕通風」原則，根部忌長期積水。",
      "waterQuality": "/ 土壤：蛇木板、樹皮、水苔或���綁栽培，排水透氣性需極佳。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1NQyP2kW7VjqVow7Wbo4lkOWkPwPSrD8Q&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-934qwm614",
    "name": "薑荷花",
    "scientificName": "Curcuma alismatifolia",
    "englishName": "Siam Tulip, Summer Tulip",
    "aliases": [
      "暹羅鬱金香",
      "觀賞薑"
    ],
    "family": "薑科 (Zingiberaceae) / 薑黃屬 (Curcuma)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1AJPUO4sxjv-Ee5qE-IjDwnprz465X9ag&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "6月至10月（夏季盛開）",
    "fruitPeriod": "秋季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "多年生球根草本植物，株高約 30-80 公分，具地下球莖。"
      },
      {
        "label": "葉片",
        "value": "葉長橢網狀或披針形，直立革質，鮮綠色，形似蕉葉或薑葉。"
      },
      {
        "label": "花朵 / 觀賞苞片",
        "value": "頂生花序，上部具有層層疊疊亮麗粉紅色的觀賞苞片，真正的小花藏於下方苞片縫隙中，呈唇形紫白色。"
      },
      {
        "label": "根系",
        "value": "具肉質地下球根及貯藏根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "每日 3-6 小時明亮散射光或晨光，正午強光需遮陰。",
      "humidity": "掌握「見乾見濕」原則，避免盆���積水爛根。",
      "waterQuality": "/ 土壤：排水良好的富含有機質壤土。冬季10月後進入休眠期應控水停水。"
    },
    "references": [
      {
        "title": "綠色生活 - 薑荷花栽培資訊",
        "url": "https://www.green.com.tw/2021/05/30/curcuma_alismatifolia/"
      },
      {
        "title": "農業知識入口網 - 薑荷花",
        "url": "https://kmweb.moa.gov.tw/subject/news.php?id=1108&news_id=7124"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1AJPUO4sxjv-Ee5qE-IjDwnprz465X9ag&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-1q21k3oot",
    "name": "紅仔珠",
    "scientificName": "Breynia officinalis Hemsl.",
    "englishName": "Coffee Bush, Formosan Breynia",
    "aliases": [
      "七星針",
      "山翠花",
      "樹珊瑚",
      "大本七星針",
      "紅心仔"
    ],
    "family": "葉下珠科 (Phyllanthaceae) / 紅仔珠屬 (Breynia)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1sS9NjGegwCPnYmbB_ItEL1T1aC6kvky1&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏至秋季（5月–10月）",
    "fruitPeriod": "秋至冬季（8月–12月，成熟時呈鮮紅色球形漿果）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–3 公尺，分枝多，小枝呈羽狀排列。"
      },
      {
        "label": "葉片",
        "value": "葉互生，排成兩列，卵形至長橢圓形，長 2–4 公分，���緣，表面綠色，背面帶白粉狀。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花小，單性，無花瓣，腋生；雄花黃綠色，下垂；雌花花萼宿存變大。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根發達，深根性。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境。",
      "humidity": "耐旱性佳，保持土壤排水良好，採乾透澆透。",
      "waterQuality": "/ 土壤：適應性強，耐貧瘠與微酸性砂質壤土。"
    },
    "references": [
      {
        "title": "台灣生物多樣性網絡 - 紅仔珠",
        "url": "https://www.tbn.org.tw/taxa/4d5ecf1a-1f30-4a1e-b0a8-b125780f0b48"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1sS9NjGegwCPnYmbB_ItEL1T1aC6kvky1&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-4glj4svaz",
    "name": "美人蕉",
    "scientificName": "Canna indica L.",
    "englishName": "Indian Shot, Canna Lily",
    "aliases": [
      "紅花美人蕉",
      "曇華",
      "蓮焦花",
      "水蕉花"
    ],
    "family": "美人蕉科 (Cannaceae) / 美人蕉屬 (Canna)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1crBUCegrmJQsHKXpOQmzIb6Y2Dx1ZEaS&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏至秋季（6月–11月，熱帶地區全年可開花）",
    "fruitPeriod": "秋季（蒴果球形，具軟刺，成熟時黑色）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本，株高 1–2 公尺，具粗壯肉質塊莖，莖直立無分枝。"
      },
      {
        "label": "葉片",
        "value": "葉互生，大型，廣披針形或長橢圓形，長 30–50 公分，具明顯鞘狀葉柄。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "總狀花序頂生；花大而鮮豔，鮮紅色或朱紅色，退化雄蕊特化為花瓣狀。"
      },
      {
        "label": "根莖 / 根系",
        "value": "具發達的塊狀地下根莖。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，陽光充足則花色鮮豔。",
      "humidity": "喜濕潤環境，耐水濕，適合水邊或保水力佳之土壤。",
      "waterQuality": "/ 土壤：喜肥沃腐殖質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 美人蕉",
        "url": "https://zh.wikipedia.org/wiki/%E7%BE%8E%E4%BA%BA%E8%95%89"
      },
      {
        "title": "農業知識入口網 - 美人蕉",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=37291"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1crBUCegrmJQsHKXpOQmzIb6Y2Dx1ZEaS&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-bfc9ee9l9",
    "name": "馬齒牡丹",
    "scientificName": "Portulaca umbraticola Kunth",
    "englishName": "Wingpod Purslane, Crowned Purslane",
    "aliases": [
      "太陽花",
      "半日花",
      "大花萬壽菊",
      "闊葉半支蓮"
    ],
    "family": "馬齒莧科 (Portulacaceae) / 馬齒莧屬 (Portulaca)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1YKyb_U6SFG28UWxjGyjfPTQ13FXUTgZE&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春末至秋季（5月–11月，強光下盛開）",
    "fruitPeriod": "夏秋季節（蓋裂蒴果）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生或多年生多肉草本，莖匍匐或斜昇，肉質多汁，常帶紫紅色。"
      },
      {
        "label": "葉片",
        "value": "葉互生，扁平肉質，倒卵形或匙形，長 1.5–3 公分，全緣，光滑無毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生或數朵頂生；花瓣 5 枚，桃紅色、鮮紅色、黃色或白色；具「半日花」特性，早晨受光開放，午後閉合。"
      },
      {
        "label": "根莖 / 根系",
        "value": "淺根系，節部易生不定根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，光照不足則花朵無法充分開放。",
      "humidity": "極耐旱，忌積水，土壤過濕易爛根爛莖。",
      "waterQuality": "/ 土壤：喜排水極良好的砂質壤土。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1YKyb_U6SFG28UWxjGyjfPTQ13FXUTgZE&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-5o1vo3b4m",
    "name": "翠蘆莉",
    "scientificName": "Ruellia simplex C. Wright",
    "englishName": "Mexican Petunia, Mexican Bluebell",
    "aliases": [
      "柳葉翠蘆莉",
      "藍花草",
      "日日見花",
      "狹葉翠蘆莉"
    ],
    "family": "爵床科 (Acanthaceae) / 翠蘆莉屬 (Ruellia)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1sCMgzJUVIkJ87s74L_qCqcYNliIwtArl&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季至秋季（4月–10月，晨開夕落，日日見花）",
    "fruitPeriod": "夏秋季節（蒴果長條形，成熟爆裂）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本，株高 30–100 公分，莖直立，節部膨大，常帶暗紫色，分枝多。"
      },
      {
        "label": "葉片",
        "value": "葉對生，線狀披針形（柳葉狀），長 10–15 公分，全緣，紅褐色至深綠色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生聚傘花序；花冠喇叭狀/高腳碟狀，5 裂，藍紫色（亦有粉紅與白色品種），花徑約 5 公分；晨開夕落但花期極長。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根系發達，生長迅速。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，陽光越足開花越多。",
      "humidity": "耐濕亦耐旱，可植於水邊，適應力強。",
      "waterQuality": "/ 土壤：對土壤不挑剔，極易管理。"
    },
    "references": [
      {
        "title": "維基百科 - 翠蘆莉",
        "url": "https://zh.wikipedia.org/wiki/%E7%B4%AB%E8%8A%B1%E8%8A%A6%E8%8E%89%E8%8D%89"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1sCMgzJUVIkJ87s74L_qCqcYNliIwtArl&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-db0vj55wt",
    "name": "洋落葵",
    "scientificName": "Anredera cordifolia (Ten.) Steenis",
    "englishName": "Heartleaf Madevine, Madeira-vine",
    "aliases": [
      "川七",
      "雲南白藥子",
      "藤子三七"
    ],
    "family": "落葵科 (Basellaceae) / 落葵屬 (Anredera)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Z0VmlPesdAbRifNViz6B3vAHp-B1gj6p&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "秋季（8月–11月）",
    "fruitPeriod": "罕見結實，主要靠珠芽（零餘子）無性繁殖",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生肉質藤本，莖蔓性長達數公尺，紫紅色或綠色，葉腋常生瘤狀珠芽（零餘子）。"
      },
      {
        "label": "葉片",
        "value": "葉互生，肉質肥厚，心形或廣卵形，長 5–10 公分，全緣，表面綠色具光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "總狀花序腋生或頂生，下垂呈長穗狀（可達 10–30 公分）；花小，白色或綠白色，具濃郁香氣，密生。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下具塊狀肉質根莖。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半日照至全日照環境，耐陰性亦佳。",
      "humidity": "喜溫暖濕潤，生長迅速，需給予充足水分。",
      "waterQuality": "/ 土壤：富含有機質之肥沃壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 藤三七",
        "url": "https://zh.wikipedia.org/zh-tw/%E8%97%A4%E4%B8%89%E4%B8%83"
      },
      {
        "title": "農業知識入口網 - 川七",
        "url": "https://kmweb.moa.gov.tw/redirect_files.php?id=163957"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Z0VmlPesdAbRifNViz6B3vAHp-B1gj6p&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-81fx3bw9b",
    "name": "數珠珊瑚",
    "scientificName": "Rivina humilis L.",
    "englishName": "Bloodberry, Rouge Plant",
    "aliases": [
      "紅珠仔",
      "珍珠一串",
      "觀音珊瑚"
    ],
    "family": "商陸科 (Phytolaccaceae) / 珊瑚珠屬 (Rivina)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=11I5uX5TRPixXtp6KfHL_o8li9t2F_rm4&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（溫暖地區全年開花）",
    "fruitPeriod": "春末至冬季（花果並存）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本或半灌木，株高 30–100 公分，枝條柔軟，半蔓性。"
      },
      {
        "label": "葉片",
        "value": "葉互生，卵形或心形，長 5–10 公分，全緣，先端漸尖。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "總狀花序頂生或腋生；花小，白色或粉紅色，4 瓣；漿果球形，成熟時呈亮麗鮮紅色（如珊瑚珠），結實纍纍串垂。"
      },
      {
        "label": "根系 / 根莖",
        "value": "鬚根發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半陰與明亮散射光，耐陰性極佳。",
      "humidity": "喜溫暖濕潤環境，採「見乾見濕」原則。",
      "waterQuality": "/ 土壤：排水良好之腐植土。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=11I5uX5TRPixXtp6KfHL_o8li9t2F_rm4&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-9lphxe5u9",
    "name": "九重葛",
    "scientificName": "Bougainvillea spectabilis Willd.",
    "englishName": "Paperflower, Bougainvillea",
    "aliases": [
      "三角梅",
      "南美紫茉莉",
      "葉子花",
      "刺九重葛"
    ],
    "family": "紫茉莉科 (Nyctaginaceae) / 九重葛屬 (Bougainvillea)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1bjAFjx-exYnN7iSM0GjppV4bMWurmpFQ&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（盛花期為秋季至春季）",
    "fruitPeriod": "罕見結實（瘦果）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠藤本或蔓性灌木，莖具利���，攀援力強。"
      },
      {
        "label": "葉片",
        "value": "葉互生，卵形或廣卵形，全緣，深綠色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "真正的小花為黃白色筒狀；外圍具 3 枚大而色彩鮮豔之紙質苞片（俗稱花瓣），顏色有洋紅、粉紅、紫、白、黃、橘等。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系深廣，耐瘠薄。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，日照越強開花越燦爛（強光促進花芽分化）。",
      "humidity": "極耐旱，忌積水；採「扣水（適度乾旱）」可促進開花。",
      "waterQuality": "/ 土壤：排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 九重葛",
        "url": "https://zh.wikipedia.org/zh-tw/%E5%8F%B6%E5%AD%90%E8%8A%B1"
      },
      {
        "title": "農業知識入口網 - 九重葛",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=2"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1bjAFjx-exYnN7iSM0GjppV4bMWurmpFQ&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-z8t72k1uf",
    "name": "日日春",
    "scientificName": "Catharanthus roseus (L.) G. Don",
    "englishName": "Madagascar Periwinkle",
    "aliases": [
      "長春花",
      "日日草",
      "日日新",
      "雁來紅",
      "四時春"
    ],
    "family": "夾竹桃科 (Apocynaceae) / 長春花屬 (Catharanthus)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1VJ1IkByIj1eWyw75Em-2MFDh70lNUyBU&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（溫暖地區每日開花）",
    "fruitPeriod": "全年（蓇葖果成對直立）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本或半灌木，株高 30–60 公分，莖直立，具乳汁，分枝多。"
      },
      {
        "label": "葉片",
        "value": "葉對生，長橢網狀或倒卵形，長 3–7 公分，全緣，葉面深綠有光澤，主脈白色明顯。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生或數朵頂生/腋生，高腳碟狀，5 裂，花色有粉紅、紫紅、白、紅心等；花期極長。"
      },
      {
        "label": "根莖 / 根系",
        "value": "直根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，光照越足開花越繁茂。",
      "humidity": "耐旱忌積水，排水不良易爛根。",
      "waterQuality": "/ 土壤：排水良好的砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 長春花",
        "url": "https://zh.wikipedia.org/zh-tw/%E9%95%B7%E6%98%A5%E8%8A%B1"
      },
      {
        "title": "農業知識入口網 - 長春花",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=15"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1VJ1IkByIj1eWyw75Em-2MFDh70lNUyBU&sz=w1000",
        "caption": "(20260722@田中森林公園���道)"
      }
    ]
  },
  {
    "id": "plant-qbvhg7ifh",
    "name": "杠板歸",
    "scientificName": "Persicaria perfoliata (L.) H. Gross",
    "englishName": "Asiatic Tearthumb, Mile-a-Minute Weed",
    "aliases": [
      "蛇倒退",
      "刺犁頭",
      "河霸網",
      "貫葉蓼",
      "三角鹽酸"
    ],
    "family": "蓼科 (Polygonaceae) / 蓼屬 (Persicaria)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1uNnJ5zgueNGGfP9bpV-BXTpD3Kswqh0_&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（約 6 月至 10 月）",
    "fruitPeriod": "秋季至冬季（約 8 月至 12 月）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生蔓性草本，莖攀援，具倒鉤刺（故稱蛇倒退），具圓盤狀抱莖之葉鞘（託葉）。"
      },
      {
        "label": "葉片",
        "value": "葉互生，正三角形，長 3–7 公分，全緣，葉柄盾狀著生於葉片近基部，葉背脈上具倒刺。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "短穗狀花序頂生；花小，綠白色或粉紅色；肉質花被在果期增大變為深藍色/紫藍色，包裹黑色球形瘦果。"
      },
      {
        "label": "根系 / 根莖",
        "value": "鬚根系。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境。",
      "humidity": "喜濕潤環境，常生於溝邊、水岸與路旁。",
      "waterQuality": "/ 土壤：適應力極強。"
    },
    "references": [
      {
        "title": "維基百科 - 杠板歸",
        "url": "https://zh.wikipedia.org/zh-tw/%E6%9D%A0%E6%9D%BF%E5%BD%92"
      },
      {
        "title": "農業知識入口網 - 杠板歸",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=53224"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1uNnJ5zgueNGGfP9bpV-BXTpD3Kswqh0_&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-kp68s878u",
    "name": "長穗木",
    "scientificName": "Stachytarpheta jamaicensis (L.) Vahl",
    "englishName": "Jamaica Vervain, Blue Snakeweed",
    "aliases": [
      "藍長穗木",
      "木本馬鞭草",
      "假馬鞭",
      "玉龍鞭"
    ],
    "family": "馬鞭草科 (Verbenaceae) / 長穗木屬 (Stachytarpheta)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1jWHkW5PLowRxQ-L8ANKhMfiw6U1BDOst&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "全年（盛花期為春季至秋季）",
    "fruitPeriod": "夏秋季節",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠半木質化草本或小灌木，株高 1–1.5 公尺，莖四稜形，分枝多。"
      },
      {
        "label": "葉片",
        "value": "葉對生，卵形或長橢圓形，葉緣鋸齒狀，葉面皺縮。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生長鞭狀穗狀花序（長可達 20–40 公分）；花小，筒狀，藍紫色，由下往上依次點狀開放。"
      },
      {
        "label": "根系 / 根莖",
        "value": "直根系強健。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，光照越足開花越好。",
      "humidity": "極耐旱，保持土壤排水良好。",
      "waterQuality": "/ 土壤：適應性強，耐貧瘠土壤。"
    },
    "references": [
      {
        "title": "農業知識入口網 - 長穗木",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=37221"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1jWHkW5PLowRxQ-L8ANKhMfiw6U1BDOst&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-f2vaabae3",
    "name": "瑪瑙珠",
    "scientificName": "Solanum diphyllum L.",
    "englishName": "Two-flower Nightshade, Twin-leaved Nightshade",
    "aliases": [
      "玉珊瑚",
      "雙葉茄",
      "二葉茄"
    ],
    "family": "茄科 (Solanaceae) / 茄屬 (Solanum)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1YwnkSniRjBVW1fy-JRH8Jy5ethIkpsub&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（約 4 月至 10 月）",
    "fruitPeriod": "夏季至冬季（約 6 月至 12 月）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "直立灌木，株高 1–2 公尺，莖無刺，分枝多。"
      },
      {
        "label": "葉片",
        "value": "葉假對生（每節著生大小兩葉），長橢圓形或倒披針形，全緣。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "聚傘花序與葉對生；花冠白色，5 深裂，星狀；漿果球形，熟時由綠轉鮮橘黃色/橙紅色，直徑約 1 公分，結實纍纍。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境。",
      "humidity": "耐旱性佳，保持土壤適度濕潤。",
      "waterQuality": "/ 土壤：適應力強，排水良好之土壤即可。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1YwnkSniRjBVW1fy-JRH8Jy5ethIkpsub&sz=w1000",
        "caption": "(20260722@田中森林公園步道)"
      }
    ]
  },
  {
    "id": "plant-38xjpg0yk",
    "name": "黃時鐘花",
    "scientificName": "Turnera ulmifolia L.",
    "englishName": "Yellow Alder, Yellow Buttercup",
    "aliases": [
      "午時花",
      "黃時鐘���",
      "榆葉時鐘花"
    ],
    "family": "時鐘花科 (Turneriaceae) / 時鐘花屬 (Turnera)",
    "dateAdded": "20260722",
    "locationNote": "@田中森林公園步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1BT641VBNiPJpRMwZucNaB5iQKd6jgk_G&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "全年（盛花期為春季至秋季）",
    "fruitPeriod": "夏秋季節（蒴果）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生常綠亞灌木，株高 30–100 公分，莖直立，枝條密生。"
      },
      {
        "label": "葉片",
        "value": "葉互生，披針形或長橢圓形，葉緣具粗鋸齒，葉基部具一對腺體。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於葉腋，花冠杯狀，5 瓣，鮮黃色，花喉部深黃色；花朵於上午開放，午後閉合（故稱午時花）。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系強健。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，陽光充足每日開花。",
      "humidity": "喜高溫多濕，採「見乾見濕」原則。",
      "waterQuality": "/ 土壤：排水良好的腐植土或壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 黃時鐘花",
        "url": "https://zh.wikipedia.org/zh-tw/%E9%BB%84%E6%97%B6%E9%92%9F%E8%8A%B1"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1BT641VBNiPJpRMwZucNaB5iQKd6jgk_G&sz=w1000",
        "caption": "(20260722@田中森林���園步道)"
      }
    ]
  },
  {
    "id": "plant-w1pxg19ag",
    "name": "朱槿",
    "scientificName": "Hibiscus rosa-sinensis L.",
    "englishName": "Chinese Hibiscus, Tropical Hibiscus, Rose of China",
    "aliases": [
      "扶桑",
      "大紅花",
      "佛桑",
      "赤槿",
      "佛桑花",
      "中國薔薇"
    ],
    "family": "錦葵科 (Malvaceae) / 木槿屬 (Hibiscus)",
    "dateAdded": "20260716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Cjmpnmwp8c2vJonLKt3WvU9-ti6felzI&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "全年開花（以春季至秋季最盛）",
    "fruitPeriod": "秋季至冬季（蒴果卵球形，栽培種極少結實）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–3 公尺；莖幹直立，分枝多，樹皮灰白色。"
      },
      {
        "label": "葉片",
        "value": "葉互生，廣卵形或狹卵形，長 5–10 公分，全緣或前半部具粗鋸齒，表面深綠色具光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於上部葉腋，大而顯眼；花冠喇叭狀，5 瓣，鮮紅色；雄蕊柱長伸出花冠外，頂端具多數黃色花藥與 5 裂柱頭。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系發達，耐修剪。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，日光照射充足則花開繁茂鮮豔。",
      "humidity": "喜濕潤，夏季生長旺盛期需充足水分，忌積��。",
      "waterQuality": "/ 土壤：喜肥沃、排水良好之微酸性壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 朱槿",
        "url": "https://zh.wikipedia.org/zh-tw/%E6%9C%B1%E6%A7%BF"
      },
      {
        "title": "農業知識入口網 - 朱槿",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=29"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Cjmpnmwp8c2vJonLKt3WvU9-ti6felzI&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-fj99dn1bz",
    "name": "黃鐘花",
    "scientificName": "Tecoma stans (L.) Juss. ex Kunth",
    "englishName": "Yellow Elder, Yellow Bells, Yellow Trumpetbush",
    "aliases": [
      "金黃風鈴",
      "黃花風鈴",
      "黃金風鈴",
      "立黃鐘"
    ],
    "family": "紫葳科 (Bignoniaceae) / 黃鐘花屬 (Tecoma)",
    "dateAdded": "20260716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1s1bYaok-3A0Wsz3X6pvy-2dB4uixBUof&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年開花（以春夏秋季最盛）",
    "fruitPeriod": "秋季至冬季（長角狀蒴果）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠小喬木或灌木，株高 2–5 公尺；樹皮灰色，分枝多，小枝微具毛。"
      },
      {
        "label": "葉片",
        "value": "奇數羽狀複葉，對生，小葉 5–13 枚，卵狀披針形，長 4–10 公分，葉緣具鋸齒，鮮綠色。"
      },
      {
        "label": "花朵 / 孢子��群",
        "value": "頂生總狀或圓錐花序；花冠喇叭狀/鐘形，鮮黃色，5 裂，花喉具紅色縱條紋，具芳香。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深，根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，陽光充足則開花不斷。",
      "humidity": "耐旱性強，採乾透澆透原則，忌長期積水。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 黃鐘花",
        "url": "https://zh.wikipedia.org/wiki/%E9%BB%84%E9%92%9F%E8%8A%B1%E5%B1%9E"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1s1bYaok-3A0Wsz3X6pvy-2dB4uixBUof&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-gcc44s5ur",
    "name": "構樹",
    "scientificName": "Broussonetia papyrifera (L.) L.H.Luo ex Vent.",
    "englishName": "Paper Mulberry, Tapa Cloth Tree",
    "aliases": [
      "鹿仔樹",
      "穀樹",
      "楮樹",
      "鈔票樹",
      "奶樹",
      "野楊梅"
    ],
    "family": "桑科 (Moraceae) / 構樹屬 (Broussonetia)",
    "dateAdded": "20260716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1FY-LX2UPoYtG2w45TYtvXoPjYlgXxQxy&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季（3月–5月，雌雄異株）",
    "fruitPeriod": "初夏至夏季（6月–7月，成熟時呈亮橘紅色球形聚合果）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉喬木，株高可達 10–20 公尺；樹皮灰褐色，枝條粗壯，全株富含白色乳汁。"
      },
      {
        "label": "葉片",
        "value": "葉互生，廣卵形或心形，長 10–20 公分，單葉或深裂（幼樹葉片常呈三至五深裂，成樹全緣），葉面粗糙密被硬毛，葉背密生絨毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "雌雄異株；雄花序躉狀穗狀下垂，黃綠色；雌花序球形頭狀，具紅紫色絲狀花柱。"
      },
      {
        "label": "果實 / 根系",
        "value": "聚合果球形，直徑 2–3 公分，成熟時呈鮮橘紅色，肉質多汁；根系發達深紮，萌蘖力極強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，陽光充足生長迅速。",
      "humidity": "極耐旱，亦耐水濕。",
      "waterQuality": "/ 土壤：適應力極強，耐貧瘠、鹽鹼與污染環境。"
    },
    "references": [
      {
        "title": "維基百科 - 構樹",
        "url": "https://zh.wikipedia.org/zh-tw/%E6%9E%84%E6%A0%91"
      },
      {
        "title": "農業知識入口網 - 構樹",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=39514"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1FY-LX2UPoYtG2w45TYtvXoPjYlgXxQxy&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-i73e7jh7m",
    "name": "樹蘭",
    "scientificName": "Aglaia odorata Lour.",
    "englishName": "Chinese Perfume Plant, Mock Lime, Orchid Tree",
    "aliases": [
      "米蘭",
      "米仔蘭",
      "珠蘭",
      "木珠蘭",
      "樹蘭花",
      "秋蘭"
    ],
    "family": "楝科 (Meliaceae) / 樹蘭屬 (Aglaia)",
    "dateAdded": "20260716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1aJVVQgSnKcMAnP9z_YzN5qLuoslcqkj-&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏秋季（6月–10月，花朵極具清香）",
    "fruitPeriod": "秋季至冬季（漿果狀蒴果，卵形，成熟時呈橙紅色）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木或小喬木，株高 2–5 公尺；樹冠圓整，分枝多而密。"
      },
      {
        "label": "葉片",
        "value": "奇數羽狀複葉，互生，小葉 3–5 枚，倒卵形或匙形，長 3–7 公分，全緣，表面深綠色有光澤，葉軸具狹翅。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生圓錐花序；花極小，球形，金黃色，直徑僅約 2 毫米，極似金黃色米粒（故稱米蘭）；花香濃郁優雅。"
      },
      {
        "label": "根莖 / 根系",
        "value": "深根性，根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，充足陽光可促進花芽分化與開花。",
      "humidity": "喜溫暖濕潤，保持土壤適度濕潤，忌積水爛根。",
      "waterQuality": "/ 土壤：喜疏鬆肥沃、排水良好的微酸性砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 米仔蘭",
        "url": "https://zh.wikipedia.org/zh-tw/%E7%B1%B3%E4%BB%94%E5%85%B0"
      },
      {
        "title": "農業知識入口網 - 樹蘭",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=105"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1aJVVQgSnKcMAnP9z_YzN5qLuoslcqkj-&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-b4hlck6aa",
    "name": "鴨跖草",
    "scientificName": "Commelina communis L.",
    "englishName": "Asiatic Dayflower, Whitemouth Dayflower",
    "aliases": [
      "竹葉菜",
      "藍花菜",
      "碧竹子",
      "水竹子",
      "鴨仔草"
    ],
    "family": "鴨跖草科 (Commelinaceae) / 鴨跖草屬 (Commelina)",
    "dateAdded": "20260716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1TvdJe21W0AP5zmbPTsk-Acd3V8EpzsJv&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（6月–9月，晨開午閉，故稱 Dayflower）",
    "fruitPeriod": "夏末至秋季（蒴果橢圓形，內含黑色種子）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生草本，莖匍匐斜昇，肉質多汁，長 30–60 公分，節處易生根。"
      },
      {
        "label": "葉片",
        "value": "葉互生，披針形或卵狀披針形，長 4–9 公分，寬 1.5–3 公分，全緣，基部成鞘狀抱莖。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "心形總苞片內抽出聚傘花序；花��� 3 枚，上方 2 枚大型呈鮮艷深藍色，下方 1 枚小型白色；雄蕊 6 枚，其中 3 枚退化雄蕊呈黃色十字形。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根系，節部極易萌生新根。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半日照至明亮散射光環境。",
      "humidity": "極喜濕潤環境，耐水濕。",
      "waterQuality": "/ 土壤：適應力極強，任何濕潤土壤均可生長。"
    },
    "references": [
      {
        "title": "維基百科 - 鴨跖草",
        "url": "https://zh.wikipedia.org/wiki/%E9%B8%AD%E8%B7%96%E8%8D%89"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1TvdJe21W0AP5zmbPTsk-Acd3V8EpzsJv&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-3hmsynk4p",
    "name": "蛺蝶花",
    "scientificName": "Caesalpinia pulcherrima (L.) Sw.",
    "englishName": "Peacock Flower, Red Bird of Paradise, Pride of Barbados",
    "aliases": [
      "金鳳花",
      "莿桐",
      "番蝴蝶",
      "洋金鳳",
      "蝴蝶花",
      "孔雀花"
    ],
    "family": "豆科 (Fabaceae / Caesalpinioideae) / 雲實屬 (Caesalpinia)",
    "dateAdded": "20260716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1dBVCxqSHW-NjvpXy4FflyDIbFBNJqYbV&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（5月–11月，熱帶地區全年）",
    "fruitPeriod": "秋季至冬季（扁平莢果，成熟時由綠轉黑褐色裂開）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉灌木或小喬木，株高 1.5–3 公尺；枝條常具疏生銳刺。"
      },
      {
        "label": "葉片",
        "value": "二回羽狀複葉，互生，小葉長橢圓形，長 1–2 公分，全緣，薄革質，對生。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生或腋生總狀花序；花大且色彩鮮豔，鮮紅與橙黃相間，花瓣 5 枚，邊緣波狀皺褶；雄蕊 10 枚，花絲細長深紅色，突出花冠外如蝴蝶觸角與鳳尾。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根發達，具固氮根瘤。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜強光與全日照，耐熱高溫。",
      "humidity": "耐旱性佳，採乾透澆透，忌土壤排水不良。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "農牧改良廠--黃蝴蝶",
        "url": "https://www.kdais.gov.tw/ws.php?id=2894"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1dBVCxqSHW-NjvpXy4FflyDIbFBNJqYbV&sz=w1000",
        "caption": "(20260716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-8sw8m2ps3",
    "name": "百合竹",
    "scientificName": "Dracaena reflexa",
    "englishName": "Song of India, Reflexed Dracaena",
    "aliases": [
      "黃金百合竹",
      "短葉竹椒草",
      "富貴竹屬"
    ],
    "family": "天門冬科 (Asparagaceae) / 龍血樹屬 (Dracaena)",
    "dateAdded": "20260716",
    "locationNote": "",
    "imageUrl": "https://drive.google.com/thumbnail?id=1O1J_5KP_bGQLT7dblr67f9i1fGlyVTdk&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "冬末至春季（室內較少開花）",
    "fruitPeriod": "春季",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "株型與莖幹",
        "value": "常綠灌木，姿態挺拔，莖幹能自然彎曲形成線條感。"
      },
      {
        "label": "葉片",
        "value": "葉劍狀披針形，革質光滑，黃金品種邊緣具金黃縱向條紋。"
      },
      {
        "label": "花朵 / 果實",
        "value": "頂生總狀花序，花小白色或黃白色，具清香；漿果小球形。"
      },
      {
        "label": "根系",
        "value": "肉質根系。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜明亮散射光，耐半陰，避開烈日直射。",
      "humidity": "耐旱也耐濕，掌握「寧乾勿濕」，避開冷氣出風口。",
      "waterQuality": "/ 土壤：排水良好砂質壤土，亦可水培養護。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1O1J_5KP_bGQLT7dblr67f9i1fGlyVTdk&sz=w1000",
        "caption": "(20260716)"
      }
    ]
  },
  {
    "id": "plant-wcvmgetzi",
    "name": "台灣五葉松",
    "scientificName": "Pinus morrisonicola Hayata",
    "englishName": "Taiwan White Pine, Taiwan Five-needle Pine",
    "aliases": [
      "玉山松",
      "短毛松",
      "山松柏",
      "早田氏松",
      "臺灣松"
    ],
    "family": "松科 (Pinaceae) / 松屬 (Pinus)",
    "dateAdded": "20260707",
    "locationNote": "@大坑四號步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1fFJkVASpOJCofHqH0R7YKmz1ox7sVN2X&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季（4月～5月，雄球花與雌球花同株）",
    "fruitPeriod": "翌年秋季（10月～11月球果成熟開裂，種子具翅）",
    "sporePeriod": "無（裸子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠大喬木，株高可達 15～25 公尺，胸徑達 1.2 公尺；樹幹常扭曲，樹皮灰褐色，老時呈不規則鱗片狀剝落。"
      },
      {
        "label": "葉片",
        "value": "針葉 5 針一束，長 4～9 公分，細長柔軟，邊緣具微鋸齒，截面呈三角形，腹面有白色氣孔線。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "雌雄同株；雄球花橢圓形聚生於新枝基部；雌球花單生或數個聚生於枝頂，熟時變為大形松果。"
      },
      {
        "label": "果實 / 根系",
        "value": "球果長橢圓狀卵形，長 7～10 公分，種鱗木質；主根深紮，側根發達，耐貧瘠與乾旱。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，光照不足易導致針葉稀疏、長勢衰弱。",
      "humidity": "極耐旱，忌積水排水不良，掌握乾透澆透原則。",
      "waterQuality": "/ 土壤：適應性強，喜酸性至微酸性排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "Pinus morrisonicola - 台灣植物資訊整合查詢系統",
        "url": "https://tai2.ntu.edu.tw/species/207%20006%2016%200"
      },
      {
        "title": "臺灣五葉松 - 維基百科",
        "url": "https://zh.wikipedia.org/zh-tw/%E8%87%BA%E7%81%A3%E4%BA%94%E8%91%89%E6%9D%BE"
      },
      {
        "title": "Pinus morrisonicola - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Pinus_morrisonicola"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1fFJkVASpOJCofHqH0R7YKmz1ox7sVN2X&sz=w1000",
        "caption": "(20260707@大坑四號步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1nYESi1i-u25lTVeahcbpbJ6FiWZc6EnW&sz=w1000",
        "caption": "(20260527@挑物古道)"
      }
    ]
  },
  {
    "id": "plant-lv2j7hkx5",
    "name": "馬利筋",
    "scientificName": "Asclepias curassavica L.",
    "englishName": "Tropical Milkweed, Bloodflower, Butterfly Weed, Silkweed, Scarlet Milkweed",
    "aliases": [
      "蓮生桂子花",
      "尖尾鳳",
      "芳草花",
      "早生貴子花",
      "金鳳花",
      "唐綿",
      "山桃花"
    ],
    "family": "夾竹桃科 (Apocynaceae) / 馬利筋屬 (Asclepias)",
    "dateAdded": "20260707",
    "locationNote": "@大坑四號步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1MOGs2YSaJaczReUoSUV8iOX_YlqIQHOX&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（主盛花期為春季至秋季5月～10月）",
    "fruitPeriod": "秋季至冬季（蓇葖果成熟開裂，種子具白色絹毛）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "直立多年生草本或亞灌木，株高約60��100公分；莖光滑或具微毛，受損時分泌白色乳汁。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，披針形或狹長橢圓形，長7～13公分，寬1.5～3.2公分，先端漸尖，基部楔形，全緣，具短柄。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "繖形花序頂生或腋生，具10～20朵花；花冠紅/橙紅色，5深裂並反捲；副花冠金黃色，直立呈冠狀。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根發達，側根細長，具優良耐旱能力。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，每日至少6小時充分陽光。",
      "humidity": "成株極耐旱，採乾透澆透原則，避免積水爛根。",
      "waterQuality": "/ 土壤：宜排水良好的砂質壤土，pH值6.0～7.5。"
    },
    "references": [
      {
        "title": "馬利筋 - 農業知識入口網",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=71"
      },
      {
        "title": "Asclepias curassavica - 台灣植物資訊整合查詢系統",
        "url": "https://tai2.ntu.edu.tw/species/515%20001%2001%200"
      },
      {
        "title": "馬利筋 - 維基百科",
        "url": "https://zh.wikipedia.org/zh-tw/%E9%A9%AC%E5%88%A9%E7%AD%8B"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1MOGs2YSaJaczReUoSUV8iOX_YlqIQHOX&sz=w1000",
        "caption": "(20260707@大坑四號步道)"
      }
    ]
  },
  {
    "id": "plant-cj3e66eix",
    "name": "山苦瓜",
    "scientificName": "Momordica charantia L. var. abbreviata Ser.",
    "englishName": "Wild Bitter Melon, Wild Bitter Gourd",
    "aliases": [
      "野生苦瓜",
      "短果苦瓜",
      "野苦瓜",
      "假苦瓜",
      "山葡萄"
    ],
    "family": "葫蘆科 (Cucurbitaceae) / 苦瓜屬 (Momordica)",
    "dateAdded": "20260527",
    "locationNote": "@挑水古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1isl3Aqeu-OylhA2i6O-hoAfPMjRXEgne&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季至秋季（4月–10月，雌雄同株異花）",
    "fruitPeriod": "夏季至秋季（5月–11月，成熟時果皮呈亮黃橘色開裂，露出鮮紅色假種皮包覆之種子）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生藤本攀緣草本，莖細長具稜角，被柔毛；具細長捲鬚能攀緣他物生長。"
      },
      {
        "label": "葉片",
        "value": "葉互生，掌狀 5–7 深裂，長 3–8 公分，裂片卵狀長橢眼形，葉緣具鋸齒，揉搓具特殊苦香味。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生，雌雄同株；花萼 5 裂，花冠黃色 5 深裂；雄花花梗長且具苞片，雌花子房下位具疣狀突起。"
      },
      {
        "label": "果實 / 根系",
        "value": "果實小呈卵形或紡錘形，長 3–5 公分，表面具瘤狀突起或軟刺；熟時由綠轉鮮黃橘色，頂端 3 瓣開裂；根系發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照��高溫環境，陽光充足則開花結果繁茂。",
      "humidity": "喜溫暖濕潤，生長旺期需水充足，採乾透澆透原則，忌盆土積水爛根。",
      "waterQuality": "/ 土壤：適應力極強，喜排水良好、富含有機質之砂質壤土。"
    },
    "references": [
      {
        "title": "山苦瓜 - 農業知識入口網",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=39517"
      },
      {
        "title": "苦瓜 - 維基百科",
        "url": "https://zh.wikipedia.org/wiki/%E8%8B%A6%E7%93%9C"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1isl3Aqeu-OylhA2i6O-hoAfPMjRXEgne&sz=w1000",
        "caption": "(20260527@挑水古道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1YoUrOM7EfyNLI5PNGJHZLfi0e-c6KxYW&sz=w1000",
        "caption": "(20260527@挑水古道)"
      }
    ]
  },
  {
    "id": "plant-99b4v4cmh",
    "name": "花旗木",
    "scientificName": "Cassia javanica L. var. indochinensis Gagnep.",
    "englishName": "Pink Shower Tree, Burmese Pink Cassia, Apple Blossom Tree",
    "aliases": [
      "絨果決明",
      "爪哇決明",
      "泰國櫻花",
      "平地櫻花",
      "粉紅陣雨木",
      "桃紅陣雨木"
    ],
    "family": "豆科 (Fabaceae / Caesalpinioideae) / 決明屬 (Cassia)",
    "dateAdded": "20260527",
    "locationNote": "@挑物古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=179Ju5uxnIbbMHoJMQzPvFuGeel48WB2n&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至初夏（3月–5月，盛花期4月，開花期長達一個多月）",
    "fruitPeriod": "秋季至冬季（長條圓柱形黑褐色圓筒狀莢果）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉喬木，株高可達 5–12 公尺；樹皮灰褐色，枝條水平鋪展延伸，幼枝被細毛。"
      },
      {
        "label": "葉片",
        "value": "偶數羽狀複葉，互生；小葉 10–20 對，長橢圓形，長 3–5 公分，全緣，先端鈍圓具小突尖，兩面被微柔毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "總狀花序腋生或頂生，花簇密生於枝條上；花萼深紅色，花瓣 5 枚，初開時淡粉紅或白色，後轉為深粉紅或玫瑰紅色，雄蕊 10 枚，具特殊花香。"
      },
      {
        "label": "根莖 / 根系",
        "value": "深根性，主根粗壯，抗風力與耐旱性佳。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，陽光越充足生長越強健、開花越爆炸繁茂。",
      "humidity": "成株極耐旱，採乾透澆透原則，忌長期積水濕腐。",
      "waterQuality": "/ 土壤：適應性廣，喜排水良好的砂質壤土或壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 爪哇決明",
        "url": "https://zh.wikipedia.org/wiki/%E8%8A%B1%E6%97%97%E6%9C%A8"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=179Ju5uxnIbbMHoJMQzPvFuGeel48WB2n&sz=w1000",
        "caption": "(20260527@挑物古道)"
      }
    ]
  },
  {
    "id": "plant-lvfyeit7g",
    "name": "軟枝黃蟬",
    "scientificName": "Allamanda cathartica L.",
    "englishName": "Golden Trumpet, Yellow Bell, Allamanda, Buttercup Flower",
    "aliases": [
      "黃蟬",
      "大花黃蟬",
      "黃鶯",
      "瀉根",
      "金蟬"
    ],
    "family": "夾竹桃科 (Apocynaceae) / 黃蟬屬 (Allamanda)",
    "dateAdded": "20260527",
    "locationNote": "@挑物古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1avNvR28-jKkE3Kaa8dXgMiQLC8lzTTui&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（5月–11月，熱帶地區可全年開花，盛花期6月–9月）",
    "fruitPeriod": "秋季（球形蒴果，具密生長刺，栽培少見結實）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠蔓性灌木，枝條長而柔軟，呈蔓藤狀伸展，株高可達 2–4 公尺；全株具白色乳汁。"
      },
      {
        "label": "葉片",
        "value": "3–4 枚輪生，長橢圓形或倒卵狀披針形，長 8–15 公分，全緣，革質，葉面濃綠有光澤，葉背脈上有毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "聚傘花序頂生；花冠大，漏斗狀，鮮黃色，直徑約 8–12 公分，花冠喉部有紅褐色縱紋，5 裂，裂片向左疊合。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根系發達，攀緣與蔓延生長力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，高溫多日照能促進源源不絕開花��",
      "humidity": "喜溫暖濕潤，生長季需充足澆水，保持土壤適度濕潤但避免積水。",
      "waterQuality": "/ 土壤：喜富含有機質、排水良好的砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 軟枝黃蟬",
        "url": "https://zh.wikipedia.org/wiki/%E8%BB%9F%E6%9E%9D%E9%BB%83%E8%9F%AC"
      },
      {
        "title": "Allamanda cathartica - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Allamanda_cathartica"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1avNvR28-jKkE3Kaa8dXgMiQLC8lzTTui&sz=w1000",
        "caption": "(20260527@挑物古道)"
      }
    ]
  },
  {
    "id": "plant-4s6kr49a2",
    "name": "緬梔花",
    "scientificName": "Plumeria rubra L.",
    "englishName": "Frangipani, Plumeria, Temple Tree, Red Jasmine",
    "aliases": [
      "雞蛋花",
      "番花",
      "鹿角樹",
      "印度素馨",
      "大季花"
    ],
    "family": "夾竹桃科 (Apocynaceae) / 緬梔屬 (Plumeria)",
    "dateAdded": "20260527",
    "locationNote": "@挑物古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Ok5KJ1ITni8MAuzcloocrJCgDb0s-UW5&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（5月–10月，盛花期6月–8月）",
    "fruitPeriod": "秋季至冬季（蓇葖果成對，栽培環境極少結實）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉小喬木，株高約 3–5 公尺；枝條肉質粗壯，具豐富白色乳汁，冬季落葉後枝幹形如鹿角。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，叢生於枝端，羽狀脈，長橢圓形或倒披針形，長 20–40 公分，全緣，革質，葉背中脈明顯隆起。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生聚傘花序；花冠漏斗狀，5 裂，裂片旋卷狀排列；花色豐富，外緣常呈白色或紅粉色，中心亮黃色，具濃郁清香。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根發達，側根粗壯，具良好耐旱性與適應力。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，光照充足則枝條粗壯、開花繁茂。",
      "humidity": "極耐旱，忌積水；採乾透澆透原則，冬季休眠落葉期應嚴格控水。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好的砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 緬梔花",
        "url": "https://zh.wikipedia.org/wiki/%E7%B7%AC%E6%A2%94%E8%8A%B1"
      },
      {
        "title": "Plumeria rubra - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Plumeria_rubra"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Ok5KJ1ITni8MAuzcloocrJCgDb0s-UW5&sz=w1000",
        "caption": "(20260527@挑物古道)"
      }
    ]
  },
  {
    "id": "plant-v19l6pf28",
    "name": "文珠蘭",
    "scientificName": "Crinum asiaticum L.",
    "englishName": "Poison Bulb, Giant Spider Lily, St. John's Lily",
    "aliases": [
      "文樹蘭",
      "文殊蘭",
      "蜘蛛百合",
      "羅裙帶",
      "允水焦",
      "水蕉"
    ],
    "family": "石蒜科 (Amaryllidaceae) / 文珠蘭屬 (Crinum)",
    "dateAdded": "20260527",
    "locationNote": "@挑水古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1PQQaLDk-nHUfxC9iQcgEZLHjdgZSaFAs&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（6月–10月，盛花期7–8月，花朵具陣陣幽香）",
    "fruitPeriod": "秋季至冬季（蒴果近球形，成熟時海綿質可漂浮水面傳播）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生大型草本，株高可達 1–1.5 公尺；具大型圓柱狀地下鱗莖，地上偽莖粗壯。"
      },
      {
        "label": "葉片",
        "value": "葉基生，大型帶狀披針形，長 50–100 公分，寬 7–12 公分，全緣，質地波狀肉質，鮮綠色有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花莖自葉腋抽出，實心且粗壯；頂生繖形花序，具 10–24 朵花；花白色，花冠筒細長，6 裂，裂片線形反捲，雄蕊 6 枚，花絲深紫紅色，突出花冠外。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下鱗莖巨大，肉質鬚根極發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，耐熱高溫。",
      "humidity": "喜溫暖濕潤，耐濕亦耐旱。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之富含有機質壤土。"
    },
    "references": [
      {
        "title": "文珠蘭 - ��基百科",
        "url": "https://zh.wikipedia.org/wiki/%E6%96%87%E7%8F%A0%E5%85%B0"
      },
      {
        "title": "Crinum asiaticum - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Crinum_asiaticum"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1PQQaLDk-nHUfxC9iQcgEZLHjdgZSaFAs&sz=w1000",
        "caption": "(20260527@挑水古道)"
      }
    ]
  },
  {
    "id": "plant-ltw3qad5s",
    "name": "粉撲花",
    "scientificName": "Calliandra brevipes Benth.",
    "englishName": "Pink Powderpuff, Calliandra",
    "aliases": [
      "美洲合歡",
      "細葉粉撲花",
      "粉紅合歡",
      "紅粉撲花",
      "毛莉花"
    ],
    "family": "豆科 (Fabaceae / Mimosoideae) / 粉撲花屬 (Calliandra)",
    "dateAdded": "20260527",
    "locationNote": "@挑水古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Wgamg695-vMPfqD1D6DlIyUZNxsqfaP3&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春���至秋季（5月–11月，盛花期夏秋）",
    "fruitPeriod": "秋季至冬季（扁平莢果，成熟時由頂端裂開反捲）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–3 公尺；分枝多，小枝細長呈灰色或褐色。"
      },
      {
        "label": "葉片",
        "value": "二回羽狀複葉，對生，小葉細小呈線狀披針形，羽片 1–2 對，小葉數十對，夜間會閉合睡眠。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頭狀花序腋生，呈圓球形粉撲狀；花絲細長且多數，基部白色，上端呈現粉紅色或鮮紅色，宛如化妝用的粉撲。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深，具固氮根瘤。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，陽光越充足開花越繁茂。",
      "humidity": "採乾透澆透原則，耐旱忌積水。",
      "waterQuality": "/ 土壤：喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "美洲合歡 - 維基百科",
        "url": "https://zh.wikipedia.org/wiki/%E7%BE%8E%E6%B4%B2%E5%90%88%E6%AC%A2"
      },
      {
        "title": "Calliandra - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Calliandra"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Wgamg695-vMPfqD1D6DlIyUZNxsqfaP3&sz=w1000",
        "caption": "(20260527@挑水古道)"
      }
    ]
  },
  {
    "id": "plant-p3l1g1sw5",
    "name": "錫葉藤",
    "scientificName": "Petrea volubilis L.",
    "englishName": "Queen's Wreath, Purple Wreath, Sandpaper Vine",
    "aliases": [
      "錫葉藤",
      "藍花藤",
      "紫鳳凰",
      "藍花藤",
      "砂紙藤"
    ],
    "family": "馬鞭草科 (Verbenaceae) / 藍花藤屬 (Petrea)",
    "dateAdded": "20260527",
    "locationNote": "@挑水古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1x_IVlppKqhWZVnmsJj_Bzcets1k_TWuM&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季至夏季（3月–8月，盛花期春季，開花時整株呈現一片紫藍色花海）",
    "fruitPeriod": "夏末至秋季（被持久宿存的花萼包被）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠藤本木質蔓藤，株高可達 4–8 公尺；莖蔓具纏繞性，老莖灰褐色。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，長橢圓形，長 10–18 公分，全緣，葉面粗糙如砂紙（傳統用於擦拭錫器，故名錫葉藤）。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生或腋生長總狀花序，下垂呈成串紫花；花雙層結構，外層淡紫色星狀萼片（宿存），內層深紫藍色花冠，5 裂。"
      },
      {
        "label": "根莖 / 根系",
        "value": "深根性，蔓延力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，陽光越足開花越密。",
      "humidity": "喜濕潤但耐旱，掌握乾透澆透。",
      "waterQuality": "/ 土壤：喜微酸性排水良好之壤土。"
    },
    "references": [
      {
        "title": "藍花藤 - 維基百科",
        "url": "https://zh.wikipedia.org/wiki/%E8%93%9D%E8%8A%B1%E8%97%A4"
      },
      {
        "title": "Petrea volubilis - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Petrea_volubilis"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1x_IVlppKqhWZVnmsJj_Bzcets1k_TWuM&sz=w1000",
        "caption": "(20260527@挑水古道)"
      }
    ]
  },
  {
    "id": "plant-oag9edavd",
    "name": "紫葉酢漿草",
    "scientificName": "Oxalis triangularis A.St.-Hil.",
    "englishName": "Purple Shamrock, False Shamrock, Purple Wood Sorrel",
    "aliases": [
      "三角紫葉酢漿草",
      "紫葉山酢漿草",
      "紫酢醬草",
      "紅葉酢漿草"
    ],
    "family": "酢漿草科 (Oxalidaceae) / 酢漿草屬 (Oxalis)",
    "dateAdded": "20260527",
    "locationNote": "@挑水古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1bZcFuL2CcaeJp7IQU5PlmSoMrUOK0pZF&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（4月–10月，環境適宜可全年開花）",
    "fruitPeriod": "夏末至秋季（蒴果成熟時開裂，彈射種子）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本，具地下球莖（鱗莖），無地上主莖；葉柄細長呈紫微紅色，長 10–25 公分，具趨光性與夜睡眠運動（夜間或強光下葉片下垂閉合）。"
      },
      {
        "label": "葉片",
        "value": "掌狀三���複葉，小葉 3 枚，倒三角形，基部楔形，深紫色或帶有淺紫色倒V字斑紋。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "繖形花序由基部抽出；花小呈漏斗狀，5 裂，淡粉紫色或白色，具 10 枚雄蕊與 5 室子房。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下具紡錘狀或鱗片狀球莖，鬚根發達，耐旱性強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜明亮散射光至半日照，忌夏季烈日暴曬，日光充足則葉色濃紫。",
      "humidity": "採乾透澆透原則，忌盆土積水爛莖。",
      "waterQuality": "/ 土壤：喜疏鬆肥沃、排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "紫葉酢漿草 - 維基百科",
        "url": "https://zh.wikipedia.org/wiki/%E7%B4%AB%E5%8F%B6%E9%85%A2%E6%B5%86%E8%8D%89"
      },
      {
        "title": "Oxalis triangularis - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Oxalis_triangularis"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1bZcFuL2CcaeJp7IQU5PlmSoMrUOK0pZF&sz=w1000",
        "caption": "(20260527@挑水古道)"
      }
    ]
  },
  {
    "id": "plant-8bqwg4not",
    "name": "黃苞小蝦花",
    "scientificName": "Pachystachys lutea Nees",
    "englishName": "Lollipop Plant, Golden Shrimp Plant, Yellow Shrimp Plant",
    "aliases": [
      "金包銀",
      "黃苞小蝦花",
      "黃蝦衣花",
      "棒花蝦衣草"
    ],
    "family": "爵床科 (Acanthaceae) / 黃蝦花屬 (Pachystachys)",
    "dateAdded": "20260527",
    "locationNote": "@挑水古道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1gcKZca8-0h6Whr_5QIVMOezCFjZr5M0u&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季至秋季（4月–11月，熱帶及溫室環境可全年開花）",
    "fruitPeriod": "夏末至冬季（蒴果，栽培少見結實）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠小灌木或亞灌木，株高 50–120 公分；莖直立，分枝多，光滑或具微毛。"
      },
      {
        "label": "葉片",
        "value": "葉對生，狹橢圓形或披針形，長 8–15 公分，全緣，葉脈明顯凹陷，深綠色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生穗狀花序，長 10–15 公分；具密生且重疊之亮金黃色苞片（形似小蝦，故名蝦花）；真正花朵自苞片伸出，唇形，白色，二唇深裂。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系淺且分枝多。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半日照至明亮散射光環境，避開夏日烈日直射。",
      "humidity": "喜濕潤環境，保持盆土濕潤但排水良好。",
      "waterQuality": "/ 土壤：喜排水良好的腐殖質壤土。"
    },
    "references": [
      {
        "title": "黃蝦花 - 維基百科",
        "url": "https://zh.wikipedia.org/wiki/%E9%87%91%E8%8B%9E%E8%8A%B1"
      },
      {
        "title": "Pachystachys lutea - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Pachystachys_lutea"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1gcKZca8-0h6Whr_5QIVMOezCFjZr5M0u&sz=w1000",
        "caption": "(20260527@挑水古道)"
      }
    ]
  },
  {
    "id": "plant-0pgfke30a",
    "name": "重瓣孤挺花",
    "scientificName": "Hippeastrum rutilum (Ker Gawl.) Herb.",
    "englishName": "Barbados Lily, Amaryllis, Striped Barbados Lily",
    "aliases": [
      "朱頂紅",
      "華胄蘭",
      "喇叭花",
      "紅花蓮",
      "孤頂花"
    ],
    "family": "石蒜科 (Amaryllidaceae) / 孤頂花屬 (Hippeastrum)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1cBWv9wAw54YOAVqfZauwDYyURuKDN9IR&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至初夏（3月–6月，花莖自鱗莖高高抽出，頂生 2–6 朵大花）",
    "fruitPeriod": "夏末（球形三瓣裂蒴果，內含黑色扁平種子）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生球根草本；地下具粗大近球形鱗莖，直徑 5–10 公分；花莖中空，直立，高 30–60 公分。"
      },
      {
        "label": "葉片",
        "value": "葉 6–8 枚自鱗莖抽出，兩列排成帶狀，長 30–50 公分，寬 2–4 公分，鮮綠色有光澤，花後更加茂盛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "繖形花序頂生；花大呈漏斗狀/喇叭狀，直徑 10–15 公分；花色豐富（紅、粉、白、雙色或條紋/���瓣），花被片 6 枚，雄蕊 6 枚，花藥黃色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下球形鱗莖貯藏豐富養分與水分，肉質根粗壯。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜充足散射光至半日照，忌夏季強光暴曬。",
      "humidity": "生長季保持適度濕潤，花後減少澆水，冬季休眠期需控水保持偏乾。",
      "waterQuality": "/ 土壤：喜肥沃、富含有機質且排水優良之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 朱頂紅",
        "url": "https://zh.wikipedia.org/wiki/%E6%9C%B1%E9%A1%B6%E7%BA%A2"
      },
      {
        "title": "Hippeastrum - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Hippeastrum"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1cBWv9wAw54YOAVqfZauwDYyURuKDN9IR&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-v09pbdsvz",
    "name": "水茄",
    "scientificName": "Solanum torvum Sw.",
    "englishName": "Turkey Berry, Devil's Fig, Pea Eggplant, Susumber",
    "aliases": [
      "萬桃花",
      "刺茄",
      "山煙草",
      "山茄",
      "野茄子",
      "假刺茄"
    ],
    "family": "茄科 (Solanaceae) / 茄屬 (Solanum)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1bDqbvZnivd0s2yTako_SC0k4ysejxFvf&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（主盛花期為春夏秋三季，花朵白亮成簇）",
    "fruitPeriod": "全��（球形漿果，未成熟時青綠色成簇如珍珠，成熟時變亮黃色）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1.5–3 公尺；莖與枝條直立，密被黃灰色星狀毛，具分散的小皮刺。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，卵形至長圓形，長 10–20 公分，寬 8–15 公分，葉緣具波狀淺裂或羽狀深裂，兩面被星狀毛，脈上常具小刺。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "歧傘花序腋外生，多花成簇；花冠白色，星狀 5 裂，直徑約 1.5–2 公分；中央 5 枚鮮黃色花藥緊密聚攏呈錐狀。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系粗壯發達，適應力與耐貧瘠能力極強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，耐熱耐高溫。",
      "humidity": "耐旱性強，土壤乾透後澆水即可。",
      "waterQuality": "/ 土壤：對土壤要求不高，耐貧瘠，以排水良好土質為佳。"
    },
    "references": [
      {
        "title": "維基百科 - 水茄",
        "url": "https://zh.wikipedia.org/wiki/%E6%B0%B4%E8%8C%84"
      },
      {
        "title": "Solanum torvum - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Solanum_torvum"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1bDqbvZnivd0s2yTako_SC0k4ysejxFvf&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-k7x90d6et",
    "name": "桂葉黃梅",
    "scientificName": "Ochna serrulata (Hochst.) Walp.",
    "englishName": "Mickey Mouse Plant, Small-leaved Plane, Carnival Ochna",
    "aliases": [
      "米老鼠樹",
      "金蓮木",
      "鋸齒桂葉黃梅",
      "米老鼠花"
    ],
    "family": "金蓮木科 (Ochnaceae) / 金蓮木屬 (Ochna)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1c2piKlhfPkzRbKCFjARoA1YvWmyvkytX&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至夏季（4月–7月，花黃色，花謝後花萼轉為鮮紅色並翻捲）",
    "fruitPeriod": "夏季至秋季（黑色核果著生於鮮紅雄蕊與萼片上，形似米老鼠頭部）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–3 公尺；莖枝直立，樹皮灰褐色，小枝具顯著皮孔。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，長橢圓形或倒披針形，長 3–6 公分，寬 1.5–2.5 公分，葉緣具細密銳鋸齒（形似桂花葉），革質硬挺有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生或聚傘花序腋生；花瓣 5–6 枚，鮮黃色，直徑約 2–3 公分；花謝後花瓣脫落，花萼與花托增大變為鮮艷朱紅色。"
      },
      {
        "label": "果實 / 根系",
        "value": "核果由綠轉漆黑色，1–6 顆附著於鮮紅花托上，整���造形極像迪士尼「米老鼠」頭像。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，日光充足則花色黃艷、果萼更加鮮紅。",
      "humidity": "喜溫暖濕潤，採乾透澆透原則，忌水積爛根。",
      "waterQuality": "/ 土壤：喜排水良好、富含有機質之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 桂葉黃梅",
        "url": "https://zh.wikipedia.org/wiki/%E6%A1%82%E5%8F%B6%E9%BB%84%E6%A2%85"
      },
      {
        "title": "Ochna serrulata - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Ochna_serrulata"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1c2piKlhfPkzRbKCFjARoA1YvWmyvkytX&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-seuukq8cd",
    "name": "牽牛花",
    "scientificName": "Ipomoea indica (Burm.) Merr.",
    "englishName": "Blue Dawn Flower, Ocean Blue Morning Glory, Morning Glory",
    "aliases": [
      "槭葉牽牛",
      "藍花牽牛",
      "朝顏",
      "喇叭花",
      "碗公花",
      "勤娘子"
    ],
    "family": "旋花科 (Convolvulaceae) / 番薯屬 (Ipomoea)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1UOclkqLftMqs4Fr-l6cvqxM9xA4JYgkS&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（主盛花期為夏季至秋季，清晨綻放，傍晚凋謝或轉紫紅色）",
    "fruitPeriod": "秋季至冬季（球形蒴果，內含黑色種��）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生纏繞性草質藤本，長可達 3–6 公尺；莖蔓細長具纏繞性，被柔毛，節處接觸濕土易生根。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，心形或 3 淺裂（槭葉牽牛呈掌狀深裂），長 5–15 公分，先端漸尖，全緣，被伏毛。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "聚傘花序腋生，1–數朵成簇；花冠漏斗狀/喇叭狀，直徑 7–10 公分，初開時呈鮮艷蔚藍色或紫藍色，隨日照與時間演變轉為粉紫色或紅紫色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根發達，藤蔓節部易生不定根，蔓延擴展極快。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，陽光充足花朵盛開且顏色鮮豔。",
      "humidity": "喜溫暖濕潤，採乾透澆透原則，極具耐旱力。",
      "waterQuality": "/ 土壤：對土壤適應力強，喜排水良好之壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 牽牛花",
        "url": "https://zh.wikipedia.org/wiki/%E7%89%B5%E7%89%9B%E8%8A%B1"
      },
      {
        "title": "Ipomoea indica - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Ipomoea_indica"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1UOclkqLftMqs4Fr-l6cvqxM9xA4JYgkS&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-4y6lt38mm",
    "name": "裂瓣朱槿",
    "scientificName": "Hibiscus schizopetalus (Dyer) Hook.f.",
    "englishName": "Fringed Hibiscus, Japanese Lantern, Spider Hibiscus, Coral Hibiscus",
    "aliases": [
      "吊燈花",
      "吊燈扶桑",
      "拱照芙蓉",
      "裂瓣扶桑",
      "細裂朱槿"
    ],
    "family": "錦葵科 (Malvaceae) / 木槿屬 (Hibiscus)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1vL_XEGMv6wb5yPGdaLk-anTaHMkG8XLx&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（熱帶與亞熱帶地區盛花期為夏至秋季，花朵單生懸垂）",
    "fruitPeriod": "秋季（長圓柱形蒴果，栽培少見結實）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1.5–3 公尺；枝條纖細，常柔弱下垂伸展。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，長橢圓形或卵狀橢圓形，長 4–7 公分，寬 2–4 公分，基部楔形，葉緣具鋸齒，鮮綠色有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於上部葉腋，花梗細長下垂（長 8–14 公分）；花冠深紅色或粉紅帶白斑，5 花瓣向上反卷並深裂成羽狀絲裂；雄蕊柱細長下垂突出於花冠外（長達 8–10 公分），形如精緻吊燈。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系發達，萌芽力與耐修剪性強���"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，日光充足則開花源源不絕。",
      "humidity": "喜溫暖濕潤，生長旺季需充份澆水，避免長期乾旱。",
      "waterQuality": "/ 土壤：喜排水良好、富含有機質之微酸性至中性壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 裂瓣朱槿",
        "url": "https://zh.wikipedia.org/wiki/%E8%A3%82%E7%93%A3%E6%9C%B1%E6%A7%BF"
      },
      {
        "title": "Hibiscus schizopetalus - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Hibiscus_schizopetalus"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1vL_XEGMv6wb5yPGdaLk-anTaHMkG8XLx&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-g1pd552fk",
    "name": "黃玉蘭",
    "scientificName": "Magnolia champaca (L.) Baill. ex Pierre",
    "englishName": "Champak, Yellow Jade Orchid, Joy Perfume Tree",
    "aliases": [
      "黃蘭",
      "金黃木蘭",
      "黃角蘭",
      "金玉蘭",
      "橙黃木蘭"
    ],
    "family": "木蘭科 (Magnoliaceae) / 木蘭屬 (Magnolia)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=16DDPSWyi6oKYlFRvKmvMVVnLs_K76C15&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（5月–10月，盛花期6月–8月，具濃郁芳香）",
    "fruitPeriod": "秋季至冬季（穗狀蓇葖果，紅褐色成熟，內含紅色種子）",
    "sporePeriod": "無（非孢子植��）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠大喬木，株高可達 10–20 公尺；樹皮灰褐色，幼枝與芽被黃褐色微柔毛。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，薄革質，長橢圓狀披針形或披針形，長 10–25 公分，寬 4–9 公分，先端漸尖，全緣或微波狀。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於葉腋；花被片 12–20 枚，呈橙黃色或金黃色，披針形，長 3–4 公分，具極濃郁甜香氣；雄蕊與雌蕊群多數。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深紮，側根發達，耐風力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，陽光充足開花繁茂芳香。",
      "humidity": "喜溫暖濕潤環境，採乾透澆透原則，忌長期積水爛根。",
      "waterQuality": "/ 土壤：喜肥沃、排水良好且微酸性之腐植壤土。"
    },
    "references": [
      {
        "title": "Magnolia champaca - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Magnolia_champaca"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=16DDPSWyi6oKYlFRvKmvMVVnLs_K76C15&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-1y2rk3df6",
    "name": "楊桃",
    "scientificName": "Averrhoa carambola L.",
    "englishName": "Carambola, Star Fruit",
    "aliases": [
      "五斂子",
      "洋桃",
      "三廉子",
      "羊桃",
      "星果"
    ],
    "family": "���漿草科 (Oxalidaceae) / 楊桃屬 (Averrhoa)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=12KEWLguG_jHGnNUugbVK1ZbybnHzRoYx&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（4月–10月，花朵小而密集，具幹生花現象）",
    "fruitPeriod": "夏季至冬季（7月–翌年3月，熟果呈金黃色）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠小喬木，株高 3–10 公尺；樹幹樹皮灰褐色，分枝多，枝條柔韌延伸。"
      },
      {
        "label": "葉片",
        "value": "奇數羽狀複葉，互生，小葉 5–11 枚，卵形至長橢圓形，長 3–8 公分，全緣，夜間或受觸碰時會微閉合。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生或老莖幹生圓錐花序（幹生花）；花小呈鐘形，5 裂，深粉紅色至紫紅色，花瓣邊緣白色，具芳香。"
      },
      {
        "label": "果實 / 根系",
        "value": "肉質漿果呈長橢圓形，橫切面呈顯著五角星形（Star Fruit），成熟時由青綠轉為亮黃色或金黃色；根系深。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，高溫溫暖氣候有利開花結果。",
      "humidity": "喜濕潤，果實發育期需充足水分，忌排水不良積水。",
      "waterQuality": "/ 土壤：喜排水良���、富含有機質之微酸性至中性壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 楊桃",
        "url": "https://zh.wikipedia.org/wiki/%E6%9D%A8%E6%A1%83"
      },
      {
        "title": "Averrhoa carambola - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Averrhoa_carambola"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=12KEWLguG_jHGnNUugbVK1ZbybnHzRoYx&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1GZSio6iKnL0d30YgMB8xyH4CaToMECIE&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-56k24sw3t",
    "name": "蒲瓜樹",
    "scientificName": "Crescentia cujete L.",
    "englishName": "Calabash Tree, Common Calabash",
    "aliases": [
      "瓢飲木",
      "葫蘆樹",
      "鐵西瓜",
      "砲彈樹",
      "炮彈果"
    ],
    "family": "紫葳科 (Bignoniaceae) / 蒲瓜樹屬 (Crescentia)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道-",
    "imageUrl": "https://drive.google.com/thumbnail?id=1e2XWW3GLQLrnhKYkQvuadaqigJvYnbFK&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春夏兩季（5月–8月，幹生花，夜間開放並散發特殊氣味）",
    "fruitPeriod": "夏季至秋季（巨大球形漿果掛於樹幹，可掛樹經年不落）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠小喬木，株高 3–8 公尺；樹幹木質硬，分枝少而橫展呈傘狀。"
      },
      {
        "label": "��片",
        "value": "單葉叢生於短枝上，倒披針形或匙形，長 10–20 公分，寬 3–6 公分，先端鈍尖，全緣，革質。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於樹幹或老枝上（幹生花）；花冠鐘狀，5 裂，淺黃綠色具紫色條紋，長約 5–7 公分，夜間開放。"
      },
      {
        "label": "果實 / 根系",
        "value": "巨大球形木質漿果，直徑達 15–30 公分，外殼光滑堅硬呈青綠色，乾燥後變木質棕色；深根性。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，高溫多濕氣候有利生長。",
      "humidity": "喜濕潤，生長期需充足水分。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之肥沃壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 蒲瓜樹",
        "url": "https://zh.wikipedia.org/wiki/%E8%92%B2%E7%93%9C%E6%A0%91"
      },
      {
        "title": "Crescentia cujete - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Crescentia_cujete"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1e2XWW3GLQLrnhKYkQvuadaqigJvYnbFK&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-ppppbj3kq",
    "name": "樹葡萄",
    "scientificName": "Plinia cauliflora (Mart.) Kausel",
    "englishName": "Jabuticaba, Jaboticaba, Brazilian Grape Tree",
    "aliases": [
      "嘉寶果",
      "木葡萄",
      "珍寶果",
      "巴西樹葡萄"
    ],
    "family": "桃金娘科 (Myrtaceae) / 嘉寶果屬 (Plinia)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1YfGhoh3mR275XmsKch-dc53RUoDYNDR0&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季與秋季（一年可多次開花，花小白色成簇密生於老樹幹上）",
    "fruitPeriod": "開花後約 30–50 天果實成熟（成熟果實呈紫黑色光亮球形，呈老莖生果奇觀）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木或小喬木，株高 3–10 公尺；樹幹光滑呈淺褐色，成長緩慢，枝條分枝密生。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，披針形或長橢圓形，長 3–7 公分，寬 1.5–3 公分，先端漸尖，全緣，革質濃綠有光澤，新葉常呈紅銅色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花簇生於樹幹與老枝上（幹生花）；花小呈白色，雄蕊多數外露成刷狀，具淡淡清香。"
      },
      {
        "label": "果實 / 根系",
        "value": "球形漿果直徑 2–4 公分，成熟時由青綠轉深紫黑，果肉白色半透明多汁，甜酸適口；深根性。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，陽光越充足生長越佳。",
      "humidity": "喜濕潤，需水份充足，生長期保持土壤濕潤，抗旱力中等。",
      "waterQuality": "/ 土壤：喜微酸性（pH 5.5–6.5）、排水良好且富含有機質之肥沃壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 嘉寶果",
        "url": "https://zh.wikipedia.org/wiki/%E5%98%89%E5%AF%B6%E6%9E%9C"
      },
      {
        "title": "Jabuticaba - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Jabuticaba"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1YfGhoh3mR275XmsKch-dc53RUoDYNDR0&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-ib2iovqe7",
    "name": "蘋婆",
    "scientificName": "Sterculia monosperma Vent.",
    "englishName": "Noble Sterculia, Seven Sisters' Fruit, Phoenix Eye Fruit",
    "aliases": [
      "苹婆",
      "鳳眼果",
      "九層皮",
      "潘安果",
      "富貴子"
    ],
    "family": "錦葵科 (Malvaceae / 傳統：梧桐科 Sterculiaceae) / 苹婆屬 (Sterculia)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1kK-s6ndOPuCbM8on62GecK88Ry96EyoX&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "春季（3月–5月，花小密集，呈乳白色或淡紅色鐘形）",
    "fruitPeriod": "夏季（7月–8月，蓇葖果成熟時革質鮮紅色裂開，露出黑色種子如鳳眼）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠中喬木，株高可達 5–15 公尺；樹冠濃密呈圓頂形，樹皮灰褐色。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，革質，矩圓形或橢��形，長 15–30 公分，寬 8–15 公分，全緣，網脈明顯。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "圓錐花序頂生或腋生，下垂；花無花瓣，萼筒鐘狀，5 裂，先端條狀向內彎曲連合，呈淡黃綠色或粉紅色。"
      },
      {
        "label": "果實 / 根系",
        "value": "蓇葖果 2–5 個聚生，革質，成熟時由綠轉為鮮艷朱紅色，裂開露 1–4 顆漆黑光亮種子（鳳眼果）；深根性。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照溫暖環境。",
      "humidity": "喜濕潤，生長季需充足水份，耐旱性亦佳。",
      "waterQuality": "/ 土壤：喜肥沃、排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 苹婆",
        "url": "https://zh.wikipedia.org/wiki/%E8%98%8B%E5%A9%86"
      },
      {
        "title": "Sterculia monosperma - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Sterculia_monosperma"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1kK-s6ndOPuCbM8on62GecK88Ry96EyoX&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-wk33q0jrg",
    "name": "巴西野牡丹",
    "scientificName": "Pleroma urvilleanum (DC.) P.J.F.Guim. & Michelang.",
    "englishName": "Princess Flower, Purple Glory Bush, Lasiandra",
    "aliases": [
      "紫花野牡丹",
      "蒂伯茜亞",
      "紫金花",
      "豔紫野牡丹"
    ],
    "family": "野牡丹科 (Melastomataceae) / 蒂伯茜屬 (Pleroma / Tibouchina)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1D-VoelyAXAH_sdz0IIt8zdXPU-XtbksU&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（主盛花期為 5月–12月，環境溫暖可全年陸續開花）",
    "fruitPeriod": "秋季至冬季（壺狀蒴果，被絨毛）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1.5–3 公尺；枝條四稜形，小枝密被粗毛或絨毛。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，長橢圓形至披針形，長 6–12 公分，全緣，掌狀脈 3–5 條凹陷明顯，葉面與葉背均密被濃密柔毛，質地絨毛感。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生聚傘花序；花冠大，直徑約 7–10 公分，5 裂，鮮濃紫藍色或深紫羅蘭色；雄蕊 10 枚，花絲紫紅色長彎曲，花藥白色或紫黑色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根發達，側根多，耐修剪與適應性佳。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，光照不足易導致枝條徒長、開花減少。",
      "humidity": "喜溫暖濕潤環境，保持盆土濕潤，夏季需充足澆水，忌長期乾旱。",
      "waterQuality": "/ 土壤：喜酸性至微酸性、排水良好且富含有機質之腐植壤土。"
    },
    "references": [
      {
        "title": "Pleroma urvilleanum - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Pleroma_urvilleanum"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1D-VoelyAXAH_sdz0IIt8zdXPU-XtbksU&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-wwcy2e6lc",
    "name": "金針花",
    "scientificName": "Hemerocallis fulva (L.) L.",
    "englishName": "Orange Daylily, Tawny Daylily, Tiger Daylily",
    "aliases": [
      "萱草",
      "黃花菜",
      "忘憂草",
      "宜男草",
      "川草",
      "安草"
    ],
    "family": "阿福花科 (Asphodelaceae) / 萱草屬 (Hemerocallis)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1LPmj3ZL9vAOX241kbwfBqrqV_zR-wVHX&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（5月–9月，單朵花綻放一日，但花苞陸續開花長達數月）",
    "fruitPeriod": "秋季（三稜狀橢圓形蒴果，內含黑色光亮種子）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生宿根草本，株高 40–100 公分；具地下根莖與肉質塊根，無地上主莖。"
      },
      {
        "label": "葉片",
        "value": "葉自根莖基生，兩列排成扁平狀，線形或狹帶狀，長 30–80 公分，寬 1–2.5 公分，全緣，質軟綠色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花莖自葉叢高高抽出，頂生繖房狀聚傘花序；花大呈漏斗狀，6 裂，顏色有鮮黃色、橘黃色至朱紅色，雄蕊 6 枚，花絲細長外露。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下根莖短，肉質根膨大呈紡錘狀，耐旱性與貯水能力極佳。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，日光充足開花繁茂鮮豔。",
      "humidity": "喜濕潤亦耐旱，生長季保持土壤適度濕潤。",
      "waterQuality": "/ 土壤：適應力極強，喜排水良好、富含有機質之壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 萱草",
        "url": "https://zh.wikipedia.org/wiki/%E8%90%B1%E8%8D%89"
      },
      {
        "title": "Hemerocallis fulva - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Hemerocallis_fulva"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1LPmj3ZL9vAOX241kbwfBqrqV_zR-wVHX&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1HuJBOo5JoKg2IWKgyZwJPwGnW5Ax63kL&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-r8130pquf",
    "name": "夏堇",
    "scientificName": "Torenia fournieri Linden ex Fourn.",
    "englishName": "Wishbone Flower, Bluewings, Formosa Torenia",
    "aliases": [
      "藍豬耳",
      "花瓜草",
      "花公草",
      "蝴蝶花",
      "藍豬耳花"
    ],
    "family": "母草科 (Linderniaceae) / 母草屬 (Torenia)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1FSqPR23wSCYBr7U8UH6LkqhnmEtOY_OS&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季至秋季（5月–11月，高溫夏季盛開，為夏日草花代表）",
    "fruitPeriod": "夏末至冬季（長橢圓形蒴果，種子細小多數）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "一年生草本，株高 15–30 公分；莖直立或斜昇，四稜形，無毛或微被毛，分枝性極佳。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，卵形或長卵形，長 3–5 公分，寬 1.5–2.5 公分，先端銳尖，基部心形或寬楔形，葉緣具粗鋸齒。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生或成總狀花序腋生與頂生；花冠唇形/喇叭狀，長約 2.5–3.5 公分，上唇淺藍色或紫粉色，下唇 3 裂深紫藍色或深粉色，喉部具鮮黃色斑塊；雄蕊 4 枚，花絲兩兩成對拱合如「許願骨」（Wishbone）。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根系，根系細密耐熱。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，耐熱耐高溫，夏季酷暑適度遮陰可延長花期。",
      "humidity": "喜濕潤，生長旺盛期需充足澆水，保持土壤濕潤但忌長期積水。",
      "waterQuality": "/ 土壤：喜肥沃、富含有機質且排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 夏堇",
        "url": "https://zh.wikipedia.org/wiki/%E5%A4%8F%E5%A0%87"
      },
      {
        "title": "Torenia fournieri - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Torenia_fournieri"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1FSqPR23wSCYBr7U8UH6LkqhnmEtOY_OS&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-zkomgvs84",
    "name": "翅果鐵刀木",
    "scientificName": "Senna alata (L.) Roxb.",
    "englishName": "Candlestick Plant, Candle Bush, Empress Candle Plant, Ringworm Bush",
    "aliases": [
      "翼柄決明",
      "翅莢決明",
      "對葉豆",
      "燭台樹",
      "翼柄茜草"
    ],
    "family": "豆科 (Fabaceae / Caesalpinioideae) / 決明屬 (Senna)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1QUGWaV_rg4Ch5HFUWe1jk6MGYPfLBVO2&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "秋季至春季（10月–4月，盛花期秋冬季）",
    "fruitPeriod": "冬季至春季（長條形莢果具 4 條顯著木質縱翅，長 10–15 公分）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠大灌木或小喬木，株高 2–4 公尺；枝條粗壯，被微柔毛，樹皮灰褐色。"
      },
      {
        "label": "葉片",
        "value": "偶數羽狀複葉，長 30–60 公分，小葉 8–14 對，長橢圓形或倒卵狀長橢圓形，長 5–15 公分，寬 3–7 公分，頂端鈍圓或微凹，全緣，革質。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生或腋生直立密集總狀花序，長 15–30 公分，外觀宛如鮮黃色蠟燭；花苞亮金黃色呈覆瓦狀重疊；花冠黃色，5 裂，雄蕊 10 枚。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深紮，具固氮根瘤，耐貧瘠能力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，陽光越足植株越強健、開花越繁茂。",
      "humidity": "喜溫暖濕潤，生長季保持適度濕潤，成株具優良耐旱性。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 翅果決明",
        "url": "https://zh.wikipedia.org/wiki/%E7%BF%85%E8%8D%9A%E5%86%B3%E6%98%8E"
      },
      {
        "title": "Senna alata - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Senna_alata"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1QUGWaV_rg4Ch5HFUWe1jk6MGYPfLBVO2&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-sqtf730e9",
    "name": "細葉美女櫻",
    "scientificName": "Glandularia pulchella (Sweet) Tronc.",
    "englishName": "Moss Verbena, Tenpoint Verbena, South American Verbena",
    "aliases": [
      "羽葉美女櫻",
      "裂葉美女櫻",
      "細葉馬鞭草",
      "美人櫻"
    ],
    "family": "馬鞭草科 (Verbenaceae) / 腺美女櫻屬 (Glandularia)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1kjj4apafmW49vW9E5P2Fk8zuDvE4BMlh&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（3月–11月，熱帶地區可全年開花）",
    "fruitPeriod": "夏末至冬初（小堅果，包藏於宿存花萼內）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本（常作地被栽培），株高 15–30 公分；莖匍匐蔓延或斜昇，四稜形，被硬毛，節處接觸地面易生根。"
      },
      {
        "label": "葉片",
        "value": "葉對生，掌狀或羽狀深裂至細裂，裂片線形或針狀，長 2–4 公分，全緣，鮮綠色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生密集繖房狀穗狀花序���花冠高腳碟狀，5 裂，裂片頂端凹入；花色呈紫紅色、藍紫色或粉紫色，中央常具白色花心。"
      },
      {
        "label": "根莖 / 根系",
        "value": "鬚根發達，匍匐莖節部生根，形成緊密的地被毯狀。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，每日至少 6 小時陽光，光照充足開花繁茂成花海。",
      "humidity": "耐旱性強，採乾透澆透原則，忌長期積水以防爛根。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "Glandularia pulchella - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Glandularia_pulchella"
      },
      {
        "title": "農業知識入口網 - 美女櫻",
        "url": "https://kmweb.moa.gov.tw/knowledge_view.php?id=3067"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1kjj4apafmW49vW9E5P2Fk8zuDvE4BMlh&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-elwmx2z0s",
    "name": "蒜香藤",
    "scientificName": "Mansoa alliacea (Manso) A.H.Gentry",
    "englishName": "Garlic Vine, False Garlic",
    "aliases": [
      "紫鈴藤",
      "張氏紫鈴藤",
      "蒜香蔓"
    ],
    "family": "紫葳科 (Bignoniaceae) / 蒜香藤屬 (Mansoa)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1zkdCmB2avUgAZ5Ytb9EUK1iuOncfXSsw&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "秋季（10��11月）及春季（3–4月），盛花期時滿株紫花如瀑布",
    "fruitPeriod": "冬末至春季（長條形扁平蒴果，栽培環境較少結實）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠攀緣性木質藤本，株高可達 3–5 公尺；莖蔓具纏繞性，枝葉搓揉後會散發濃烈大蒜香味。"
      },
      {
        "label": "葉片",
        "value": "三出複葉對生，頂小葉常退化為卷鬚；小葉橢圓形或卵形，長 6–10 公分，全緣，革質有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "腋生聚傘花序；花冠鐘形/漏斗狀，5 裂，長約 4–6 公分；初開時呈濃紫紅色，隨後漸褪為粉紫色，凋謝前變為白色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深紮，鬚根發達，攀緣性極強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，陽光充足開花極為繁茂。",
      "humidity": "喜溫暖濕潤，採乾透澆透原則，耐旱忌排水不良積水爛根。",
      "waterQuality": "/ 土壤：喜排水良好且富含有機質之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 蒜香藤",
        "url": "https://zh.wikipedia.org/wiki/%E8%92%9C%E9%A6%99%E8%97%A4"
      },
      {
        "title": "Mansoa alliacea - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Mansoa_alliacea"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1zkdCmB2avUgAZ5Ytb9EUK1iuOncfXSsw&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-hc1zqeh0k",
    "name": "鑲邊旋葉鐵莧",
    "scientificName": "Acalypha wilkesiana Mueller-Arg. cv. 'Marginata' / Acalypha 'Hoffmannii' (異名：Acalypha hamiltoniana Bruant)",
    "englishName": "Copperleaf, Marginated Copperleaf, Jacob's Coat",
    "aliases": [
      "旋葉鐵莧",
      "鑲邊鐵莧",
      "黃邊細葉鐵莧",
      "鑲邊紅桑",
      "覆輪紅桑",
      "彩葉木"
    ],
    "family": "大戟科 (Euphorbiaceae) / 鐵海棠屬 (Acalypha)",
    "dateAdded": "20260520",
    "locationNote": "@彰化虎山巖步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1wVFKkyt9z6V85_QISwuHWNdy-aKIHKxq&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（花小不顯眼，主為觀葉植物）",
    "fruitPeriod": "秋季（蒴果，栽培少見結實）",
    "sporePeriod": "無（非孢子植物）",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–2.5 公尺；莖直立，分枝多，小枝被細柔毛。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，廣卵形或倒卵形，長 10–20 公分，寬 6–12 公分，葉緣具波狀粗鋸齒，葉面深綠色，最顯著特徵為葉緣圍繞一圈乳白色、淺黃色或粉紅色的鮮明鋸齒鑲邊（覆輪斑紋）。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "雌雄異株；穗狀花序腋生，下垂呈細長繩索狀，紅褐色或綠褐色，花極小無花瓣。"
      },
      {
        "label": "根莖 / 根系",
        "value": "根系發達，耐修剪。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，日光越充足則葉緣鑲邊班紋越鮮豔突出。",
      "humidity": "喜溫暖濕潤，保持土壤適度濕潤，避免長期乾旱缺水。",
      "waterQuality": "/ 土壤：喜排水良好、富含有機質之肥沃壤土。"
    },
    "references": [
      {
        "title": "校園植物圖庫 - 鑲邊旋葉鐵莧",
        "url": "http://icontent.nkps.tp.edu.tw/naturesci/SpeciesShow.aspx?specID=59"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1wVFKkyt9z6V85_QISwuHWNdy-aKIHKxq&sz=w1000",
        "caption": "(20260520@彰化虎山巖步道)"
      }
    ]
  },
  {
    "id": "plant-gplism6lr",
    "name": "鐵砲百合",
    "scientificName": "Lilium longiflorum Thunb.",
    "englishName": "Easter Lily, Trumpet Lily",
    "aliases": [
      "麝香百合",
      "復興百合",
      "長吹花"
    ],
    "family": "百合科 (Liliaceae) / 百合屬 (Lilium)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1esJngI02IG8yuv1o59DfsJ_vPS5HsdQl&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至夏季（4月–6月，花朵純白喇叭狀呈俯垂或平展）",
    "fruitPeriod": "夏季至秋季（7月–9月，圓柱形蒴果，具多數扁平翅狀種子）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生球根草本，株高 30–100 公分；地下具肉質白色鱗莖；莖直立，綠色光滑。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，無柄，披針形或條狀披針形，長 10–15 公分，全緣，平行脈明顯。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生 1–6 朵大花，喇叭狀，長 12–18 公分，純白色，花被片 6 枚，基部合生；雄蕊 6 枚，花藥黃色，芳香濃郁。"
      },
      {
        "label": "根莖 / 根系",
        "value": "具地下球形鱗莖，鬚根與莖生根發達。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照，忌高溫暴曬。",
      "humidity": "保持土壤適度濕潤，忌積水爛根。",
      "waterQuality": "/ 土壤：喜肥沃、排水良好的微酸性至中性砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 鐵砲百合",
        "url": "https://zh.wikipedia.org/wiki/%E9%90%B5%E7%82%AE%E7%99%BE%E5%90%88"
      },
      {
        "title": "Lilium longiflorum - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Lilium_longiflorum"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1esJngI02IG8yuv1o59DfsJ_vPS5HsdQl&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1ut6PJ_UIIDAaZbDIW-1RVA7g5oL19S0e&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-35xb148x6",
    "name": "油��",
    "scientificName": "Vernicia montana Lour.",
    "englishName": "Wood-oil Tree, Montana Tung Tree",
    "aliases": [
      "千年桐",
      "皺桐",
      "廣東油桐",
      "木油樹"
    ],
    "family": "大戟科 (Euphorbiaceae) / 油桐屬 (Vernicia)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1So90vXqZ5cp5dRy5HrD2h4T4FGxlvKGI&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季（4月–6月，聚傘花序頂生，花瓣白色基部帶紫紅色條紋）",
    "fruitPeriod": "夏季至秋季（7月–10月，核果卵球形至三棱狀，果皮具顯著網狀皺紋）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉喬木，株高可達 8–20 公尺；樹皮灰褐色，小枝具稀疏皮孔；葉柄長 7–17 公分，頂端具 2 枚顯著有柄的杯狀腺體。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，廣卵形至闊心形，長 8–20 公分，全緣或 2–5 淺裂，掌狀脈，裂缺處常具紅色腺體。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單性，雌雄異株或同株；花瓣 5 片，白色，基部具紫紅色條紋；雄花雄蕊 8–10 枚，雌花柱頭 3 枚，二深裂。"
      },
      {
        "label": "果實 / 根系",
        "value": "核果呈三棱狀卵球形，直徑 3–5 公分，果皮顯著具網狀皺紋；種子具強烈毒性，富含桐油。"
      }
    ],
    "uses": [
      "觀賞：熱門觀��植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，耐熱耐高溫。",
      "humidity": "喜排水良好的濕潤土壤，極具耐旱力。",
      "waterQuality": "/ 土壤：對土壤適應力強，喜肥沃透氣之砂質壤土。"
    },
    "references": [
      {
        "title": "千年桐 - 農業部苗栗區農業改良場",
        "url": "https://www.mdares.gov.tw/ws.php?id=5576"
      },
      {
        "title": "Vernicia montana - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Vernicia_montana"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1So90vXqZ5cp5dRy5HrD2h4T4FGxlvKGI&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-8gpgl2sqh",
    "name": "石竹",
    "scientificName": "Dianthus chinensis L.",
    "englishName": "China Pink, Rainbow Pink",
    "aliases": [
      "洛陽花",
      "石菊",
      "繡竹",
      "日暮草"
    ],
    "family": "石竹科 (Caryophyllaceae) / 石竹屬 (Dianthus)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1Q3nBCHYZSaDc6_UiWL_-sdCgndcXlt_r&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（4月–10月，花色鮮艷豐富，花期長）",
    "fruitPeriod": "夏季至秋季（5月–11月，圓柱形蒴果，內含黑色扁平種子）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 茎部",
        "value": "多年生草本（常作一、二年生栽培），株高 30–50 公分；莖直立，節部膨��如竹節，成簇叢生。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，線形或線狀披針形，長 3–5 公分，寬 0.2–0.5 公分，全緣，基部抱莖。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生或數朵成聚傘花序；花萼筒狀，具 4 枚苞片；花瓣 5 枚，頂端具鋸齒或深裂，色彩有粉紅、深紅、紫色、白色或雙色斑紋。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根直立肉質，鬚根發達，耐寒耐貧瘠。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，陽光充足則株型緊密、開花繁茂。",
      "humidity": "耐乾旱，忌盆土長期積水或高濕酷熱。",
      "waterQuality": "/ 土壤：喜肥沃、排水良好且含石灰質的弱鹼性至中性砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 石竹",
        "url": "https://zh.wikipedia.org/wiki/%E7%9F%B3%E7%AB%B9"
      },
      {
        "title": "Dianthus chinensis - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Dianthus_chinensis"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1Q3nBCHYZSaDc6_UiWL_-sdCgndcXlt_r&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-lni1n2q16",
    "name": "百香果",
    "scientificName": "Passiflora edulis Sims",
    "englishName": "Passion Fruit, Purple Granadilla",
    "aliases": [
      "西番蓮",
      "時鐘花",
      "百香蓮",
      "紫果西番蓮"
    ],
    "family": "西番蓮科 (Passifloraceae) / 西番蓮屬 (Passiflora)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1jwlAbdNt4Zvo2ars8QSaR754o4bxeE0J&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（5月–10月，花朵造型獨特如時鐘面盤）",
    "fruitPeriod": "夏季至冬季（7月–翌年2月，果實由青綠轉熟為深紫紅色或黃色）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 茎部",
        "value": "多年生蔓性藤本，長達 6–10 公尺；莖蔓具縱溝紋，具腋生卷須纏繞攀爬。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，掌狀 3 深裂（幼葉可能為不分裂），長 6–15 公分，葉緣具鋸齒，葉柄頂端具 2 枚腺體。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於葉腋；花被片 5 枚白色，內側具多層絲狀紫白色副花冠（形似時鐘刻度）；雄蕊 5 枚，柱頭 3 裂形似時針分針，構造極奇特。"
      },
      {
        "label": "根莖 / 根系",
        "value": "淺根性，根系發達開展，喜濕潤透氣土壤。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照，光照充足方能源源不絕開花結果。",
      "humidity": "喜濕潤，生長期需充分澆水，忌盆土長期積水。",
      "waterQuality": "/ 土壤：喜疏鬆肥沃、排水良好之微酸性壤土。"
    },
    "references": [
      {
        "title": "維基百科 - ���香果",
        "url": "https://zh.wikipedia.org/wiki/%E7%99%BE%E9%A6%99%E6%9E%9C"
      },
      {
        "title": "Passiflora edulis - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Passiflora_edulis"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1jwlAbdNt4Zvo2ars8QSaR754o4bxeE0J&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-f3tz1l607",
    "name": "孤挺花",
    "scientificName": "Hippeastrum spp. / Hippeastrum striatum",
    "englishName": "Amaryllis, Striped Barbados Lily",
    "aliases": [
      "朱頂紅",
      "華胄蘭",
      "喇叭花",
      "紅花蓮",
      "孤頂花"
    ],
    "family": "石蒜科 (Amaryllidaceae) / 孤頂花屬 (Hippeastrum)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1rr3lt1A0kudxHF6R3i_sIgd3sZlRRNAB&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至初夏（3月–6月，花莖挺拔高舉，頂生 2–6 朵大花）",
    "fruitPeriod": "夏末（球形三瓣裂蒴果，內含黑色扁平翅狀種子）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 茎部",
        "value": "多年生球根草本；地下具粗大球形鱗莖，直徑 5–10 公分；花莖中空直立，高 30–60 公分。"
      },
      {
        "label": "葉片",
        "value": "葉 6–8 枚自鱗莖抽出，帶狀，長 30–50 公分，寬 2–4 公分，鮮綠色有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "繖形花序頂生；花大呈漏斗狀，直徑 10–15 公分；花色具紅白相間顯著條紋，花被片 6 枚，雄蕊 6 枚，花藥黃色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下球形鱗莖富含養分與水分，肉質根粗壯。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜充足散射光至半日照，忌夏季烈日暴曬。",
      "humidity": "生長季保持適度濕潤，花後減水，冬季休眠期控水保持偏乾。",
      "waterQuality": "/ 土壤：喜肥沃、排水優良之砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 朱頂紅",
        "url": "https://zh.wikipedia.org/wiki/%E6%9C%B1%E9%A1%B6%E7%BA%A2"
      },
      {
        "title": "Hippeastrum - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Hippeastrum"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1rr3lt1A0kudxHF6R3i_sIgd3sZlRRNAB&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-f9srzouor",
    "name": "金塔扶桑",
    "scientificName": "Hibiscus rosa-sinensis 'El Capitolio Sport' (cv. 'Golden Pagoda')",
    "englishName": "El Capitolio Sport Hibiscus, Tequila Sunrise Hibiscus",
    "aliases": [
      "金塔朱槿",
      "橙色金塔扶桑",
      "花中花扶桑",
      "重台扶桑"
    ],
    "family": "錦葵科 (Malvaceae) / 木槿屬 (Hibiscus)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道-",
    "imageUrl": "https://drive.google.com/thumbnail?id=1G-nDva9A1_8jDwGjLo81KDFsm3MsznaB&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年（盛花期為春末至秋季，高溫陽光充足下開花不絕）",
    "fruitPeriod": "秋季（栽培品種極少結實，主要以扦插或高壓法繁殖）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木，株高 1–3 公尺；莖幹直立，枝條木質化，分枝性佳，樹皮灰褐色。"
      },
      {
        "label": "葉片",
        "value": "單葉互生，廣卵形至卵狀披針形，長 5–10 公分，葉緣具鋸齒，表面濃綠色具光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花單生於上部葉腋；具極特殊之「花中花」（雙層重台）結構，外層為 5 片單瓣淺橘/杏黃色花瓣，中央延伸出一條長雄蕊柱，雄蕊柱頂端瓣化形成第二層小球狀重瓣花塔，型如金塔，極具奇趣。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深紮，鬚根系發達，萌芽力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，日光越充足則花色越金黃鮮豔、塔狀結構越為挺拔。",
      "humidity": "喜溫暖濕潤，採「乾透澆透」原則，忌高濕積水爛根。",
      "waterQuality": "/ 土壤：喜疏鬆肥沃、排水良好之微酸性至中性砂質壤土。"
    },
    "references": [
      {
        "title": "金塔扶桑 - 植物多樣性紀錄",
        "url": "https://plant.apaostudio.com/read.php/jin-ta-fu-sang/"
      },
      {
        "title": "金塔扶桑 - 福星花園",
        "url": "https://bruce0342.blogspot.com/2009/10/blog-post_28.html"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1G-nDva9A1_8jDwGjLo81KDFsm3MsznaB&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-jtlulhugc",
    "name": "相思樹",
    "scientificName": "Acacia confusa Merr.",
    "englishName": "Small Philippine Acacia, Formosa Acacia",
    "aliases": [
      "台灣相思樹",
      "相思木",
      "香絲樹"
    ],
    "family": "豆科 (Fabaceae) / 金合歡屬 (Acacia)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=195TdTFEP7GINc3zkQczwVi4V-KO9nHf7&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至初夏（4月–6月，黃色絨球狀頭狀花序盛開如金黃花海）",
    "fruitPeriod": "夏季至秋季（8月–10月，扁平莢果成熟時轉深褐色開裂）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 茎部",
        "value": "常綠喬木，株高可達 10–20 公尺；樹幹灰褐色具縱裂紋，枝條細長柔韌。"
      },
      {
        "label": "葉片",
        "value": "幼苗具二回羽狀複葉，成株葉片退化，由葉柄變態為假葉（Phyllode），鐮刀狀披針形，長 6–10 公分，全緣，平行脈 3–5 條。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頭狀花序腋生，直徑約 0.6–0.8 公分，由數十朵小花聚集成金黃色球���；雄蕊多數外露呈絨球狀，具清香。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深紮，根系具根瘤菌可固氮，極耐貧瘠與乾旱。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "極喜全日照環境，耐熱耐旱。",
      "humidity": "耐乾旱，自然降雨即可，忌長期積水。",
      "waterQuality": "/ 土壤：對土壤適應力極強，耐酸性土、貧瘠土與貧瘠山坡地。"
    },
    "references": [
      {
        "title": "維基百科 - 相思樹",
        "url": "https://zh.wikipedia.org/wiki/%E7%9B%B8%E6%80%9D%E6%A0%91"
      },
      {
        "title": "Acacia confusa - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Acacia_confusa"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=195TdTFEP7GINc3zkQczwVi4V-KO9nHf7&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-jsprmn5py",
    "name": "菟絲子",
    "scientificName": "Cuscuta campestris Yunck.",
    "englishName": "Field Dodder, Golden Dodder",
    "aliases": [
      "平原菟絲子",
      "黃絲藤",
      "無根草",
      "金絲藤"
    ],
    "family": "旋花科 (Convolvulaceae) / 菟絲子屬 (Cuscuta)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1yXRfvNMMmMdnJHFXV4adv1BxDflIyLIv&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏季至秋季（6月–10月，無數白色小花聚集成密簇花序）",
    "fruitPeriod": "秋季（扁球形蒴果，種子量���大且壽命極長）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 茎部",
        "value": "一年生寄生性草本；莖細長呈絲狀，金黃色或黃白色，無葉綠素，以吸器（Haustorium）纏繞穿透寄主植物吸收養分。"
      },
      {
        "label": "葉片",
        "value": "退化呈極小的鱗片狀，無葉綠素，無法自行進行光合作用。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花小呈鐘狀，白色或淡黃色，5 裂，無柄或具短柄，多數小花聚集成球狀聚傘花序；雄蕊 5 枚，花藥黃色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "種子萌發時有暫時性幼根，一旦觸及寄主並形成吸器後，幼根即枯萎死亡，完全依附寄主生存。"
      }
    ],
    "uses": [
      "園藝栽培"
    ],
    "careNotes": {
      "light": "",
      "humidity": "",
      "waterQuality": ""
    },
    "references": [
      {
        "title": "維基百科 - 菟絲子",
        "url": "https://zh.wikipedia.org/wiki/%E8%8F%9F%E7%B5%B2"
      },
      {
        "title": "Cuscuta campestris - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Cuscuta_campestris"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1yXRfvNMMmMdnJHFXV4adv1BxDflIyLIv&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-h937vh410",
    "name": "桂花",
    "scientificName": "Osmanthus fragrans Lour.",
    "englishName": "Sweet Osmanthus, Sweet Olive",
    "aliases": [
      "木犀",
      "岩桂",
      "九里香",
      "金桂",
      "丹桂"
    ],
    "family": "木犀科 (Oleaceae) / 木犀屬 (Osmanthus)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1y_I2UxXyd8Az89PSpjmhz3fbhbSEMqVc&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "秋季為主（9月–10月，四季桂品種可全年多次開花，香氣濃郁）",
    "fruitPeriod": "翌年春季（3月–4月，紫黑色核果，栽培品系結實率較低）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 茎部",
        "value": "常綠灌木或小喬木，株高 3–5 公尺；樹皮灰褐色，皮孔顯著，分枝多而緊密。"
      },
      {
        "label": "葉片",
        "value": "單葉對生，革質，長橢圓形或披針形，長 5–12 公分，寬 2.5–5 公分，先端漸尖，全緣或上半部具細鋸齒，表面深綠有光澤。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "聚傘花序簇生於葉腋；花小呈鐘狀，4 裂，金黃色（金桂）、黃白色（銀桂）或橙紅色（丹桂），直徑約 3–4 釐米，具強烈清甜芳香。"
      },
      {
        "label": "根莖 / 根系",
        "value": "主根深紮，側根發達，耐修剪。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜充足散射光至全日照，光照充足開花繁茂。",
      "humidity": "喜濕潤但忌積水，採乾透澆透原則。",
      "waterQuality": "/ 土壤：喜肥沃、排水良好之微酸性砂質壤土，忌鹼性土。"
    },
    "references": [
      {
        "title": "維基百科 - 桂花",
        "url": "https://zh.wikipedia.org/wiki/%E6%A1%82%E8%8A%B1"
      },
      {
        "title": "Osmanthus fragrans - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Osmanthus_fragrans"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1y_I2UxXyd8Az89PSpjmhz3fbhbSEMqVc&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-rq7nn8zky",
    "name": "紫花酢漿草",
    "scientificName": "Oxalis debilis Kunth var. corymbosa (DC.) Lourteig",
    "englishName": "Pink Woodsorrel, Violet Wood-sorrel",
    "aliases": [
      "大酢醬草",
      "三葉酸草",
      "銅錘草"
    ],
    "family": "酢漿草科 (Oxalidaceae) / 酢漿草屬 (Oxalis)",
    "dateAdded": "20260506",
    "locationNote": "@大甲水東流桐花步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1RI-gxaICJeKLNXsY4KtJrJXT5R9Wqqiv&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至秋季（3月–11月，花朵粉紅至紫紅色成簇盛開）",
    "fruitPeriod": "夏季（蒴果，栽培品系極少結實，主要以地下鱗莖繁殖）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本，具地下褐色球形鱗莖（小鱗莖成簇）；無地上主莖，葉柄細長柔弱，被微柔毛。"
      },
      {
        "label": "葉片",
        "value": "掌狀三出複葉，小葉 3 枚，倒心形，長 1.5–3 公分，綠色，先端凹缺，夜間或雨天小葉下垂閉合（睡眠運動）���"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "繖形花序高出葉面；花冠漏斗狀，5 裂，粉紅色或淡紫紅色，基部具深色脈紋；花藥黃色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下具白色紡錘狀肉質根（俗稱「蘿蔔根」）及多數小鱗莖。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照環境，強光下花朵盛開。",
      "humidity": "喜濕潤，採乾透澆透原則，夏季休眠期宜稍控水。",
      "waterQuality": "/ 土壤：適應力極強，排水良好之砂質壤土最佳。"
    },
    "references": [
      {
        "title": "Oxalis debilis - Wikipedia",
        "url": "https://en.wikipedia.org/wiki/Oxalis_debilis"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1RI-gxaICJeKLNXsY4KtJrJXT5R9Wqqiv&sz=w1000",
        "caption": "(20260506@大甲水東流桐花步道)"
      }
    ]
  },
  {
    "id": "plant-8efm5ks7w",
    "name": "月桃",
    "scientificName": "Alpinia zerumbet (Pers.) B.L.Burtt & R.M.Sm.",
    "englishName": "Shell Ginger, Shell Flower",
    "aliases": [
      "艷山薑",
      "玉桃",
      "良姜",
      "虎子花",
      "砂仁",
      "良薑"
    ],
    "family": "薑科 (Zingiberaceae) / 月桃屬 (Alpinia)",
    "dateAdded": "20230716",
    "locationNote": "@竹坑南寮步道，月桃的果實",
    "imageUrl": "https://drive.google.com/thumbnail?id=1CcYChRyCDt0vYfxS2YGac4xb5HXCKH7v&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春末至夏季（4月–6月，成串下垂的白色肉質花，���瓣具鮮黃底紅斑）",
    "fruitPeriod": "夏末至秋季（7月–10月，球形或卵形蒴果，具顯著縱稜，成熟時由綠轉紅）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生大型草本，株高可達 1.5–3 公尺；假莖粗壯直立，地下具肉質根莖。"
      },
      {
        "label": "葉片",
        "value": "葉互生，排成兩列，長披針形，長 30–70 公分，寬 8–15 公分，全緣，表面深綠光滑，具特殊芳香味。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "圓錐花序頂生下垂；花苞白色如珍珠/貝殼，花冠白色，唇瓣匙狀大型，黃色底帶紅色斑紋。"
      },
      {
        "label": "果實 / 根系",
        "value": "球形蒴果具明顯縱肋，成熟時呈鮮紅色，內含多數棕黑色具芳香假種皮之種子；根莖塊狀粗大。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜半日照至全日照環境，耐陰性亦佳。",
      "humidity": "喜溫暖濕潤環境，生長季需保持土壤濕潤。",
      "waterQuality": "/ 土壤：適應力強，喜排水良好且富含有機質之壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 月桃",
        "url": "https://zh.wikipedia.org/wiki/%E8%89%B7%E5%B1%B1%E8%96%91"
      },
      {
        "title": "農業知識入口網 - 月桃",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=37339"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1CcYChRyCDt0vYfxS2YGac4xb5HXCKH7v&sz=w1000",
        "caption": "(20230716@竹坑南寮步道，月桃的果實)"
      },
      {
        "url": "https://drive.google.com/thumbnail?id=1vVnArqw85ZtUZ7hobPsuTwbumqi395Y5&sz=w1000",
        "caption": "(20260527@挑水古道)"
      }
    ]
  },
  {
    "id": "plant-sxmydesxh",
    "name": "九芎",
    "scientificName": "Lagerstroemia subcostata Koehne",
    "englishName": "Subcostate Crape Myrtle",
    "aliases": [
      "苞花紫薇",
      "小花紫薇",
      "南紫薇",
      "拘木",
      "猴不爬",
      "九木"
    ],
    "family": "千屈菜科 (Lythraceae) / 紫薇屬 (Lagerstroemia)",
    "dateAdded": "20230716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1VHAphc4Scup2oqCujS24ihZBtIH4JWNF&sz=w1000",
    "petFriendly": true,
    "bloomPeriod": "夏季（6月–8月，開白色小花）",
    "fruitPeriod": "秋季至冬季（9月–2月，蒴果橢球形）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "落葉喬木，樹皮紅褐色光滑且易剝落，樹幹光滑如洗，俗稱「猴不爬」；小枝微具翅。"
      },
      {
        "label": "葉片",
        "value": "葉長橢角形或卵形，長 4–8 公分，寬 2–4 公分，全緣，薄革質，新葉帶紅褐色，秋季轉紅黃色。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生圓錐花序；花小而多，白色，花瓣 6 枚，具長爪與皺褶，雄蕊多數。"
      },
      {
        "label": "根莖 / 根系",
        "value": "深根性，水土保持優良樹種。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照環境，耐熱耐旱。",
      "humidity": "幼苗期保持土壤濕潤，成株耐旱力強。",
      "waterQuality": "/ 土壤：適應性強，耐貧瘠與乾旱，喜排水良好土壤。"
    },
    "references": [],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1VHAphc4Scup2oqCujS24ihZBtIH4JWNF&sz=w1000",
        "caption": "(20230716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-ib2y9airf",
    "name": "千年木",
    "scientificName": "Dracaena reflexa var. angustifolia Baker",
    "englishName": "Red-edged Dracaena, Dragon Tree",
    "aliases": [
      "五彩千年木",
      "細葉竹蕉",
      "彩虹竹蕉",
      "千年木",
      "紅邊龍血樹"
    ],
    "family": "天門冬科 (Asparagaceae) / 龍血樹屬 (Dracaena)",
    "dateAdded": "20230716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1wpmxDBTgFHA8Rw7M_Gntz1X7mlOCAcP0&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "春季至夏季（室內栽培極罕見開花）",
    "fruitPeriod": "夏季（球形漿果，成熟呈黃橙色）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠灌木或小喬木，株高 1–4 公尺；莖幹直立細長，具環狀葉痕，頂端分枝自然彎曲挺拔。"
      },
      {
        "label": "葉片",
        "value": "葉簇生於莖頂，線形/劍形，長 30–60 公分，寬 1–2 公分，無柄，革質，深綠色，葉緣具鮮豔紅紫色/紅褐色縱向邊紋（五彩品種具紅黃綠三色條紋）。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "頂生圓錐花序；花小，黃白色或淡綠色，具清香。"
      },
      {
        "label": "根莖 / 根系",
        "value": "肉質根系，耐旱力強。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜明亮散射光，耐半陰；光照充足時葉緣紅斑更為鮮豔，但避開夏季烈日直射。",
      "humidity": "掌握「寧乾勿濕」原則，待盆土乾透後再澆透，忌盆底積水爛根。",
      "waterQuality": "/ 土壤：喜疏鬆肥沃、排水良好的砂質壤土。"
    },
    "references": [
      {
        "title": "維基百科 - 紅邊竹蕉",
        "url": "https://zh.wikipedia.org/wiki/%E7%B4%85%E9%82%8A%E7%AB%B9%E8%95%89"
      },
      {
        "title": "農業知識入口網 - 千年木",
        "url": "https://kmweb.moa.gov.tw/subject/subject.php?id=8419"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1wpmxDBTgFHA8Rw7M_Gntz1X7mlOCAcP0&sz=w1000",
        "caption": "(20230716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-3y6ltt8ft",
    "name": "黃花韭蘭",
    "scientificName": "Zephyranthes citrina Baker",
    "englishName": "Yellow Rain Lily, Citron Zephyr Lily",
    "aliases": [
      "黃韭蘭",
      "黃蔥蘭",
      "黃花風雨蘭",
      "韭蔥蘭"
    ],
    "family": "石蒜科 (Amaryllidaceae) / 韭蘭屬 (Zephyranthes)",
    "dateAdded": "20230716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=1XFIaiV-dC6jAw764sIlHHNTLzX5-eKu-&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "夏至秋季（6月–10月，常於雨後暴發盛開，故稱風雨蘭）",
    "fruitPeriod": "秋季（蓋裂蒴果，內含黑色扁平種子）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "多年生草本，具地下球形鱗莖（直徑約 1.5–2.5 公分）。"
      },
      {
        "label": "葉片",
        "value": "葉基生，線形（似韭菜），肉質，濃綠色，長 15–30 公分，寬 2–4 毫米。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "花莖自葉叢中抽出，單生頂端；花漏斗狀，鮮黃色/檸檬黃色，6 裂；雄蕊 6 枚，花藥黃色。"
      },
      {
        "label": "根莖 / 根系",
        "value": "地下具發達鱗莖與鬚根系。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照至半日照，光照不足則開花減少。",
      "humidity": "性喜溫暖濕潤，極耐旱，雨後易誘發大規模開花。",
      "waterQuality": "/ 土壤：適應性強，喜排水良好之砂質壤土。"
    },
    "references": [
      {
        "title": "農業知識入口網 - 風雨蘭",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=145"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=1XFIaiV-dC6jAw764sIlHHNTLzX5-eKu-&sz=w1000",
        "caption": "(20230716@竹坑南寮步道)"
      }
    ]
  },
  {
    "id": "plant-9sha7p8sf",
    "name": "樹牽牛",
    "scientificName": "Ipomoea carnea Jacq. subsp. fistulosa (Mart. ex Choiss.) D.F.Austin",
    "englishName": "Bush Morning Glory",
    "aliases": [
      "木蕃薯",
      "粗莖紅薯",
      "水朝顏",
      "樹朝顏",
      "立牽牛"
    ],
    "family": "旋花科 (Convolvulaceae) / 番薯屬 (Ipomoea)",
    "dateAdded": "20230716",
    "locationNote": "@竹坑南寮步道",
    "imageUrl": "https://drive.google.com/thumbnail?id=18ndFWx61n1bKgJkeLnqY6ywxsjQhbY-h&sz=w1000",
    "petFriendly": false,
    "bloomPeriod": "全年開花（夏秋季最盛）",
    "fruitPeriod": "秋季至冬季（卵形蒴果，內含具綿毛之種子）",
    "sporePeriod": "無",
    "morphologyDetails": [
      {
        "label": "葉柄與葉軸 / 莖部",
        "value": "常綠半蔓性灌木，株高 1–3 公尺；莖直立或斜昇，中空粗壯，具乳汁，基部木質化。"
      },
      {
        "label": "葉片",
        "value": "葉互生，心形或廣卵形，長 10���25 公分，寬 5–15 公分，全緣，先端漸尖，葉柄長，基部具腺體。"
      },
      {
        "label": "花朵 / 孢子囊群",
        "value": "聚傘花序頂生或腋生；花冠漏斗狀/喇叭狀，大型，粉紅色至淡紫色，花喉顏色較深，花徑可達 7–10 公分。"
      },
      {
        "label": "根莖 / 根系",
        "value": "深根性，根系粗壯耐旱。"
      }
    ],
    "uses": [
      "觀賞：熱門觀葉植物"
    ],
    "careNotes": {
      "light": "喜全日照，陽光充足則花量繁茂。",
      "humidity": "極耐旱亦耐水濕，可在水邊潮濕處良好生長。",
      "waterQuality": "/ 土壤：適應性極強，耐貧瘠與微鹽鹼土壤。"
    },
    "references": [
      {
        "title": "維基百科 - 樹牽牛",
        "url": "https://zh.wikipedia.org/wiki/%E6%A0%91%E7%89%B5%E7%89%9B"
      },
      {
        "title": "農業知識入口網 - 樹牽牛",
        "url": "https://kmweb.moa.gov.tw/theme_data.php?theme=plant_illustration&id=492"
      }
    ],
    "galleryImages": [
      {
        "url": "https://drive.google.com/thumbnail?id=18ndFWx61n1bKgJkeLnqY6ywxsjQhbY-h&sz=w1000",
        "caption": "(20230716@竹坑南寮步道)"
      }
    ]
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

  // 2. 寫入 IndexedDB 永久大容量快取 (圖片已是 Drive URL，體積極小)
  saveToIndexedDB('synced_plants', plants);

  // 3. 寫入 LocalStorage（圖片已是 Drive URL，體積極小，可完整存入）
  try {
    localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(plants));
  } catch (e) {
    console.warn('LocalStorage 備份失敗，嘗試精簡版...', e);
    try {
      // 超級極簡備份（僅保留核心文字欄位）
      const ultraLight = plants.map(p => ({
        id: p.id,
        name: p.name,
        scientificName: p.scientificName,
        englishName: p.englishName,
        family: p.family,
        aliases: p.aliases,
        dateAdded: p.dateAdded,
        locationNote: p.locationNote,
        petFriendly: p.petFriendly,
        imageUrl: p.imageUrl || DEFAULT_SVG_PLACEHOLDER
      }));
      localStorage.setItem(STORAGE_KEYS[0], JSON.stringify(ultraLight));
    } catch (err2) {
      console.error('LocalStorage 寫入完全失敗 (請依賴 IndexedDB):', err2);
    }
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
  inMemoryComparisonsList = null;
  saveToIndexedDB('synced_plants', null);
  saveToIndexedDB('synced_comparisons_v2', null);
  try {
    STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    if (typeof COMPARISON_STORAGE_KEYS !== 'undefined') {
      COMPARISON_STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    }
  } catch(e) {}
  if (typeof clearLastSyncedTime === 'function') {
    clearLastSyncedTime();
  }
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

// ==========================================================================
// 相似鑑別資料集與持久化 (Similar Species Identification Store)
// ==========================================================================

let inMemoryComparisonsList = null;
const COMPARISON_STORAGE_KEYS = ['nian_hua_re_cao_comparisons_v2', 'nian_hua_re_cao_comparisons_v1'];

const DEFAULT_COMPARISON_DATA = [
  {
    id: "comp-lavender-sage",
    title: "薰衣草 vs 鼠尾草",
    species: ["薰衣草", "鼠尾草"],
    family: "唇形科",
    confusionLevel: "★★★★☆",
    mnemonic: "薰衣草莖基部木質化、揉葉清冽芳香；鼠尾草葉面具細毛與皺紋、氣味偏草本辛香。",
    dateAdded: "20260817",
    comparisonTable: {
      headers: ["比對項目", "薰衣草 (Lavender)", "鼠尾草 (Sage)"],
      rows: [
        {
          feature: "葉片外觀",
          values: [
            "葉形狹長線形或羽狀，葉緣平滑或全緣，質地偏硬",
            "葉片多為卵圓或長橢圓形，表面具明顯網狀皺褶或細絨毛"
          ]
        },
        {
          feature: "花序排列",
          values: [
            "頂生穗狀花序，輪傘花輪密集緊湊呈棒狀",
            "輪傘花序較為疏鬆分層，花冠唇形明顯展開"
          ]
        },
        {
          feature: "莖部質感",
          values: [
            "多年生亞灌木，成熟植株基部明顯木質化呈褐色",
            "多為草本或半木質，莖呈典型四稜形且密生腺毛"
          ]
        },
        {
          feature: "氣味辨識",
          values: [
            "清甜芳香、具舒緩放鬆的標誌性薰衣草精油香",
            "強烈草本辛香、藥草香（部分觀賞種如粉萼鼠尾草氣味較淡）"
          ]
        },
        {
          feature: "主要用途",
          values: [
            "提煉精油、香氛、花草茶、芳療",
            "西餐香料（如料理鼠尾草）、庭園景觀花海"
          ]
        }
      ]
    },
    detailedNotes: [
      {
        title: "1. 摸摸看葉片表面",
        content: "鼠尾草葉片大多粗糙、帶有細毛或網狀凹凸皺紋；薰衣草葉片較為平整或窄細挺立。"
      },
      {
        title: "2. 輕揉葉片聞氣味",
        content: "薰衣草帶有甜美放鬆的精油芬芳；鼠尾草則有濃郁草本料理辛香味。"
      },
      {
        title: "3. 觀察基部木質化程度",
        content: "薰衣草底部常呈現木質化褐色老枝；鼠尾草大多保持綠色草質莖。"
      }
    ],
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1565011523534-747a8601f10a?w=800&auto=format&fit=crop",
        caption: "薰衣草 (狹長平滑葉片與密集穗狀花輪)"
      },
      {
        url: "https://drive.google.com/thumbnail?id=1eBjwwJFXhWqCu3oloNDpbR0GSZDjiyQZ&sz=w1000",
        caption: "鼠尾草 / 粉萼鼠尾草 (卵圓形具皺褶葉片與分層唇形花)"
      }
    ]
  },
  {
    id: "comp-crape-subcostate",
    title: "紫薇 vs 九芎",
    species: ["紫薇", "九芎"],
    family: "千屈菜科",
    confusionLevel: "★★★★☆",
    mnemonic: "紫薇花大艷麗（紅/紫/白）、果實如彈珠；九芎花小密集且呈白黃色、果實小如豌豆，兩者樹皮皆極光滑（猴不爬）。",
    dateAdded: "20260816",
    comparisonTable: {
      headers: ["比對項目", "紫薇 (Crape Myrtle)", "九芎 (Subcostate Crape Myrtle)"],
      rows: [
        {
          feature: "花朵顏色與大小",
          values: [
            "花朵較大 (直徑約 3~4 cm)，花色艷麗多變（紅、紫、粉、白）",
            "花朵細小 (直徑約 0.5~0.8 cm)，花色多為白或淡黃白色"
          ]
        },
        {
          feature: "果實大小",
          values: [
            "蒴果較大（長約 1~1.5 公分，似小龍眼）",
            "蒴果極小（長約 0.6~0.8 公分，如豌豆大小）"
          ]
        },
        {
          feature: "葉片與葉柄",
          values: [
            "葉片近無柄或極短柄，近對生或互生，質地較薄",
            "葉片具短柄，基部兩側常具一對微小腺點"
          ]
        },
        {
          feature: "樹皮特徵",
          values: [
            "樹皮平滑易剝落，呈灰褐色（俗稱猴不爬、百日紅）",
            "樹皮極為光溜紅褐色，剝落後呈現新木黃白色斑塊"
          ]
        },
        {
          feature: "生態習性",
          values: [
            "外來園藝觀賞樹種，庭園公園綠化常見",
            "台灣原生樹種，多見於低海拔山區及溪谷崩塌地水土保持"
          ]
        }
      ]
    },
    detailedNotes: [
      {
        title: "1. 花朵大小與顏色一秒辨識",
        content: "開出大朵粉紅、紫紅花朵的大多是紫薇；開出密密麻麻細碎小白花的是台灣原生九芎。"
      },
      {
        title: "2. 蒴果大小比一比",
        content: "秋冬落葉時可看樹梢果實：紫薇果實飽滿如彈珠；九芎果實小巧如小綠豆。"
      },
      {
        title: "3. 樹幹光滑度",
        content: "兩者都是「猴不爬」，但九芎樹幹紅褐色斑駁感更強烈，極易剝落露出白嫩新皮。"
      }
    ],
    galleryImages: [
      {
        url: "https://drive.google.com/thumbnail?id=1R-vb55hXNXe0yrGYn1N1PzQDgYlutVJw&sz=w1000",
        caption: "紫薇 (花大艷麗、花瓣具長爪與皺褶)"
      },
      {
        url: "https://drive.google.com/thumbnail?id=1VHAphc4Scup2oqCujS24ihZBtIH4JWNF&sz=w1000",
        caption: "九芎 (花小密集、台灣原生水土保持樹)"
      }
    ]
  },
  {
    id: "comp-bauhinia-trio",
    title: "艷紫荊 vs 洋紫荊 vs 羊蹄甲",
    species: ["艷紫荊", "洋紫荊", "羊蹄甲"],
    family: "豆科 (蘇木亞科)",
    confusionLevel: "★★★★★",
    mnemonic: "羊蹄甲春開粉紅兼落葉、雄蕊5~6；洋紫荊秋開白或淡粉、雄蕊3；艷紫荊冬春艷紫不結莢、雄蕊5。",
    dateAdded: "20260815",
    comparisonTable: {
      headers: ["比對項目", "羊蹄甲", "洋紫荊", "艷紫荊 (香港市花)"],
      rows: [
        {
          feature: "開花季節",
          values: [
            "春天 (3~5月)，開花時通常全株落葉",
            "秋天至初冬 (10~12月)，開花時綠葉繁茂",
            "秋冬至翌春 (10~3月)，花期極長且花朵常開滿樹"
          ]
        },
        {
          feature: "花朵顏色",
          values: [
            "粉紅至紫紅色，旗瓣具深紫紅色條紋",
            "粉白至淡粉紅色，花瓣較為狹窄倒披針形",
            "鮮艷濃郁的艷紫色或紫紅色，花大繁盛"
          ]
        },
        {
          feature: "雄蕊數量",
          values: [
            "5~6 枚可孕雄蕊（長）",
            "3 枚可孕雄蕊（長）",
            "5 枚可孕雄蕊（長）"
          ]
        },
        {
          feature: "果實 (莢果)",
          values: [
            "結果率高，莢果扁平長條狀",
            "結果率高，結莢長而硬",
            "為天然雜交種，雄蕊多不孕，【通常不結果實】"
          ]
        },
        {
          feature: "葉片分叉",
          values: [
            "葉端裂至 1/4~1/3，先端鈍圓如羊蹄印",
            "葉端深裂至 1/3~1/2，裂片先端較尖",
            "葉幅最大，裂至 1/4~1/3，質地較厚"
          ]
        }
      ]
    },
    detailedNotes: [
      {
        title: "1. 看花期與花色",
        content: "春天滿樹粉紅無葉是羊蹄甲；秋天開淡白粉花是洋紫荊；冬天盛開大朵艷麗紫花是艷紫荊。"
      },
      {
        title: "2. 數雄蕊數量",
        content: "抓一朵落花數裡面的長花絲：3枚為洋紫荊，5~6枚為羊蹄甲或艷紫荊。"
      },
      {
        title: "3. 找找看有沒有掛豆莢",
        content: "艷紫荊因雜交不育，樹上幾乎永遠看不到掛豆莢；其他兩者在花期後皆結實纍纍。"
      }
    ],
    galleryImages: [
      {
        url: "https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=800&auto=format&fit=crop",
        caption: "羊蹄甲 (春季開花滿樹粉紅無葉)"
      },
      {
        url: "https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=800&auto=format&fit=crop",
        caption: "洋紫荊 (秋季開淡粉白花、雄蕊3枚)"
      },
      {
        url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop",
        caption: "艷紫荊 (秋冬盛開艷麗深紫、不結莢)"
      }
    ]
  },
  {
    id: "comp-cayratia-sambucus",
    title: "烏蘞莓 vs 冇骨消",
    species: ["烏蘞莓", "冇骨消"],
    family: "葡萄科 / 五福花科",
    confusionLevel: "★★★★☆",
    mnemonic: "烏蘞莓是五葉鳥足狀蔓藤、有卷鬚；冇骨消是直立灌木、具亮黃蜜杯與紅果。",
    dateAdded: "20260814",
    comparisonTable: {
      headers: ["比對項目", "烏蘞莓 (Cayratia japonica)", "冇骨消 (Sambucus chinensis)"],
      rows: [
        {
          feature: "生長型態",
          values: [
            "草質藤本，具分枝卷鬚攀附其他植物生長",
            "直立草本或亞灌木，莖直立無卷鬚"
          ]
        },
        {
          feature: "葉片結構",
          values: [
            "鳥足狀 5 出複葉（小葉 5 枚，中央一枚最大）",
            "奇數羽狀複葉，小葉 5~9 枚，對生，葉緣具細鋸齒"
          ]
        },
        {
          feature: "花序與蜜腺",
          values: [
            "聚繖花序腋生，花極小呈淡黃綠色，花盤肉質橙紅",
            "頂生大型複聚繖花序，花白色，花序間著生黃色杯狀蜜腺（蜜杯）"
          ]
        },
        {
          feature: "果實外觀",
          values: [
            "漿果球形，成熟時由綠轉紫黑色",
            "核果球形，成熟時呈鮮紅色，晶瑩剔透"
          ]
        },
        {
          feature: "生態吸引力",
          values: [
            "多種小型昆蟲取食花蜜",
            "台灣低海拔極重要的蜜源植物，吸引大量蝴蝶與鳥類"
          ]
        }
      ]
    },
    detailedNotes: [
      {
        title: "1. 看爬藤還是直立",
        content: "烏蘞莓是趴在地上或纏繞在灌木上的藤蔓；冇骨消是站得挺挺的灌木叢。"
      },
      {
        title: "2. 找找看有沒有黃色「小蜜杯」",
        content: "冇骨消開白花時，花叢中一顆顆橘黃色的小杯子是它最標誌性的腺體。"
      },
      {
        title: "3. 數葉子排列",
        content: "烏蘞莓是鳥足狀5葉；冇骨消是標準的羽毛狀排開複葉。"
      }
    ],
    galleryImages: [
      {
        url: "https://drive.google.com/thumbnail?id=1nl_V8Msgx-xGtvit9UxTwqsEaYFkVboB&sz=w1000",
        caption: "烏蘞莓 (鳥足狀5出複葉與攀爬卷鬚)"
      },
      {
        url: "https://images.unsplash.com/photo-1507290439931-a861b5a38200?w=800&auto=format&fit=crop",
        caption: "冇骨消 (羽狀複葉與亮橘黃色蜜杯)"
      }
    ]
  }
];

function getStoredComparisons() {
  if (inMemoryComparisonsList && inMemoryComparisonsList.length > 0) {
    return inMemoryComparisonsList;
  }
  try {
    for (let key of COMPARISON_STORAGE_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryComparisonsList = parsed;
          return parsed;
        }
      }
    }
  } catch (e) {}
  return DEFAULT_COMPARISON_DATA;
}

async function loadStoredComparisonsAsync() {
  const idbComps = await getFromIndexedDB('synced_comparisons_v2');
  if (idbComps && Array.isArray(idbComps) && idbComps.length > 0) {
    inMemoryComparisonsList = idbComps;
    return idbComps;
  }
  return getStoredComparisons();
}

function saveStoredComparisons(comparisons) {
  if (!comparisons || !Array.isArray(comparisons) || comparisons.length === 0) return;
  inMemoryComparisonsList = comparisons;
  saveToIndexedDB('synced_comparisons_v2', comparisons);
  try {
    localStorage.setItem(COMPARISON_STORAGE_KEYS[0], JSON.stringify(comparisons));
  } catch (e) {}
}

async function mergeAndSaveStoredComparisons(newOrUpdatedComps = [], deletedComps = []) {
  let currentList = [...(await loadStoredComparisonsAsync())];
  let deletedCount = 0;
  let addedCount = 0;
  let updatedCount = 0;

  // ⚡ 聰明機制：若當前資料庫「僅有初始 4 筆預設示範資料」且雲端有新鑑別資料傳入，則自動清除示範資料，改由使用者的真實文件接管！
  const demoIds = ['comp-lavender-sage', 'comp-crape-subcostate', 'comp-bauhinia-trio', 'comp-cayratia-sambucus'];
  const isPureDemoData = currentList.length > 0 && currentList.every(c => c.isDemo || demoIds.includes(c.id));
  if (isPureDemoData && Array.isArray(newOrUpdatedComps) && newOrUpdatedComps.length > 0) {
    currentList = [];
  }

  // 1. 處理刪除
  if (Array.isArray(deletedComps) && deletedComps.length > 0) {
    deletedComps.forEach(item => {
      const targetName = typeof item === 'string' ? item.trim() : (item.name || '').trim();
      if (!targetName) return;
      const initialLen = currentList.length;
      currentList = currentList.filter(c => {
        const titleMatch = (c.title || '').trim() === targetName;
        const speciesMatch = (c.species || []).some(s => s === targetName);
        return !(titleMatch || speciesMatch);
      });
      if (currentList.length < initialLen) deletedCount++;
    });
  }

  // 2. 處理新增與更新
  if (Array.isArray(newOrUpdatedComps) && newOrUpdatedComps.length > 0) {
    newOrUpdatedComps.forEach(incomingComp => {
      if (!incomingComp || !incomingComp.title) return;
      const cleanIncomingTitle = incomingComp.title.trim();
      const existingIdx = currentList.findIndex(c => (c.title || '').trim() === cleanIncomingTitle);

      if (existingIdx !== -1) {
        const oldId = currentList[existingIdx].id;
        currentList[existingIdx] = {
          ...incomingComp,
          id: oldId || incomingComp.id || `comp-${Date.now()}`
        };
        updatedCount++;
      } else {
        currentList.unshift({
          ...incomingComp,
          id: incomingComp.id || `comp-${Date.now()}`
        });
        addedCount++;
      }
    });
  }

  saveStoredComparisons(currentList);

  return {
    addedCount,
    updatedCount,
    deletedCount,
    totalCount: currentList.length
  };
}

// 綁定全域供其他腳本調用
window.DEFAULT_COMPARISON_DATA = DEFAULT_COMPARISON_DATA;
window.getStoredComparisons = getStoredComparisons;
window.loadStoredComparisonsAsync = loadStoredComparisonsAsync;
window.saveStoredComparisons = saveStoredComparisons;
window.mergeAndSaveStoredComparisons = mergeAndSaveStoredComparisons;

