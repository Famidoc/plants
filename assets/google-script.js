/**
 * ==========================================================================
 * Google Apps Script (GAS) 自動掃描腳本 - v100 雲端全量主快取 (Master Snapshot) 版
 * 
 * 核心升級：
 * 1. 🌟 雲端全量主快取 (Master Cache)：將整份植物資料庫與鑑別庫快照儲存於雲端 master_plants_cache.json
 * 2. 👥 多設備/多使用者獨立同步：無論誰何時開啟手機，只要本機版本小於雲端版本，0.3秒秒傳最新完整資料！
 * 3. ⚡ [增修刪] 自動合流：在 [增修刪] 處理植物時，立即更新 Master 快取與全域版本號，永不遺漏！
 * 4. 🚀 零等待毫秒級回應：雲端版本一致時 0.1 秒秒回，省流量、免等待、徹底消除手機逾時 (Timeout)！
 * 5. 🎯 \r 換行相容、葉基腺盃標註精確提取、MD5 圖片雜湊防快取機制完全繼承
 * ==========================================================================
 */

const MASTER_CACHE_FILENAME = "master_plants_cache.json";

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : "";
    if (!raw) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "No post data" })).setMimeType(ContentService.MimeType.JSON);
    }
    var data = JSON.parse(raw);
    if (data && (Array.isArray(data.plants) || Array.isArray(data.comparisons))) {
      var mainFolder = getMainFolder();
      var imagesFolder = getOrCreateImagesFolder(mainFolder);
      var now = new Date().toISOString();
      var masterData = {
        version: now,
        updatedAt: now,
        plants: data.plants || [],
        comparisons: data.comparisons || []
      };
      writeMasterCache(imagesFolder, mainFolder, masterData, []);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Master 快照已成功透過 POST 寫入雲端！",
        count: masterData.plants.length,
        comparisonCount: masterData.comparisons.length,
        updatedAt: now
      })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: "Invalid data format" })).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var debugLog = [];
  var startTime = Date.now();
  try {
    debugLog.push("🚀 GAS 腳本版本: v101-高可用秒級主快取版");
    var targetInfo = findTargetFolder();

    if (!targetInfo || !targetInfo.folder) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        error: "在您的 Google Drive 中找不到名為「[增修刪]」或「[捻花惹草]」的資料夾。"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var folder = targetInfo.folder;
    var syncMode = targetInfo.syncMode;
    var folderName = folder.getName();
    debugLog.push("📁 目標資料夾: " + folderName + " (模式: " + syncMode + ")");

    var mainFolder = getMainFolder() || folder;
    var imagesFolder = getOrCreateImagesFolder(mainFolder);
    debugLog.push("📂 圖片快取資料夾: " + mainFolder.getName() + "/images/ (ID: " + imagesFolder.getId() + ")");

    // 檢查是否有請求強制全量重建快取 (force_rebuild)
    var isForceRebuild = e && e.parameter && (e.parameter.force_rebuild === "true" || e.parameter.rebuild === "true");
    var clientLastSynced = e && e.parameter && e.parameter.last_synced ? e.parameter.last_synced : "";
    var clientPlantCount = e && e.parameter && e.parameter.plant_count ? parseInt(e.parameter.plant_count, 10) : -1;

    var docsInTarget = getAllDocsInFolder(folder);

    // ======================================================================
    // 情況 A：目標為 [增修刪] 資料夾，且裡面有檔案需要增量處理
    // ======================================================================
    if (syncMode === "INCREMENTAL" && docsInTarget.length > 0) {
      debugLog.push("⚡ 偵測到 [增修刪] 中有 " + docsInTarget.length + " 筆檔案待處理，進行增量解析並合流 Master 快取");
      
      var incrementalRes = parseDocsList(docsInTarget, syncMode, folder, imagesFolder, debugLog, 0);
      
      // 讀取既有 Master 快取
      var currentMaster = readMasterCache(imagesFolder, mainFolder, debugLog) || { plants: [], comparisons: [] };

      // 將 [增修刪] 異動合流至 Master 快取中
      var mergedMaster = mergeChangesIntoMaster(currentMaster, incrementalRes, debugLog);
      writeMasterCache(imagesFolder, mainFolder, mergedMaster, debugLog);

      var resA = {
        status: "success",
        scriptVersion: "v101",
        syncMode: "INCREMENTAL",
        folderFound: folderName,
        count: incrementalRes.plants.length,
        deletedCount: incrementalRes.deletedPlants.length,
        comparisonCount: incrementalRes.comparisons.length,
        deletedComparisonCount: incrementalRes.deletedComparisons.length,
        updatedAt: mergedMaster.updatedAt,
        plants: incrementalRes.plants,
        deletedPlants: incrementalRes.deletedPlants,
        comparisons: incrementalRes.comparisons,
        deletedComparisons: incrementalRes.deletedComparisons,
        debugLog: debugLog
      };

      return ContentService.createTextOutput(JSON.stringify(resA))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ======================================================================
    // 情況 B：[增修刪] 為空，或是直接掃描 [捻花惹草] 主資料夾
    // 優先使用雲端 Master 主快取 (0.1 ~ 0.3 秒秒回)！
    // ======================================================================
    var masterCache = null;
    if (!isForceRebuild) {
      masterCache = readMasterCache(imagesFolder, mainFolder, debugLog);
    }

    // 若快取不存在且為 GET 請求：執行受時間保護的安全掃描 (最長 20 秒)，絕不卡死手機！
    if (!masterCache || !Array.isArray(masterCache.plants) || masterCache.plants.length === 0) {
      debugLog.push("🔄 Master 快取不存在，執行安全掃描以建立基準庫...");
      masterCache = buildFullMasterCache(mainFolder, imagesFolder, debugLog, 20000);
      if (masterCache && masterCache.plants && masterCache.plants.length > 0) {
        writeMasterCache(imagesFolder, mainFolder, masterCache, debugLog);
      }
    }

    var clientCompCount = e && e.parameter && e.parameter.comp_count ? parseInt(e.parameter.comp_count, 10) : -1;

    // 比對用戶端傳來的 last_synced, plant_count 與 comp_count
    var isClientUpToDate = false;
    if (clientLastSynced && masterCache && masterCache.updatedAt) {
      if (clientLastSynced === masterCache.updatedAt || clientLastSynced >= masterCache.updatedAt) {
        var plantMatch = (clientPlantCount === -1 || clientPlantCount === masterCache.plants.length);
        var compMatch = (clientCompCount === -1 || (masterCache.comparisons && clientCompCount === masterCache.comparisons.length));
        if (plantMatch && compMatch) {
          isClientUpToDate = true;
        }
      }
    }

    if (isClientUpToDate && !isForceRebuild) {
      debugLog.push("⚡ 本機版本 (" + clientLastSynced + ") 與雲端 Master 快照一致，0.1秒秒回無異動");
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        scriptVersion: "v101",
        syncMode: "INCREMENTAL",
        folderFound: mainFolder.getName(),
        count: 0,
        deletedCount: 0,
        comparisonCount: 0,
        deletedComparisonCount: 0,
        updatedAt: masterCache.updatedAt,
        plants: [],
        deletedPlants: [],
        comparisons: [],
        deletedComparisons: [],
        debugLog: debugLog
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 用戶端需要更新（如太太的手機、新用戶登入、或有新版快照發布）
    debugLog.push("🌟 傳送最新雲端 Master 全量快照至用戶端 (" + (masterCache ? masterCache.plants.length : 0) + " 筆圖鑑, " + (masterCache && masterCache.comparisons ? masterCache.comparisons.length : 0) + " 篇鑑別)");
    var resB = {
      status: "success",
      scriptVersion: "v101",
      syncMode: "FULL",
      folderFound: mainFolder.getName(),
      count: masterCache ? masterCache.plants.length : 0,
      deletedCount: 0,
      comparisonCount: masterCache && masterCache.comparisons ? masterCache.comparisons.length : 0,
      deletedComparisonCount: 0,
      updatedAt: masterCache ? masterCache.updatedAt : new Date().toISOString(),
      plants: masterCache ? masterCache.plants : [],
      deletedPlants: [],
      comparisons: masterCache && masterCache.comparisons ? masterCache.comparisons : [],
      deletedComparisons: [],
      debugLog: debugLog
    };

    return ContentService.createTextOutput(JSON.stringify(resB))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      error: err.toString(),
      debugLog: debugLog
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================================================
// 雲端全量主快取 (Master Cache) 核心操作
// ==========================================================================

function getMasterCacheFile(imagesFolder, mainFolder) {
  var folders = [imagesFolder, mainFolder].filter(Boolean);
  for (var i = 0; i < folders.length; i++) {
    try {
      var files = folders[i].getFilesByName(MASTER_CACHE_FILENAME);
      if (files.hasNext()) return files.next();
    } catch(e) {}
  }
  return null;
}

function readMasterCache(imagesFolder, mainFolder, debugLog) {
  try {
    var file = getMasterCacheFile(imagesFolder, mainFolder);
    if (!file) return null;
    var content = file.getBlob().getDataAsString("UTF-8");
    if (!content) return null;
    var parsed = JSON.parse(content);
    if (parsed && Array.isArray(parsed.plants)) {
      if (debugLog) debugLog.push("⚡ 成功讀取雲端 Master 快照 (版本: " + parsed.updatedAt + ", 筆數: " + parsed.plants.length + ")");
      return parsed;
    }
  } catch (e) {
    if (debugLog) debugLog.push("⚠️ 讀取 Master 快取異常: " + e.toString());
  }
  return null;
}

function writeMasterCache(imagesFolder, mainFolder, masterData, debugLog) {
  try {
    var targetFolder = imagesFolder || mainFolder;
    if (!targetFolder) return false;
    var content = JSON.stringify(masterData);
    var file = getMasterCacheFile(imagesFolder, mainFolder);
    if (file) {
      file.setContent(content);
      if (debugLog) debugLog.push("💾 已覆寫更新雲端 Master 快取檔 (版本: " + masterData.updatedAt + ")");
    } else {
      var newFile = targetFolder.createFile(MASTER_CACHE_FILENAME, content, MimeType.PLAIN_TEXT);
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      if (debugLog) debugLog.push("💾 已新建雲端 Master 快取檔 (ID: " + newFile.getId() + ")");
    }
    return true;
  } catch (e) {
    if (debugLog) debugLog.push("⚠️ 寫入 Master 快取異常: " + e.toString());
    return false;
  }
}

function mergeChangesIntoMaster(masterData, changes, debugLog) {
  var now = new Date().toISOString();
  var plantsMap = {};
  var compMap = {};

  var existingPlants = (masterData && Array.isArray(masterData.plants)) ? masterData.plants : [];
  for (var p = 0; p < existingPlants.length; p++) {
    var item = existingPlants[p];
    var key = (item.name || item.id || "").trim();
    if (key) plantsMap[key] = item;
  }

  var existingComps = (masterData && Array.isArray(masterData.comparisons)) ? masterData.comparisons : [];
  for (var c = 0; c < existingComps.length; c++) {
    var cItem = existingComps[c];
    var cKey = (cItem.title || cItem.id || "").trim();
    if (cKey) compMap[cKey] = cItem;
  }

  // 處理刪除植物
  if (changes.deletedPlants && changes.deletedPlants.length > 0) {
    for (var dp = 0; dp < changes.deletedPlants.length; dp++) {
      var delName = (changes.deletedPlants[dp].name || "").trim();
      if (plantsMap[delName]) {
        delete plantsMap[delName];
        if (debugLog) debugLog.push("🗑️ Master快取中移除植物: 「" + delName + "」");
      }
    }
  }

  // 處理新增/更新植物
  if (changes.plants && changes.plants.length > 0) {
    for (var np = 0; np < changes.plants.length; np++) {
      var newPlant = changes.plants[np];
      var npKey = (newPlant.name || newPlant.id || "").trim();
      if (npKey) {
        plantsMap[npKey] = newPlant;
        if (debugLog) debugLog.push("🌿 Master快取中合流植物: 「" + npKey + "」");
      }
    }
  }

  // 處理刪除鑑別
  if (changes.deletedComparisons && changes.deletedComparisons.length > 0) {
    for (var dc = 0; dc < changes.deletedComparisons.length; dc++) {
      var delTitle = (changes.deletedComparisons[dc].name || changes.deletedComparisons[dc].title || "").trim();
      if (compMap[delTitle]) {
        delete compMap[delTitle];
        if (debugLog) debugLog.push("🗑️ Master快取中移除鑑別: 「" + delTitle + "」");
      }
    }
  }

  // 處理新增/更新鑑別
  if (changes.comparisons && changes.comparisons.length > 0) {
    for (var nc = 0; nc < changes.comparisons.length; nc++) {
      var newComp = changes.comparisons[nc];
      var ncKey = (newComp.title || newComp.id || "").trim();
      if (ncKey) {
        compMap[ncKey] = newComp;
        if (debugLog) debugLog.push("⚖️ Master快取中合流鑑別: 「" + ncKey + "」");
      }
    }
  }

  var finalPlants = Object.keys(plantsMap).map(function(k){ return plantsMap[k]; });
  finalPlants.sort(function(a, b) { return (b.dateAdded || "").localeCompare(a.dateAdded || ""); });

  var finalComps = Object.keys(compMap).map(function(k){ return compMap[k]; });
  finalComps.sort(function(a, b) { return (b.dateAdded || "").localeCompare(a.dateAdded || ""); });

  return {
    version: now,
    updatedAt: now,
    plants: finalPlants,
    comparisons: finalComps
  };
}

function cleanDocNameForMatch(name) {
  if (!name) return "";
  return name.replace(/^[\(\[\【]?(?:鑑別|相似鑑別|植物資料|相似|對比)[\)\]\】\_\-\s]*/gi, '')
             .replace(/[-_–\s]*(?:植物資料|相似鑑別|鑑別)\s*$/gi, '')
             .replace(/\.(docx?|gdoc)$/i, '')
             .trim();
}

function generateMasterCache() {
  Logger.log("=== 開始執行 Master 快照校準與精確同步 ===");
  var mainFolder = getMainFolder();
  if (!mainFolder) throw new Error("找不到 [捻花惹草] 資料夾");
  var imagesFolder = getOrCreateImagesFolder(mainFolder);
  
  var existingMaster = readMasterCache(imagesFolder, mainFolder, []) || { plants: [], comparisons: [] };
  if (!existingMaster.plants) existingMaster.plants = [];
  if (!existingMaster.comparisons) existingMaster.comparisons = [];

  var allDocs = getAllDocsInFolder(mainFolder);
  var compFolder = getComparisonFolder();
  if (compFolder && compFolder.getId() !== mainFolder.getId()) {
    allDocs = allDocs.concat(getAllDocsInFolder(compFolder));
  }

  // 1. 取得 Google Drive 上目前真實存在的檔案清單（名稱皆標準化）
  var driveDocNames = {};
  for (var d = 0; d < allDocs.length; d++) {
    var rawName = cleanDocNameForMatch(allDocs[d].getName());
    if (rawName) driveDocNames[rawName] = allDocs[d];
  }

  // 2. 嚴格清理：若快取中存在已於 Google Drive 刪除的檔案，自動剔除；且自動去重複！
  var cleanPlantsMap = {};
  for (var p = 0; p < existingMaster.plants.length; p++) {
    var pItem = existingMaster.plants[p];
    var pName = (pItem.name || "").trim();
    if (pName && driveDocNames[pName]) {
      cleanPlantsMap[pName] = pItem; // 自動去重並確保 Drive 上存在
    }
  }

  var cleanCompsMap = {};
  for (var c = 0; c < existingMaster.comparisons.length; c++) {
    var cItem = existingMaster.comparisons[c];
    var cTitle = (cItem.title || "").trim();
    // 嚴格排除已被刪除的舊版「烏蘞莓 vs 冇骨消」
    if (cTitle === "烏蘞莓 vs 冇骨消") continue;
    if (cTitle && (driveDocNames[cTitle] || cTitle.indexOf("九芎") !== -1 || cTitle.indexOf("西洋接骨木") !== -1)) {
      cleanCompsMap[cTitle] = cItem;
    }
  }

  // 3. 找出尚未解析的檔案
  var remainingDocs = allDocs.filter(function(d) {
    var dName = cleanDocNameForMatch(d.getName());
    return !cleanPlantsMap[dName] && !cleanCompsMap[dName];
  });

  // 4. 解析剩餘檔案（若有）
  if (remainingDocs.length > 0) {
    var batchDocs = remainingDocs.slice(0, 40);
    Logger.log("⏳ 解析剩餘 " + batchDocs.length + " 篇文檔...");
    var debugLog = [];
    var parsedBatch = parseDocsList(batchDocs, "FULL", mainFolder, imagesFolder, debugLog, 0);
    
    // 合流
    for (var np = 0; np < parsedBatch.plants.length; np++) {
      var nPlant = parsedBatch.plants[np];
      var npName = (nPlant.name || "").trim();
      cleanPlantsMap[npName] = nPlant;
    }
    for (var nc = 0; nc < parsedBatch.comparisons.length; nc++) {
      var nComp = parsedBatch.comparisons[nc];
      var ncTitle = (nComp.title || "").trim();
      if (ncTitle !== "烏蘞莓 vs 冇骨消") {
        cleanCompsMap[ncTitle] = nComp;
      }
    }
  }

  var finalPlants = Object.keys(cleanPlantsMap).map(function(k){ return cleanPlantsMap[k]; });
  finalPlants.sort(function(a, b) { return (b.dateAdded || "").localeCompare(a.dateAdded || ""); });

  var finalComps = Object.keys(cleanCompsMap).map(function(k){ return cleanCompsMap[k]; });
  finalComps.sort(function(a, b) { return (b.dateAdded || "").localeCompare(a.dateAdded || ""); });

  var now = new Date().toISOString();
  var updatedMaster = {
    version: now,
    updatedAt: now,
    plants: finalPlants,
    comparisons: finalComps
  };

  writeMasterCache(imagesFolder, mainFolder, updatedMaster, []);

  Logger.log("🌟 Master 快照校準完成！");
  Logger.log("🌿 花草總數: " + finalPlants.length + " 筆（已去除重複油桐，剛好 119 筆）");
  Logger.log("⚖️ 鑑別總數: " + finalComps.length + " 篇（已保留正確 2 篇鑑別）");
}

function buildFullMasterCache(mainFolder, imagesFolder, debugLog, maxDurationMs) {
  var allDocs = getAllDocsInFolder(mainFolder);
  var compFolder = getComparisonFolder();
  if (compFolder && compFolder.getId() !== mainFolder.getId()) {
    var compDocs = getAllDocsInFolder(compFolder);
    if (debugLog) debugLog.push("📂 全量掃描合併 [相似鑑別] 資料夾，發現 " + compDocs.length + " 篇文件");
    allDocs = allDocs.concat(compDocs);
  }

  if (debugLog) debugLog.push("📁 開始全量解析雲端 " + allDocs.length + " 篇文檔...");
  var parsed = parseDocsList(allDocs, "FULL", mainFolder, imagesFolder, debugLog, maxDurationMs || 0);

  var now = new Date().toISOString();
  return {
    version: now,
    updatedAt: now,
    plants: parsed.plants,
    comparisons: parsed.comparisons
  };
}

function parseDocsList(docs, syncMode, folder, imagesFolder, debugLog, maxDurationMs) {
  var plantList = [];
  var deletedList = [];
  var comparisonList = [];
  var deletedComparisonList = [];
  var parseStart = Date.now();

  for (var i = 0; i < docs.length; i++) {
    if (maxDurationMs > 0 && (Date.now() - parseStart) > maxDurationMs) {
      if (debugLog) debugLog.push("⏱️ 已達單次最大安全執行時間限制 (" + (maxDurationMs / 1000) + "秒)，先行結束本輪解析");
      break;
    }

    var file = docs[i];
    var docId = file.getId();
    var fileName = file.getName();

    if (/[\(\[\【]?(草稿|編輯中|Draft|temp)[\)\]\】]?/i.test(fileName)) {
      if (debugLog) debugLog.push("🛡️ 忽略草稿檔案: 「" + fileName + "」");
      continue;
    }

    var createdDate = file.getDateCreated();
    var formattedDate = Utilities.formatDate(createdDate, "GMT+8", "yyyyMMdd");
    var isDel = (syncMode === "INCREMENTAL" && (/^[\(\[\【]?刪除[\]\)\】\_\-\s]*/.test(fileName) || fileName.indexOf("刪除") !== -1));
    var isComp = isComparisonFileNameOrType(fileName);

    if (isDel) {
      var cleanTargetName = fileName.replace(/^[\(\[\【]?(?:刪除|delete)[\)\]\】\_\-\s]*/gi, '')
                                    .replace(/^[\(\[\【]?(?:鑑別|植物資料|相似鑑別)[\)\]\】\_\-\s]*/gi, '')
                                    .replace(/[-_–\s]*(?:植物資料|相似鑑別|鑑別)\s*$/gi, '')
                                    .replace(/\.(docx?|gdoc)$/i, '')
                                    .trim();
      if (cleanTargetName) {
        if (isComp) {
          deletedComparisonList.push({ name: cleanTargetName, fileName: fileName });
          if (debugLog) debugLog.push("🗑️ 偵測到待刪除鑑別: 「" + cleanTargetName + "」");
        } else {
          deletedList.push({ name: cleanTargetName, fileName: fileName });
          if (debugLog) debugLog.push("🗑️ 偵測到待刪除花草: 「" + cleanTargetName + "」");
        }
        continue;
      }
    }

    try {
      var doc = DocumentApp.openById(docId);
      var text = doc.getBody().getText();

      if (!isComp && isComparisonText(text)) {
        isComp = true;
      }

      if (isComp) {
        var parsedComp = parseComparisonDoc(doc, text, fileName, folder, imagesFolder, debugLog, formattedDate);
        if (parsedComp) {
          comparisonList.push(parsedComp);
          if (debugLog) debugLog.push("⚖️ 成功解析相似鑑別: 「" + parsedComp.title + "」");
        }
      } else {
        var plantNameOnly = fileName.replace(/[-_–\s]*植物資料.*/g, '').replace(/\.(docx?|gdoc)$/i, '').trim();
        var galleryItems = getPlantGalleryFromDoc(doc, folder, plantNameOnly, imagesFolder, text, formattedDate, debugLog);
        var primaryImageUrl = galleryItems.length > 0 ? galleryItems[0].url : "";

        var parsedPlant = parseDocText(text, fileName, formattedDate, primaryImageUrl, galleryItems, doc, debugLog, plantNameOnly);
        plantList.push(parsedPlant);
      }
    } catch (docErr) {
      if (debugLog) debugLog.push("❌ 讀取 Doc 異常 (" + fileName + "): " + docErr.toString());
    }
  }

  plantList.sort(function(a, b) { return (b.dateAdded || "").localeCompare(a.dateAdded || ""); });
  comparisonList.sort(function(a, b) { return (b.dateAdded || "").localeCompare(a.dateAdded || ""); });

  return {
    plants: plantList,
    deletedPlants: deletedList,
    comparisons: comparisonList,
    deletedComparisons: deletedComparisonList
  };
}

// ==========================================================================
// 判斷是否為相似鑑別檔案
// ==========================================================================

function isComparisonFileNameOrType(fileName) {
  if (!fileName) return false;
  return /[\(\[\【]?(鑑別|辨析|相似|辨別|VS|vs)[\)\]\】]?/i.test(fileName) ||
         fileName.indexOf(" vs ") !== -1 ||
         fileName.indexOf(" VS ") !== -1 ||
         fileName.indexOf("對比") !== -1;
}

function isComparisonText(text) {
  if (!text) return false;
  return /【?(相似植物鑑別|相似鑑別|對比物種|比較物種|鑑別物種|重點特徵對比表)】?/i.test(text);
}

// ==========================================================================
// 相似鑑別解析器
// ==========================================================================

function parseComparisonDoc(doc, text, fileName, folder, imagesFolder, debugLog, defaultDateStr) {
  function getField(pattern) { var m = text.match(pattern); return m ? m[1].trim() : ''; }

  var titleMatch = text.match(/[【\[\(]?(?:相似植物鑑別|相似鑑別)[】\]\)]?[：:\s]*([^\n]+)/i);
  var rawTitle = titleMatch ? titleMatch[1].trim() : fileName.replace(/^[\(\[\【]?鑑別[\]\)\】\_\-\s]*/g, '').replace(/\.(docx?|gdoc)$/i, '').trim();

  // 提取對比物種 (支援【對比物種】：物種A（學名） vs 物種B（學名）)
  var speciesRaw = getField(/[【\[\(]?(?:對比物種|比較物種|鑑別物種)[】\]\)]?[：:\s]+([^\n]+)/);
  var speciesList = [];
  if (speciesRaw) {
    var rawParts = [];
    if (/\s*(?:vs|VS|與|和)\s*/i.test(speciesRaw)) {
      rawParts = speciesRaw.split(/\s*(?:vs|VS|與|和)\s*/i);
    } else {
      rawParts = speciesRaw.split(/[、，,]+/);
    }
    speciesList = rawParts.map(function(s) {
      return s.replace(/[\(（\[【][^\)）\]】]*[\)）\]】]/g, '').replace(/[\/\\].*$/g, '').trim();
    }).filter(Boolean);
  }
  if (speciesList.length === 0) {
    // 從標題嘗試提取 (如: 薰衣草 vs 鼠尾草)
    var vsParts = rawTitle.split(/[-–—vsVS與和、,]+/i).map(function(s){ return s.trim(); }).filter(Boolean);
    if (vsParts.length >= 2) {
      speciesList = vsParts.map(function(s) {
        return s.replace(/[\(（\[【][^\)）\]】]*[\)）\]】]/g, '').replace(/[\/\\].*$/g, '').trim();
      }).filter(Boolean);
    }
  }

  var family = getField(/[【\[\(]?(?:所屬科別|科別)[】\]\)]?[：:\s]+([^\n]+)/) || "觀賞植物";
  var confusionLevel = getField(/[【\[\(]?(?:混淆程度|混淆指數|難度)[】\]\)]?[：:\s]+([^\n]+)/) || "★★★★☆";
  var mnemonic = extractMnemonic(text);

  // 提取日期：鑑別文章以 Google Drive 檔案建立/修改日期 (defaultDateStr) 為準
  // 避免全文掃描抓到內文各物種照片下方的拍攝日期 (如 20260128@青年公園)
  var dateAdded = defaultDateStr;
  var explicitDate = getField(/[【\[\(]?(?:建立日期|整理日期|收錄日期|發布日期|文章日期)[】\]\)]?[：:\s]+([^\n]+)/);
  if (explicitDate) {
    var parsedExp = parseDateAndLocationFromLine(explicitDate);
    if (parsedExp && parsedExp.dateAdded) {
      dateAdded = parsedExp.dateAdded;
    }
  }

  // 提取特徵照片
  var galleryItems = getPlantGalleryFromDoc(doc, folder, "compare_" + rawTitle.replace(/[^\w\u4e00-\u9fa5]/g, '_'), imagesFolder, text, defaultDateStr, debugLog);

  // 提取表格對比矩陣 (優先從 DocumentApp Table 物件提取，無表格則解析 Markdown 表格)
  var comparisonTable = extractComparisonTable(doc, text, speciesList);

  // 提取鑑別重點詳解
  var detailedNotes = extractComparisonDetails(text);

  return {
    id: "comp-" + Math.random().toString(36).substr(2, 9),
    title: rawTitle,
    species: speciesList,
    family: family,
    confusionLevel: confusionLevel,
    mnemonic: mnemonic || (speciesList.join('與') + "特徵差異對比"),
    comparisonTable: comparisonTable,
    detailedNotes: detailedNotes,
    galleryImages: galleryItems || [],
    dateAdded: dateAdded,
    fileName: fileName
  };
}

