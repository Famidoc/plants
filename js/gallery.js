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
      if (typeof window.renderCompareCards === 'function') {
        window.renderCompareCards();
      }
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

/**
 * 全欄位全域深度搜尋比對函式
 * 涵蓋：植物名稱、學名、英文名、別名、科別、主圖地點、附圖圖集(caption/地點/註記)、
 * 形態特徵、養護資訊、用途、花期果期、參考資料等全欄位
 */
function matchPlantQuery(p, q) {
  if (!p || !q) return false;
  const lowerQ = q.toLowerCase().trim();
  if (!lowerQ) return true;

  // 1. 基本名稱與文字欄位
  if (String(p.name || '').toLowerCase().includes(lowerQ)) return true;
  if (String(p.scientificName || '').toLowerCase().includes(lowerQ)) return true;
  if (String(p.englishName || '').toLowerCase().includes(lowerQ)) return true;
  if (Array.isArray(p.aliases) && p.aliases.some(a => String(a || '').toLowerCase().includes(lowerQ))) return true;
  if (String(p.family || '').toLowerCase().includes(lowerQ)) return true;
  if (String(p.locationNote || '').toLowerCase().includes(lowerQ)) return true;
  if (String(p.dateAdded || '').toLowerCase().includes(lowerQ)) return true;
  if (String(p.bloomPeriod || '').toLowerCase().includes(lowerQ)) return true;
  if (String(p.fruitPeriod || '').toLowerCase().includes(lowerQ)) return true;
  if (String(p.sporePeriod || '').toLowerCase().includes(lowerQ)) return true;

  // 2. 用途 (uses)
  if (Array.isArray(p.uses) && p.uses.some(u => String(u || '').toLowerCase().includes(lowerQ))) return true;
  if (typeof p.uses === 'string' && p.uses.toLowerCase().includes(lowerQ)) return true;

  // 3. 形態特徵 (morphologyDetails)
  if (Array.isArray(p.morphologyDetails)) {
    if (p.morphologyDetails.some(m => String(m.label || '').toLowerCase().includes(lowerQ) || String(m.value || '').toLowerCase().includes(lowerQ))) return true;
  }

  // 4. 養護資訊 (careNotes)
  if (p.careNotes && typeof p.careNotes === 'object') {
    if (Object.values(p.careNotes).some(val => String(val || '').toLowerCase().includes(lowerQ))) return true;
  }

  // 5. 📷 附圖圖集 (galleryImages) - 照片圖說/拍攝地點/日期/特徵註解
  if (Array.isArray(p.galleryImages)) {
    if (p.galleryImages.some(img => {
      if (!img) return false;
      const caption = String(img.caption || '').toLowerCase();
      const title = String(img.title || '').toLowerCase();
      const alt = String(img.alt || '').toLowerCase();
      return caption.includes(lowerQ) || title.includes(lowerQ) || alt.includes(lowerQ);
    })) return true;
  }

  // 6. 參考資料 (references)
  if (Array.isArray(p.references)) {
    if (p.references.some(r => String(r.title || '').toLowerCase().includes(lowerQ) || String(r.url || '').toLowerCase().includes(lowerQ))) return true;
  }

  return false;
}

  // 2. 進行搜尋過濾 (全域深度搜尋)
  let filtered = [...rawList];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => matchPlantQuery(p, q));
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
        filtered = filtered.filter(p => matchPlantQuery(p, q));
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

  // 點擊背景空白處關閉燈箱
  const plantBackdrop = document.getElementById('plantModalBackdrop');
  if (plantBackdrop && !plantBackdrop.dataset.clickBound) {
    plantBackdrop.dataset.clickBound = 'true';
    plantBackdrop.addEventListener('click', (e) => {
      if (e.target === plantBackdrop) closePlantDetailModal();
    });
  }

  const posterBackdrop = document.getElementById('posterModalBackdrop');
  if (posterBackdrop && !posterBackdrop.dataset.clickBound) {
    posterBackdrop.dataset.clickBound = 'true';
    posterBackdrop.addEventListener('click', (e) => {
      if (e.target === posterBackdrop) closePlantPosterModal();
    });
  }

  // 鍵盤 ← / → / Esc 快速導覽燈箱
  if (!window.modalKeyNavBound) {
    window.modalKeyNavBound = true;
    window.addEventListener('keydown', (e) => {
      const posterModal = document.getElementById('posterModalBackdrop');
      if (posterModal && (posterModal.classList.contains('open') || posterModal.classList.contains('active'))) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closePlantPosterModal();
          return;
        }
      }

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
      const curNum = currentDetailIndex + 1;
      const totalNum = currentlyRenderedList.length;
      indexBadge.innerHTML = `<span class="badge-text-full">第 ${curNum} / ${totalNum} 筆</span><span class="badge-text-short">${curNum}/${totalNum}</span>`;
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

  // 輔助函式：將 caption 結構化為精美的雙行 HTML
  function renderCaptionHtml(rawCap, fallbackIdx) {
    let cleanCap = String(rawCap || '').trim();
    // 移除可能殘留的章節性大標題
    cleanCap = cleanCap.replace(/^[\(\[\【]?\s*(?:其他附圖|植物附圖|附圖|特徵照片|更多附圖|照片記錄|植物特徵)\s*[\)\]\】]?\s*/gi, '').trim();
    if (!cleanCap) cleanCap = `特徵照片 ${fallbackIdx + 1}`;

    // 檢查是否符合 "特徵名稱 (時間@地點)" 結構
    const match = cleanCap.match(/^(.+?)\s*(\([^\)]+\))$/);
    if (match) {
      const title = match[1].trim();
      const sub = match[2].trim();
      return `<span class="gallery-caption-title">${title}</span><span class="gallery-caption-sub">${sub}</span>`;
    }
    // 若只有時間地點括號
    if (cleanCap.startsWith('(') && cleanCap.endsWith(')')) {
      return `<span class="gallery-caption-title" style="font-size:0.75rem; font-weight:600;">${cleanCap}</span>`;
    }
    return `<span class="gallery-caption-title">${cleanCap}</span>`;
  }

  if (galleryContainer) {
    if (galleryImages.length > 0) {
      galleryContainer.innerHTML = galleryImages.map((img, idx) => {
        const itemUrl = formatDriveImageUrl(img.url);
        let rawCap = String(img.caption || '').trim();
        rawCap = rawCap.replace(/^[\(\[\【]?\s*(?:其他附圖|植物附圖|附圖|特徵照片|更多附圖|照片記錄|植物特徵)\s*[\)\]\】]?\s*/gi, '').trim();
        const captionText = rawCap || `特徵照片 ${idx + 1}`;
        const captionHtml = renderCaptionHtml(captionText, idx);
        return `
          <div class="gallery-item-card" data-url="${itemUrl}" data-caption="${captionText}" title="${captionText}">
            <img src="${itemUrl}" alt="${captionText}" class="gallery-item-img" loading="lazy">
            <div class="gallery-item-caption">${captionHtml}</div>
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

  // 重置預設啟用「📷 植物圖集」Tab (除非是點擊 [上一筆/下一筆] 連續瀏覽)
  if (!modalBackdrop.classList.contains('open')) {
    switchModalTab('tab-gallery');
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
      : (activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'tab-gallery');
    
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

  let timer1 = null;
  let timer2 = null;

  if (typeof showSyncProgressBanner === 'function') {
    showSyncProgressBanner('loading', '🌱 初次全量載入中... 正在為您下載 240+ 筆完整圖鑑與知識庫（約需 10~15 秒，請耐心稍候；完成後即可離線秒開！）');
    timer1 = setTimeout(() => {
      showSyncProgressBanner('loading', '🌿 雲端 240+ 筆圖鑑資料龐大，正在全力下載中，請勿關閉網頁，即將完成...');
    }, 6000);
    timer2 = setTimeout(() => {
      showSyncProgressBanner('loading', '⏳ 正在解析植物形態特徵與高清圖庫，就快好了，感謝您的耐心等候...');
    }, 14000);
  }

  try {
    const syncRes = await fetchLatestDataFromGAS();
    if (syncRes && syncRes.plants) {
      saveStoredPlants(syncRes.plants);
      if (syncRes.comparisons && Array.isArray(syncRes.comparisons) && typeof saveStoredComparisons === 'function') {
        saveStoredComparisons(syncRes.comparisons);
      }
      initGallery();
      if (typeof renderCompareCards === 'function') renderCompareCards();

      if (typeof showSyncProgressBanner === 'function') {
        showSyncProgressBanner('success', `✅ 初次載入完成！成功載入 ${syncRes.plants.length} 筆圖鑑與 ${syncRes.comparisons ? syncRes.comparisons.length : 0} 篇鑑別，之後開啟皆可秒開！`, 5000);
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
  } finally {
    if (timer1) clearTimeout(timer1);
    if (timer2) clearTimeout(timer2);
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
      const iconEl = btn.querySelector('.share-icon');
      const fullTextEl = btn.querySelector('.share-text-full');
      const shortTextEl = btn.querySelector('.share-text-short');
      const origIcon = iconEl ? iconEl.textContent : '🔗';
      if (iconEl) iconEl.textContent = '✅';
      if (fullTextEl) fullTextEl.textContent = '已複製連結！';
      if (shortTextEl) shortTextEl.textContent = '已複製';
      setTimeout(() => {
        btn.classList.remove('copied');
        if (iconEl) iconEl.textContent = origIcon;
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
async function checkAndOpenUrlPlant() {
  try {
    const params = new URLSearchParams(window.location.search);
    const target = params.get('plant') || params.get('id');
    if (!target || !target.trim()) return false;

    const query = decodeURIComponent(target).trim().toLowerCase();
    const list = Array.isArray(currentPlantsList) && currentPlantsList.length > 0
      ? currentPlantsList
      : (getStoredPlants() || DEFAULT_PLANT_DATA);

    const findMatch = (arr) => {
      return (arr || []).find(p => {
        if (!p) return false;
        if (p.name && p.name.toLowerCase() === query) return true;
        if (p.id && String(p.id).toLowerCase() === query) return true;
        if (p.scientificName && p.scientificName.toLowerCase() === query) return true;
        if (p.aliases && Array.isArray(p.aliases) && p.aliases.some(a => String(a).toLowerCase() === query)) return true;
        return false;
      });
    };

    let matched = findMatch(list);

    if (matched) {
      // 若非圖鑑主畫面，切換回圖鑑
      const galleryNavBtn = document.querySelector('[data-target-view="viewGallery"]');
      if (galleryNavBtn && !galleryNavBtn.classList.contains('active')) {
        galleryNavBtn.click();
      }
      openPlantDetailModal(matched);
      return true;
    } else {
      // 若本機尚未收錄該筆花草（可能剛於雲端新增），自動觸發一次雲端連線同步
      if (!window._urlPlantSyncAttempted && typeof fetchLatestDataFromGAS === 'function') {
        window._urlPlantSyncAttempted = true;
        if (typeof showToast === 'function') {
          showToast(`🌿 正在從雲端載入《${decodeURIComponent(target)}》最新圖資...`, 4000);
        }
        try {
          const syncRes = await fetchLatestDataFromGAS();
          if (syncRes && syncRes.plants) {
            currentPlantsList = syncRes.plants;
            renderGallery();
            const newMatched = findMatch(currentPlantsList);
            if (newMatched) {
              openPlantDetailModal(newMatched);
              return true;
            }
          }
        } catch(e) {
          console.warn('自動同步花草失敗:', e);
        }
      }
    }
  } catch(e) {
    console.warn("解析網址植物參數失敗:", e);
  }
  return false;
}

/**
 * 跨域圖片加載 Helper（含 CORS 與 Weserv 代理備援）
 */
function loadImageWithCors(url) {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string') return resolve(null);
    const cleanUrl = url.trim();
    if (!cleanUrl) return resolve(null);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // 嘗試透過 weserv 圖片代理跨域
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}&w=1000&output=jpg`;
      const pImg = new Image();
      pImg.crossOrigin = 'anonymous';
      pImg.onload = () => resolve(pImg);
      pImg.onerror = () => resolve(null);
      pImg.src = proxyUrl;
    };
    img.src = cleanUrl;
  });
}

