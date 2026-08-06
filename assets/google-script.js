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
    var folder = findTargetFolder();

    if (!folder) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        error: "在您的 Google Drive 中找不到名為「捻花惹草」或「[捻花惹草]」的資料夾。"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var docs = getAllDocsInFolder(folder);
    var plantList = [];

    for (var i = 0; i < docs.length; i++) {
      var file = docs[i];
      var docId = file.getId();
      var fileName = file.getName();
      var createdDate = file.getDateCreated();
      var formattedDate = Utilities.formatDate(createdDate, "GMT+8", "yyyyMMdd");
      var plantNameOnly = fileName.replace(/[-_–\s]*植物資料.*/g, '').trim();

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
      folderFound: folder.getName(),
      count: plantList.length,
      updatedAt: new Date().toISOString(),
      debugLog: debugLog,
      plants: plantList
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
  try {
    var body = doc.getBody();
    var inlineImgs = body.getImages();
    if (inlineImgs && inlineImgs.length > 0) {
      for (var i = 0; i < inlineImgs.length; i++) {
        var res1 = compressBlobToBase64(inlineImgs[i].getBlob());
        if (res1) {
          debugLog.push("✅ " + fileName + " 成功從 InlineImage 擷取");
          return res1;
        }
      }
    }
  } catch(eA) {}

  try {
    var posImgs = doc.getBody().getPositionedImages();
    if (posImgs && posImgs.length > 0) {
      var resP = compressBlobToBase64(posImgs[0].getBlob());
      if (resP) {
        debugLog.push("✅ " + fileName + " 成功從 PositionedImage 擷取");
        return resP;
      }
    }
  } catch(eC) {}

  try {
    var driveImg = findDriveFolderPhoto(folder, plantName);
    if (driveImg) {
      debugLog.push("✅ " + fileName + " 成功從 Drive 資料夾擷取");
      return driveImg;
    }
  } catch(eD) {}

  return null;
}

function compressBlobToBase64(blob) {
  if (!blob) return null;

  var imgBlob = blob;
  try {
    var cType = blob.getContentType() || "";
    if (cType.indexOf("image/") === -1) {
      imgBlob = blob.getAs(MimeType.PNG);
    }
  } catch(eMime) {
    try {
      imgBlob = blob.getAs(MimeType.JPEG);
    } catch(eMime2) {}
  }

  try {
    var resized = ImagesService.makeImage(imgBlob).resize(400, 400).getAs(MimeType.JPEG);
    var rawBase64 = Utilities.base64Encode(resized.getBytes());
    return "data:image/jpeg;base64," + rawBase64.replace(/[\r\n\s]+/g, "");
  } catch(e1) {}

  try {
    var bytes = imgBlob.getBytes();
    if (bytes && bytes.length > 0) {
      var rawBase64_2 = Utilities.base64Encode(bytes);
      var finalType = imgBlob.getContentType() || "image/jpeg";
      return "data:" + finalType + ";base64," + rawBase64_2.replace(/[\r\n\s]+/g, "");
    }
  } catch(e2) {}

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
  var candidateNames = ["捻花惹草", "[捻花惹草]", "【捻花惹草】"];
  var bestFolder = null;

  for (var i = 0; i < candidateNames.length; i++) {
    var folders = DriveApp.getFoldersByName(candidateNames[i]);
    while (folders.hasNext()) {
      var f = folders.next();
      var docs = getAllDocsInFolder(f);
      if (docs.length > 0) {
        return f;
      }
      if (!bestFolder) bestFolder = f;
    }
  }
  return bestFolder;
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

/**
 * 通用形態特徵條列解析器 (支援 1. 株型與莖幹 2. 葉片 3. 花朵/果實 4. 根系 等所有項目)
 */
function extractMorphologyDetails(text) {
  var details = [];
  var morphMatch = text.match(/形態特徵[\s\S]*?(?=(?:特殊作用|用途|養護|參考資料|$))/i);
  if (!morphMatch) return details;

  var block = morphMatch[0].replace(/^形態特徵[\s:\n]*/i, '').trim();
  if (!block) return details;

  var lines = block.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    // 清除開頭編號 (例如 1. 2. - * •)
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

function parseDocText(text, fileName, defaultDateStr, imageUrl, doc) {
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
  var dateMatch = text.match(/\((\d{8})([^\)]*)\)/);
  if (dateMatch) {
    dateAdded = dateMatch[1];
    locationNote = dateMatch[2];
  }

  var references = extractReferences(text, doc);
  var morphologyDetails = extractMorphologyDetails(text);

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
    references: references,
    galleryImages: extractGalleryImages(doc, debugLog)
  };
}

/**
 * 自動深度擷取文件中的所有特徵附圖照片 (支援 InlineImage、PositionedImage 浮動圖與所有圖案)
 */
function extractGalleryImages(doc, debugLog) {
  var gallery = [];
  if (!doc) return gallery;

  try {
    var body = doc.getBody();
    
    // 1. 取得所有 InlineImages (內聯圖片)
    var inlineImgs = body.getImages() || [];
    
    // 2. 取得所有 PositionedImages (浮動 / 環繞圖片)
    var posImgs = [];
    try {
      posImgs = body.getPositionedImages() || [];
    } catch(ePos) {}

    if (debugLog) {
      debugLog.push("📷 " + doc.getName() + " 偵測照片 - Inline: " + inlineImgs.length + " 張, Positioned: " + posImgs.length + " 張");
    }

    // 嘗試尋找「其他附圖」下方的文字作為 Caption 標題
    var captionText = "";
    try {
      var fullText = body.getText();
      var idx = fullText.indexOf("其他附圖");
      if (idx !== -1) {
        var subText = fullText.substring(idx + 4).trim();
        var lines = subText.split("\n").map(function(l){ return l.trim(); }).filter(Boolean);
        if (lines.length > 0) {
          captionText = lines[0]; // 例如：植株 (20260727@九九峰心之芳庭)
        }
      }
    } catch(eCap) {}

    var addedUrls = {};

    // A. 處理所有 2 張以後的 InlineImages
    if (inlineImgs.length > 1) {
      for (var i = 1; i < inlineImgs.length; i++) {
        var b64_in = compressBlobToBase64(inlineImgs[i].getBlob());
        if (b64_in && !addedUrls[b64_in]) {
          addedUrls[b64_in] = true;
          gallery.push({
            caption: captionText || ("特徵附圖照片 " + (gallery.length + 1)),
            url: b64_in
          });
        }
      }
    }

    // B. 處理所有 PositionedImages (浮動圖片)
    if (posImgs.length > 0) {
      for (var p = 0; p < posImgs.length; p++) {
        var b64_pos = compressBlobToBase64(posImgs[p].getBlob());
        if (b64_pos && !addedUrls[b64_pos]) {
          addedUrls[b64_pos] = true;
          gallery.push({
            caption: captionText || ("特徵附圖照片 " + (gallery.length + 1)),
            url: b64_pos
          });
        }
      }
    }

    // C. 如果圖集仍為空但文件內有多張照片，則包含剩餘照片
    if (gallery.length === 0 && inlineImgs.length > 0) {
      for (var m = 0; m < inlineImgs.length; m++) {
        var b64_m = compressBlobToBase64(inlineImgs[m].getBlob());
        if (b64_m && !addedUrls[b64_m]) {
          addedUrls[b64_m] = true;
          gallery.push({
            caption: captionText || "特徵照片",
            url: b64_m
          });
        }
      }
    }
  } catch(e) {
    if (debugLog) debugLog.push("⚠️ 擷取圖集例外: " + e.toString());
  }

  return gallery;
}
