/**
 * 「捻花惹草」App 主程式入口與 View 路由控制器
 */

let deferredPwaPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化圖鑑 (0.0001 秒原生秒刷已儲存之花草與照片)
  initGallery();

  // 2. 導覽列與 View 切換 (Desktop & Mobile)
  setupNavigation();

  // 3. 測驗按鈕事件綁定
  setupQuizControls();

  // 4. 設定 Modal 與 GAS 同步綁定
  setupSettingsModal();

  // 4.5 QR Code 分享彈窗綁定
  setupQrModal();

  // 5. 註冊 PWA Service Worker 與自動版面升級監聽
  registerServiceWorker();

  // 6. 安全版背景靜默自動增量同步 (絕對不覆蓋原本圖鑑)
  setTimeout(() => {
    autoBackgroundSyncGAS();
  }, 1500);
});

async function autoBackgroundSyncGAS() {
  const url = getSavedGasUrl();
  if (!url) return;
  try {
    const syncRes = await fetchLatestDataFromGAS();
    if (syncRes) {
      const { syncMode, plants, deletedPlants } = syncRes;
      if (syncMode === 'INCREMENTAL') {
        await mergeAndSaveStoredPlants(plants, deletedPlants);
      } else {
        if (plants && Array.isArray(plants) && plants.length > 0) {
          saveStoredPlants(plants);
        }
      }
      const modalBackdrop = document.getElementById('plantModalBackdrop');
      if (!modalBackdrop || !modalBackdrop.classList.contains('open')) {
        initGallery();
      }
    }
  } catch(e) {}
}

function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn, .mobile-nav-item');
  const viewSections = document.querySelectorAll('.view-section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetViewId = btn.getAttribute('data-target-view');
      if (!targetViewId) return;

      // 切換按鈕 active
      document.querySelectorAll('.nav-btn, .mobile-nav-item').forEach(b => {
        if (b.getAttribute('data-target-view') === targetViewId) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // 切換 View Section
      viewSections.forEach(sec => {
        if (sec.id === targetViewId) {
          sec.classList.add('active');
        } else {
          sec.classList.remove('active');
        }
      });

      // 如果切換到測驗頁面且尚未開始，自動初始化新測驗
      if (targetViewId === 'quizView') {
        const resultContainer = document.getElementById('quizResultContainer');
        const playingContainer = document.getElementById('quizPlayingContainer');
        if (resultContainer.style.display !== 'block' && playingContainer.style.display !== 'block') {
          startNewQuiz();
        }
      }
    });
  });
}

function setupQuizControls() {
  const restartBtn = document.getElementById('restartQuizBtn');
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      startNewQuiz();
    });
  }
}

function setupSettingsModal() {
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const modalBackdrop = document.getElementById('settingsModalBackdrop');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const saveGasBtn = document.getElementById('saveGasUrlBtn');
  const gasInput = document.getElementById('gasApiUrlInput');
  const triggerSyncBtn = document.getElementById('triggerSyncBtn');
  const pasteDocBtn = document.getElementById('pasteDocParseBtn');
  const rawDocInput = document.getElementById('rawDocInput');

  if (openSettingsBtn && modalBackdrop) {
    openSettingsBtn.addEventListener('click', () => {
      if (gasInput) gasInput.value = getSavedGasUrl();
      modalBackdrop.classList.add('open');
    });
  }

  if (closeSettingsBtn && modalBackdrop) {
    closeSettingsBtn.addEventListener('click', () => {
      modalBackdrop.classList.remove('open');
    });
  }

  if (saveGasBtn && gasInput) {
    saveGasBtn.addEventListener('click', () => {
      if (!gasInput.value.trim()) {
        showToast('請先輸入有效的 API 網址！');
        return;
      }
      saveGasUrl(gasInput.value);
      showToast('💾 已成功儲存 Google Apps Script API 網址！');
    });
  }

  if (triggerSyncBtn) {
    triggerSyncBtn.addEventListener('click', async () => {
      if (gasInput && gasInput.value.trim()) {
        saveGasUrl(gasInput.value);
      }

      const currentUrl = getSavedGasUrl();
      if (!currentUrl) {
        showToast('❌ 請先在上方欄位貼入您的 Google Apps Script API 網址！');
        return;
      }

      showToast('📡 正在連線同步 Google Drive 資料與照片...');
      try {
        const syncRes = await fetchLatestDataFromGAS();
        const { syncMode, plants, deletedPlants, folderFound, debugLog } = syncRes;

        // 渲染診斷日誌 (Debug Log)
        renderDebugLog(debugLog);

        let msg = '';
        if (syncMode === 'INCREMENTAL') {
          const stats = await mergeAndSaveStoredPlants(plants, deletedPlants);
          initGallery();

          let details = [];
          if (stats.addedCount > 0) details.push(`新增 ${stats.addedCount} 筆`);
          if (stats.updatedCount > 0) details.push(`更新 ${stats.updatedCount} 筆`);
          if (stats.deletedCount > 0) details.push(`刪除 ${stats.deletedCount} 筆`);
          const detailStr = details.length > 0 ? details.join('、') : '無異動項目';

          msg = `✅ [增修刪] 暫存同步成功！${detailStr}（圖鑑共 ${stats.totalCount} 筆）。<br>💡 提示：可展開下方診斷日誌確認照片擷取細節。`;
        } else {
          saveStoredPlants(plants);
          initGallery();
          msg = `✅ 全量連線同步成功！已從 [${folderFound}] 載入 ${plants.length} 筆完整花草資料與照片。`;
        }

        showToast(msg, 6500);
      } catch (err) {
        showToast(`❌ 同步失敗：${err.message}`, 6500);
      }
    });
  }

  const clearSyncBtn = document.getElementById('clearCacheAndSyncBtn');
  if (clearSyncBtn) {
    clearSyncBtn.addEventListener('click', async () => {
      if (confirm('確定要清空本機快取的圖鑑資料，並重新連線下載最新資料與照片嗎？')) {
        clearAllPlantCache();
        showToast('🧹 已成功清空本機快取，正在重新下載完整圖鑑與照片...');
        if (triggerSyncBtn) {
          triggerSyncBtn.click();
        }
      }
    });
  }

  // 純文字解析新增
  if (pasteDocBtn && rawDocInput) {
    pasteDocBtn.addEventListener('click', () => {
      const text = rawDocInput.value;
      if (!text.trim()) {
        showToast('請先貼上 Google Doc 的花草內文！');
        return;
      }

      const newPlant = parseGoogleDocFormat(text);
      if (newPlant) {
        const current = getStoredPlants();
        current.unshift(newPlant); // 逆向放在最前面
        saveStoredPlants(current);
        initGallery();
        rawDocInput.value = '';
        showToast(`✅ 成功新增花草「${newPlant.name}」！`);
        if (modalBackdrop) modalBackdrop.classList.remove('open');
      } else {
        showToast('解析失敗，請確認格式');
      }
    });
  }
}

