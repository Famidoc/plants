/**
 * ==========================================================================
 * Google Apps Script (GAS) 自動掃描腳本 - v70 高速 Drive 縮圖快取版
 * 
 * 重大修復：
 * 1. 圖片網址統一採用 https://drive.google.com/thumbnail?id=FILE_ID&sz=w1000
 *    徹底解決 Google Drive 防盜連與 CORS 政策導致在 App 顯示空白的問題！
 * 2. 徹底消除 images/ 資料夾圖片重複產生問題：
 *    - 優先讀取 images/ 資料夾中已存在的 {植物名稱}_0.jpg, {植物名稱}_1.jpg 快取
 *    - 若尚未快取，單次走訪 Doc 全文提取圖片並依序命名，絕不上傳重複檔案。
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

    var imagesFolder = getOrCreateImagesFolder(folder);
    debugLog.push("📂 圖片快取資料夾: images/ (ID: " + imagesFolder.getId() + ")");

    var docs = getAllDocsInFolder(folder);
    var plantList = [];
    var deletedList = [];

    for (var i = 0; i < docs.length; i++) {
      var file = docs[i];
      var docId = file.getId();
      var fileName = file.getName();
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

        // ⚡ v70：一次性獲取圖片 URL 清單 (已排重 & 有限快取)
        var photoUrls = getPlantImagesFromDriveOrDoc(doc, folder, plantNameOnly, imagesFolder, debugLog);
        var primaryImageUrl = photoUrls.length > 0 ? photoUrls[0] : "";

        var parsedPlant = parseDocText(text, fileName, formattedDate, primaryImageUrl, photoUrls, doc, debugLog, plantNameOnly);
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
// ⚡ v70 新增：Drive images/ 資料夾管理與單次除重圖片處理
// ==========================================================================

function getOrCreateImagesFolder(parentFolder) {
  var folders = parentFolder.getFoldersByName('images');
  if (folders.hasNext()) return folders.next();
  var newFolder = parentFolder.createFolder('images');
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * ⚡ v70 關鍵修復：取得 Google Drive 縮圖網址 (跨域載入 100% 成功且絕不空白)
 */
function getDriveThumbnailUrl(fileId) {
  return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
}

/**
 * ⚡ v70 核心：除重與快取圖片處理 (確保 images/ 不重複產生檔案)
 */