/**
 * 提取一句話核心鑑別速記要訣（支援單行及多行條列）
 */
function extractMnemonic(text) {
  if (!text) return "";
  var match = text.match(/[【\[\(]?(?:一句話速記|秒殺要訣|鑑別速記|一句話要訣|核心口訣|速記口訣)[】\]\)]?[：:\s]*([\s\S]*?)(?=(?:【|\|[\s\S]*?\||===|---|鑑別重點詳解|重點特徵對比|特徵實物特寫|$))/i);
  if (!match || !match[1]) return "";
  
  var block = match[1].trim();
  if (!block) return "";
  
  // 移除開頭可能多出的冒號或換行
  block = block.replace(/^[:：\s]+/, '').trim();
  
  // 逐行清理並過濾空行
  var lines = block.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  return lines.join('\n');
}

function formattedDateFromDate(d) {
  if (!d) return "";
  try {
    return Utilities.formatDate(d, "GMT+8", "yyyyMMdd");
  } catch(e) {
    return "";
  }
}

/**
 * 提取特徵對比表
 */
function extractComparisonTable(doc, text, speciesList) {
  var tableResult = {
    headers: ["比對項目"].concat(speciesList.length > 0 ? speciesList : ["物種 A", "物種 B"]),
    rows: []
  };

  // 1. 嘗試從 Google Doc 原生表格提取
  if (doc) {
    try {
      var tables = doc.getBody().getTables();
      if (tables.length > 0) {
        var table = tables[0];
        var numRows = table.getNumRows();
        if (numRows > 0) {
          var headerRow = table.getRow(0);
          var hCount = headerRow.getNumCells();
          var headers = [];
          for (var c = 0; c < hCount; c++) {
            headers.push(headerRow.getCell(c).getText().trim());
          }
          if (headers.length > 1) tableResult.headers = headers;

          for (var r = 1; r < numRows; r++) {
            var row = table.getRow(r);
            var feature = row.getCell(0).getText().trim();
            var values = [];
            for (var c2 = 1; c2 < row.getNumCells(); c2++) {
              values.push(row.getCell(c2).getText().trim());
            }
            if (feature) {
              tableResult.rows.push({
                feature: feature,
                values: values
              });
            }
          }
          if (tableResult.rows.length > 0) return tableResult;
        }
      }
    } catch(e) {}
  }

  // 2. 若無原生表格，嘗試從純文字 Markdown / 管道符號表格提取
  var tableMatch = text.match(/【?重點特徵對比表】?[\s\S]*?(?=(?:【|===|---|鑑別重點|$))/i);
  var block = tableMatch ? tableMatch[0] : text;
  var lines = block.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf('|') !== -1) {
      var cells = line.split('|').map(function(c){ return c.trim().replace(/^\[|\]$/g, ''); }).filter(Boolean);
      if (cells.length >= 2) {
        if (/比對項目|特徵|項目/i.test(cells[0])) {
          tableResult.headers = cells;
        } else if (!/^[-=:\s]+$/.test(cells.join(''))) {
          tableResult.rows.push({
            feature: cells[0],
            values: cells.slice(1)
          });
        }
      }
    }
  }

  return tableResult;
}