/**
 * 載入專屬 QR Code 圖片
 */
function loadQrCodeImage(shareUrl) {
  return new Promise((resolve) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shareUrl)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(qrUrl)}`;
      const pImg = new Image();
      pImg.crossOrigin = 'anonymous';
      pImg.onload = () => resolve(pImg);
      pImg.onerror = () => resolve(null);
      pImg.src = proxyUrl;
    };
    img.src = qrUrl;
  });
}

/**
 * Canvas 繪製圓角矩形 Helper
 */
function drawCanvasRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Canvas 繪製自適應折行文字 Helper
 */
function drawCanvasWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  if (!text) return y;
  const words = text.split('');
  let line = '';
  let lineCount = 0;
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n];
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lineCount++;
      if (lineCount >= maxLines) {
        ctx.fillText(line.slice(0, -1) + '...', x, currentY);
        return currentY + lineHeight;
      }
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

/**
 * 輔助繪製海報膠囊 Badge
 */
function drawPosterBadge(ctx, x, y, w, h, icon, text, bg, color) {
  ctx.save();
  ctx.fillStyle = bg;
  drawCanvasRoundedRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.font = 'bold 20px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'center';
  const fullLabel = icon ? `${icon} ${text}` : text;
  ctx.fillText(fullLabel, x + w / 2, y + h / 2 + 7);
  ctx.restore();
}

/**
 * 繪製植物名片海報至 Canvas
 */
async function generatePlantPosterCanvas(plant) {
  const canvas = document.getElementById('plantPosterCanvas');
  if (!canvas || !plant) return null;

  const W = 1080;
  const H = 1440;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 1. 底色優雅漸層 (自然米白與薄荷綠感)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#fbfcf9');
  bgGrad.addColorStop(0.5, '#f5f8f4');
  bgGrad.addColorStop(1, '#ebf2e9');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // 2. 裝飾雙邊框與細節
  ctx.strokeStyle = 'rgba(27, 59, 43, 0.16)';
  ctx.lineWidth = 4;
  drawCanvasRoundedRect(ctx, 32, 32, W - 64, H - 64, 32);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(27, 59, 43, 0.08)';
  ctx.lineWidth = 1.5;
  drawCanvasRoundedRect(ctx, 44, 44, W - 88, H - 88, 24);
  ctx.stroke();

  // 3. 頂部 Bar (品牌與科別)
  ctx.fillStyle = '#1b3b2b';
  ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🪴 捻花惹草 • 花草圖鑑典藏', 64, 88);

  ctx.textAlign = 'right';
  ctx.font = '500 22px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#496b58';
  const familyText = plant.family ? (plant.family.split('/')[0] || plant.family).trim() : '觀賞植物';
  ctx.fillText(`🌿 ${familyText}`, W - 64, 88);

  // 頂部分隔細線
  ctx.strokeStyle = 'rgba(27, 59, 43, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 108);
  ctx.lineTo(W - 64, 108);
  ctx.stroke();

  // 4. 植物大圖區 (952 x 620 px)
  const imgX = 64;
  const imgY = 126;
  const imgW = W - 128;
  const imgH = 620;
  const imgR = 24;

  // 陰影
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#ffffff';
  drawCanvasRoundedRect(ctx, imgX, imgY, imgW, imgH, imgR);
  ctx.fill();
  ctx.restore();

  // 載入主圖
  const rawImgUrl = formatDriveImageUrl(plant.imageUrl);
  const plantImg = await loadImageWithCors(rawImgUrl);

  ctx.save();
  drawCanvasRoundedRect(ctx, imgX, imgY, imgW, imgH, imgR);
  ctx.clip();

  if (plantImg && plantImg.width > 0) {
    // 居中滿版裁切繪製 (Cover)
    const aspect = plantImg.width / plantImg.height;
    const targetAspect = imgW / imgH;
    let sW, sH, sX, sY;
    if (aspect > targetAspect) {
      sH = plantImg.height;
      sW = plantImg.height * targetAspect;
      sX = (plantImg.width - sW) / 2;
      sY = 0;
    } else {
      sW = plantImg.width;
      sH = plantImg.width / targetAspect;
      sX = 0;
      sY = (plantImg.height - sH) / 2;
    }
    ctx.drawImage(plantImg, sX, sY, sW, sH, imgX, imgY, imgW, imgH);
  } else {
    // 無圖/跨域失敗備援圖示
    const noImgGrad = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY + imgH);
    noImgGrad.addColorStop(0, '#2e5b3f');
    noImgGrad.addColorStop(1, '#1b3b2b');
    ctx.fillStyle = noImgGrad;
    ctx.fillRect(imgX, imgY, imgW, imgH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '72px sans-serif';
    ctx.fillText('🪴', imgX + imgW / 2, imgY + imgH / 2 - 20);
    ctx.font = 'bold 36px "Noto Sans TC", sans-serif';
    ctx.fillText(plant.name, imgX + imgW / 2, imgY + imgH / 2 + 50);
  }
  ctx.restore();

  // 5. 植物名稱與學名區塊
  let textY = 798;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#11261c';
  ctx.font = 'bold 50px "Noto Sans TC", sans-serif';
  ctx.fillText(plant.name, 64, textY);

  // 英文名稱 (若有)
  if (plant.englishName && plant.englishName.trim()) {
    ctx.font = '600 24px "Outfit", sans-serif';
    ctx.fillStyle = '#557a66';
    ctx.textAlign = 'right';
    ctx.fillText(plant.englishName, W - 64, textY - 8);
  }

  // 學名 (Italic)
  textY += 46;
  ctx.textAlign = 'left';
  ctx.font = 'italic 600 26px "Outfit", "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#2b6343';
  const sciNameText = plant.scientificName ? plant.scientificName : '–';
  ctx.fillText(sciNameText, 64, textY);

  // 別名 (若有)
  if (plant.aliases && Array.isArray(plant.aliases) && plant.aliases.length > 0) {
    textY += 36;
    ctx.font = '400 22px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#5c7265';
    const aliasesStr = `別名：${plant.aliases.slice(0, 5).join('、')}`;
    ctx.fillText(aliasesStr, 64, textY);
  }

  // 6. 三大照護關鍵指標膠囊 (Pill Badges)
  const badgeY = 926;
  const badgeH = 54;
  const badgeW = (W - 128 - 32) / 3;

  // Badge 1: ☀️ 日照
  const lightStr = (plant.careNotes?.light || '日照適中').split(/[,，。]/)[0] || '半日照至全日照';
  drawPosterBadge(ctx, 64, badgeY, badgeW, badgeH, '☀️', lightStr.slice(0, 10), '#e8f4ec', '#1b4d2e');

  // Badge 2: 💧 水分
  const waterStr = (plant.careNotes?.humidity || '水分適中').split(/[,，。]/)[0] || '保持介質濕潤';
  drawPosterBadge(ctx, 64 + badgeW + 16, badgeY, badgeW, badgeH, '💧', waterStr.slice(0, 10), '#e6f3f8', '#1a5276');

  // Badge 3: 🐾 寵物安全
  let petLabel = '🐾 寵物友善';
  let petBg = '#e8f5e9';
  let petColor = '#2e7d32';
  if (plant.petFriendly === false) {
    petLabel = '⚠️ 具毒性/請留意';
    petBg = '#fff3e0';
    petColor = '#d35400';
  } else if (plant.petFriendly === undefined || plant.petFriendly === null) {
    petLabel = 'ℹ️ 毒性未明';
    petBg = '#f5f5f5';
    petColor = '#616161';
  }
  drawPosterBadge(ctx, 64 + (badgeW + 16) * 2, badgeY, badgeW, badgeH, '', petLabel, petBg, petColor);

  // 7. 特色摘錄卡片 (Highlight Box)
  const boxX = 64;
  const boxY = 1006;
  const boxW = W - 128;
  const boxH = 200;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  drawCanvasRoundedRect(ctx, boxX, boxY, boxW, boxH, 20);
  ctx.fill();
  ctx.strokeStyle = 'rgba(27, 59, 43, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // 摘錄標題
  ctx.fillStyle = '#1b3b2b';
  ctx.font = 'bold 22px "Noto Sans TC", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('📌 形態特色與照護叮嚀', boxX + 24, boxY + 40);

  // 抓取文字內容
  let snippet = '';
  if (plant.morphologyDetails && Array.isArray(plant.morphologyDetails) && plant.morphologyDetails.length > 0) {
    snippet = plant.morphologyDetails.map(m => `${m.label}：${m.value}`).join(' ');
  } else if (plant.careNotes) {
    snippet = `${plant.careNotes.light || ''} ${plant.careNotes.humidity || ''} ${plant.careNotes.waterQuality || ''}`;
  }
  if (!snippet || snippet.length < 5) snippet = '適合居家擺設與花園種植，四季呈現不同觀賞價值。';

  ctx.fillStyle = '#4a5b51';
  ctx.font = '400 21px/1.6 "Noto Sans TC", sans-serif';
  drawCanvasWrappedText(ctx, snippet, boxX + 24, boxY + 76, boxW - 48, 34, 3);

  // 8. 底部品牌與 QR Code Bar
  const bottomY = 1236;
  const shareUrl = generatePlantShareUrl(plant);
  const qrImg = await loadQrCodeImage(shareUrl);

  // 左側品牌與引導
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1b3b2b';
  ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
  ctx.fillText('🌿 捻花惹草 | 綠意生活與花草知識庫', 64, bottomY + 30);

  ctx.fillStyle = '#5c7265';
  ctx.font = '500 20px "Noto Sans TC", sans-serif';
  ctx.fillText('掃描右側 QR Code 探索圖鑑、相似鑑別與知識測驗', 64, bottomY + 66);

  ctx.font = '500 18px "Outfit", "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#7a9686';
  ctx.fillText('@2026 by Famidoc Chang & Antigravity', 64, bottomY + 102);

  // 右側 QR Code
  const qrX = W - 64 - 130;
  const qrY = bottomY - 6;
  const qrSize = 130;

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  drawCanvasRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 16);
  ctx.fill();
  ctx.restore();

  if (qrImg && qrImg.width > 0) {
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

  return canvas;
}

/**
 * 開啟花草名片海報 Modal 並自動繪製海報
 */
async function openPlantPosterModal(event) {
  if (event) event.stopPropagation();
  if (!currentActivePlant) {
    if (typeof showToast === 'function') {
      showToast('⚠️ 未能取得花草資料', 2000);
    }
    return;
  }

  const backdrop = document.getElementById('posterModalBackdrop');
  const spinner = document.getElementById('posterLoadingSpinner');
  const canvas = document.getElementById('plantPosterCanvas');
  const imgPreview = document.getElementById('plantPosterImg');

  if (backdrop) {
    backdrop.classList.add('open');
    backdrop.classList.add('active');
  }
  if (spinner) spinner.style.display = 'flex';
  if (imgPreview) imgPreview.style.display = 'none';

  try {
    const renderedCanvas = await generatePlantPosterCanvas(currentActivePlant);
    if (renderedCanvas) {
      const dataUrl = renderedCanvas.toDataURL('image/png');
      if (imgPreview) {
        imgPreview.src = dataUrl;
        imgPreview.style.display = 'block';
      }
    }
  } catch(e) {
    console.error('產生花草名片海報失敗:', e);
    if (typeof showToast === 'function') {
      showToast('⚠️ 產生名片圖卡失敗，請稍後重試', 3000);
    }
  } finally {
    if (spinner) spinner.style.display = 'none';
  }
}

/**
 * 關閉花草名片海報 Modal
 */
function closePlantPosterModal() {
  const backdrop = document.getElementById('posterModalBackdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
    backdrop.classList.remove('active');
  }
}

/**
 * 下載花草名片 PNG 圖檔
 */
function downloadPosterImage() {
  const canvas = document.getElementById('plantPosterCanvas');
  if (!canvas || !currentActivePlant) return;

  try {
    const link = document.createElement('a');
    const plantName = currentActivePlant.name || '花草';
    link.download = `捻花惹草_${plantName}_植物名片.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === 'function') {
      showToast(`📥 已開始下載《${plantName}》名片圖卡！`, 3500);
    }
  } catch(e) {
    console.error('下載海報失敗:', e);
    if (typeof showToast === 'function') {
      showToast('⚠️ 下載圖卡失敗，請長按圖片手動儲存', 3500);
    }
  }
}

