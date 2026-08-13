/**
 * ==========================================================================
 * Google Apps Script (GAS) 自動掃描腳本 - v75 聰明增量與零等待保護版
 * 
 * 重大修復與升級：
 * 1. ⚡ [增修刪] 零等待保護：當 [增修刪] 為空時，0.1秒直接回傳 0 筆異動，絕不白跑全量掃描
 * 2. 徹底消除圖片重複產生與雙重讀取 Bug
 * 3. 智慧增量快取：當 Doc 中新增照片時，自動精確補抓新照片並存入 images/ 主資料夾
 * 4. 逐圖時間地點解析：自動辨識每張照片下方/附近的獨立拍攝時間與地點 (如 20260707@大坑四號步道)
 * 5. 草稿防護機制：自動忽略名稱含有 [草稿]、(編輯中)、Draft 的檔案
 * ==========================================================================
 */

function doGet(e) {
  var debugLog = [];
  try {
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

    var docs = getAllDocsInFolder(folder);

    // ⚡ v79 智慧增量 fallback 全量機制
    if (syncMode === "INCREMENTAL" && docs.length === 0) {
      var realMainFolder = getMainFolder();
      if (realMainFolder) {
        var mainDocs = getAllDocsInFolder(realMainFolder);
        var hasChanges = false;
        var reason = "";

        // 解析傳入的本機狀態參數
        var lastSynced = e && e.parameter && e.parameter.last_synced ? e.parameter.last_synced : "";
        var plantCount = e && e.parameter && e.parameter.plant_count ? parseInt(e.parameter.plant_count, 10) : -1;

        if (plantCount !== -1 && mainDocs.length !== plantCount) {
          hasChanges = true;
          reason = "雲端檔案數量 (" + mainDocs.length + ") 與本機數量 (" + plantCount + ") 不一致";
        } else if (lastSynced) {
          var lastSyncedTime = isNaN(lastSynced) ? new Date(lastSynced).getTime() : parseInt(lastSynced, 10);
          if (!isNaN(lastSyncedTime)) {
            for (var d = 0; d < mainDocs.length; d++) {
              if (mainDocs[d].getLastUpdated().getTime() > lastSyncedTime) {
                hasChanges = true;
                reason = "發現檔案在上次同步後有更新: " + mainDocs[d].getName();
                break;
              }
            }
          } else {
            hasChanges = true;
            reason = "無效的 last_synced 格式: " + lastSynced;
          }
        } else {
          hasChanges = true;
          reason = "未提供 last_synced 參數";
        }

        if (hasChanges) {
          debugLog.push("🔄 [增修刪] 為空，但偵測到雲端主資料夾有更新 (" + reason + ")，自動切換為全量同步");
          folder = realMainFolder;
          folderName = folder.getName();
          syncMode = "FULL";
          docs = mainDocs;
        } else {
          debugLog.push("⚡ [增修刪] 為空且雲端無更新，0.1秒直接回傳 0 筆異動");
        }
      }
    }

    var plantList = [];
    var deletedList = [];

    for (var i = 0; i < docs.length; i++) {
      var file = docs[i];
      var docId = file.getId();
      var fileName = file.getName();

      // 🛡️ 草稿保護：若檔名包含 [草稿]、(編輯中)、Draft，自動跳過不安裝到正式庫
      if (/[\(\[\【]?(草稿|編輯中|Draft|temp)[\)\]\】]?/i.test(fileName)) {
        debugLog.push("🛡️ 忽略草稿檔案: 「" + fileName + "」");
        continue;
      }

      var createdDate = file.getDateCreated();
      var formattedDate = Utilities.formatDate(createdDate, "GMT+8", "yyyyMMdd");
      var plantNameOnly = fileName.replace(/[-_–\s]*植物資料.*/g, '').trim();

      if (syncMode === "INCREMENTAL" && (/^[\(\[\【]?刪除[\]\)\】\_\-\s]*/.test(fileName) || fileName.indexOf("刪除") !== -1)) {
        var cleanTargetName = fileName.replace(/^[\(\[\【]?刪除[\]\)\】\_\-\s]*/g, '')
                                      .replace(/[-_–\s]*植物資料.*/g, '')
                                      .replace(/\.(docx?|gdoc)$/i, '')
                                      .trim();
        if (cleanTargetName) {
          deletedList.push({ name: cleanTargetName, fileName: fileName });
          debugLog.push("🗑️ 偵測到待刪除檔案: 「" + cleanTargetName + "」");
          continue;
        }
      }

      try {
        var doc = DocumentApp.openById(docId);
        var text = doc.getBody().getText();

        // ⚡ v71：逐圖解析圖片網址與獨立標題 (已排重 & 正確擴充快取)
        var galleryItems = getPlantGalleryFromDoc(doc, folder, plantNameOnly, imagesFolder, text, formattedDate, debugLog);
        var primaryImageUrl = galleryItems.length > 0 ? galleryItems[0].url : "";

        var parsedPlant = parseDocText(text, fileName, formattedDate, primaryImageUrl, galleryItems, doc, debugLog, plantNameOnly);
        plantList.push(parsedPlant);
      } catch (docErr) {
        debugLog.push("❌ 讀取 Doc 異常 (" + fileName + "): " + docErr.toString());
      }
    }

    plantList.sort(function(a, b) {
      return (b.dateAdded || "").localeCompare(a.dateAdded || "");
    });

    var result = {
      status: "success",
      syncMode: syncMode,
      folderFound: folderName,
      count: plantList.length,
      deletedCount: deletedList.length,
      updatedAt: new Date().toISOString(),
      debugLog: debugLog,
      plants: plantList,
      deletedPlants: deletedList
    };

    return ContentService.createTextOutput(JSON.stringify(result))
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
// ⚡ v71 新增：Drive images/ 資料夾管理與精確單次圖片處理
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

/**
 * ⚡ v71 核心：解析 Doc 內的所有圖片與對應獨立標題 (時間地點)
 */
function getPlantGalleryFromDoc(doc, folder, plantName, imagesFolder, fullDocText, defaultDateStr, debugLog) {
  var galleryItems = [];
  if (!doc) return galleryItems;

  var docImages = getDocImagesWithNearbyText(doc);
  if (docImages.length === 0) {
    // 若 Doc 無內嵌圖片，嘗試搜尋 Drive 同名圖檔
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

  // 先讀取 images/ 中已存在的快取檔案對照表
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

  for (var i = 0; i < docImages.length; i++) {
    try {
      var item = docImages[i];
      var blob = item.image.getBlob();
      if (!blob) continue;
      
      var bytesLen = blob.getBytes().length;
      if (bytesLen < 200) continue; // 過濾小於 200 bytes 的佔位小圖

      var blobKey = bytesLen + '_' + (blob.getContentType() || '');
      if (seenBlobKeys[blobKey]) continue; // 避免同一文章內完全重複的 Blob 圖片
      seenBlobKeys[blobKey] = true;

      var imgIndex = galleryItems.length;
      var saveName = plantName + '_' + imgIndex + '.jpg';
      var imgUrl = "";

      if (existingFilesMap[saveName]) {
        imgUrl = existingFilesMap[saveName];
      } else {
        imgUrl = saveBlobToDriveAndGetUrl(blob, imagesFolder, saveName);
      }

      if (imgUrl) {
        // 解析該張照片專屬的拍攝時間與地點標題
        var specificCaption = parseSpecificCaptionFromNearbyText(item.nearbyText) || defaultDocCaption || ("特徵照片 " + (imgIndex + 1));
        galleryItems.push({
          url: imgUrl,
          caption: specificCaption
        });
      }
    } catch(eImg) {
      debugLog.push("⚠️ 處理圖片 " + i + " 異常: " + eImg.toString());
    }
  }

  debugLog.push("✅ " + plantName + " 成功解析 " + galleryItems.length + " 張獨立照片與標題");
  return galleryItems;
}

/**
 * ⚡ v71 修復：單次精確走訪 Doc 中的圖片及其下方/附近說明文字 (絕不重複走訪)
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
        var para = child.asParagraph();
        var numParaChildren = para.getNumChildren();
        
        for (var j = 0; j < numParaChildren; j++) {
          var pChild = para.getChild(j);
          if (pChild.getType() === DocumentApp.ElementType.INLINE_IMAGE) {
            var img = pChild.asInlineImage();
            // 抓取照片附近的說明文字：包含同段落文字與後續 2 個段落
            var nearbyText = para.getText() || "";
            if (i + 1 < numChildren && body.getChild(i + 1).getType() === DocumentApp.ElementType.PARAGRAPH) {
              nearbyText += "\n" + body.getChild(i + 1).asParagraph().getText();
            }
            if (i + 2 < numChildren && body.getChild(i + 2).getType() === DocumentApp.ElementType.PARAGRAPH) {
              nearbyText += "\n" + body.getChild(i + 2).asParagraph().getText();
            }
            results.push({ image: img, nearbyText: nearbyText });
          }
        }
      } else if (type === DocumentApp.ElementType.INLINE_IMAGE) {
        results.push({ image: child.asInlineImage(), nearbyText: "" });
      }
    }
  } catch(e) {}

  return results;
}

/**
 * 解析照片附近專屬的時間與地點標題 (如：20260707@大坑四號步道)
 */
function parseSpecificCaptionFromNearbyText(text) {
  if (!text) return null;

  // 1. 優先尋找完整標註格式：(照片拍攝地點與日期：20260707@大坑四號步道 - 盛開的紫茉莉) 或 (20260707@大坑四號步道)
  var matchDateLoc = text.match(/(?:照片拍攝地點與日期[：:\s]*)?\(?(\d{4}[年\-\/\.]?\s*\d{1,2}[月\-\/\.]?\s*\d{1,2}[日]?)\s*@\s*([^\)\n\r\t]+)\)?/);
  if (matchDateLoc) {
    var rawDate = matchDateLoc[1];
    var rawLoc = matchDateLoc[2].trim();

    var dMatch = rawDate.match(/(\d{4})[年\-\/\.]?\s*(\d{1,2})[月\-\/\.]?\s*(\d{1,2})[日]?/);
    var dateClean = dMatch 
      ? dMatch[1] + (dMatch[2].length === 1 ? '0' + dMatch[2] : dMatch[2]) + (dMatch[3].length === 1 ? '0' + dMatch[3] : dMatch[3])
      : rawDate.replace(/[^\d]/g, '');

    // 清理地點說明中可能夾帶的後續描述
    var locClean = rawLoc.split(/[-–—]/)[0].replace(/[\)\s]+/g, '').trim();
    if (locClean && !locClean.startsWith('@')) locClean = '@' + locClean;

    return "(" + dateClean + locClean + ")";
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
// 全文圖片走訪與資料解析
// ==========================================================================

function getMainFolder() {
  var mainNames = ["捻花惹草", "[捻花惹草]", "【捻花惹草】"];
  for (var i = 0; i < mainNames.length; i++) {
    var folders = DriveApp.getFoldersByName(mainNames[i]);
    if (folders.hasNext()) return folders.next();
  }
  return null;
}

function findTargetFolder() {
  var stagingNames = ["增修刪", "[增修刪]", "【增修刪】"];
  for (var s = 0; s < stagingNames.length; s++) {
    var sFolders = DriveApp.getFoldersByName(stagingNames[s]);
    if (sFolders.hasNext()) {
      // ⚡ v75 重大優化：只要發現名為 [增修刪] 的資料夾，即鎖定增量模式 (INCREMENTAL)
      // 若資料夾為空，0.1秒直接回傳 0 筆異動，絕不下墜白跑全量主資料夾掃描！
      return { folder: sFolders.next(), syncMode: "INCREMENTAL" };
    }
  }
  var mainNames = ["捻花惹草", "[捻花惹草]", "【捻花惹草】"];
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
      var files = targetFolder.getFilesByType(MimeType.GOOGLE_DOCS);
      while (files.hasNext()) { var f = files.next(); if (!seenIds[f.getId()]) { seenIds[f.getId()] = true; docs.push(f); } }
    } catch(e1) {}
    try {
      var allFiles = targetFolder.getFiles();
      while (allFiles.hasNext()) {
        var f2 = allFiles.next();
        var m = f2.getMimeType();
        if ((m === MimeType.GOOGLE_DOCS || m === "application/vnd.google-apps.document") && !seenIds[f2.getId()]) {
          seenIds[f2.getId()] = true; docs.push(f2);
        }
      }
    } catch(e2) {}
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

  var name = plantName || fileName.replace(/[-_–\s]*植物資料.*/g, '').trim();
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
    scientificName: getField(/(?:學名)[：:\s]+([^\n]+)/),
    englishName: getField(/(?:英文名)[：:\s]+([^\n]+)/),
    aliases: (getField(/(?:別名)[：:\s]+([^\n]+)/) || "").split(/[、,]/).map(function(s){ return s.trim(); }).filter(Boolean),
    family: getField(/(?:科別)[：:\s]+([^\n]+)/) || "觀賞植物",
    dateAdded: dateAdded,
    locationNote: locationNote,
    imageUrl: imageUrl,
    petFriendly: text.indexOf("無毒") !== -1 || text.indexOf("寵物友善") !== -1,
    bloomPeriod: getField(/(?:花期)[：:\s]+([^\n]+)/),
    fruitPeriod: getField(/(?:果期)[：:\s]+([^\n]+)/),
    sporePeriod: getField(/(?:孢子期)[：:\s]+([^\n]+)/),
    morphologyDetails: extractMorphologyDetails(text),
    uses: [text.indexOf("觀賞") !== -1 ? "觀賞：熱門觀葉植物" : "園藝栽培"],
    careNotes: {
      light: getField(/(?:光照)[：:\s]+([^\n]+)/),
      humidity: getField(/(?:水分與濕度|濕度)[：:\s]+([^\n]+)/),
      waterQuality: getField(/(?:水質)[：:\s]+([^\n]+)/)
    },
    references: extractReferences(text, doc),
    galleryImages: galleryItems || []
  };
}

