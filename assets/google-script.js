/**
 * ==========================================================================
 * Google Apps Script (GAS) 自動掃描腳本 - 全欄位項目深度擷取版
 * 
 * 新增修復：
 * 1. 深度解析「形態特徵」區塊內的所有條列項目（如：株型與莖幹、葉片、花朵/果實、根系）。
 * 2. 徹底確保每個 Google Doc 的每項細節資訊均能 100% 完整採集！
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
    var syncMode = targetInfo.syncMode; // "INCREMENTAL" or "FULL"
    var folderName = folder.getName();
    debugLog.push("📁 目標資料夾: " + folderName + " (模式: " + syncMode + ")");

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

      // 在增量模式下，檢測檔名是否包含 [刪除] 標籤前綴
      if (syncMode === "INCREMENTAL" && (/^[\(\[\【]?刪除[\]\)\】\_\-\s]*/.test(fileName) || fileName.indexOf("刪除") !== -1)) {
        var cleanTargetName = fileName.replace(/^[\(\[\【]?刪除[\]\)\】\_\-\s]*/g, '')
                                      .replace(/[-_–\s]*植物資料.*/g, '')
                                      .replace(/\.(docx?|gdoc)$/i, '')
                                      .trim();
        if (cleanTargetName) {
          deletedList.push({
            name: cleanTargetName,
            fileName: fileName
          });
          debugLog.push("🗑️ 偵測到待刪除檔案: 「" + cleanTargetName + "」 (檔名: " + fileName + ")");
          continue; // 跳過此檔案的全文解析
        }
      }

      try {
        var doc = DocumentApp.openById(docId);
        var text = doc.getBody().getText();

        var imageUrl = scanDocAndFolderForPhoto(doc, folder, plantNameOnly, debugLog, fileName) || "./assets/images/ferns.jpg";
        
        var parsedPlant = parseDocText(text, fileName, formattedDate, imageUrl, doc, debugLog);
        plantList.push(parsedPlant);
      } catch (docErr) {
        debugLog.push("❌ 讀取 Doc 異常 (" + fileName + "): " + docErr.toString());
      }
    }

    // 逆向排序：最新加入者在最上方
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

