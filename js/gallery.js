/**
 * 「捻花惹草」圖鑑展覽與關鍵字搜尋/篩選器控制器
 */

let currentPlantsList = [];
let activeCategory = 'ALL';
let searchQuery = '';
let isSortAsc = false;
let currentlyRenderedList = [];
let currentDetailIndex = -1;

// SVG 綠色葉片無圖備援
const DEFAULT_SVG_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%231c3629'/><text x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%2388ab8e'>🌿</text><text x='50%25' y='65%25' dominant-baseline='middle' text-anchor='middle' font-size='16' font-weight='bold' fill='%23afd19e'>花草圖鑑照片</text></svg>";

async function initGallery() {
  // 1. 先用同步 getStoredPlants() 秒刷畫面 (防止卡在「載入中....」)
  currentPlantsList = getStoredPlants();
  if (currentPlantsList && currentPlantsList.length > 0) {
    renderGallery();
  }

  // 2. 深度非同步載入 IndexedDB 大容量完整資料庫
  try {
    const loadedList = await loadStoredPlantsAsync();
    if (loadedList && Array.isArray(loadedList) && loadedList.length > 0) {
      currentPlantsList = loadedList;
      renderGallery();
    } else {
      renderGallery();
    }
  } catch(e) {
    renderGallery();
  }

  setupGalleryEventListeners();
}

/**
 * 核心渲染函式：包含正/逆向排序 (後加入者在最上面 或 最舊者在最上面)
 */
