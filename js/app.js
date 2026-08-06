/**
 * 「捻花惹草」App 主程式入口與 View 路由控制器
 */

let deferredPwaPrompt = null;

document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化圖鑑 (0.0001 秒原生秒刷已儲存之 13 筆花草與照片)
  initGallery();

  // 2. 導覽列與 View 切換 (Desktop & Mobile)
  setupNavigation();

  // 3. 測驗按鈕事件綁定
  setupQuizControls();

  // 4. 設定 Modal 與 GAS 同步綁定
  setupSettingsModal();

  // 5. 註冊 PWA Service Worker 與安裝提示
  registerServiceWorker();
});

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

      showToast('📡 嘗試連線同步 Google Drive 最新資料與照片...');
      try {
        const plants = await fetchLatestDataFromGAS();
        saveStoredPlants(plants);
        initGallery();

        showToast(`✅ 同步成功！已載入 ${plants.length} 筆花草資料與照片。`);
        if (modalBackdrop) modalBackdrop.classList.remove('open');
      } catch (err) {
        showToast(`❌ 同步失敗：${err.message}`, 6500);
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
      navigator.serviceWorker.register('./sw.js?v=11')
        .then((reg) => {
          console.log('PWA ServiceWorker 註冊成功:', reg.scope);
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  showToast('✨ App 發現最新更新，正在為您載入最新版面...');
                  setTimeout(() => window.location.reload(), 1000);
                }
              });
            }
          });
        })
        .catch((err) => console.log('PWA ServiceWorker 註冊失敗:', err));
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