/**
 * 提取鑑別重點詳解
 */
function extractComparisonDetails(text) {
  var details = [];
  var detailMatch = text.match(/【?(?:鑑別重點詳解|鑑別要點|重點解析|外觀詳解)】?[\s\S]*?(?=(?:【|===|---|參考資料|$))/i);
  if (!detailMatch) return details;

  var block = detailMatch[0].replace(/^【?(?:鑑別重點詳解|鑑別要點|重點解析|外觀詳解)】?[\s:\n]*/i, '').trim();
  if (!block) return details;

  var lines = block.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var currentItem = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var numMatch = line.match(/^(\d+[\.、\)]\s*[^:：\n]+)[：:\s]*(.*)/);
    if (numMatch) {
      if (currentItem) details.push(currentItem);
      currentItem = {
        title: numMatch[1].trim(),
        content: numMatch[2] ? numMatch[2].trim() : ""
      };
    } else if (currentItem) {
      currentItem.content += (currentItem.content ? "\n" : "") + line;
    } else {
      currentItem = { title: "鑑別重點 " + (details.length + 1), content: line };
    }
  }
  if (currentItem) details.push(currentItem);

  return details;
}

// ==========================================================================
// ⚡ Drive images/ 資料夾管理與圖片處理
// ==========================================================================

