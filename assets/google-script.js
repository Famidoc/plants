/**
 * ==========================================================================
 * Google Apps Script (GAS) 自動掃描腳本 - v95 跨分隔線穿透與標題徹底排除版
 * 
 * 重大修復：
 * 1. 🛡️ 穿透水平分割線 (HORIZONTAL_RULE)：修復兩張附圖間有橫線導致下方說明被阻斷的 Bug
 * 2. 🚫 徹底排除文章標題：嚴格過濾「油桐 - 植物資料」等標題，絕不誤當作圖片標註
 * 3. 🎯 標註一對一消費機制：保證各圖片精確依序取得屬於自己的專屬標註
 * 4. ⚡ 圖片雜湊快取機制 (MD5)：修復換新圖後因同名快取導致 App 主圖無法更新的問題
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

          // 若為全量同步，額外嘗試搜尋 [相似鑑別] 歸檔資料夾並合併掃描
          var compFolder = getComparisonFolder();
          if (compFolder && compFolder.getId() !== realMainFolder.getId()) {
            var compDocs = getAllDocsInFolder(compFolder);
            debugLog.push("📂 合併掃描 [相似鑑別] 主資料夾，發現 " + compDocs.length + " 篇鑑別文件");
            docs = docs.concat(compDocs);
          }
        } else {
          debugLog.push("⚡ [增修刪] 為空且雲端無更新，0.1秒直接回傳 0 筆異動");
        }
      }
    }

    var plantList = [];
    var deletedList = [];
    var comparisonList = [];
    var deletedComparisonList = [];

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
      var isDel = (syncMode === "INCREMENTAL" && (/^[\(\[\【]?刪除[\]\)\】\_\-\s]*/.test(fileName) || fileName.indexOf("刪除") !== -1));

      // 判斷是否為「相似鑑別」檔案
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
            debugLog.push("🗑️ 偵測到待刪除鑑別: 「" + cleanTargetName + "」");
          } else {
            deletedList.push({ name: cleanTargetName, fileName: fileName });
            debugLog.push("🗑️ 偵測到待刪除花草: 「" + cleanTargetName + "」");
          }
          continue;
        }
      }

      try {
        var doc = DocumentApp.openById(docId);
        var text = doc.getBody().getText();

        // 二次檢查內文特徵判斷是否為鑑別文章
        if (!isComp && isComparisonText(text)) {
          isComp = true;
        }

        if (isComp) {
          var parsedComp = parseComparisonDoc(doc, text, fileName, folder, imagesFolder, debugLog, formattedDate);
          if (parsedComp) {
            comparisonList.push(parsedComp);
            debugLog.push("⚖️ 成功解析相似鑑別: 「" + parsedComp.title + "」");
          }
        } else {
          var plantNameOnly = fileName.replace(/[-_–\s]*植物資料.*/g, '').replace(/\.(docx?|gdoc)$/i, '').trim();
          var galleryItems = getPlantGalleryFromDoc(doc, folder, plantNameOnly, imagesFolder, text, formattedDate, debugLog);
          var primaryImageUrl = galleryItems.length > 0 ? galleryItems[0].url : "";

          var parsedPlant = parseDocText(text, fileName, formattedDate, primaryImageUrl, galleryItems, doc, debugLog, plantNameOnly);
          plantList.push(parsedPlant);
        }
      } catch (docErr) {
        debugLog.push("❌ 讀取 Doc 異常 (" + fileName + "): " + docErr.toString());
      }
    }

    plantList.sort(function(a, b) {
      return (b.dateAdded || "").localeCompare(a.dateAdded || "");
    });

    comparisonList.sort(function(a, b) {
      return (b.dateAdded || "").localeCompare(a.dateAdded || "");
    });

    var result = {
      status: "success",
      syncMode: syncMode,
      folderFound: folderName,
      count: plantList.length,
      deletedCount: deletedList.length,
      comparisonCount: comparisonList.length,
      deletedComparisonCount: deletedComparisonList.length,
      updatedAt: new Date().toISOString(),
      debugLog: debugLog,
      plants: plantList,
      deletedPlants: deletedList,
      comparisons: comparisonList,
      deletedComparisons: deletedComparisonList
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

  var titleMatch = text.match(/【?(?:相似植物鑑別|相似鑑別)】?[：:\s]*([^\n]+)/i);
  var rawTitle = titleMatch ? titleMatch[1].trim() : fileName.replace(/^[\(\[\【]?鑑別[\]\)\】\_\-\s]*/g, '').replace(/\.(docx?|gdoc)$/i, '').trim();

  // 提取對比物種
  var speciesField = getField(/(?:對比物種|比較物種|鑑別物種)[：:\s]+([^\n]+)/);
  var speciesList = [];
  if (speciesField) {
    speciesList = speciesField.split(/[、,，\/\s+與和vsVS]+/).map(function(s){ return s.trim(); }).filter(Boolean);
  }
  if (speciesList.length === 0) {
    // 從標題嘗試提取 (如: 薰衣草 vs 鼠尾草)
    var vsParts = rawTitle.split(/[-–—vsVS與和、,]+/i).map(function(s){ return s.trim(); }).filter(Boolean);
    if (vsParts.length >= 2) speciesList = vsParts;
  }

  var family = getField(/(?:所屬科別|科別)[：:\s]+([^\n]+)/) || "觀賞植物";
  var confusionLevel = getField(/(?:混淆程度|混淆指數|難度)[：:\s]+([^\n]+)/) || "★★★★☆";
  var mnemonic = getField(/(?:一句話速記|秒殺要訣|鑑別速記|一句話要訣|核心口訣)[：:\s]+([^\n]+)/);

  // 提取日期地點
  var dateAdded = defaultDateStr;
  var parsedDl = parseDateAndLocationFromLine(text);
  if (parsedDl && parsedDl.dateAdded) dateAdded = parsedDl.dateAdded;

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
        // 🎯 核心演算法：一對一精確標註指派
        var specificCaption = null;
        if (item.nearbyText) {
          var candidateCap = parseSpecificCaptionFromNearbyText(item.nearbyText, plantName);
          if (candidateCap && !isCaptionAlreadyUsed(candidateCap, galleryItems)) {
            specificCaption = candidateCap;
          }
        }

        // 若專屬文字為空或重複，從文檔全局標註序列中依序消費下一個未使用的有效標註！
        if (!specificCaption) {
          for (var cIdx = 0; cIdx < allDocCaptions.length; cIdx++) {
            if (!usedCaptionIndices[cIdx]) {
              usedCaptionIndices[cIdx] = true;
              specificCaption = allDocCaptions[cIdx];
              break;
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
 * ⚡ 全文標註行依序提取器 (v95 嚴格純化版)
 * 提取所有包含日期/地點或特徵時地的有效行，100% 排除「油桐 - 植物資料」等標題
 */
function extractAllOrderedDocCaptions(text, defaultDateStr, plantName) {
  var captions = [];
  if (!text) return captions;

  var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
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
            // 只要找到含有 @、日期或有效特徵的文字即鎖定完成
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
 * ⚡ 智慧特徵與拍攝日期地點解析器 (v95 嚴格純化版)
 * 範例 1: "油桐果 (照片拍攝：20260506@大甲水東流桐花步道)" -> "油桐果 (20260506@大甲水東流桐花步道)"
 * 範例 2: "葉基的腺盃 (20260422@挑水古道+碧山古道)" -> "葉基的腺盃 (20260422@挑水古道+碧山古道)"
 * 範例 3: "20260422@挑水古道+碧山古道" -> "(20260422@挑水古道+碧山古道)"
 */
function parseSpecificCaptionFromNearbyText(text, plantName) {
  if (!text) return null;

  var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
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
