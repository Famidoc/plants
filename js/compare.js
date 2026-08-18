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
    
    // 1. 嚴格名稱比對 (優先中文名稱完全相等)
    const plants = typeof window.getStoredPlants === 'function' ? window.getStoredPlants() : [];
    
    // 先找完全相等的名稱
    let matched = plants.find(p => p && (p.name || '').trim() === cleanName);
    
    // 若無，再找別名中有完全相等的項目（嚴格相等，不用 includes，避免苞花紫薇誤命中紫薇）
    if (!matched) {
      matched = plants.find(p => p && Array.isArray(p.aliases) && p.aliases.some(a => (a || '').trim() === cleanName));
    }

    if (matched && matched.imageUrl) {
      return matched.imageUrl;
    }

    // 2. 優先使用傳入的 fallbackUrl（如鑑別文件內附的照片）
    if (fallbackUrl) {
      return fallbackUrl;
    }

    // 3. 特殊精確對照表
    const KNOWN_PHOTOS = {
      '薰衣草': 'https://images.unsplash.com/photo-1565011523534-747a8601f10a?w=800&auto=format&fit=crop',
      '鼠尾草': 'https://drive.google.com/thumbnail?id=1eBjwwJFXhWqCu3oloNDpbR0GSZDjiyQZ&sz=w1000',
      '粉萼鼠尾草': 'https://drive.google.com/thumbnail?id=1eBjwwJFXhWqCu3oloNDpbR0GSZDjiyQZ&sz=w1000',
      '紫薇': 'https://drive.google.com/thumbnail?id=1R-vb55hXNXe0yrGYn1N1PzQDgYlutVJw&sz=w1000',
      '九芎': 'https://drive.google.com/thumbnail?id=1VHAphc4Scup2oqCujS24ihZBtIH4JWNF&sz=w1000',
      '羊蹄甲': 'https://images.unsplash.com/photo-1520412099551-62b6bafeb5bb?w=800&auto=format&fit=crop',
      '洋紫荊': 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=800&auto=format&fit=crop',
      '艷紫荊': 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&auto=format&fit=crop',
      '烏蘞莓': 'https://drive.google.com/thumbnail?id=1nl_V8Msgx-xGtvit9UxTwqsEaYFkVboB&sz=w1000',
      '冇骨消': 'https://images.unsplash.com/photo-1507290439931-a861b5a38200?w=800&auto=format&fit=crop',
      '西洋接骨木': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&auto=format&fit=crop',
      '接骨木': 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=800&auto=format&fit=crop'
    };

    if (KNOWN_PHOTOS[cleanName]) {
      return KNOWN_PHOTOS[cleanName];
    }

    return 'https://images.unsplash.com/photo-1565011523534-747a8601f10a?w=800&auto=format&fit=crop';
  }

  /**
   * 設置互動事件監聽器
   */
  function setupCompareControls() {
    const searchInput = document.getElementById('compareSearchInput');
    const categoryChips = document.querySelectorAll('.compare-category-chip');
    const sortBtn = document.getElementById('compareSortBtn');
    const modalBackdrop = document.getElementById('compareModalBackdrop');
    const closeBtn = document.getElementById('closeCompareModalBtn');

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

    // 關閉燈箱
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        closeCompareModal();
      });
    }

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
      // 科別篩選
      if (currentCategory !== 'ALL') {
        const itemFam = (item.family || '').toLowerCase();
        if (!itemFam.includes(currentCategory.toLowerCase())) {
          return false;
        }
      }

      // 文字搜尋 (標題、物種名稱、科別、口訣、表格特徵)
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

    // 3. 更新計數
    if (countBadge) {
      countBadge.textContent = `共 ${filtered.length} 組相似鑑別`;
    }

    // 4. 空資料狀態
    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-light); background: rgba(255,255,255,0.06); border-radius: var(--radius-lg); backdrop-filter: blur(8px);">
          <div style="font-size: 3rem; margin-bottom: 0.8rem;">⚖️🔍</div>
          <h3 style="font-size: 1.3rem; margin-bottom: 0.5rem;">未找到符合條件的相似鑑別資料</h3>
          <p style="opacity: 0.8; font-size: 0.9rem;">請嘗試更換搜尋關鍵字或科別標籤。</p>
        </div>
      `;
      return;
    }

    // 5. 渲染卡片 (智慧支援 2 物種對比與 3 物種三方對比)
    container.innerHTML = filtered.map(item => {
      const speciesArr = item.species || [];
      const images = item.galleryImages || [];
      
      let heroImagesHtml = '';
      if (speciesArr.length >= 3) {
        // 三物種鼎立排版
        const imgList = speciesArr.slice(0, 3).map((sp, idx) => {
          const spImg = findSpeciesPhoto(sp, images[idx] ? images[idx].url : '');
          return `
            <div class="compare-hero-img-wrap" style="flex: 1;">
              <img src="${escapeHtml(spImg)}" alt="${escapeHtml(sp)}" loading="lazy">
              <span class="compare-hero-label" style="font-size: 0.72rem; padding: 2px 6px;">${escapeHtml(sp)}</span>
            </div>
          `;
        });
        heroImagesHtml = imgList.join('<div class="compare-vs-badge" style="width: 28px; height: 28px; font-size: 0.75rem; position: static; transform: none; margin: 0 -14px; z-index: 4; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">VS</div>');
      } else {
        // 雙物種對抗排版
        const leftLabel = speciesArr[0] || '物種 A';
        const rightLabel = speciesArr[1] || '物種 B';
        const leftImg = findSpeciesPhoto(leftLabel, images[0] ? images[0].url : '');
        const rightImg = findSpeciesPhoto(rightLabel, images[1] ? images[1].url : '');
        heroImagesHtml = `
          <div class="compare-hero-img-wrap">
            <img src="${escapeHtml(leftImg)}" alt="${escapeHtml(leftLabel)}" loading="lazy">
            <span class="compare-hero-label">${escapeHtml(leftLabel)}</span>
          </div>
          <div class="compare-vs-badge">VS</div>
          <div class="compare-hero-img-wrap">
            <img src="${escapeHtml(rightImg)}" alt="${escapeHtml(rightLabel)}" loading="lazy">
            <span class="compare-hero-label">${escapeHtml(rightLabel)}</span>
          </div>
        `;
      }

      // 提取特徵預覽標籤 (前 3~4 個項目)
      let featureTagsHtml = '';
      if (item.comparisonTable && item.comparisonTable.rows) {
        featureTagsHtml = item.comparisonTable.rows.slice(0, 4).map(r => `
          <span class="compare-feature-chip">📌 ${escapeHtml(r.feature)}</span>
        `).join('');
      }

      return `
        <article class="compare-card" data-compare-id="${escapeHtml(item.id)}" onclick="window.openCompareModal('${escapeHtml(item.id)}')">
          <!-- 封面與 VS 標誌 -->
          <div class="compare-hero-banner" style="display: flex; align-items: center; position: relative;">
            ${heroImagesHtml}
          </div>

          <!-- 卡片內容區 -->
          <div class="compare-card-body">
            <div class="compare-card-header">
              <h3 class="compare-card-title">${escapeHtml(item.title)}</h3>
            </div>

            <div class="compare-card-meta">
              <span class="compare-family-badge">🌿 ${escapeHtml(item.family || '觀賞植物')}</span>
              <span class="compare-diff-badge">⚡ 混淆度 ${escapeHtml(item.confusionLevel || '★★★★☆')}</span>
            </div>

            <!-- 一句話速記口訣 -->
            <div class="compare-mnemonic-box">
              <i>💡</i>
              <div>${escapeHtml(item.mnemonic || '點擊展開查看詳細對比矩陣與特徵解析')}</div>
            </div>

            <!-- 特徵亮點 -->
            ${featureTagsHtml ? `<div class="compare-features-preview">${featureTagsHtml}</div>` : ''}

            <!-- 底部動作 -->
            <div class="compare-action-bar">
              <span class="compare-date-text">📅 ${escapeHtml(item.dateAdded || '')}</span>
              <span class="compare-btn-link">深入辨析比對 ➔</span>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  /**
   * 開啟相似鑑別詳細燈箱
   */
  function openCompareModal(compareId) {
    const item = allComparisons.find(c => c.id === compareId);
    if (!item) return;

    const backdrop = document.getElementById('compareModalBackdrop');
    const modalTitle = document.getElementById('compareModalTitle');
    const modalSubtitle = document.getElementById('compareModalSubtitle');
    const mnemonicText = document.getElementById('compareModalMnemonicText');
    const quickJumpBar = document.getElementById('compareQuickJumpBar');
    const tableContainer = document.getElementById('compareTableContainer');
    const galleryContainer = document.getElementById('compareGalleryContainer');
    const notesContainer = document.getElementById('compareNotesContainer');

    if (!backdrop) return;

    // 1. 設定標題與副標
    if (modalTitle) modalTitle.textContent = item.title;
    if (modalSubtitle) {
      modalSubtitle.innerHTML = `
        <span>🌿 ${escapeHtml(item.family || '觀賞植物')}</span>
        <span>•</span>
        <span>⚡ 混淆指數：${escapeHtml(item.confusionLevel || '★★★★☆')}</span>
      `;
    }

    // 2. 口訣 Banner
    if (mnemonicText) {
      mnemonicText.textContent = item.mnemonic || '觀察葉片、花序與氣味特徵進行精確鑑別。';
    }

    // 3. 關聯植物快速導覽 Chips
    if (quickJumpBar) {
      const speciesList = item.species || [];
      if (speciesList.length > 0) {
        quickJumpBar.innerHTML = `
          <span class="compare-quick-jump-title">🔍 關聯圖鑑速查：</span>
          ${speciesList.map(name => `
            <button class="compare-plant-jump-btn" onclick="window.jumpToPlantFromCompare('${escapeHtml(name)}')">
              <span>🪴</span>
              <span>查看「${escapeHtml(name)}」完整圖鑑</span>
            </button>
          `).join('')}
        `;
        quickJumpBar.style.display = 'flex';
      } else {
        quickJumpBar.style.display = 'none';
      }
    }

    // 4. 特徵對比矩陣表格
    if (tableContainer) {
      if (item.comparisonTable && item.comparisonTable.headers && item.comparisonTable.rows && item.comparisonTable.rows.length > 0) {
        const headers = item.comparisonTable.headers;
        const rows = item.comparisonTable.rows;

        tableContainer.innerHTML = `
          <div class="compare-table-wrapper">
            <table class="compare-matrix-table">
              <thead>
                <tr>
                  ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td class="feature-name">📌 ${escapeHtml(r.feature)}</td>
                    ${(r.values || []).map(v => `<td>${escapeHtml(v)}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        tableContainer.parentElement.style.display = 'block';
      } else {
        tableContainer.parentElement.style.display = 'none';
      }
    }

    // 5. 高清圖文對照區
    if (galleryContainer) {
      const images = item.galleryImages || [];
      if (images.length > 0) {
        galleryContainer.innerHTML = `
          <div class="compare-gallery-grid">
            ${images.map(img => {
              const realImgUrl = findSpeciesPhoto(img.caption ? img.caption.split(/[\(\s@\-]/)[1] || '' : '', img.url);
              return `
                <div class="compare-gallery-item">
                  <img src="${escapeHtml(realImgUrl)}" alt="${escapeHtml(img.caption || '鑑別特徵圖')}" loading="lazy" onclick="window.openEnlargedImage ? window.openEnlargedImage('${escapeHtml(realImgUrl)}', '${escapeHtml(img.caption || '')}') : window.open('${escapeHtml(realImgUrl)}', '_blank')">
                  <div class="compare-gallery-caption">${escapeHtml(img.caption || '特徵特寫照')}</div>
                </div>
              `;
            }).join('')}
          </div>
        `;
        galleryContainer.parentElement.style.display = 'block';
      } else {
        galleryContainer.parentElement.style.display = 'none';
      }
    }

    // 6. 鑑別重點詳解條列
    if (notesContainer) {
      const notes = item.detailedNotes || [];
      if (notes.length > 0) {
        notesContainer.innerHTML = `
          <div class="compare-notes-list">
            ${notes.map(n => `
              <div class="compare-note-card">
                <div class="compare-note-title">🎯 ${escapeHtml(n.title)}</div>
                <div class="compare-note-content">${escapeHtml(n.content)}</div>
              </div>
            `).join('')}
          </div>
        `;
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