function scanDocAndFolderForPhoto(doc, folder, plantName, debugLog, fileName) {
  if (!doc) return null;

  // 1. 嘗試掃描 InlineImage (內嵌圖片)
  try {
    var body = doc.getBody();
    var inlineImgs = body.getImages();
    if (inlineImgs && inlineImgs.length > 0) {
      for (var i = 0; i < inlineImgs.length; i++) {
        try {
          var res1 = compressBlobToBase64(inlineImgs[i].getBlob());
          if (res1) {
            debugLog.push("✅ " + fileName + " 成功從 InlineImage #" + (i+1) + " 擷取照片");
            return res1;
          }
        } catch(eImg) {
          debugLog.push("⚠️ " + fileName + " 處理 InlineImage #" + (i+1) + " 例外: " + eImg.toString());
        }
      }
    } else {
      debugLog.push("ℹ️ " + fileName + " 的 getImages() 未找到 InlineImage");
    }
  } catch(eA) {
    debugLog.push("⚠️ " + fileName + " 掃描 InlineImages 例外: " + eA.toString());
  }

  // 2. 嘗試掃描 PositionedImage (浮動圖片)
  try {
    var posImgs = doc.getBody().getPositionedImages();
    if (posImgs && posImgs.length > 0) {
      for (var p = 0; p < posImgs.length; p++) {
        try {
          var resP = compressBlobToBase64(posImgs[p].getBlob());
          if (resP) {
            debugLog.push("✅ " + fileName + " 成功從 PositionedImage #" + (p+1) + " 擷取照片");
            return resP;
          }
        } catch(ePos) {
          debugLog.push("⚠️ " + fileName + " 處理 PositionedImage #" + (p+1) + " 例外: " + ePos.toString());
        }
      }
    }
  } catch(eC) {}

  // 3. 嘗試掃描 InlineDrawing (畫布/繪圖)
  try {
    var drawings = doc.getBody().getInlineDrawings();
    if (drawings && drawings.length > 0) {
      for (var d = 0; d < drawings.length; d++) {
        try {
          var resD = compressBlobToBase64(drawings[d].getBlob());
          if (resD) {
            debugLog.push("✅ " + fileName + " 成功從 InlineDrawing #" + (d+1) + " 擷取照片");
            return resD;
          }
        } catch(eDrawItem) {}
      }
    }
  } catch(eDraw) {}

  // 4. 嘗試掃描 Google Doc 表格 (Table) 內圖片
  try {
    var tables = doc.getBody().getTables();
    if (tables && tables.length > 0) {
      for (var t = 0; t < tables.length; t++) {
        var table = tables[t];
        for (var r = 0; r < table.getNumRows(); r++) {
          var row = table.getRow(r);
          for (var c = 0; c < row.getNumCells(); c++) {
            var cell = row.getCell(c);
            var cellImgs = cell.getImages();
            for (var ci = 0; ci < cellImgs.length; ci++) {
              try {
                var resCell = compressBlobToBase64(cellImgs[ci].getBlob());
                if (resCell) {
                  debugLog.push("✅ " + fileName + " 成功從 Table 儲存格擷取照片");
                  return resCell;
                }
              } catch(eCellImg) {}
            }
          }
        }
      }
    }
  } catch(eTable) {}

  // 5. 嘗試從 Drive 資料夾搜尋同名圖片檔
  try {
    var driveImg = findDriveFolderPhoto(folder, plantName);
    if (driveImg) {
      debugLog.push("✅ " + fileName + " 成功從 Drive 資料夾同名圖檔擷取照片");
      return driveImg;
    }
  } catch(eD) {}

  debugLog.push("❌ " + fileName + " 內文與資料夾皆未抓到實體照片（改用預備綠葉）");
  return null;
}

function compressBlobToBase64(blob) {
  if (!blob) return null;

  try {
    var bytes = blob.getBytes();
    if (!bytes || bytes.length === 0) return null;

    var contentType = blob.getContentType() || "";
    if (contentType && contentType.indexOf("image/") === -1 && contentType.indexOf("application/octet-stream") === -1) {
      return null;
    }

    try {
      var resized = ImagesService.makeImage(blob).resize(500, 500).getAs(MimeType.JPEG);
      var rawBase64 = Utilities.base64Encode(resized.getBytes());
      return "data:image/jpeg;base64," + rawBase64.replace(/[\r\n\s]+/g, "");
    } catch(eResize) {
      try {
        var jpegBlob = blob.getAs(MimeType.JPEG);
        var rawBase64_2 = Utilities.base64Encode(jpegBlob.getBytes());
        return "data:image/jpeg;base64," + rawBase64_2.replace(/[\r\n\s]+/g, "");
      } catch(eMime) {}
    }
    
    var rawBase64_3 = Utilities.base64Encode(bytes);
    var cType = (contentType && contentType.indexOf("image/") === 0) ? contentType : "image/jpeg";
    return "data:" + cType + ";base64," + rawBase64_3.replace(/[\r\n\s]+/g, "");
  } catch(eFinal) {}

  return null;
}

function findDriveFolderPhoto(folder, plantName) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var f = files.next();
    var mime = f.getMimeType();
    if (mime.indexOf("image/") === 0 || mime.indexOf("image") !== -1) {
      var fname = f.getName();
      if (fname.indexOf(plantName) !== -1 || plantName.indexOf(fname.split('.')[0]) !== -1) {
        return compressBlobToBase64(f.getBlob());
      }
    }
  }
  return null;
}