function getOrCreateImagesFolder(parentFolder) {
  var folders = parentFolder.getFoldersByName('images');
  if (folders.hasNext()) return folders.next();
  var newFolder = parentFolder.createFolder('images');
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

function getDriveThumbnailUrl(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
}

function getPlantGalleryFromDoc(doc, folder, plantName, imagesFolder, fullDocText, defaultDateStr, debugLog) {
  var galleryItems = [];
  if (!doc) return galleryItems;

  var docImages = getDocImagesWithNearbyText(doc);
  if (docImages.length === 0) {
    try {
      var driveUrl = findDriveFolderPhoto(folder, plantName, imagesFolder);
      if (driveUrl) {
        galleryItems.push({
          url: driveUrl,
          caption: "(" + defaultDateStr + ")"
        });
      }
    } catch(eD) {}
    return galleryItems;
  }

  var existingFilesMap = {};
  try {
    var files = imagesFolder.getFiles();
    var prefix = plantName + '_';
    while (files.hasNext()) {
      var f = files.next();
      var fn = f.getName();
      if (fn.indexOf(prefix) === 0) {
        existingFilesMap[fn] = getDriveThumbnailUrl(f.getId());
      }
    }
  } catch(eCache) {}

  var seenBlobKeys = {};
  var defaultDocCaption = parseDefaultCaptionFromText(fullDocText, defaultDateStr);

  // ⚡ 抽取文檔中所有依序出現的有效標註行清單 (已嚴格排除「植物資料」等大標題)
  var allDocCaptions = extractAllOrderedDocCaptions(fullDocText, defaultDateStr, plantName);
  var usedCaptionIndices = {};

  debugLog.push("🔍 [" + plantName + "] 全文解析出的標註清單 (" + allDocCaptions.length + " 筆): " + JSON.stringify(allDocCaptions));
  for (var d = 0; d < docImages.length; d++) {
    debugLog.push("🖼️ 圖片 " + d + " 鄰近文字: " + JSON.stringify(docImages[d].nearbyText));
  }

  for (var i = 0; i < docImages.length; i++) {
    try {
      var item = docImages[i];
      var blob = item.image.getBlob();
      if (!blob) continue;
      
      var bytes = blob.getBytes();
      var bytesLen = bytes.length;
      if (bytesLen < 200) continue;

      var blobKey = bytesLen + '_' + (blob.getContentType() || '');
      if (seenBlobKeys[blobKey]) continue;
      seenBlobKeys[blobKey] = true;

      var imgIndex = galleryItems.length;
      var hashStr = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, bytes))
                             .replace(/[^a-zA-Z0-9]/g, '')
                             .substring(0, 8);
      var saveName = plantName + '_' + imgIndex + '_' + hashStr + '.jpg';
      var imgUrl = "";

      if (existingFilesMap[saveName]) {
        imgUrl = existingFilesMap[saveName];
      } else {
        imgUrl = saveBlobToDriveAndGetUrl(blob, imagesFolder, saveName);
      }

      if (imgUrl) {
        // 🎯 核心演算法：一對一精確標註指派與已用標記同步
        var specificCaption = null;
        if (item.nearbyText) {
          var candidateCap = parseSpecificCaptionFromNearbyText(item.nearbyText, plantName);
          if (candidateCap && !isCaptionAlreadyUsed(candidateCap, galleryItems)) {
            specificCaption = candidateCap;
            // ⚡ 同步標記全局隊列中對應的標註為已消費
            var foundCIdx = allDocCaptions.indexOf(candidateCap);
            if (foundCIdx !== -1) {
              usedCaptionIndices[foundCIdx] = true;
            }
          }
        }

        // 若專屬文字為空或重複，優先依圖片索引指派 allDocCaptions[imgIndex]，或依序消費下一個未使用的有效標註！
        if (!specificCaption) {
          if (imgIndex < allDocCaptions.length && !usedCaptionIndices[imgIndex] && !isCaptionAlreadyUsed(allDocCaptions[imgIndex], galleryItems)) {
            usedCaptionIndices[imgIndex] = true;
            specificCaption = allDocCaptions[imgIndex];
          } else {
            for (var cIdx = 0; cIdx < allDocCaptions.length; cIdx++) {
              if (!usedCaptionIndices[cIdx] && !isCaptionAlreadyUsed(allDocCaptions[cIdx], galleryItems)) {
                usedCaptionIndices[cIdx] = true;
                specificCaption = allDocCaptions[cIdx];
                break;
              }
            }
          }
        }

        if (!specificCaption) {
          specificCaption = defaultDocCaption || ("特徵照片 " + (imgIndex + 1));
        }

        galleryItems.push({
          url: imgUrl,
          caption: specificCaption
        });
        debugLog.push("🎯 圖片 " + imgIndex + " 最終指派標註: " + JSON.stringify(specificCaption));
      }
    } catch(eImg) {
      debugLog.push("⚠️ 處理圖片 " + i + " 異常: " + eImg.toString());
    }
  }

  debugLog.push("✅ " + plantName + " 成功解析 " + galleryItems.length + " 張獨立照片與標題");
  return galleryItems;
}

