/**
 * 「捻花惹草」圖鑑展覽與關鍵字搜尋/篩選器控制器
 */

let currentPlantsList = [];
let activeCategory = 'ALL';
let searchQuery = '';
let isSortAsc = false;
let sortMode = 'DESC'; // 'DESC', 'ASC', 'RANDOM'
let randomShuffledList = null;
let currentlyRenderedList = [];
let currentDetailIndex = -1;
let currentActivePlant = null; // 當前在燈箱中檢視的花草物件
let currentPage = 1;       // 分頁狀態
const PAGE_SIZE = 24;      // 每頁顯示筆數

function handleImageError(imgEl) {
  if (imgEl) {
    imgEl.onerror = null;
    imgEl.src = DEFAULT_SVG_PLACEHOLDER;
  }
}

/**
 * ⚡ 關鍵工具：將 Google Drive 各種網址格式（含 uc?export=view）轉成通用全相容的 1000px 縮圖 URL
 * 避免瀏覽器防盜連/CORS政策導致跨域圖片顯示空白
 */
function formatDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return DEFAULT_SVG_PLACEHOLDER;
  const clean = url.trim().replace(/[\r\n\s]+/g, '');
  if (!clean || clean === './assets/images/ferns.jpg') {
    return DEFAULT_SVG_PLACEHOLDER;
  }
  if (clean.includes('drive.google.com') || clean.includes('googleusercontent.com')) {
    const match = clean.match(/id=([a-zA-Z0-9_-]+)/) || clean.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
  }
  return clean;
}

/**
 * Fisher-Yates 隨機洗牌演算法
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function initGallery() {
  // 1. 無條件第一時間同步秒刷畫面，絕對不允許卡在「載入中...」
  currentPlantsList = getStoredPlants() || DEFAULT_PLANT_DATA;
  renderGallery();
  checkAndOpenUrlPlant();

  // 2. 深度非同步載入 IndexedDB 大容量完整資料庫
  try {
    const loadedList = await loadStoredPlantsAsync();
    if (loadedList && Array.isArray(loadedList) && loadedList.length > 0) {
      currentPlantsList = loadedList;
      renderGallery();
      checkAndOpenUrlPlant();
    }
  } catch(e) {
    console.warn("IndexedDB 載入警告:", e);
    renderGallery();
  }

  setupGalleryEventListeners();
}

/**
 * 核心渲染函式：包含正向、逆向與隨機打亂排序
 */