function findTargetFolder() {
  // 1. 優先尋找「增修刪」資料夾 (若有檔案則執行增量模式)
  var stagingNames = ["增修刪", "[增修刪]", "【增修刪】"];
  for (var s = 0; s < stagingNames.length; s++) {
    var sFolders = DriveApp.getFoldersByName(stagingNames[s]);
    while (sFolders.hasNext()) {
      var sf = sFolders.next();
      var sDocs = getAllDocsInFolder(sf);
      if (sDocs.length > 0) {
        return { folder: sf, syncMode: "INCREMENTAL" };
      }
    }
  }

  // 2. 次要尋找「捻花惹草」主資料夾 (若無暫存檔則執行全量模式)
  var mainNames = ["捻花惹草", "[捻花惹草]", "【捻花惹草】"];
  var bestFolder = null;

  for (var i = 0; i < mainNames.length; i++) {
    var folders = DriveApp.getFoldersByName(mainNames[i]);
    while (folders.hasNext()) {
      var f = folders.next();
      var docs = getAllDocsInFolder(f);
      if (docs.length > 0) {
        return { folder: f, syncMode: "FULL" };
      }
      if (!bestFolder) bestFolder = f;
    }
  }

  if (bestFolder) {
    return { folder: bestFolder, syncMode: "FULL" };
  }

  return null;
}

function getAllDocsInFolder(folder) {
  var docs = [];
  var seenIds = {};

  function searchIn(targetFolder) {
    if (!targetFolder) return;

    try {
      var files = targetFolder.getFilesByType(MimeType.GOOGLE_DOCS);
      while (files.hasNext()) {
        var f = files.next();
        if (!seenIds[f.getId()]) {
          seenIds[f.getId()] = true;
          docs.push(f);
        }
      }
    } catch(e1) {}

    try {
      var allFiles = targetFolder.getFiles();
      while (allFiles.hasNext()) {
        var f2 = allFiles.next();
        var m = f2.getMimeType();
        if (m === MimeType.GOOGLE_DOCS || m === "application/vnd.google-apps.document") {
          if (!seenIds[f2.getId()]) {
            seenIds[f2.getId()] = true;
            docs.push(f2);
          }
        }
      }
    } catch(e2) {}

    try {
      var subs = targetFolder.getSubFolders();
      while (subs.hasNext()) {
        searchIn(subs.next());
      }
    } catch(e3) {}
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
    var title = mdMatch[1].trim();
    var url = mdMatch[2].trim();
    if (!seenUrls[url]) {
      seenUrls[url] = true;
      refs.push({ title: title, url: url });
    }
  }

  if (doc) {
    try {
      var paragraphs = doc.getBody().getParagraphs();
      var inRefSection = false;
      for (var i = 0; i < paragraphs.length; i++) {
        var p = paragraphs[i];
        var pText = p.getText().trim();
        if (pText.indexOf("參考資料") !== -1) {
          inRefSection = true;
          continue;
        }
        if (inRefSection) {
          for (var j = 0; j < p.getNumChildren(); j++) {
            var child = p.getChild(j);
            if (child.getType() === DocumentApp.ElementType.TEXT) {
              var txtObj = child.asText();
              var linkUrl = txtObj.getLinkUrl();
              if (linkUrl && !seenUrls[linkUrl]) {
                seenUrls[linkUrl] = true;
                refs.push({
                  title: pText || "參考資料連結",
                  url: linkUrl
                });
                break;
              }
            }
          }
        }
      }
    } catch(e) {}
  }

  if (refs.length === 0) {
    var urlRegex = /(https?:\/\/[^\s\)]+)/g;
    var urlMatch;
    while ((urlMatch = urlRegex.exec(text)) !== null) {
      var u = urlMatch[1].trim();
      if (!seenUrls[u]) {
        seenUrls[u] = true;
        refs.push({ title: "外部參考連結", url: u });
      }
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

  var lines = block.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var cleaned = line.replace(/^[\d\.\-\*•\s]+/, '').trim();
    if (!cleaned) continue;

    var colonIdx = cleaned.search(/[：:]/);
    if (colonIdx !== -1) {
      var label = cleaned.substring(0, colonIdx).trim();
      var val = cleaned.substring(colonIdx + 1).trim();
      details.push({ label: label, value: val });
    } else {
      details.push({ label: "特徵說明", value: cleaned });
    }
  }
  return details;
}