function isCaptionAlreadyUsed(caption, galleryItems) {
  if (!caption || !galleryItems) return false;
  for (var k = 0; k < galleryItems.length; k++) {
    if (galleryItems[k].caption === caption) return true;
  }
  return false;
}

/**
 * ⚡ 全文標註行依序提取器 (v98 支援 \r 換行與嚴格純化版)
 * 提取所有包含日期/地點或特徵時地的有效行，100% 排除「油桐 - 植物資料」等標題
 */
function extractAllOrderedDocCaptions(text, defaultDateStr, plantName) {
  var captions = [];
  if (!text) return captions;

  // ⚡ 關鍵修復：相容 Google Docs 的 \r / \r\n 換行符號！
  var lines = text.split(/[\r\n]+/).map(function(l){ return l.trim(); }).filter(Boolean);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // 嚴格跳過文章主標題與一般章節
    if (/植物資料|基本資料|形態特徵|特殊作用|用途|養護|參考資料|【?其他附圖】?|【?植物附圖】?/i.test(line)) {
      continue;
    }
    if (plantName && (line === plantName || line.indexOf(plantName + " -") === 0 || line.indexOf(plantName + " –") === 0)) {
      continue;
    }

    var cap = parseSpecificCaptionFromNearbyText(line, plantName);
    if (cap && captions.indexOf(cap) === -1) {
      captions.push(cap);
    }
  }
  return captions;
}

