/**
 * ==========================================================================
 * 「相似鑑別」前端互動模組 (Similar Species Comparison Module)
 * ==========================================================================
 */

(function() {
  let allComparisons = [];
  let currentFilterText = '';
  let currentCategory = 'ALL';
  let isReverseSort = false; // 預設依新增時間排序 (最新在先)

  /**
   * 初始化相似鑑別模組
   */
  async function initCompareModule() {
    if (typeof window.loadStoredPlantsAsync === 'function') {
      try {
        await window.loadStoredPlantsAsync();
      } catch (e) {}
    }
    allComparisons = await window.loadStoredComparisonsAsync();
    setupCompareControls();
    renderCompareCards();
  }

  /**
   * 智慧取得物種真實照片（優先從已儲存的圖鑑資料庫比對）
   */
  function findSpeciesPhoto(speciesName, fallbackUrl) {
    if (!speciesName) return fallbackUrl || '';
    const cleanName = speciesName.trim().replace(/\s*\(.*?\)/g, '');
    
    // 1. 取得圖鑑資料庫 (包含已從 IndexedDB 增量同步之所有植物)
    const plants = typeof window.getStoredPlants === 'function' ? window.getStoredPlants() : [];
    
    // (1) 先找完全相等的名稱
    let matched = plants.find(p => p && (p.name || '').trim() === cleanName);
    
    // (2) 若無，找去除「- 植物資料」或副標題後相等的名稱
    if (!matched) {
      matched = plants.find(p => {
        if (!p || !p.name) return false;
        const pClean = p.name.replace(/[-_–\s]*(植物資料|資料|圖鑑).*/g, '').trim();
        return pClean === cleanName || p.name.trim() === cleanName || p.name.includes(cleanName) || cleanName.includes(pClean);
      });
    }

    // (3) 若無，再找別名中有相等的項目
    if (!matched) {
      matched = plants.find(p => p && Array.isArray(p.aliases) && p.aliases.some(a => {
        const aClean = (a || '').replace(/[-_–\s]*(植物資料|資料|圖鑑).*/g, '').trim();
        return aClean === cleanName || (a || '').includes(cleanName) || cleanName.includes(aClean);
      }));
    }

    if (matched) {
      if (matched.imageUrl && matched.imageUrl.startsWith('http')) {
        return matched.imageUrl;
      }
      if (Array.isArray(matched.images) && matched.images.length > 0) {
        const firstImg = matched.images[0];
        const imgUrl = typeof firstImg === 'string' ? firstImg : (firstImg.url || firstImg.thumbnailUrl);
        if (imgUrl && imgUrl.startsWith('http')) return imgUrl;
      }
    }

    // 2. 使用傳入的 fallbackUrl（僅當非假圖庫時）
    if (fallbackUrl && fallbackUrl.startsWith('http') && !fallbackUrl.includes('images.unsplash.com')) {
      return fallbackUrl;
    }

    // 3. 官方 Google Drive 確證無誤的真實照片庫
    const KNOWN_PHOTOS = {
      '紫薇': 'https://drive.google.com/thumbnail?id=1R-vb55hXNXe0yrGYn1N1PzQDgYlutVJw&sz=w1000',
      '九芎': 'https://drive.google.com/thumbnail?id=1VHAphc4Scup2oqCujS24ihZBtIH4JWNF&sz=w1000',
      '烏蘞莓': 'https://drive.google.com/thumbnail?id=1nl_V8Msgx-xGtvit9UxTwqsEaYFkVboB&sz=w1000'
    };

    if (KNOWN_PHOTOS[cleanName]) {
      return KNOWN_PHOTOS[cleanName];
    }

    // 🛡️ 嚴謹原則：無真實圖資時回傳空字串，前端顯示「尚無圖資」佔位標籤，絕不塞假圖誤導！
    return '';
  }

  /**
   * 設置互動事件監聽器
   */
  function setupCompareControls() {
    const searchInput = document.getElementById('compareSearchInput');
    const categoryChips = document.querySelectorAll('.compare-category-chip');
    const sortBtn = document.getElementById('compareSortBtn');
    const modalBackdrop = document.getElementById('compareModalBackdrop');
    const closeBtn1 = document.getElementById('closeCompareModalBtn');
    const closeBtn2 = document.getElementById('compareModalCloseBtn');

    // 搜尋輸入監聽
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        currentFilterText = e.target.value.trim().toLowerCase();
        renderCompareCards();
      });
    }

    // 科別標籤點擊
    categoryChips.forEach(chip => {
      chip.addEventListener('click', () => {
        categoryChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentCategory = chip.getAttribute('data-family') || 'ALL';
        renderCompareCards();
      });
    });

    // 排序切換
    if (sortBtn) {
      sortBtn.addEventListener('click', () => {
        isReverseSort = !isReverseSort;
        sortBtn.textContent = isReverseSort ? '⬆ 依時間正向排序' : '⬇ 依時間逆向排序';
        renderCompareCards();
      });
    }

    // 關閉燈箱（綁定所有關閉按鈕）
    [closeBtn1, closeBtn2].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeCompareModal();
        });
      }
    });

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
          closeCompareModal();
        }
      });
    }

    // ESC 鍵關閉燈箱
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop && (modalBackdrop.classList.contains('open') || modalBackdrop.classList.contains('active'))) {
        closeCompareModal();
      }
    });
  }

  /**
   * 渲染鑑別圖卡網格
   */
  function renderCompareCards() {
    const container = document.getElementById('compareGridContainer');
    const countBadge = document.getElementById('compareCountBadge');
    if (!container) return;

    allComparisons = window.getStoredComparisons() || [];

    // 1. 篩選 (搜尋字串 + 科別)
    let filtered = allComparisons.filter(item => {
      if (currentCategory !== 'ALL') {
        const itemFam = (item.family || '').toLowerCase();
        if (!itemFam.includes(currentCategory.toLowerCase())) return false;
      }
      if (currentFilterText) {
        const titleMatch = (item.title || '').toLowerCase().includes(currentFilterText);
        const speciesMatch = (item.species || []).some(s => s.toLowerCase().includes(currentFilterText));
        const familyMatch = (item.family || '').toLowerCase().includes(currentFilterText);
        const mnemonicMatch = (item.mnemonic || '').toLowerCase().includes(currentFilterText);
        let tableMatch = false;
        if (item.comparisonTable && item.comparisonTable.rows) {
          tableMatch = item.comparisonTable.rows.some(r => 
            (r.feature || '').toLowerCase().includes(currentFilterText) ||
            (r.values || []).some(v => v.toLowerCase().includes(currentFilterText))
          );
        }
        return titleMatch || speciesMatch || familyMatch || mnemonicMatch || tableMatch;
      }
      return true;
    });

    // 2. 排序
    filtered.sort((a, b) => {
      const dateA = a.dateAdded || '';
      const dateB = b.dateAdded || '';
      return isReverseSort ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });

    if (countBadge) countBadge.textContent = `共 ${filtered.length} 組相似鑑別`;

    if (filtered.length === 0) {
      container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-light); background: rgba(255,255,255,0.06); border-radius: var(--radius-lg); backdrop-filter: blur(8px);"><h3>未找到符合條件的相似鑑別資料</h3></div>`;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const speciesArr = item.species || [];
      const images = item.galleryImages || [];
      
      let heroImagesHtml = '';
      if (speciesArr.length >= 3) {
        const imgList = speciesArr.slice(0, 3).map((sp, idx) => {
          const spImg = findSpeciesPhoto(sp, images[idx] ? images[idx].url : '');
          if (spImg) {
            return `
              <div class="compare-hero-img-wrap" style="flex: 1;">
                <img src="${escapeHtml(spImg)}" alt="${escapeHtml(sp)}" loading="lazy">
                <span class="compare-hero-label" style="font-size: 0.72rem; padding: 2px 6px;">${escapeHtml(sp)}</span>
              </div>
            `;
          } else {
            return `
              <div class="compare-hero-img-wrap compare-hero-no-img" style="flex: 1;">
                <div class="compare-no-img-box">
                  <span class="no-img-icon">🪴</span>
                  <span class="no-img-text">尚無照片</span>
                </div>
                <span class="compare-hero-label" style="font-size: 0.72rem; padding: 2px 6px;">${escapeHtml(sp)}</span>
              </div>
            `;
          }
        });
        heroImagesHtml = imgList.join('<div class="compare-vs-badge" style="width: 28px; height: 28px; font-size: 0.75rem; position: static; transform: none; margin: 0 -14px; z-index: 4; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">VS</div>');
      } else {
        const leftLabel = speciesArr[0] || '物種 A';
        const rightLabel = speciesArr[1] || '物種 B';
        const leftImg = findSpeciesPhoto(leftLabel, images[0] ? images[0].url : '');
        const rightImg = findSpeciesPhoto(rightLabel, images[1] ? images[1].url : '');

        const leftHtml = leftImg ? `
          <div class="compare-hero-img-wrap">
            <img src="${escapeHtml(leftImg)}" alt="${escapeHtml(leftLabel)}" loading="lazy">
            <span class="compare-hero-label">${escapeHtml(leftLabel)}</span>
          </div>
        ` : `
          <div class="compare-hero-img-wrap compare-hero-no-img">
            <div class="compare-no-img-box">
              <span class="no-img-icon">🪴</span>
              <span class="no-img-text">尚無照片</span>
            </div>
            <span class="compare-hero-label">${escapeHtml(leftLabel)}</span>
          </div>
        `;

        const rightHtml = rightImg ? `
          <div class="compare-hero-img-wrap">
            <img src="${escapeHtml(rightImg)}" alt="${escapeHtml(rightLabel)}" loading="lazy">
            <span class="compare-hero-label">${escapeHtml(rightLabel)}</span>
          </div>
        ` : `
          <div class="compare-hero-img-wrap compare-hero-no-img">
            <div class="compare-no-img-box">
              <span class="no-img-icon">🪴</span>
              <span class="no-img-text">尚無照片</span>
            </div>
            <span class="compare-hero-label">${escapeHtml(rightLabel)}</span>
          </div>
        `;

        heroImagesHtml = `${leftHtml}<div class="compare-vs-badge">VS</div>${rightHtml}`;
      }

      let featureTagsHtml = item.comparisonTable?.rows?.slice(0, 4).map(r => `<span class="compare-feature-chip">📌 ${escapeHtml(r.feature)}</span>`).join('') || '';

      return `
        <article class="compare-card" data-compare-id="${escapeHtml(item.id)}" onclick="window.openCompareModal('${escapeHtml(item.id)}')">
          <div class="compare-hero-banner" style="display: flex; align-items: center; position: relative;">${heroImagesHtml}</div>
          <div class="compare-card-body">
            <div class="compare-card-header"><h3 class="compare-card-title">${escapeHtml(item.title)}</h3></div>
            <div class="compare-card-meta">
              <span class="compare-family-badge">🌿 ${escapeHtml(item.family || '觀賞植物')}</span>
              <span class="compare-confusion-badge">⚡ 混淆度 ${escapeHtml(item.confusionLevel || '★★★★☆')}</span>
            </div>
            ${item.mnemonic ? `
              <div class="compare-mnemonic-box">
                <span class="compare-mnemonic-icon">💡</span>
                <p class="compare-mnemonic-text">${escapeHtml(item.mnemonic)}</p>
              </div>
            ` : ''}
            ${featureTagsHtml ? `<div class="compare-features-preview">${featureTagsHtml}</div>` : ''}
            <div class="compare-action-bar">
              <span class="compare-date-text">📅 ${escapeHtml(item.dateAdded || '最新收錄')}</span>
              <span class="compare-btn-link">深入辨析比對 ➔</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  /**
   * 切換橫向全幅檢視模式
   */
  function toggleCompareTableWideMode() {
    const modalBody = document.querySelector('.compare-modal-body');
    const btn = document.getElementById('toggleCompareWideBtn');
    if (!modalBody) return;
    modalBody.classList.toggle('wide-table-mode');
    const isWide = modalBody.classList.contains('wide-table-mode');
    if (btn) {
      btn.classList.toggle('active', isWide);
      btn.innerHTML = isWide ? '<span>📑</span> <span>還原完整視圖</span>' : '<span>↔️</span> <span>橫向全幅檢視</span>';
    }
  }

  /**
   * 開啟相似鑑別詳情燈箱
   */
  function openCompareModal(compareId) {
    const item = (allComparisons || []).find(c => String(c.id) === String(compareId));
    if (!item) return;

    const modalBackdrop = document.getElementById('compareModalBackdrop');
    const modalTitle = document.getElementById('compareModalTitle');
    const modalSubtitle = document.getElementById('compareModalSubtitle');
    const mnemonicText = document.getElementById('compareModalMnemonicText');
    const quickJumpBar = document.getElementById('compareQuickJumpBar');
    const tableContainer = document.getElementById('compareTableContainer');
    const notesContainer = document.getElementById('compareNotesContainer');
    const galleryContainer = document.getElementById('compareGalleryContainer');
    const wideBtn = document.getElementById('toggleCompareWideBtn');
    const modalBody = document.querySelector('.compare-modal-body');

    if (modalBody) modalBody.classList.remove('wide-table-mode');
    if (wideBtn) {
      wideBtn.classList.remove('active');
      wideBtn.innerHTML = '<span>↔️</span> <span>橫向全幅檢視</span>';
    }

    if (modalTitle) modalTitle.textContent = item.title;
    if (modalSubtitle) modalSubtitle.innerHTML = `<span>🌿 ${escapeHtml(item.family || '觀賞植物')}</span> <span>•</span> <span>⚡ 混淆指數：${escapeHtml(item.confusionLevel || '★★★★☆')}</span>`;
    if (mnemonicText) mnemonicText.textContent = item.mnemonic || '觀察葉片、花序與氣味特徵進行精確鑑別。';

    if (quickJumpBar) {
      const speciesList = item.species || [];
      quickJumpBar.innerHTML = speciesList.length > 0 ? `<span class="compare-quick-jump-title">🔍 關聯圖鑑速查：</span>` + speciesList.map(name => `<button class="compare-plant-jump-btn" onclick="window.jumpToPlantFromCompare('${escapeHtml(name)}')"><span>🪴</span> <span>查看「${escapeHtml(name)}」</span></button>`).join('') : '';
      quickJumpBar.style.display = speciesList.length > 0 ? 'flex' : 'none';
    }

    if (tableContainer) {
      if (item.comparisonTable?.rows?.length > 0) {
        tableContainer.innerHTML = `<div class="compare-table-wrapper"><table class="compare-matrix-table"><thead><tr>${item.comparisonTable.headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${item.comparisonTable.rows.map(r => `<tr><td class="feature-name">📌 ${escapeHtml(r.feature)}</td>${(r.values || []).map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
        tableContainer.parentElement.style.display = 'block';
      } else {
        tableContainer.parentElement.style.display = 'none';
      }
    }

    if (galleryContainer) {
      const images = item.galleryImages || [];
      const speciesList = item.species || [];
      let galleryItemsHtml = images.length > 0 ? images.map(img => {
        if (!img.url || img.url.includes('unsplash.com')) {
          return `<div class="compare-gallery-item no-img-item"><span style="font-size: 2.2rem; opacity: 0.6; margin-bottom: 6px;">📷</span><span style="font-size: 0.88rem; font-weight: 700; color: var(--primary-dark);">${escapeHtml(img.caption || '植物照片')}</span><span style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">(尚無實物特寫圖資)</span></div>`;
        }
        return `<div class="compare-gallery-item"><img src="${escapeHtml(img.url)}" alt="${escapeHtml(img.caption || '鑑別特徵圖')}" loading="lazy" onclick="window.openEnlargedImage ? window.openEnlargedImage('${escapeHtml(img.url)}', '${escapeHtml(img.caption || '')}') : window.open('${escapeHtml(img.url)}', '_blank')"><div class="compare-gallery-caption">${escapeHtml(img.caption || '特徵特寫照')}</div></div>`;
      }).join('') : speciesList.map(sp => {
        const spImg = findSpeciesPhoto(sp, '');
        return spImg ? `<div class="compare-gallery-item"><img src="${escapeHtml(spImg)}" alt="${escapeHtml(sp)}" loading="lazy" onclick="window.openEnlargedImage ? window.openEnlargedImage('${escapeHtml(spImg)}', '${escapeHtml(sp)}') : window.open('${escapeHtml(spImg)}', '_blank')"><div class="compare-gallery-caption">${escapeHtml(sp)} (圖鑑資料庫照片)</div></div>` : `<div class="compare-gallery-item no-img-item"><span style="font-size: 2.2rem; opacity: 0.6; margin-bottom: 6px;">📷</span><span style="font-size: 0.88rem; font-weight: 700; color: var(--primary-dark);">${escapeHtml(sp)}</span><span style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">(尚無實物特寫圖資)</span></div>`;
      }).join('');

      galleryContainer.innerHTML = `<div class="compare-gallery-grid">${galleryItemsHtml}</div>`;
      galleryContainer.parentElement.style.display = 'block';
    }

    if (notesContainer) {
      const notes = item.detailedNotes || [];
      if (notes.length > 0) {
        notesContainer.innerHTML = `<div class="compare-notes-list">${notes.map((n, idx) => `<div class="compare-note-item"><div class="compare-note-header"><span class="compare-note-badge">${idx + 1}</span><h4 class="compare-note-title">${escapeHtml(n.title || `鑑別要點 ${idx + 1}`)}</h4></div><div class="compare-note-content">${escapeHtml(n.content || '').replace(/\n/g, '<br>')}</div></div>`).join('')}</div>`;
        notesContainer.parentElement.style.display = 'block';
      } else {
        notesContainer.parentElement.style.display = 'none';
      }
    }

    // ⚡ 關鍵修復：同時加上 open 與 active，確保 modal.css 能百分之百開啟顯示燈箱！
    backdrop.classList.add('open');
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * 關閉相似鑑別詳細燈箱
   */
  function closeCompareModal() {
    const backdrop = document.getElementById('compareModalBackdrop');
    if (backdrop) {
      backdrop.classList.remove('open');
      backdrop.classList.remove('active');
    }
    document.body.style.overflow = '';
  }

  /**
   * 從鑑別燈箱直接跳轉至圖鑑分頁看單一植物詳細資料
   */
  function jumpToPlantFromCompare(plantName) {
    closeCompareModal();

    // 切換至花草圖鑑分頁
    const galleryNavBtn = document.querySelector('[data-target-view="galleryView"]');
    if (galleryNavBtn) {
      galleryNavBtn.click();
    }

    // 搜尋該植物並自動開啟
    const plants = typeof window.getStoredPlants === 'function' ? window.getStoredPlants() : [];
    const cleanTargetName = plantName.trim().replace(/\s*\(.*?\)/g, '');
    const matchedPlant = plants.find(p => 
      p.name === cleanTargetName ||
      p.name.includes(cleanTargetName) || 
      cleanTargetName.includes(p.name) ||
      (p.aliases && p.aliases.some(a => a.includes(cleanTargetName) || cleanTargetName.includes(a)))
    );

    if (matchedPlant && typeof window.openPlantModal === 'function') {
      setTimeout(() => {
        window.openPlantModal(matchedPlant.id);
      }, 250);
    } else {
      // 若找不到完全匹配，將植物名填入圖鑑搜尋框
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.value = cleanTargetName;
        searchInput.dispatchEvent(new Event('input'));
      }
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 匯出至全域
  window.initCompareModule = initCompareModule;
  window.renderCompareCards = renderCompareCards;
  window.openCompareModal = openCompareModal;
  window.closeCompareModal = closeCompareModal;
  window.jumpToPlantFromCompare = jumpToPlantFromCompare;
  window.findSpeciesPhoto = findSpeciesPhoto;

})();