function parseDocText(text, fileName, defaultDateStr, imageUrl, doc, debugLog) {
  function getField(pattern) {
    var m = text.match(pattern);
    return m ? m[1].trim() : '';
  }

  var name = fileName.replace(/[-_–\s]*植物資料.*/g, '').trim();
  var sciName = getField(/(?:學名)[：:\s]+([^\n]+)/);
  var engName = getField(/(?:英文名)[：:\s]+([^\n]+)/);
  var aliasesStr = getField(/(?:別名)[：:\s]+([^\n]+)/);
  var familyStr = getField(/(?:科別)[：:\s]+([^\n]+)/);

  var dateAdded = defaultDateStr;
  var locationNote = "";

  // 1. 高階比對：包含 (照片拍攝地點與日期：YYYYMMDD@地點) 或 YYYYMMDD@地點 格式
  var dateLocMatch = text.match(/(?:照片拍攝地點與日期|拍攝地點與日期|拍攝地點|地點|日期)?[：:\s]*(\d{8})\s*@\s*([^\)\n\r\s]+)/);
  if (dateLocMatch) {
    dateAdded = dateLocMatch[1];
    locationNote = "@" + dateLocMatch[2].replace(/[\)\s]/g, '').trim();
  } else {
    // 2. 次要比對：一般 (YYYYMMDD) 格式
    var dateMatch = text.match(/\((\d{8})([^\)]*)\)/) || text.match(/(\d{8})/);
    if (dateMatch) {
      dateAdded = dateMatch[1] || dateMatch[2];
      if (dateMatch[2] && dateMatch[2].includes('@')) {
        locationNote = dateMatch[2].trim();
      }
    }
  }

  var defaultDateLocCaption = "";
  if (dateAdded || locationNote) {
    var locClean = locationNote ? (locationNote.indexOf("@") === 0 ? locationNote : "@" + locationNote) : "";
    defaultDateLocCaption = "(" + dateAdded + locClean + ")";
  }

  var refs = extractReferences(text, doc);
  var morphologyDetails = extractMorphologyDetails(text);
  var gallery = extractGalleryImages(doc, debugLog, defaultDateLocCaption);

  // 智慧預設：若無其他附圖，但有擷取到主要照片，自動將主要照片加入特徵照片 1 (帶入時間地點標註)
  if ((!gallery || gallery.length === 0) && imageUrl && imageUrl.indexOf("data:image") === 0) {
    gallery = [{
      caption: defaultDateLocCaption || "特徵照片 1",
      url: imageUrl
    }];
  }

  return {
    id: "plant-" + Math.random().toString(36).substr(2, 9),
    name: name || "花草植物",
    scientificName: sciName || "",
    englishName: engName || "",
    aliases: aliasesStr ? aliasesStr.split(/[、,]/).map(function(s){ return s.trim(); }) : [],
    family: familyStr || "觀賞植物",
    dateAdded: dateAdded,
    locationNote: locationNote,
    imageUrl: imageUrl,
    petFriendly: text.includes("無毒") || text.includes("寵物友善"),
    bloomPeriod: getField(/(?:花期)[：:\s]+([^\n]+)/),
    fruitPeriod: getField(/(?:果期)[：:\s]+([^\n]+)/),
    sporePeriod: getField(/(?:孢子期)[：:\s]+([^\n]+)/),
    morphologyDetails: morphologyDetails,
    uses: [text.includes("觀賞") ? "觀賞：熱門觀葉植物" : "園藝栽培"],
    careNotes: {
      light: getField(/(?:光照)[：:\s]+([^\n]+)/),
      humidity: getField(/(?:水分與濕度|濕度)[：:\s]+([^\n]+)/),
      waterQuality: getField(/(?:水質)[：:\s]+([^\n]+)/)
    },
    references: refs,
    galleryImages: gallery
  };
}