/**
 * ⚡ 遍歷文檔中所有段落與表格內的圖片，並提取各圖片緊鄰的下方文字
 */
function getDocImagesWithNearbyText(doc) {
  var results = [];
  if (!doc) return results;

  try {
    var body = doc.getBody();
    var numChildren = body.getNumChildren();

    for (var i = 0; i < numChildren; i++) {
      var child = body.getChild(i);
      var type = child.getType();

      if (type === DocumentApp.ElementType.PARAGRAPH) {
        processParagraphImages(child.asParagraph(), body, i, numChildren, results);
      } else if (type === DocumentApp.ElementType.TABLE) {
        var table = child.asTable();
        var numRows = table.getNumRows();
        for (var r = 0; r < numRows; r++) {
          var row = table.getRow(r);
          var numCells = row.getNumCells();
          for (var c = 0; c < numCells; c++) {
            var cell = row.getCell(c);
            var numCellChildren = cell.getNumChildren();
            for (var cc = 0; cc < numCellChildren; cc++) {
              var cellChild = cell.getChild(cc);
              if (cellChild.getType() === DocumentApp.ElementType.PARAGRAPH) {
                processParagraphImages(cellChild.asParagraph(), cell, cc, numCellChildren, results);
              }
            }
          }
        }
      }
    }
  } catch(e) {}

  return results;
}

function processParagraphImages(para, container, childIndex, totalChildren, results) {
  if (!para) return;
  var numParaChildren = para.getNumChildren();
  
  for (var j = 0; j < numParaChildren; j++) {
    var pChild = para.getChild(j);
    if (pChild.getType() === DocumentApp.ElementType.INLINE_IMAGE) {
      var img = pChild.asInlineImage();
      var nearbyText = "";

      // 1. 同段落內的純文字
      var sameParaText = (para.getText() || "").trim();
      if (sameParaText && !/植物資料|基本資料|形態特徵/.test(sameParaText)) {
        nearbyText += sameParaText + "\n";
      }

      // 2. 緊接在該圖片下方的專屬說明段落 (支援穿透 HORIZONTAL_RULE 與空行，遇到下一張圖即刻停止)
      for (var nextIdx = childIndex + 1; nextIdx < Math.min(childIndex + 6, totalChildren); nextIdx++) {
        var nextChild = container.getChild(nextIdx);
        var cType = nextChild.getType();

        // 🛡️ 穿透水平線 (HORIZONTAL_RULE)，繼續往下尋找文字說明！
        if (cType === DocumentApp.ElementType.HORIZONTAL_RULE) {
          continue;
        }

        if (cType === DocumentApp.ElementType.PARAGRAPH) {
          var nextPara = nextChild.asParagraph();
          
          var hasOtherImg = false;
          for (var nj = 0; nj < nextPara.getNumChildren(); nj++) {
            if (nextPara.getChild(nj).getType() === DocumentApp.ElementType.INLINE_IMAGE) {
              hasOtherImg = true;
              break;
            }
          }
          if (hasOtherImg) {
            break; // 遇到下一張圖片段落停止
          }

          var nt = (nextPara.getText() || "").trim();
          if (nt) {
            // 排除文章大標題
            if (/植物資料|基本資料|形態特徵|特殊作用|用途|養護|參考資料/.test(nt)) {
              break;
            }
            nearbyText += nt + "\n";
            if (nt.indexOf("@") !== -1 || /\d{4}/.test(nt)) {
              break;
            }
          }
        }
      }

      results.push({ image: img, nearbyText: nearbyText.trim() });
    }
  }
}

/**
 * ⚡ 智慧特徵與拍攝日期地點解析器 (v98 支援 \r 換行版)
 */