function renderDebugLog(logArray) {
  const section = document.getElementById('syncDebugLogSection');
  const listEl = document.getElementById('syncDebugLogList');
  const header = document.getElementById('syncDebugLogHeader');
  const toggleText = document.getElementById('syncDebugLogToggleText');
  if (!section || !listEl) return;

  if (logArray && Array.isArray(logArray) && logArray.length > 0) {
    listEl.innerHTML = logArray.map(item => {
      let icon = '•';
      if (item.includes('✅')) icon = '✅';
      else if (item.includes('❌')) icon = '❌';
      else if (item.includes('ℹ️')) icon = 'ℹ️';
      else if (item.includes('⚠️')) icon = '⚠️';
      return `<div style="margin-bottom: 3px;">${item}</div>`;
    }).join('');
    section.style.display = 'block';
  } else {
    listEl.innerHTML = '<div>尚無日誌記錄</div>';
    section.style.display = 'none';
  }

  if (header && !header.dataset.bound) {
    header.dataset.bound = 'true';
    header.addEventListener('click', () => {
      const isHidden = listEl.style.display === 'none' || !listEl.style.display;
      listEl.style.display = isHidden ? 'block' : 'none';
      if (toggleText) {
        toggleText.textContent = isHidden ? '點擊收合 ▲' : '點擊展開 ▼';
      }
    });
  }
}

function setupQrModal() {
  const openQrBtn = document.getElementById('openQrModalBtn');
  const qrModalBackdrop = document.getElementById('qrModalBackdrop');
  const closeQrBtn = document.getElementById('closeQrModalBtn');

  if (openQrBtn && qrModalBackdrop) {
    openQrBtn.addEventListener('click', (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      qrModalBackdrop.classList.add('open');
    });
  }

  if (closeQrBtn && qrModalBackdrop) {
    closeQrBtn.addEventListener('click', (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      qrModalBackdrop.classList.remove('open');
    });
  }

  if (qrModalBackdrop) {
    qrModalBackdrop.addEventListener('click', (e) => {
      if (e.target === qrModalBackdrop) {
        qrModalBackdrop.classList.remove('open');
      }
    });
  }
}

function showToast(message, duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>🌿</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js?v=30')
        .then((reg) => {
          console.log('PWA ServiceWorker 註冊成功:', reg.scope);

          // 自動向伺服器檢查並下載最新版網頁
          reg.update();

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showToast('✨ App 發現最新功能更新，正在自動為您升級版面...', 3000);
                  setTimeout(() => window.location.reload(), 1200);
                }
              });
            }
          });
        })
        .catch((err) => console.log('PWA ServiceWorker 註冊失敗:', err));
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', () => {
        installBtn.style.display = 'none';
        deferredPwaPrompt.prompt();
        deferredPwaPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('使用者接受安裝 PWA');
          }
          deferredPwaPrompt = null;
        });
      });
    }
  });
}