function renderGallery() {
  const gridContainer = document.getElementById('plantGridContainer');
  const countBadge = document.getElementById('plantCountBadge');
  const sortBtn = document.getElementById('sortOrderToggleBtn');
  if (!gridContainer) return;

  // 更新排序按鈕 UI
  if (sortBtn) {
    sortBtn.textContent = isSortAsc ? '⬆ 正向排序（最舊在上）' : '⬇ 逆向排序（最新在上）';
  }

  // 1. 複製資料庫並執行排序
  let sorted = [...currentPlantsList].sort((a, b) => {
    const dateA = a.dateAdded || "0";
    const dateB = b.dateAdded || "0";
    return isSortAsc ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
  });

  // 2. 進行搜尋過濾
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    sorted = sorted.filter(p => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchSci = (p.scientificName || '').toLowerCase().includes(q);
      const matchAliases = (p.aliases || []).some(a => a.toLowerCase().includes(q));
      const matchFamily = (p.family || '').toLowerCase().includes(q);
      const matchCare = JSON.stringify(p.careNotes || {}).toLowerCase().includes(q);
      const matchLoc = (p.locationNote || '').toLowerCase().includes(q);
      const matchMorph = JSON.stringify(p.morphologyDetails || []).toLowerCase().includes(q);
      return matchName || matchSci || matchAliases || matchFamily || matchCare || matchLoc || matchMorph;
    });
  }

  // 3. 進行分類 Chips 篩選
  if (activeCategory !== 'ALL') {
    if (activeCategory === 'PET_SAFE') {
      sorted = sorted.filter(p => p.petFriendly === true);
    } else {
      sorted = sorted.filter(p => (p.family || '').includes(activeCategory));
    }
  }

  // 儲存目前呈列的清單，供 Modal [上一筆][下一筆] 切換
  currentlyRenderedList = sorted;

  // 更新顯示筆數標籤
  if (countBadge) {
    countBadge.textContent = `共 ${sorted.length} 筆資料 (逆序呈列)`;
  }

  // 4. 產生卡片 HTML
  if (sorted.length === 0) {
    gridContainer.innerHTML = `
      <div class="empty-gallery-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🌿</div>
        <h3>未找到符合條件的花草</h3>
        <p>請嘗試清除搜尋關鍵字或切換分類標籤</p>
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = sorted.map((plant, index) => {
    try {
      const aliasesTag = (plant.aliases && Array.isArray(plant.aliases) && plant.aliases.length > 0) 
        ? `<span class="plant-tag">${plant.aliases[0]}</span>` : '';

      const familyStr = String(plant.family || '');
      const familyTag = familyStr ? `<span class="plant-tag">${familyStr.split(' ')[0]}</span>` : '';

      const dateStr = String(plant.dateAdded || '');
      const dateFormatted = (dateStr && dateStr.length === 8) 
        ? `${dateStr.slice(0,4)}/${dateStr.slice(4,6)}/${dateStr.slice(6,8)}` 
        : (dateStr || '最新');

      let rawUrl = String(plant.imageUrl || '');
      let cleanImageUrl = rawUrl.trim().replace(/[\r\n\s]+/g, '');
      if (!cleanImageUrl || cleanImageUrl === './assets/images/ferns.jpg') {
        cleanImageUrl = DEFAULT_SVG_PLACEHOLDER;
      }

      let isCloudPhoto = cleanImageUrl.startsWith('data:image') && !cleanImageUrl.includes('svg+xml');

      return `
        <div class="plant-card" data-id="${plant.id}">
          <div class="plant-image-container">
            <img src="${cleanImageUrl}" alt="${plant.name || '花草'}" class="plant-card-img" onerror="this.src='${DEFAULT_SVG_PLACEHOLDER}'">
            ${plant.petFriendly ? '<span class="pet-friendly-tag">🐾 寵物友善</span>' : ''}
            ${isCloudPhoto ? '<span style="position:absolute; bottom:8px; right:8px; background:rgba(15,32,23,0.85); color:#afd19e; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:10px; border:1px solid #afd19e;">📷 雲端照片</span>' : ''}
          </div>
          <div class="plant-card-body">
            <h3 class="plant-card-title">${plant.name || '無名花草'}</h3>
            <div class="plant-card-date">📅 ${dateFormatted} ${plant.locationNote ? `• ${plant.locationNote}` : ''}</div>
            <div class="plant-card-sci-name">${plant.scientificName || ''}</div>
            <div class="plant-card-tags">
              ${familyTag}
              ${aliasesTag}
            </div>
          </div>
        </div>
      `;
    } catch (cardErr) {
      console.error("卡片渲染例外:", cardErr);
      return '';
    }
  }).join('');

  // 綁定卡片點擊開啟詳細 Modal
  gridContainer.querySelectorAll('.plant-card').forEach(card => {
    card.addEventListener('click', () => {
      const plantId = card.getAttribute('data-id');
      const plantData = currentPlantsList.find(p => p.id === plantId);
      if (plantData) {
        openPlantDetailModal(plantData);
      }
    });
  });
}

function setupGalleryEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearBtn) {
        clearBtn.classList.toggle('visible', searchQuery.length > 0);
      }
      renderGallery();
    });
  }

  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = 'true';
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearBtn.classList.remove('visible');
      renderGallery();
    });
  }

  // 排序切換按鈕點擊
  const sortBtn = document.getElementById('sortOrderToggleBtn');
  if (sortBtn && !sortBtn.dataset.bound) {
    sortBtn.dataset.bound = 'true';
    sortBtn.addEventListener('click', () => {
      isSortAsc = !isSortAsc;
      renderGallery();
    });
  }

  // 分類 Chips 點擊
  const chipContainer = document.getElementById('categoryChips');
  if (chipContainer && !chipContainer.dataset.bound) {
    chipContainer.dataset.bound = 'true';
    chipContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-btn');
      if (!chip) return;
      
      chipContainer.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeCategory = chip.getAttribute('data-category') || 'ALL';
      renderGallery();
    });
  }

  // 鍵盤 ← / → / Esc 快速導覽燈箱
  if (!window.modalKeyNavBound) {
    window.modalKeyNavBound = true;
    window.addEventListener('keydown', (e) => {
      const modalBackdrop = document.getElementById('plantModalBackdrop');
      if (modalBackdrop && modalBackdrop.classList.contains('open')) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigatePlantModal(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigatePlantModal(1);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closePlantDetailModal();
        }
      }
    });
  }
}

/**
 * 開啟花草詳細資料視窗 (Modal View)
 */
function openPlantDetailModal(plant) {
  const modalBackdrop = document.getElementById('plantModalBackdrop');
  if (!modalBackdrop) return;

  // 計算當前筆數位置
  if (currentlyRenderedList.length > 0) {
    const idx = currentlyRenderedList.findIndex(p => p.id === plant.id);
    if (idx !== -1) {
      currentDetailIndex = idx;
    }
  }

  const indexBadge = document.getElementById('modalIndexBadge');
  if (indexBadge) {
    if (currentlyRenderedList.length > 0 && currentDetailIndex !== -1) {
      indexBadge.textContent = `第 ${currentDetailIndex + 1} / ${currentlyRenderedList.length} 筆`;
    } else {
      indexBadge.textContent = '';
    }
  }

  const dateStr = String(plant.dateAdded || '');
  const dateFormatted = (dateStr && dateStr.length === 8) 
    ? `${dateStr.slice(0,4)}年${dateStr.slice(4,6)}月${dateStr.slice(6,8)}日` 
    : dateStr;

  let rawUrl = String(plant.imageUrl || '');
  let cleanImageUrl = rawUrl.trim().replace(/[\r\n\s]+/g, '');
  if (!cleanImageUrl || cleanImageUrl === './assets/images/ferns.jpg') {
    cleanImageUrl = DEFAULT_SVG_PLACEHOLDER;
  }

  // 填入資料
  const heroImg = document.getElementById('modalHeroImg');
  const heroBgBlur = document.getElementById('modalHeroBgBlur');
  if (heroImg) heroImg.src = cleanImageUrl;
  if (heroBgBlur) heroBgBlur.src = cleanImageUrl;

  // 點擊主圖可查看無遮擋全螢幕大圖
  if (heroImg) {
    heroImg.onclick = () => {
      openFullScreenPhoto(heroImg.src, plant.name);
    };
  }

  const modalTitleEl = document.getElementById('modalTitle');
  if (modalTitleEl) modalTitleEl.textContent = plant.name;

  // 基本資料 Tab
  document.getElementById('modalSciName').textContent = plant.scientificName || '無';
  document.getElementById('modalEngName').textContent = plant.englishName || '無';
  document.getElementById('modalAliases').textContent = (plant.aliases && plant.aliases.length > 0) ? plant.aliases.join('、') : '無';
  document.getElementById('modalFamily').textContent = plant.family || '無';
  document.getElementById('modalPetFriendly').textContent = plant.petFriendly ? '✅ 寵物友善（對貓狗無毒）' : '⚠️ 需注意寵物接觸（非完全無毒）';

  // 形態特徵 Tab 完整渲染 (完整呈列株型與莖幹、葉片、花朵/果實、根系等項目)
  document.getElementById('modalBloom').textContent = plant.bloomPeriod || '無';
  document.getElementById('modalFruit').textContent = plant.fruitPeriod || '無';
  document.getElementById('modalSpore').textContent = plant.sporePeriod || '無';

  let morphText = '';
  if (plant.morphologyDetails && Array.isArray(plant.morphologyDetails) && plant.morphologyDetails.length > 0) {
    morphText = plant.morphologyDetails.map(item => `【${item.label}】${item.value}`).join('\n\n');
  } else {
    let morphLines = [];
    if (plant.morphology?.stem) morphLines.push(`【莖 / 株型】${plant.morphology.stem}`);
    if (plant.morphology?.leaf) morphLines.push(`【葉片】${plant.morphology.leaf}`);
    if (plant.morphology?.sporangia) morphLines.push(`【花朵 / 果實 / 孢子】${plant.morphology.sporangia}`);
    if (plant.morphology?.rhizome) morphLines.push(`【根系】${plant.morphology.rhizome}`);
    morphText = morphLines.length > 0 ? morphLines.join('\n\n') : (plant.morphology?.fullText || '詳見內文說明');
  }

  document.getElementById('modalMorphologyText').textContent = morphText;

  // 養護注意事項 Tab
  document.getElementById('modalLight').textContent = plant.careNotes?.light || '中等散射光';
  document.getElementById('modalHumidity').textContent = plant.careNotes?.humidity || '維持介質適度濕潤';
  document.getElementById('modalWaterQuality').textContent = plant.careNotes?.waterQuality || '普通過濾水或靜置水';
  document.getElementById('modalUsesText').textContent = (plant.uses && plant.uses.length > 0) ? plant.uses.join('\n') : '觀賞植物';

  // 📷 植物圖集 Tab 渲染 (其他附圖)
  const galleryContainer = document.getElementById('modalGalleryContainer');
  const galleryCountBadge = document.getElementById('modalGalleryCountBadge');
  const galleryOption = document.getElementById('modalGalleryOption');
  let galleryImages = plant.galleryImages || [];

  // 智慧解析：構建預設 (時間@地點) 標註文字
  const rawDateStr = String(plant.dateAdded || '');
  const rawLocNote = String(plant.locationNote || '').trim();
  let defaultDateLocCaption = '';
  if (rawDateStr || rawLocNote) {
    let locTag = rawLocNote ? (rawLocNote.startsWith('@') ? rawLocNote : '@' + rawLocNote) : '';
    defaultDateLocCaption = `(${rawDateStr}${locTag})`;
  }

  // 智慧預設：若附圖集為空，但主照片為實體照片，自動將主照片作為附圖加入
  if (galleryImages.length === 0 && cleanImageUrl && cleanImageUrl.startsWith('data:image') && !cleanImageUrl.includes('svg+xml')) {
    galleryImages = [{ url: cleanImageUrl, caption: defaultDateLocCaption || '特徵照片 1' }];
  } else {
    // 智慧修復：若附圖標題為通用「特徵照片 X」，自動帶入 (時間@地點) 標註
    galleryImages = galleryImages.map((img, idx) => {
      let cap = String(img.caption || '').trim();
      if (!cap || cap.startsWith('特徵照片') || cap.startsWith('特徵繪圖照片')) {
        if (defaultDateLocCaption) {
          return { ...img, caption: defaultDateLocCaption };
        }
      }
      return img;
    });
  }

  if (galleryCountBadge) {
    galleryCountBadge.textContent = galleryImages.length;
  }
  if (galleryOption) {
    galleryOption.textContent = `📷 植物圖集 (${galleryImages.length})`;
  }

  if (galleryContainer) {
    if (galleryImages.length > 0) {
      galleryContainer.innerHTML = galleryImages.map((img, idx) => `
        <div class="gallery-item-card" data-url="${img.url}" data-caption="${img.caption || `特徵照片 ${idx + 1}`}">
          <img src="${img.url}" alt="${img.caption || '特徵照片'}" class="gallery-item-img">
          <div class="gallery-item-caption">${img.caption || `特徵照片 ${idx + 1}`}</div>
        </div>
      `).join('');

      // 點擊縮圖：將主圖 (Hero Photo) 放大替換顯示該特徵照片
      galleryContainer.querySelectorAll('.gallery-item-card').forEach(card => {
        card.addEventListener('click', () => {
          const targetUrl = card.getAttribute('data-url');
          if (targetUrl) {
            if (heroImg) heroImg.src = targetUrl;
            if (heroBgBlur) heroBgBlur.src = targetUrl;
            galleryContainer.querySelectorAll('.gallery-item-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
          }
        });
      });
    } else {
      galleryContainer.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 2rem; text-align: center; color: var(--text-muted); background: #f8faf8; border-radius: 12px; border: 1px dashed #c2decb;">
          <div style="font-size: 2rem; margin-bottom: 8px;">🌿</div>
          <div style="font-weight: 700; color: var(--primary-dark);">此花草目前尚未包含其他特徵附圖照片</div>
          <div style="font-size: 0.85rem; margin-top: 4px;">如需補充，可在 Google Doc 檔案末端加入「其他附圖」標題並插入圖片，同步後即可自動載入！</div>
        </div>
      `;
    }
  }

  // 🔗 參考資料 Tab 渲染 (外部參考連結)
  const refContainer = document.getElementById('modalReferencesList');
  if (refContainer) {
    const refs = plant.references || [];
    if (refs && refs.length > 0) {
      refContainer.innerHTML = refs.map(r => `
        <li>
          <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="reference-link">
            🌐 ${r.title || r.url} ↗
          </a>
        </li>
      `).join('');
    } else {
      refContainer.innerHTML = `
        <li style="color: var(--text-muted); padding: 0.5rem 0;">尚無外部參考連結紀錄</li>
      `;
    }
  }

  // 重置預設啟用第一個 Tab (除非是點擊 [上一筆/下一筆] 連續瀏覽)
  if (!modalBackdrop.classList.contains('open')) {
    switchModalTab('tab-basic');
  }

  // 強制 JS 響應式雙重防護：根據實際螢幕寬度與觸控裝置強制動態切換 Tab 選單顯示
  const tabBtnsContainer = modalBackdrop.querySelector('.tab-buttons');
  const tabSelectWrapper = modalBackdrop.querySelector('.modal-tab-select-wrapper');
  if (tabBtnsContainer && tabSelectWrapper) {
    const isMobile = (window.innerWidth <= 768) || (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) || ('ontouchstart' in window && window.innerWidth <= 1024);
    if (isMobile) {
      tabBtnsContainer.style.setProperty('display', 'none', 'important');
      tabSelectWrapper.style.setProperty('display', 'block', 'important');
    } else {
      tabBtnsContainer.style.setProperty('display', 'flex', 'important');
      tabSelectWrapper.style.setProperty('display', 'none', 'important');
    }
  }

  modalBackdrop.classList.add('open');
}