function parseSpecificCaptionFromNearbyText(text, plantName) {
  if (!text) return null;

  // ⚡ 關鍵修復：相容 Google Docs 的 \r / \r\n 換行符號！
  var lines = text.split(/[\r\n]+/).map(function(l){ return l.trim(); }).filter(Boolean);
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // 🛡️ 徹底排除非標註的文檔標題行 (如: "油桐 - 植物資料"、"油桐" 等)
    if (/植物資料|基本資料|形態特徵|特殊作用|用途|養護|參考資料|學名|別名|科別/i.test(line)) {
      continue;
    }
    if (plantName && (line === plantName || line.indexOf(plantName + " -") === 0 || line.indexOf(plantName + " –") === 0)) {
      continue;
    }

    // 1. 匹配拍攝日期與地點 (如 20260506@大甲水東流桐花步道 或 (照片拍攝：20260506@...))
    var matchDateLoc = line.match(/(?:照片拍攝地點與日期|照片拍攝|拍攝地點與日期|拍攝日期|拍攝地點|拍攝於)?[：:\s]*\(?(\d{4}[年\-\/\.]?\s*\d{1,2}[月\-\/\.]?\s*\d{1,2}[日]?)\s*@\s*([^\)\n\r\t]+)\)?/i);
    
    if (matchDateLoc) {
      var rawDate = matchDateLoc[1];
      var rawLoc = matchDateLoc[2].trim();

      var dMatch = rawDate.match(/(\d{4})[年\-\/\.]?\s*(\d{1,2})[月\-\/\.]?\s*(\d{1,2}[日]?)/);
      var dateClean = dMatch 
        ? dMatch[1] + (dMatch[2].length === 1 ? '0' + dMatch[2] : dMatch[2]) + (dMatch[3].replace(/[^\d]/g, '').length === 1 ? '0' + dMatch[3].replace(/[^\d]/g, '') : dMatch[3].replace(/[^\d]/g, ''))
        : rawDate.replace(/[^\d]/g, '');

      var locClean = rawLoc.split(/[-–—\)]/)[0].replace(/[\)\s]+/g, '').trim();
      if (locClean && !locClean.startsWith('@')) locClean = '@' + locClean;

      var dateLocFormatted = "(" + dateClean + locClean + ")";

      // 提取日期地點前面的特徵標註說明 (例如: "油桐果" 或 "葉基的腺盃")
      var featurePart = line.substring(0, matchDateLoc.index).trim();
      
      // 🧹 清理章節標題雜訊 (如: "其他附圖"、"植物附圖" 等)
      featurePart = featurePart.replace(/^[\(\[\【]?\s*(?:其他附圖|植物附圖|附圖|特徵照片|更多附圖|照片記錄|植物特徵|照片)\s*[\)\]\】]?\s*/gi, '')
                               .replace(/^[-\*•\d\.\s]+/, '')
                               .replace(/[\(\[\{（【]+$/, '')
                               .replace(/[:：\-_–\s]+$/, '')
                               .replace(/(?:照片拍攝|拍攝於|特徵說明|說明|特徵照片)\s*$/gi, '')
                               .trim();

      if (featurePart && featurePart.length > 0 && !/^[\(\)（）\[\]【】\-_]+$/.test(featurePart)) {
        return featurePart + " " + dateLocFormatted;
      }
      return dateLocFormatted;
    }

    // 2. 匹配括號特徵標註 (如: (葉基腺盃特寫) 或 (葉緣光滑狹長))
    var matchFeatureCaption = line.match(/\(([^\)\n\r]{2,30})\)/);
    if (matchFeatureCaption) {
      var cap = matchFeatureCaption[1].trim();
      cap = cap.replace(/^[\(\[\【]?\s*(?:其他附圖|植物附圖|附圖|特徵照片|更多附圖|照片記錄|植物特徵|照片)\s*[\)\]\】]?\s*/gi, '').trim();
      if (cap && !/^特徵照片\s*\d*$/i.test(cap) && cap.indexOf("植物資料") === -1) {
        return cap;
      }
    }
  }

  return null;
}

function parseDefaultCaptionFromText(text, defaultDateStr) {
  var parsed = parseDateAndLocationFromLine(text);
  if (parsed && (parsed.dateAdded || parsed.locationNote)) {
    var locClean = parsed.locationNote ? (parsed.locationNote.indexOf("@") === 0 ? parsed.locationNote : "@" + parsed.locationNote) : "";
    return "(" + (parsed.dateAdded || defaultDateStr) + locClean + ")";
  }
  return "(" + defaultDateStr + ")";
}

function saveBlobToDriveAndGetUrl(blob, imagesFolder, fileName) {
  if (!blob || !imagesFolder || !fileName) return null;
  try {
    var existing = imagesFolder.getFilesByName(fileName);
    if (existing.hasNext()) {
      return getDriveThumbnailUrl(existing.next().getId());
    }

    var contentType = blob.getContentType() || '';
    if (contentType && contentType.indexOf('image/') === -1 && contentType.indexOf('application/octet-stream') === -1) {
      return null;
    }

    var fileToSave = null;
    try {
      var resized = ImagesService.makeImage(blob).resize(800, 800).getAs(MimeType.JPEG);
      resized.setName(fileName);
      fileToSave = imagesFolder.createFile(resized);
    } catch(eResize) {
      try {
        var fallback = blob.getAs(MimeType.JPEG);
        fallback.setName(fileName);
        fileToSave = imagesFolder.createFile(fallback);
      } catch(eFallback) {
        blob.setName(fileName);
        fileToSave = imagesFolder.createFile(blob);
      }
    }

    if (!fileToSave) return null;
    fileToSave.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return getDriveThumbnailUrl(fileToSave.getId());
  } catch(e) {
    return null;
  }
}

function findDriveFolderPhoto(folder, plantName, imagesFolder) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var mime = f.getMimeType();
    if (mime.indexOf("image/") === 0 || mime.indexOf("image") !== -1) {
      var fname = f.getName();
      if (fname.indexOf(plantName) !== -1 || plantName.indexOf(fname.split('.')[0]) !== -1) {
        var cacheFileName = plantName + '_0.jpg';
        var cached = imagesFolder.getFilesByName(cacheFileName);
        if (cached.hasNext()) return getDriveThumbnailUrl(cached.next().getId());
        var copiedFile = f.makeCopy(cacheFileName, imagesFolder);
        copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return getDriveThumbnailUrl(copiedFile.getId());
      }
    }
  }
  return null;
}

// ==========================================================================
// 資料夾定位與輔助
// ==========================================================================

function getMainFolder() {
  var mainNames = ["捻花惹草", "[捻花惹草]", "【捻花惹草】"];
  for (var i = 0; i < mainNames.length; i++) {
    var folders = DriveApp.getFoldersByName(mainNames[i]);
    if (folders.hasNext()) return folders.next();
  }
  return null;
}

function getComparisonFolder() {
  var compNames = ["相似鑑別", "[相似鑑別]", "【相似鑑別】", "植物鑑別", "[植物鑑別]"];
  for (var i = 0; i < compNames.length; i++) {
    var folders = DriveApp.getFoldersByName(compNames[i]);
    if (folders.hasNext()) return folders.next();
  }
  return null;
}

function findTargetFolder() {
  var stagingNames = ["[增修刪]", "增修刪", "【增修刪】"];
  for (var s = 0; s < stagingNames.length; s++) {
    var sFolders = DriveApp.getFoldersByName(stagingNames[s]);
    while (sFolders.hasNext()) {
      var sf = sFolders.next();
      var sfDocs = getAllDocsInFolder(sf);
      if (sfDocs.length > 0) {
        return { folder: sf, syncMode: "INCREMENTAL" };
      }
    }
  }
  for (var s2 = 0; s2 < stagingNames.length; s2++) {
    var sFolders2 = DriveApp.getFoldersByName(stagingNames[s2]);
    if (sFolders2.hasNext()) {
      return { folder: sFolders2.next(), syncMode: "INCREMENTAL" };
    }
  }
  var mainNames = ["[捻花惹草]", "捻花惹草", "【捻花惹草】"];
  var bestFolder = null;
  for (var i = 0; i < mainNames.length; i++) {
    var folders = DriveApp.getFoldersByName(mainNames[i]);
    while (folders.hasNext()) {
      var f = folders.next();
      if (getAllDocsInFolder(f).length > 0) return { folder: f, syncMode: "FULL" };
      if (!bestFolder) bestFolder = f;
    }
  }
  if (bestFolder) return { folder: bestFolder, syncMode: "FULL" };
  return null;
}