function renderGallery() {
  const gridContainer = document.getElementById('plantGridContainer');
  const countBadge = document.getElementById('plantCountBadge');
  const sortBtn = document.getElementById('sortOrderToggleBtn');
  const randomSortBtn = document.getElementById('randomSortBtn');
  if (!gridContainer) return;

  // 更新排序按鈕 UI
  if (sortBtn) {
    sortBtn.textContent = (sortMode === 'ASC') ? '⬆ 正向排序（最舊在上）' : '⬇ 逆向排序（最新在上）';
    sortBtn.classList.toggle('active-mode', sortMode !== 'RANDOM');
  }
  if (randomSortBtn) {
    randomSortBtn.classList.toggle('active-mode', sortMode === 'RANDOM');
  }

  // 1. 複製資料庫與過濾無效項目
  let rawList = Array.isArray(currentPlantsList) ? currentPlantsList.filter(p => p && typeof p === 'object') : [];
  if (rawList.length === 0) {
    rawList = DEFAULT_PLANT_DATA;
  }

  // 2. 進行搜尋過濾
  let filtered = [...rawList];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => {
      if (!p) return false;
      const nameStr = String(p.name || '').toLowerCase();
      const matchName = nameStr.includes(q);
      const matchSci = String(p.scientificName || '').toLowerCase().includes(q);
      const matchAliases = Array.isArray(p.aliases) ? p.aliases.some(a => String(a || '').toLowerCase().includes(q)) : false;
      const matchFamily = String(p.family || '').toLowerCase().includes(q);
      const matchCare = JSON.stringify(p.careNotes || {}).toLowerCase().includes(q);
      const matchLoc = String(p.locationNote || '').toLowerCase().includes(q);
      const matchMorph = JSON.stringify(p.morphologyDetails || []).toLowerCase().includes(q);
      return matchName || matchSci || matchAliases || matchFamily || matchCare || matchLoc || matchMorph;
    });
  }

  // 3. 進行分類 Chips 篩選 (取得當前分頁內容)
  if (activeCategory !== 'ALL') {
    if (activeCategory === 'PET_SAFE') {
      filtered = filtered.filter(p => p && p.petFriendly === true);
    } else {
      filtered = filtered.filter(p => p && String(p.family || '').includes(activeCategory));
    }
  }

  // 4. 執行排序邏輯 (正向 / 逆向 / 隨機排序)
  let sorted = [];
  if (sortMode === 'RANDOM') {
    if (!randomShuffledList || randomShuffledList.length !== filtered.length) {
      randomShuffledList = shuffleArray(filtered);
    }
    sorted = randomShuffledList;
  } else {
    randomShuffledList = null;
    sorted = [...filtered].sort((a, b) => {
      const dateA = String((a && a.dateAdded) || "0");
      const dateB = String((b && b.dateAdded) || "0");
      return (sortMode === 'ASC') ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });
  }

  // 儲存目前呈列的清單，供 Modal [上一筆][下一筆] 切換
  currentlyRenderedList = sorted;

  // 更新顯示筆數標籤
  if (countBadge) {
    let modeText = '逆序';
    if (sortMode === 'ASC') modeText = '正序';
    if (sortMode === 'RANDOM') modeText = '🎲隨機洗牌';
    countBadge.textContent = `共 ${sorted.length} 筆資料 (${modeText}呈列)`;
  }

  // 分頁顯示：取前 N 筆
  const pagedSorted = sorted.slice(0, currentPage * PAGE_SIZE);
  const hasMore = sorted.length > pagedSorted.length;

  // 4. 產生卡片 HTML
  if (pagedSorted.length === 0) {
    const hasSearch = searchQuery.trim() || activeCategory !== 'ALL';
    gridContainer.innerHTML = `
      <div class="empty-gallery-state" style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1.5rem; background: rgba(255,255,255,0.7); border-radius: 20px; border: 1.5px dashed #a3c9b0; backdrop-filter: blur(10px); margin: 1rem 0;">
        <div class="empty-icon" style="font-size: 3.8rem; margin-bottom: 0.8rem;">🪴</div>
        <h3 style="color: var(--primary-dark); font-size: 1.35rem; font-weight: 800; margin-bottom: 0.8rem;">
          ${hasSearch ? '未找到符合條件的花草' : '歡迎使用《捻花惹草》花草圖鑑！'}
        </h3>
        <p style="color: var(--text-muted); font-size: 0.98rem; margin-bottom: 1.8rem; line-height: 1.7; max-width: 520px; margin-left: auto; margin-right: auto;">
          ${hasSearch ? '請嘗試清除搜尋關鍵字或切換分類標籤。' : '初次使用或清空本機快取時，請點擊下方按鈕進行第一次雲端連線同步，載入 50+ 筆完整花草圖資與照片。'}
        </p>
        ${!hasSearch ? `
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button onclick="triggerFullInitialSync()" class="btn-primary" style="padding: 0.85rem 2rem; font-size: 1.05rem; border-radius: 2rem; box-shadow: 0 4px 15px rgba(27,59,43,0.3);">
              ⚡ 開始初次連線同步圖鑑
            </button>
            <button onclick="openSettingsModal()" class="btn-primary" style="padding: 0.85rem 1.5rem; font-size: 1rem; border-radius: 2rem; background: rgba(27,59,43,0.1); color: var(--primary-dark); border: 1px solid var(--primary-dark);">
              ⚙️ 同步設定
            </button>
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  gridContainer.innerHTML = pagedSorted.map((plant, index) => {
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
      let cleanImageUrl = formatDriveImageUrl(rawUrl);

      let isCloudPhoto = cleanImageUrl.includes('drive.google.com') ||
                         (cleanImageUrl.startsWith('https://') && !cleanImageUrl.includes('svg+xml'));

      let rawLocStr = String(plant.locationNote || '').trim();
      let cleanLocationNote = '';
      if (rawLocStr) {
        let atIdx = rawLocStr.indexOf('@');
        if (atIdx !== -1) {
          let subLoc = rawLocStr.substring(atIdx);
          let matchLoc = subLoc.match(/^@[^\)\n\r\t\s]+/);
          cleanLocationNote = matchLoc ? matchLoc[0] : subLoc.substring(0, 15);
        } else {
          cleanLocationNote = rawLocStr.length > 15 ? rawLocStr.substring(0, 15) : rawLocStr;
        }
      }

      return `
        <div class="plant-card" data-id="${plant.id}">
          <div class="plant-image-container">
            <img src="${cleanImageUrl}" alt="${plant.name || '花草'}" class="plant-card-img" loading="lazy" onerror="handleImageError(this)">
            ${plant.petFriendly ? '<span class="pet-friendly-tag">🐾 寵物友善</span>' : ''}
            ${isCloudPhoto ? '<span style="position:absolute; bottom:8px; right:8px; background:rgba(15,32,23,0.85); color:#afd19e; font-size:0.75rem; font-weight:700; padding:2px 8px; border-radius:10px; border:1px solid #afd19e;">📷 雲端照片</span>' : ''}
          </div>
          <div class="plant-card-body">
            <h3 class="plant-card-title">${plant.name || '無名花草'}</h3>
            <div class="plant-card-date">📅 ${dateFormatted} ${cleanLocationNote ? `• ${cleanLocationNote}` : ''}</div>
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

  // 載入更多按鈕
  const existingLoadMore = document.getElementById('loadMoreBtn');
  if (existingLoadMore) existingLoadMore.remove();

  if (hasMore) {
    const loadMoreBtn = document.createElement('div');
    loadMoreBtn.id = 'loadMoreBtn';
    loadMoreBtn.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 1.5rem 0 2rem;';
    loadMoreBtn.innerHTML = `
      <button onclick="loadMorePlants()" style="
        background: var(--primary-dark, #1a3a2a);
        color: var(--primary-light, #afd19e);
        border: 1.5px solid var(--primary-light, #afd19e);
        border-radius: 2rem;
        padding: 0.6rem 2rem;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
        ▼ 載入更多 (${pagedSorted.length} / ${sorted.length} 筆)
      </button>
    `;
    gridContainer.appendChild(loadMoreBtn);
  }
}

function loadMorePlants() {
  currentPage += 1;
  renderGallery();
  // 平滑滾動到新塗片第一張
  const cards = document.querySelectorAll('.plant-card');
  if (cards.length > (currentPage - 1) * PAGE_SIZE) {
    cards[(currentPage - 1) * PAGE_SIZE].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function setupGalleryEventListeners() {
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (clearBtn) clearBtn.classList.toggle('visible', searchQuery.length > 0);
      currentPage = 1; // 搜尋變更從第一頁開始
      renderGallery();
    });
  }

  if (clearBtn && !clearBtn.dataset.bound) {
    clearBtn.dataset.bound = 'true';
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      clearBtn.classList.remove('visible');
      currentPage = 1; // 清除搜尋從第一頁開始
      renderGallery();
    });
  }

  // 排序切換按鈕點擊 (正序 ↔ 逆序)
  const sortBtn = document.getElementById('sortOrderToggleBtn');
  if (sortBtn && !sortBtn.dataset.bound) {
    sortBtn.dataset.bound = 'true';
    sortBtn.addEventListener('click', () => {
      if (sortMode === 'DESC') { sortMode = 'ASC'; } else { sortMode = 'DESC'; }
      currentPage = 1; // 排序變更從第一頁開始
      renderGallery();
    });
  }

  // 🎲 隨機排序按鈕點擊 (隨機打亂當前分頁內容)
  const randomSortBtn = document.getElementById('randomSortBtn');
  if (randomSortBtn && !randomSortBtn.dataset.bound) {
    randomSortBtn.dataset.bound = 'true';
    randomSortBtn.addEventListener('click', () => {
      sortMode = 'RANDOM';
      currentPage = 1; // 隨機排序從第一頁開始
      let rawList = Array.isArray(currentPlantsList) ? currentPlantsList.filter(p => p && typeof p === 'object') : [];
      let filtered = [...rawList];
      if (activeCategory !== 'ALL') {
        if (activeCategory === 'PET_SAFE') {
          filtered = filtered.filter(p => p && p.petFriendly === true);
        } else {
          filtered = filtered.filter(p => p && String(p.family || '').includes(activeCategory));
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(p => {
          if (!p) return false;
          return String(p.name || '').toLowerCase().includes(q) ||
                 String(p.scientificName || '').toLowerCase().includes(q) ||
                 String(p.family || '').toLowerCase().includes(q);
        });
      }
      randomShuffledList = shuffleArray(filtered);
      renderGallery();
      const tabName = activeCategory === 'ALL' ? '全部花草' : activeCategory;
      if (typeof showToast === 'function') {
        showToast(`🎲 已成功將當前分頁「${tabName}」的 ${filtered.length} 筆內容隨機排序！`);
      }
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
      currentPage = 1; // 分類變更從第一頁開始
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
  if (!modalBackdrop || !plant) return;

  currentActivePlant = plant;

  // 支援 Deep Link：在瀏覽器網址列同步更新 ?plant=... (不刷新頁面)
  try {
    if (window.history && window.history.replaceState) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('plant', plant.name);
      window.history.replaceState(null, '', currentUrl.toString());
    }
  } catch (err) {
    console.debug('更新網址參數失敗:', err);
  }

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
  let cleanImageUrl = formatDriveImageUrl(rawUrl);

  // 填入資料
  const heroContainer = document.querySelector('.modal-header-hero');
  const heroImg = document.getElementById('modalHeroImg');
  const heroBgBlur = document.getElementById('modalHeroBgBlur');
  if (heroImg) heroImg.src = cleanImageUrl;
  if (heroBgBlur) heroBgBlur.src = cleanImageUrl;

  // 點擊主圖區域或主圖照片，均可查看無遮擋全螢幕大圖
  let activeHeroPhotoUrl = cleanImageUrl;
  let activeHeroPhotoCaption = plant.name;

  const handleHeroClick = (e) => {
    if (e && e.target && e.target.closest('.modal-nav-btn')) return;
    openFullScreenPhoto(activeHeroPhotoUrl || cleanImageUrl, activeHeroPhotoCaption || plant.name);
  };

  if (heroContainer) heroContainer.onclick = handleHeroClick;
  if (heroImg) heroImg.onclick = handleHeroClick;

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
  let rawDateStr = String(plant.dateAdded || '').trim();
  let rawLocNote = String(plant.locationNote || '').trim();

  // 格式化 2026年07月27日 為 20260727
  const dMatch = rawDateStr.match(/(\d{4})[年/-/\.]?\s*(\d{1,2})[月/-/\.]?\s*(\d{1,2})[日]?/);
  if (dMatch) {
    const y = dMatch[1];
    const m = dMatch[2].length === 1 ? '0' + dMatch[2] : dMatch[2];
    const d = dMatch[3].length === 1 ? '0' + dMatch[3] : dMatch[3];
    rawDateStr = y + m + d;
  }

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
      galleryContainer.innerHTML = galleryImages.map((img, idx) => {
        const itemUrl = formatDriveImageUrl(img.url);
        return `
          <div class="gallery-item-card" data-url="${itemUrl}" data-caption="${img.caption || `特徵照片 ${idx + 1}`}">
            <img src="${itemUrl}" alt="${img.caption || '特徵照片'}" class="gallery-item-img" loading="lazy">
            <div class="gallery-item-caption">${img.caption || `特徵照片 ${idx + 1}`}</div>
          </div>
        `;
      }).join('');

      // 點擊縮圖：將主圖 (Hero Photo) 放大替換顯示該特徵照片
      galleryContainer.querySelectorAll('.gallery-item-card').forEach(card => {
        card.addEventListener('click', () => {
          const targetUrl = card.getAttribute('data-url');
          const targetCap = card.getAttribute('data-caption');
          if (targetUrl) {
            activeHeroPhotoUrl = targetUrl;
            activeHeroPhotoCaption = targetCap || plant.name;
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

  // 關閉燈箱時還原乾淨的網址列（移除 ?plant 參數）
  try {
    if (window.history && window.history.replaceState) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('plant');
      currentUrl.searchParams.delete('id');
      window.history.replaceState(null, '', currentUrl.pathname + (currentUrl.search ? currentUrl.search : ''));
    }
  } catch (err) {
    console.debug('還原網址失敗:', err);
  }
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

function closeFullScreenPhoto() {
  const modal = document.getElementById('fullScreenPhotoModal');
  if (modal) modal.classList.remove('open');
}

/**
 * ⚡ 初次安裝/無資料使用者一鍵全量同步圖鑑
 */
async function triggerFullInitialSync() {
  const url = typeof getSavedGasUrlAsync === 'function' ? (await getSavedGasUrlAsync()) : getSavedGasUrl();
  if (!url) {
    if (typeof showToast === 'function') {
      showToast('💡 初次使用請先貼入您的 Google Apps Script API 網址！', 5000);
    }
    if (typeof openSettingsModal === 'function') {
      openSettingsModal();
    }
    return;
  }

  if (typeof showSyncProgressBanner === 'function') {
    showSyncProgressBanner('loading', '🔄 初次全量連線同步中..... 正在下載雲端 50+ 筆花草圖資與照片');
  }

  try {
    const syncRes = await fetchLatestDataFromGAS();
    if (syncRes && syncRes.plants) {
      saveStoredPlants(syncRes.plants);
      initGallery();
      if (typeof showSyncProgressBanner === 'function') {
        showSyncProgressBanner('success', `✅ 初次同步完成！成功載入 ${syncRes.plants.length} 筆完整花草圖鑑`, 3500);
      }
      if (typeof showToast === 'function') {
        showToast(`✅ 歡迎使用！已成功載入 ${syncRes.plants.length} 筆花草圖鑑。`, 5000);
      }
    }
  } catch(err) {
    if (typeof showSyncProgressBanner === 'function') {
      showSyncProgressBanner('error', `⚠️ 同步失敗：${err.message}`, 6000);
    }
    if (typeof openSettingsModal === 'function') {
      openSettingsModal();
    }
  }
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

/**
 * ⚡ 全域安全無障礙：點擊燈箱主圖區域任何地方放大照片
 */
window.openCurrentHeroPhotoFullScreen = function(e) {
  if (e && e.target && e.target.closest('.modal-nav-btn')) {
    return; // 避開上一筆/下一筆按鈕
  }
  if (e) e.stopPropagation();
  const heroImg = document.getElementById('modalHeroImg');
  const modalTitle = document.getElementById('modalTitle');
  if (heroImg && heroImg.src) {
    openFullScreenPhoto(heroImg.src, (modalTitle ? modalTitle.textContent : '花草大圖'));
  }
};

/**
 * 剪貼簿複製通用 Helper（支援現代 Clipboard API 與降級 execCommand）
 */
async function copyTextToClipboard(text) {
  if (!text) return false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard 失敗，嘗試 execCommand fallback:', err);
    }
  }
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    console.error('execCommand 複製失敗:', err);
    return false;
  }
}

/**
 * 產生植物專屬分享連結 URL
 */
function generatePlantShareUrl(plant) {
  if (!plant) return window.location.href;
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}?plant=${encodeURIComponent(plant.name || plant.id)}`;
}

/**
 * 複製花草詳細頁分享連結
 */
async function copyPlantShareLink(event) {
  if (event) event.stopPropagation();
  if (!currentActivePlant) {
    if (typeof showToast === 'function') {
      showToast('⚠️ 未能取得花草資料', 2000);
    }
    return;
  }

  const shareUrl = generatePlantShareUrl(currentActivePlant);
  const btn = document.getElementById('modalShareBtn');
  const success = await copyTextToClipboard(shareUrl);

  if (success) {
    if (btn) {
      btn.classList.add('copied');
      const fullTextEl = btn.querySelector('.share-text-full');
      const shortTextEl = btn.querySelector('.share-text-short');
      if (fullTextEl) fullTextEl.textContent = '已複製連結！';
      if (shortTextEl) shortTextEl.textContent = '已複製';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (fullTextEl) fullTextEl.textContent = '複製分享連結';
        if (shortTextEl) shortTextEl.textContent = '分享';
      }, 2000);
    }
    if (typeof showToast === 'function') {
      showToast(`🔗 已成功複製《${currentActivePlant.name}》專屬分享連結！`, 3500);
    }
  } else {
    prompt('請手動複製以下分享網址：', shareUrl);
  }
}

/**
 * 複製全螢幕相片分享連結
 */
async function copyFullScreenPhotoShareLink(event) {
  if (event) event.stopPropagation();
  if (!currentActivePlant) {
    if (typeof showToast === 'function') {
      showToast('⚠️ 未能取得花草資料', 2000);
    }
    return;
  }

  const shareUrl = generatePlantShareUrl(currentActivePlant);
  const btn = document.getElementById('fullScreenShareBtn');
  const success = await copyTextToClipboard(shareUrl);

  if (success) {
    if (btn) {
      btn.classList.add('copied');
      const fullTextEl = btn.querySelector('.share-text-full');
      const shortTextEl = btn.querySelector('.share-text-short');
      if (fullTextEl) fullTextEl.textContent = '已複製連結！';
      if (shortTextEl) shortTextEl.textContent = '已複製';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (fullTextEl) fullTextEl.textContent = '複製分享連結';
        if (shortTextEl) shortTextEl.textContent = '分享';
      }, 2000);
    }
    if (typeof showToast === 'function') {
      showToast(`🔗 已成功複製《${currentActivePlant.name}》專屬分享連結！`, 3500);
    }
  } else {
    prompt('請手動複製以下分享網址：', shareUrl);
  }
}