/**
 * 燈箱上一筆 (-1) / 下一筆 (+1) 切換
 */
function navigatePlantModal(direction) {
  if (!currentlyRenderedList || currentlyRenderedList.length === 0) return;
  if (currentDetailIndex === -1) currentDetailIndex = 0;

  let nextIndex = currentDetailIndex + direction;
  // 循環流覽
  if (nextIndex < 0) {
    nextIndex = currentlyRenderedList.length - 1;
  } else if (nextIndex >= currentlyRenderedList.length) {
    nextIndex = 0;
  }

  const nextPlant = currentlyRenderedList[nextIndex];
  if (nextPlant) {
    // 記憶使用者當前停留在哪一個 Tab
    const tabSelect = document.getElementById('modalTabSelect');
    const activeTabBtn = document.querySelector('#plantModalContainer .tab-btn.active');
    const activeTabId = (tabSelect && tabSelect.offsetParent !== null)
      ? tabSelect.value
      : (activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'tab-basic');
    
    openPlantDetailModal(nextPlant);
    
    if (activeTabId) {
      switchModalTab(activeTabId);
    }
  }
}

function closePlantDetailModal() {
  const modalBackdrop = document.getElementById('plantModalBackdrop');
  if (modalBackdrop) modalBackdrop.classList.remove('open');
}

function switchModalTab(tabId) {
  const modal = document.getElementById('plantModalContainer');
  if (!modal) return;

  // 1. 同步 Desktop Tab 按鈕 active 狀態
  modal.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  // 2. 同步 Mobile 下拉選單選擇值
  const tabSelect = document.getElementById('modalTabSelect');
  if (tabSelect && tabSelect.value !== tabId) {
    tabSelect.value = tabId;
  }

  // 3. 切換 Tab 內容區塊顯示
  modal.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

function openFullScreenPhoto(url, caption) {
  const modal = document.getElementById('fullScreenPhotoModal');
  const img = document.getElementById('fullScreenPhotoImg');
  const cap = document.getElementById('fullScreenPhotoCaption');
  if (modal && img) {
    img.src = url;
    if (cap) cap.textContent = caption || '';
    modal.classList.add('open');
  }
}

function closeFullScreenPhoto() {
  const modal = document.getElementById('fullScreenPhotoModal');
  if (modal) modal.classList.remove('open');
}