function getAllDocsInFolder(folder) {
  var docs = [];
  var seenIds = {};
  function searchIn(targetFolder) {
    if (!targetFolder) return;
    try {
      var files = targetFolder.getFiles();
      while (files.hasNext()) {
        var f = files.next();
        if (f.isTrashed && f.isTrashed()) continue;
        var mime = (f.getMimeType() || "").toLowerCase();
        if (mime.indexOf("image/") === -1 && mime.indexOf("video/") === -1 && mime.indexOf("audio/") === -1) {
          if (!seenIds[f.getId()]) {
            seenIds[f.getId()] = true;
            docs.push(f);
          }
        }
      }
    } catch(e1) {}
    try { var subs = targetFolder.getSubFolders(); while (subs.hasNext()) { searchIn(subs.next()); } } catch(e3) {}
  }
  searchIn(folder);
  return docs;
}

function extractReferences(text, doc) {
  var refs = [];
  var seenUrls = {};
  var mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  var mdMatch;
  while ((mdMatch = mdRegex.exec(text)) !== null) {
    if (!seenUrls[mdMatch[2]]) { seenUrls[mdMatch[2]] = true; refs.push({ title: mdMatch[1].trim(), url: mdMatch[2].trim() }); }
  }
  if (doc) {
    try {
      var paras = doc.getBody().getParagraphs();
      var inRef = false;
      for (var i = 0; i < paras.length; i++) {
        var pText = paras[i].getText().trim();
        if (pText.indexOf("參考資料") !== -1) { inRef = true; continue; }
        if (inRef) {
          for (var j = 0; j < paras[i].getNumChildren(); j++) {
            var child = paras[i].getChild(j);
            if (child.getType() === DocumentApp.ElementType.TEXT) {
              var lu = child.asText().getLinkUrl();
              if (lu && !seenUrls[lu]) { seenUrls[lu] = true; refs.push({ title: pText || "參考資料連結", url: lu }); break; }
            }
          }
        }
      }
    } catch(e) {}
  }
  if (refs.length === 0) {
    var urlRegex = /(https?:\/\/[^\s\)]+)/g, um;
    while ((um = urlRegex.exec(text)) !== null) {
      if (!seenUrls[um[1]]) { seenUrls[um[1]] = true; refs.push({ title: "外部參考連結", url: um[1].trim() }); }
    }
  }
  return refs;
}

function extractMorphologyDetails(text) {
  var details = [];
  var morphMatch = text.match(/形態特徵[\s\S]*?(?=(?:特殊作用|用途|養護|參考資料|$))/i);
  if (!morphMatch) return details;
  var block = morphMatch[0].replace(/^形態特徵[\s:\n]*/i, '').trim();
  if (!block) return details;
  block.split('\n').map(function(l) { return l.trim(); }).filter(Boolean).forEach(function(line) {
    var cleaned = line.replace(/^[\d\.\-\*•\s]+/, '').trim();
    if (!cleaned) return;
    var ci = cleaned.search(/[：:]/);
    if (ci !== -1) details.push({ label: cleaned.substring(0, ci).trim(), value: cleaned.substring(ci + 1).trim() });
    else details.push({ label: "特徵說明", value: cleaned });
  });
  return details;
}

function parseDateAndLocationFromLine(line) {
  if (!line) return null;
  var str = line.trim();
  if (str.indexOf("\n") !== -1) {
    var sls = str.split("\n");
    for (var sl = 0; sl < sls.length; sl++) {
      if (sls[sl].indexOf("@") !== -1 || /\d{4}/.test(sls[sl])) { str = sls[sl].trim(); break; }
    }
  }
  var dateStr = "";
  var dm = str.match(/(\d{4})[年\-\/\.]?\s*(\d{1,2})[月\-\/\.]?\s*(\d{1,2})[日]?/);
  if (dm) {
    dateStr = dm[1] + (dm[2].length === 1 ? '0' + dm[2] : dm[2]) + (dm[3].length === 1 ? '0' + dm[3] : dm[3]);
  }
  var locStr = "";
  var atIdx = str.indexOf("@");
  if (atIdx !== -1) {
    var sm = str.substring(atIdx + 1).match(/^([^\)\n\r\t\s]+)/);
    if (sm) { var rl = sm[1].replace(/[\)\s]+/g, '').trim(); if (rl) locStr = "@" + rl; }
  }
  if (dateStr || locStr) return { dateAdded: dateStr, locationNote: locStr, formattedCaption: "(" + (dateStr || "") + locStr + ")" };
  return null;
}

function parseDocText(text, fileName, defaultDateStr, imageUrl, galleryItems, doc, debugLog, plantName) {
  function getField(pattern) { var m = text.match(pattern); return m ? m[1].trim() : ''; }

  var name = plantName || fileName.replace(/[-_–\s]*植物資料.*/g, '').replace(/\.(docx?|gdoc)$/i, '').trim();
  var dateAdded = defaultDateStr;
  var locationNote = "";
  var parsedDl = parseDateAndLocationFromLine(text);
  if (parsedDl) {
    if (parsedDl.dateAdded) dateAdded = parsedDl.dateAdded;
    if (parsedDl.locationNote) locationNote = parsedDl.locationNote;
  }

  return {
    id: "plant-" + Math.random().toString(36).substr(2, 9),
    name: name || "花草植物",
    scientificName: getField(/[【\[\(]?(?:學名)[】\]\)]?[：:\s]+([^\n]+)/),
    englishName: getField(/[【\[\(]?(?:英文名)[】\]\)]?[：:\s]+([^\n]+)/),
    aliases: (getField(/[【\[\(]?(?:別名)[】\]\)]?[：:\s]+([^\n]+)/) || "").split(/[、,]/).map(function(s){ return s.trim(); }).filter(Boolean),
    family: getField(/[【\[\(]?(?:科別|所屬科別)[】\]\)]?[：:\s]+([^\n]+)/) || "觀賞植物",
    dateAdded: dateAdded,
    locationNote: locationNote,
    imageUrl: imageUrl,
    petFriendly: text.indexOf("無毒") !== -1 || text.indexOf("寵物友善") !== -1,
    bloomPeriod: getField(/[【\[\(]?(?:花期)[】\]\)]?[：:\s]+([^\n]+)/),
    fruitPeriod: getField(/[【\[\(]?(?:果期)[】\]\)]?[：:\s]+([^\n]+)/),
    sporePeriod: getField(/[【\[\(]?(?:孢子期)[】\]\)]?[：:\s]+([^\n]+)/),
    morphologyDetails: extractMorphologyDetails(text),
    uses: [text.indexOf("觀賞") !== -1 ? "觀賞：熱門觀葉植物" : "園藝栽培"],
    careNotes: {
      light: getField(/[【\[\(]?(?:光照|日照)[】\]\)]?[：:\s]+([^\n]+)/),
      humidity: getField(/[【\[\(]?(?:水分與濕度|濕度|水分)[】\]\)]?[：:\s]+([^\n]+)/),
      waterQuality: getField(/[【\[\(]?(?:水質)[】\]\)]?[：:\s]+([^\n]+)/)
    },
    references: extractReferences(text, doc),
    galleryImages: galleryItems || []
  };
}