/**
 * 複製 App 首頁網址 (供 QR Code 彈窗使用)
 */
async function copyAppUrl(event) {
  if (event) event.stopPropagation();
  const appUrl = window.location.origin + window.location.pathname;
  const btn = document.getElementById('copyQrAppUrlBtn');
  const success = await copyTextToClipboard(appUrl);

  if (success) {
    if (btn) {
      const origHtml = btn.innerHTML;
      btn.innerHTML = '<span>✅ 已成功複製 App 網址！</span>';
      setTimeout(() => {
        btn.innerHTML = origHtml;
      }, 2000);
    }
    if (typeof showToast === 'function') {
      showToast('📋 已複製《捻花惹草》App 網址！', 3000);
    }
  } else {
    prompt('請手動複製以下 App 網址：', appUrl);
  }
}

/**
 * 檢查網址列是否有 ?plant=... 或 ?id=... 並自動彈出詳細燈箱
 */
function checkAndOpenUrlPlant() {
  try {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('plant') || params.get('id');
    if (!target || !target.trim()) return false;

    const query = decodeURIComponent(target).trim().toLowerCase();
    const list = Array.isArray(currentPlantsList) && currentPlantsList.length > 0
      ? currentPlantsList
      : (getStoredPlants() || DEFAULT_PLANT_DATA);

    const matched = list.find(p => {
      if (!p) return false;
      if (p.name && p.name.toLowerCase() === query) return true;
      if (p.id && String(p.id).toLowerCase() === query) return true;
      if (p.scientificName && p.scientificName.toLowerCase() === query) return true;
      if (p.aliases && Array.isArray(p.aliases) && p.aliases.some(a => String(a).toLowerCase() === query)) return true;
      return false;
    });

    if (matched) {
      // 若非圖鑑主畫面，切換回圖鑑
      const galleryNavBtn = document.querySelector('[data-target-view="viewGallery"]');
      if (galleryNavBtn && !galleryNavBtn.classList.contains('active')) {
        galleryNavBtn.click();
      }
      openPlantDetailModal(matched);
      return true;
    }
  } catch(e) {
    console.warn("解析網址植物參數失敗:", e);
  }
  return false;
}

window.openFullScreenPhoto = openFullScreenPhoto;
window.closeFullScreenPhoto = closeFullScreenPhoto;
window.copyPlantShareLink = copyPlantShareLink;
window.copyFullScreenPhotoShareLink = copyFullScreenPhotoShareLink;
window.copyAppUrl = copyAppUrl;
window.checkAndOpenUrlPlant = checkAndOpenUrlPlant;