function getPlantImagesFromDriveOrDoc(doc, folder, plantName, imagesFolder, debugLog) {
  var urls = [];

  // 1. 優先檢查 images/ 快取資料夾中已有該植物照片 (例如 九芎_0.jpg, 九芎_1.jpg)
  try {
    var files = imagesFolder.getFiles();
    var cachedFiles = [];
    var prefix = plantName + '_';
    while (files.hasNext()) {
      var f = files.next();
      var fn = f.getName();
      if (fn.indexOf(prefix) === 0) {
        cachedFiles.push(f);
      }
    }
    if (cachedFiles.length > 0) {
      cachedFiles.sort(function(a, b) {
        return a.getName().localeCompare(b.getName());
      });
      for (var c = 0; c < cachedFiles.length; c++) {
        urls.push(getDriveThumbnailUrl(cachedFiles[c].getId()));
      }
      debugLog.push("⚡ " + plantName + " 從 images/ 快取的 " + urls.length + " 張照片讀取成功");
      return urls;
    }
  } catch(eCache) {}

  // 2. 若無快取，從 Doc 提取所有圖片，序號為 0, 1, 2...
  if (!doc) return urls;

  try {
    var allDocImages = getAllImagesFromDoc(doc);
    var seenBlobs = {};

    for (var i = 0; i < allDocImages.length; i++) {
      try {
        var blob = allDocImages[i].getBlob();
        if (!blob) continue;
        var bytesLength = blob.getBytes().length;
        if (bytesLength < 200) continue; // 過濾過小佔位圖

        var blobKey = bytesLength + '_' + blob.getContentType();
        if (seenBlobs[blobKey]) continue;
        seenBlobs[blobKey] = true;

        var saveName = plantName + '_' + urls.length + '.jpg';
        var url = saveBlobToDriveAndGetUrl(blob, imagesFolder, saveName);
        if (url) {
          urls.push(url);
        }
      } catch(eBlob) {}
    }
    debugLog.push("✅ " + plantName + " 成功從 Doc 提取 " + urls.length + " 張照片並存入 Drive");
  } catch(eScan) {}

  // 3. 若 Doc 亦無圖片，搜尋 Drive 資料夾同名圖檔
  if (urls.length === 0) {
    try {
      var driveUrl = findDriveFolderPhoto(folder, plantName, imagesFolder);
      if (driveUrl) urls.push(driveUrl);
    } catch(eD) {}
  }

  return urls;
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

function findTargetFolder() {
  var stagingNames = ["增修刪", "[增修刪]", "【增修刪】"];
  for (var s = 0; s < stagingNames.length; s++) {
    var sFolders = DriveApp.getFoldersByName(stagingNames[s]);
    while (sFolders.hasNext()) {
      var sf = sFolders.next();
      if (getAllDocsInFolder(sf).length > 0) return { folder: sf, syncMode: "INCREMENTAL" };
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

function getAllImagesFromDoc(doc) {
  var images = [];
  if (!doc) return images;
  try {
    function walkElement(element) {
      if (!element) return;
      try {
        var type = element.getType();
        if (type === DocumentApp.ElementType.INLINE_IMAGE) images.push(element.asInlineImage());
        else if (type === DocumentApp.ElementType.POSITIONED_IMAGE) images.push(element.asPositionedImage());
        else if (type === DocumentApp.ElementType.INLINE_DRAWING) images.push(element.asInlineDrawing());
        else if (element.getNumChildren && typeof element.getNumChildren === 'function') {
          for (var i = 0; i < element.getNumChildren(); i++) walkElement(element.getChild(i));
        }
      } catch(e) {}
    }
    walkElement(doc.getBody());
    try { var di = doc.getBody().getImages() || []; for (var d = 0; d < di.length; d++) images.push(di[d]); } catch(e) {}
  } catch(e) {}
  return images;
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

function parseDocText(text, fileName, defaultDateStr, imageUrl, photoUrls, doc, debugLog, plantName) {
  function getField(pattern) { var m = text.match(pattern); return m ? m[1].trim() : ''; }

  var name = plantName || fileName.replace(/[-_–\s]*植物資料.*/g, '').trim();
  var dateAdded = defaultDateStr;
  var locationNote = "";
  var parsedDl = parseDateAndLocationFromLine(text);
  if (parsedDl) {
    if (parsedDl.dateAdded) dateAdded = parsedDl.dateAdded;
    if (parsedDl.locationNote) locationNote = parsedDl.locationNote;
  }
  var locClean = locationNote ? (locationNote.indexOf("@") === 0 ? locationNote : "@" + locationNote) : "";
  var defaultDateLocCaption = (dateAdded || locationNote) ? ("(" + dateAdded + locClean + ")") : "";

  // 整理圖集：將所有網址包裝為帶標題的物件
  var gallery = [];
  var urlsToUse = (photoUrls && photoUrls.length > 0) ? photoUrls : (imageUrl ? [imageUrl] : []);
  for (var u = 0; u < urlsToUse.length; u++) {
    gallery.push({
      caption: defaultDateLocCaption || ("特徵照片 " + (u + 1)),
      url: urlsToUse[u]
    });
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
    galleryImages: gallery
  };
}

 *
 * 重大改造：圖片不再轉為 base64，改為儲存到 Drive images/ 子資料夾，
 * 回傳公開 URL。回應體積從 ~20-40MB 降至 <200KB，支援上千筆資料。
 *
 * 快取機制：同名圖片若已在 images/ 資料夾，直接回傳 URL，不重複上傳。
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

    // ⚡ v68 新增：確保 images/ 子資料夾存在
    var imagesFolder = getOrCreateImagesFolder(folder);
    debugLog.push("📂 圖片快取資料夾: images/ (ID: " + imagesFolder.getId() + ")");

    var docs = getAllDocsInFolder(folder);
    var plantList = [];
    var deletedList = [];

    for (var i = 0; i < docs.length; i++) {
      var file = docs[i];
      var docId = file.getId();
      var fileName = file.getName();
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
        var imageUrl = scanDocAndFolderForPhoto(doc, folder, plantNameOnly, debugLog, fileName, imagesFolder) || "";
        var parsedPlant = parseDocText(text, fileName, formattedDate, imageUrl, doc, debugLog, plantNameOnly, imagesFolder);
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
// ⚡ v68 新增：Drive images/ 資料夾管理
// ==========================================================================

function getOrCreateImagesFolder(parentFolder) {
  var folders = parentFolder.getFoldersByName('images');
  if (folders.hasNext()) return folders.next();
  var newFolder = parentFolder.createFolder('images');
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * ⚡ v68 核心：將圖片 Blob 存到 Drive images/ 資料夾，回傳公開 URL。
 * 若同名檔案已存在，直接回傳 URL（快取機制）。
 */
function saveBlobToDriveAndGetUrl(blob, imagesFolder, fileName) {
  if (!blob || !imagesFolder || !fileName) return null;
  try {
    // 若已有快取，直接回傳
    var existing = imagesFolder.getFilesByName(fileName);
    if (existing.hasNext()) {
      return 'https://drive.google.com/uc?export=view&id=' + existing.next().getId();
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
    return 'https://drive.google.com/uc?export=view&id=' + fileToSave.getId();
  } catch(e) {
    return null;
  }
}

// ==========================================================================
// 主要圖片擷取函式（v68 改造版）
// ==========================================================================

function scanDocAndFolderForPhoto(doc, folder, plantName, debugLog, fileName, imagesFolder) {
  if (!doc) return null;

  // 1. InlineImage
  try {
    var inlineImgs = doc.getBody().getImages();
    if (inlineImgs && inlineImgs.length > 0) {
      for (var i = 0; i < inlineImgs.length; i++) {
        try {
          var url1 = saveBlobToDriveAndGetUrl(inlineImgs[i].getBlob(), imagesFolder, plantName + '_img_' + i + '.jpg');
          if (url1) { debugLog.push("✅ " + fileName + " InlineImage #" + (i+1) + " 已存入 Drive"); return url1; }
        } catch(eImg) { debugLog.push("⚠️ " + fileName + " InlineImage #" + (i+1) + " 例外: " + eImg.toString()); }
      }
    } else {
      debugLog.push("ℹ️ " + fileName + " 未找到 InlineImage");
    }
  } catch(eA) { debugLog.push("⚠️ " + fileName + " 掃描 InlineImages 例外: " + eA.toString()); }

  // 2. PositionedImage
  try {
    var posImgs = doc.getBody().getPositionedImages();
    if (posImgs && posImgs.length > 0) {
      for (var p = 0; p < posImgs.length; p++) {
        try {
          var urlP = saveBlobToDriveAndGetUrl(posImgs[p].getBlob(), imagesFolder, plantName + '_pos_' + p + '.jpg');
          if (urlP) { debugLog.push("✅ " + fileName + " PositionedImage #" + (p+1) + " 已存入 Drive"); return urlP; }
        } catch(ePos) {}
      }
    }
  } catch(eC) {}

  // 3. InlineDrawing
  try {
    var drawings = doc.getBody().getInlineDrawings();
    if (drawings && drawings.length > 0) {
      for (var d = 0; d < drawings.length; d++) {
        try {
          var urlD = saveBlobToDriveAndGetUrl(drawings[d].getBlob(), imagesFolder, plantName + '_draw_' + d + '.jpg');
          if (urlD) { debugLog.push("✅ " + fileName + " Drawing #" + (d+1) + " 已存入 Drive"); return urlD; }
        } catch(eDrawItem) {}
      }
    }
  } catch(eDraw) {}

  // 4. Table 內圖片
  try {
    var tables = doc.getBody().getTables();
    if (tables && tables.length > 0) {
      for (var t = 0; t < tables.length; t++) {
        var table = tables[t];
        for (var r = 0; r < table.getNumRows(); r++) {
          var row = table.getRow(r);
          for (var c = 0; c < row.getNumCells(); c++) {
            var cellImgs = row.getCell(c).getImages();
            for (var ci = 0; ci < cellImgs.length; ci++) {
              try {
                var urlCell = saveBlobToDriveAndGetUrl(cellImgs[ci].getBlob(), imagesFolder, plantName + '_tbl_' + t + '_' + r + '_' + c + '_' + ci + '.jpg');
                if (urlCell) { debugLog.push("✅ " + fileName + " Table 圖片已存入 Drive"); return urlCell; }
              } catch(eCellImg) {}
            }
          }
        }
      }
    }
  } catch(eTable) {}

  // 5. Drive 資料夾同名圖片
  try {
    var driveUrl = findDriveFolderPhoto(folder, plantName, imagesFolder);
    if (driveUrl) { debugLog.push("✅ " + fileName + " 從 Drive 資料夾找到同名圖片"); return driveUrl; }
  } catch(eD) {}

  debugLog.push("❌ " + fileName + " 未找到任何照片");
  return null;
}

function findDriveFolderPhoto(folder, plantName, imagesFolder) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var mime = f.getMimeType();
    if (mime.indexOf("image/") === 0 || mime.indexOf("image") !== -1) {
      var fname = f.getName();
      if (fname.indexOf(plantName) !== -1 || plantName.indexOf(fname.split('.')[0]) !== -1) {
        var cacheFileName = plantName + '_drive_0.jpg';
        var cached = imagesFolder.getFilesByName(cacheFileName);
        if (cached.hasNext()) return 'https://drive.google.com/uc?export=view&id=' + cached.next().getId();
        var copiedFile = f.makeCopy(cacheFileName, imagesFolder);
        copiedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return 'https://drive.google.com/uc?export=view&id=' + copiedFile.getId();
      }
    }
  }
  return null;
}

function extractGalleryImages(doc, debugLog, defaultDateLocCaption, plantName, imagesFolder) {
  var gallery = [];
  if (!doc) return gallery;
  try {
    var body = doc.getBody();
    var allDocImages = getAllImagesFromDoc(doc);
    var inlineImgs = body.getImages() || [];
    var posImgs = []; try { posImgs = body.getPositionedImages() || []; } catch(e) {}
    var drawings = []; try { drawings = body.getInlineDrawings() || []; } catch(e) {}

    var captionLines = [];
    try {
      var lines = body.getText().split("\n");
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l].trim();
        var dl = parseDateAndLocationFromLine(line);
        if (dl && dl.formattedCaption) { captionLines.push(dl.formattedCaption); }
        else if (line.indexOf("其他附圖") !== -1) {
          var sub = line.replace(/^其他附圖[：:\s]*/, '').trim();
          if (sub) captionLines.push(sub);
        }
      }
    } catch(eCap) {}

    var addedNames = {};

    function tryAddImage(blob, nameKey, defaultCap) {
      if (addedNames[nameKey]) return;
      var url = saveBlobToDriveAndGetUrl(blob, imagesFolder, nameKey);
      if (url) {
        addedNames[nameKey] = true;
        var cap = (captionLines.length > gallery.length) ? captionLines[gallery.length] : (defaultCap || ("特徵照片 " + (gallery.length + 1)));
        gallery.push({ caption: cap, url: url });
      }
    }

    // 1. 全文遞迴
    for (var a = 0; a < allDocImages.length; a++) {
      try { tryAddImage(allDocImages[a].getBlob(), plantName + '_gallery_' + a + '.jpg', defaultDateLocCaption); } catch(e) {}
    }
    // 2. InlineImages 備援
    for (var i = 0; i < inlineImgs.length; i++) {
      try { tryAddImage(inlineImgs[i].getBlob(), plantName + '_inline_' + i + '.jpg', defaultDateLocCaption); } catch(e) {}
    }
    // 3. PositionedImages 備援
    for (var p = 0; p < posImgs.length; p++) {
      try { tryAddImage(posImgs[p].getBlob(), plantName + '_pos_gal_' + p + '.jpg', defaultDateLocCaption); } catch(e) {}
    }
    // 4. Drawings 備援
    for (var d = 0; d < drawings.length; d++) {
      try { tryAddImage(drawings[d].getBlob(), plantName + '_draw_gal_' + d + '.jpg', defaultDateLocCaption || ("特徵繪圖 " + (gallery.length + 1))); } catch(e) {}
    }
    // 5. Table Cells 備援
    try {
      var tables = body.getTables() || [];
      for (var t = 0; t < tables.length; t++) {
        for (var r = 0; r < tables[t].getNumRows(); r++) {
          var row = tables[t].getRow(r);
          for (var c = 0; c < row.getNumCells(); c++) {
            var cellImgs = row.getCell(c).getImages() || [];
            for (var ci = 0; ci < cellImgs.length; ci++) {
              try { tryAddImage(cellImgs[ci].getBlob(), plantName + '_tbl_gal_' + t + '_' + r + '_' + c + '_' + ci + '.jpg', defaultDateLocCaption); } catch(e) {}
            }
          }
        }
      }
    } catch(eTbl) {}

  } catch(e) {
    if (debugLog) debugLog.push("⚠️ 擷取圖集例外: " + e.toString());
  }
  return gallery;
}

// ==========================================================================
// 解析函式（與原版相同）
// ==========================================================================

function findTargetFolder() {
  var stagingNames = ["增修刪", "[增修刪]", "【增修刪】"];
  for (var s = 0; s < stagingNames.length; s++) {
    var sFolders = DriveApp.getFoldersByName(stagingNames[s]);
    while (sFolders.hasNext()) {
      var sf = sFolders.next();
      if (getAllDocsInFolder(sf).length > 0) return { folder: sf, syncMode: "INCREMENTAL" };
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

function getAllImagesFromDoc(doc) {
  var images = [];
  if (!doc) return images;
  try {
    function walkElement(element) {
      if (!element) return;
      try {
        var type = element.getType();
        if (type === DocumentApp.ElementType.INLINE_IMAGE) images.push(element.asInlineImage());
        else if (type === DocumentApp.ElementType.POSITIONED_IMAGE) images.push(element.asPositionedImage());
        else if (type === DocumentApp.ElementType.INLINE_DRAWING) images.push(element.asInlineDrawing());
        else if (element.getNumChildren && typeof element.getNumChildren === 'function') {
          for (var i = 0; i < element.getNumChildren(); i++) walkElement(element.getChild(i));
        }
      } catch(e) {}
    }
    walkElement(doc.getBody());
    try { var di = doc.getBody().getImages() || []; for (var d = 0; d < di.length; d++) images.push(di[d]); } catch(e) {}
  } catch(e) {}
  return images;
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

function parseDocText(text, fileName, defaultDateStr, imageUrl, doc, debugLog, plantName, imagesFolder) {
  function getField(pattern) { var m = text.match(pattern); return m ? m[1].trim() : ''; }

  var name = plantName || fileName.replace(/[-_–\s]*植物資料.*/g, '').trim();
  var dateAdded = defaultDateStr;
  var locationNote = "";
  var parsedDl = parseDateAndLocationFromLine(text);
  if (parsedDl) {
    if (parsedDl.dateAdded) dateAdded = parsedDl.dateAdded;
    if (parsedDl.locationNote) locationNote = parsedDl.locationNote;
  }
  var locClean = locationNote ? (locationNote.indexOf("@") === 0 ? locationNote : "@" + locationNote) : "";
  var defaultDateLocCaption = (dateAdded || locationNote) ? ("(" + dateAdded + locClean + ")") : "";

  var gallery = extractGalleryImages(doc, debugLog, defaultDateLocCaption, name, imagesFolder);

  // 若無圖集但有主要照片（Drive URL），自動加入
  if ((!gallery || gallery.length === 0) && imageUrl && imageUrl.startsWith('https://')) {
    gallery = [{ caption: defaultDateLocCaption || "特徵照片 1", url: imageUrl }];
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
    galleryImages: gallery
  };
}