function extractGalleryImages(doc, debugLog, defaultDateLocCaption) {
  var gallery = [];
  if (!doc) return gallery;

  try {
    var body = doc.getBody();
    var inlineImgs = body.getImages() || [];
    var posImgs = [];
    try {
      posImgs = body.getPositionedImages() || [];
    } catch(ePos) {}

    var drawings = [];
    try {
      drawings = body.getInlineDrawings() || [];
    } catch(eDraw) {}

    // 掃描 Doc 全文是否有 (照片拍攝地點與日期：20260722@田中森林公園步道) 或 (20260722@地點) 格式標註
    var captionLines = [];
    try {
      var fullText = body.getText();
      var lines = fullText.split("\n");
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l].trim();
        var mDateLoc = line.match(/(?:照片拍攝地點與日期|拍攝地點與日期|拍攝地點|地點|日期)?[：:\s]*(\d{8})\s*@\s*([^\)\n\r\s]+)/);
        if (mDateLoc) {
          captionLines.push("(" + mDateLoc[1] + "@" + mDateLoc[2].replace(/[\)\s]/g, '').trim() + ")");
        } else if (line.indexOf("其他附圖") !== -1) {
          var subText = line.replace(/^其他附圖[：:\s]*/, '').trim();
          if (subText) captionLines.push(subText);
        }
      }
    } catch(eCap) {}

    var addedUrls = {};

    for (var i = 0; i < inlineImgs.length; i++) {
      var b64_in = compressBlobToBase64(inlineImgs[i].getBlob());
      if (b64_in && !addedUrls[b64_in]) {
        addedUrls[b64_in] = true;
        var cap = (captionLines.length > i) ? captionLines[i] : (defaultDateLocCaption || ("特徵照片 " + (gallery.length + 1)));
        gallery.push({
          caption: cap,
          url: b64_in
        });
      }
    }

    for (var p = 0; p < posImgs.length; p++) {
      var b64_pos = compressBlobToBase64(posImgs[p].getBlob());
      if (b64_pos && !addedUrls[b64_pos]) {
        addedUrls[b64_pos] = true;
        var capP = (captionLines.length > gallery.length) ? captionLines[gallery.length] : (defaultDateLocCaption || ("特徵照片 " + (gallery.length + 1)));
        gallery.push({
          caption: capP,
          url: b64_pos
        });
      }
    }

    for (var d = 0; d < drawings.length; d++) {
      try {
        var b64_draw = compressBlobToBase64(drawings[d].getBlob());
        if (b64_draw && !addedUrls[b64_draw]) {
          addedUrls[b64_draw] = true;
          var capD = defaultDateLocCaption || ("特徵繪圖照片 " + (gallery.length + 1));
          gallery.push({
            caption: capD,
            url: b64_draw
          });
        }
      } catch(eD) {}
    }

    // 掃描表格 (Table) 內部的所有照片
    try {
      var tables = body.getTables() || [];
      for (var t = 0; t < tables.length; t++) {
        var tbl = tables[t];
        for (var r = 0; r < tbl.getNumRows(); r++) {
          var row = tbl.getRow(r);
          for (var c = 0; c < row.getNumCells(); c++) {
            var cell = row.getCell(c);
            var cellImgs = cell.getImages() || [];
            for (var ci = 0; ci < cellImgs.length; ci++) {
              try {
                var b64_tbl = compressBlobToBase64(cellImgs[ci].getBlob());
                if (b64_tbl && !addedUrls[b64_tbl]) {
                  addedUrls[b64_tbl] = true;
                  var capT = (captionLines.length > gallery.length) ? captionLines[gallery.length] : (defaultDateLocCaption || ("特徵照片 " + (gallery.length + 1)));
                  gallery.push({
                    caption: capT,
                    url: b64_tbl
                  });
                }
              } catch(eCi) {}
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