/**
 * 原生社群分享海報圖片 (調用 Web Share API)
 */
async function sharePosterImage() {
  const canvas = document.getElementById('plantPosterCanvas');
  if (!canvas || !currentActivePlant) return;

  const plantName = currentActivePlant.name || '花草';
  const shareUrl = generatePlantShareUrl(currentActivePlant);

  try {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        downloadPosterImage();
        return;
      }
      const file = new File([blob], `捻花惹草_${plantName}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `🌿 捻花惹草 - ${plantName}`,
            text: `分享【${plantName}】花草植物名片！點擊連結查看完整圖鑑與照護要點：`,
            url: shareUrl,
            files: [file]
          });
          return;
        } catch(shareErr) {
          if (shareErr.name !== 'AbortError') {
            console.warn('原生檔案分享失敗，降級為純連結分享:', shareErr);
          } else {
            return; // 使用者主動取消
          }
        }
      }

      // 若不支援檔案分享，嘗試純文字與網址分享
      if (navigator.share) {
        try {
          await navigator.share({
            title: `🌿 捻花惹草 - ${plantName}`,
            text: `分享【${plantName}】花草植物名片！點擊連結查看完整圖鑑：`,
            url: shareUrl
          });
          return;
        } catch(e) {}
      }

      // 降級為下載圖片並複製連結
      downloadPosterImage();
      await copyTextToClipboard(shareUrl);
      if (typeof showToast === 'function') {
        showToast('📥 圖卡已下載，且分享網址已複製到剪貼簿！', 3500);
      }
    }, 'image/png');
  } catch(e) {
    downloadPosterImage();
  }
}

/**
 * 複製名片海報圖片至剪貼簿
 */
async function copyPosterImage() {
  const canvas = document.getElementById('plantPosterCanvas');
  if (!canvas || !currentActivePlant) return;

  try {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        downloadPosterImage();
        return;
      }
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          if (typeof showToast === 'function') {
            showToast(`📋 已將《${currentActivePlant.name}》名片圖卡複製到剪貼簿！`, 3500);
          }
          return;
        } catch(clipErr) {
          console.warn('ClipboardItem 圖片寫入失敗:', clipErr);
        }
      }
      // 降級為直接下載
      downloadPosterImage();
    }, 'image/png');
  } catch(e) {
    downloadPosterImage();
  }
}

window.openFullScreenPhoto = openFullScreenPhoto;
window.closeFullScreenPhoto = closeFullScreenPhoto;
window.copyTextToClipboard = copyTextToClipboard;
window.copyPlantShareLink = copyPlantShareLink;
window.copyFullScreenPhotoShareLink = copyFullScreenPhotoShareLink;
window.copyAppUrl = copyAppUrl;
window.checkAndOpenUrlPlant = checkAndOpenUrlPlant;
window.openPlantPosterModal = openPlantPosterModal;
window.closePlantPosterModal = closePlantPosterModal;
window.downloadPosterImage = downloadPosterImage;
window.sharePosterImage = sharePosterImage;
window.copyPosterImage = copyPosterImage;
window.generatePlantPosterCanvas = generatePlantPosterCanvas;
