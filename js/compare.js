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
  let currentActiveCompare = null; // 當前正在燈箱檢視的比對物件

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
    checkAndOpenUrlCompare();
  }

  /**
   * 清理物種名稱（去除所有全形/半形括號內容如學名與別名、後綴標記）
   */
  /**
   * 清理物種名稱（去除所有全形/半形括號內容如學名與別名、巢狀括號、尾隨學名命名者、後綴標記）
   */
  function cleanSpeciesName(rawName) {
    if (!rawName) return '';
    let str = rawName.toString();

    // 1. 遞迴清除所有成對的全形/半形括號內容 (解決巢狀括號如 (Griseb.) 造成的截斷殘留)
    let prev = '';
    while (prev !== str) {
      prev = str;
      str = str.replace(/[\(（\[【][^\(\)（）\[\]【】]*[\)）\]】]/g, ' ');
    }

    // 2. 清理斜線、常見後綴標記、以及孤立未成對的括號
    str = str.replace(/[\/\\].*$/g, '')
             .replace(/[-_–\s]*(植物資料|資料|圖鑑).*/g, '')
             .replace(/[\(\)（）\[\]【】]/g, ' ')
             .trim();

    // 3. 去除尾隨的拉丁學名、命名者縮寫或英文字串 (例如 "貓腥草 R.M.King & H.Rob.")
    str = str.replace(/\s+[A-Za-z0-9&.,'\-]+.*$/, '').trim();

    return str;
  }

  /**
   * 從鑑別文檔附圖中尋找「專屬」於特定物種的照片 (嚴格排除同時包含其他對比物種名稱的文章總圖)
   */
  function findDocImageForSpecies(speciesName, images, allSpecies) {
    if (!speciesName || !Array.isArray(images) || images.length === 0) return '';
    const cleanTarget = cleanSpeciesName(speciesName);
    if (!cleanTarget) return '';

    const otherSpecies = (allSpecies || [])
      .map(s => cleanSpeciesName(s))
      .filter(s => s && s !== cleanTarget);

    const matched = images.find(img => {
      if (!img || !img.url || img.url.includes('unsplash.com')) return false;
      const cap = (img.caption || '').trim();
      if (!cap) return false;

      // 1. caption 必須包含該物種名稱
      if (!cap.includes(cleanTarget)) return false;

      // 2. caption 絕不能同時包含其他對比物種名稱 (例如避免「三色堇 vs 香堇菜」這種全篇對比標題圖被誤判為單一物種特寫)
      const hasOther = otherSpecies.some(os => cap.includes(os));
      if (hasOther) return false;

      return true;
    });

    return matched ? matched.url : '';
  }

  /**
   * 智慧取得物種真實照片（只從圖鑑庫以主名稱精確匹配，絕不使用別名以免跨物種污染）
   */
  function findSpeciesPhoto(speciesName, fallbackUrl) {
    if (!speciesName) return fallbackUrl || '';
    const targetName = cleanSpeciesName(speciesName);
    if (!targetName) return fallbackUrl || '';
    
    // 1. 取得圖鑑資料庫
    const plants = typeof window.getStoredPlants === 'function' ? window.getStoredPlants() : [];
    
    // 🛡️ 核心原則：只比對植物卡片的「主名稱」！絕不比對別名！
    // 鑑別場景下，近緣物種別名常互相包含俗名（例如香堇菜別名常被寫為小三色堇或三色堇），若比對別名會導致錯將香堇菜圖資塞給三色堇！
    let matched = plants.find(p => p && cleanSpeciesName(p.name) === targetName);

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

    // 2. 官方 Google Drive 確證無誤的真實照片庫
    const KNOWN_PHOTOS = {
      '紫薇': 'https://drive.google.com/thumbnail?id=1R-vb55hXNXe0yrGYn1N1PzQDgYlutVJw&sz=w1000',
      '九芎': 'https://drive.google.com/thumbnail?id=1VHAphc4Scup2oqCujS24ihZBtIH4JWNF&sz=w1000',
      '烏蘞莓': 'https://drive.google.com/thumbnail?id=1nl_V8Msgx-xGtvit9UxTwqsEaYFkVboB&sz=w1000'
    };

    if (KNOWN_PHOTOS[targetName]) {
      return KNOWN_PHOTOS[targetName];
    }

    // 3. 使用傳入的專屬 fallbackUrl
    if (fallbackUrl && fallbackUrl.startsWith('http') && !fallbackUrl.includes('images.unsplash.com')) {
      return fallbackUrl;
    }

    // 🛡️ 嚴謹原則：無真實圖資時回傳空字串，前端顯示「尚無照片」佔位標籤，絕不塞錯圖！
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
        const imgUrls = [];
        const imgList = speciesArr.slice(0, 3).map((sp, idx) => {
          let docImg = findDocImageForSpecies(sp, images, speciesArr);
          let spImg = findSpeciesPhoto(sp, docImg);
          const cleanSp = cleanSpeciesName(sp) || sp;
          
          if (spImg && imgUrls.includes(spImg)) {
            const hasExactMain = typeof window.getStoredPlants === 'function' &&
              (window.getStoredPlants() || []).some(p => p && cleanSpeciesName(p.name) === cleanSp);
            if (!hasExactMain) spImg = '';
          }
          if (spImg) imgUrls.push(spImg);

          if (spImg) {
            return `
              <div class="compare-hero-img-wrap" style="flex: 1;">
                <img src="${escapeHtml(spImg)}" alt="${escapeHtml(cleanSp)}" loading="lazy">
                <span class="compare-hero-label" style="font-size: 0.72rem; padding: 2px 6px;">${escapeHtml(cleanSp)}</span>
              </div>
            `;
          } else {
            return `
              <div class="compare-hero-img-wrap compare-hero-no-img" style="flex: 1;">
                <div class="compare-no-img-box">
                  <span class="no-img-icon">🪴</span>
                  <span class="no-img-text">尚無照片</span>
                </div>
                <span class="compare-hero-label" style="font-size: 0.72rem; padding: 2px 6px;">${escapeHtml(cleanSp)}</span>
              </div>
            `;
          }
        });
        heroImagesHtml = imgList.join('<div class="compare-vs-badge" style="width: 28px; height: 28px; font-size: 0.75rem; position: static; transform: none; margin: 0 -14px; z-index: 4; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">VS</div>');
      } else {
        const leftLabel = speciesArr[0] || '物種 A';
        const rightLabel = speciesArr[1] || '物種 B';
        const cleanLeft = cleanSpeciesName(leftLabel) || leftLabel;
        const cleanRight = cleanSpeciesName(rightLabel) || rightLabel;

        let leftDocImg = findDocImageForSpecies(leftLabel, images, speciesArr);
        let rightDocImg = findDocImageForSpecies(rightLabel, images, speciesArr);

        let leftImg = findSpeciesPhoto(leftLabel, leftDocImg);
        let rightImg = findSpeciesPhoto(rightLabel, rightDocImg);

        // 🛡️ 關鍵互斥守衛：如果左右兩側拿到同一張照片（非空），必須判定誰才是真正持有者
        if (leftImg && rightImg && leftImg === rightImg) {
          const plants = typeof window.getStoredPlants === 'function' ? window.getStoredPlants() : [];
          const leftHasMain = plants.some(p => p && cleanSpeciesName(p.name) === cleanLeft);
          const rightHasMain = plants.some(p => p && cleanSpeciesName(p.name) === cleanRight);
          if (leftHasMain && !rightHasMain) {
            rightImg = '';
          } else if (rightHasMain && !leftHasMain) {
            leftImg = '';
          } else {
            // 兩者皆無主名圖鑑（文章總圖），皆顯示尚無特寫照片以防誤導
            leftImg = '';
            rightImg = '';
          }
        }

        const leftHtml = leftImg ? `
          <div class="compare-hero-img-wrap">
            <img src="${escapeHtml(leftImg)}" alt="${escapeHtml(cleanLeft)}" loading="lazy">
            <span class="compare-hero-label">${escapeHtml(cleanLeft)}</span>
          </div>
        ` : `
          <div class="compare-hero-img-wrap compare-hero-no-img">
            <div class="compare-no-img-box">
              <span class="no-img-icon">🪴</span>
              <span class="no-img-text">尚無照片</span>
            </div>
            <span class="compare-hero-label">${escapeHtml(cleanLeft)}</span>
          </div>
        `;

        const rightHtml = rightImg ? `
          <div class="compare-hero-img-wrap">
            <img src="${escapeHtml(rightImg)}" alt="${escapeHtml(cleanRight)}" loading="lazy">
            <span class="compare-hero-label">${escapeHtml(cleanRight)}</span>
          </div>
        ` : `
          <div class="compare-hero-img-wrap compare-hero-no-img">
            <div class="compare-no-img-box">
              <span class="no-img-icon">🪴</span>
              <span class="no-img-text">尚無照片</span>
            </div>
            <span class="compare-hero-label">${escapeHtml(cleanRight)}</span>
          </div>
        `;

        heroImagesHtml = `${leftHtml}<div class="compare-vs-badge">VS</div>${rightHtml}`;
      }

      let featureTagsHtml = item.comparisonTable?.rows?.slice(0, 4).map(r => `<span class="compare-feature-chip">📌 ${escapeHtml(r.feature)}</span>`).join('') || '';

      const cardMnemonic = getDisplayMnemonic(item);

      return `
        <article class="compare-card" data-compare-id="${escapeHtml(item.id)}" onclick="window.openCompareModal('${escapeHtml(item.id)}')">
          <div class="compare-hero-banner" style="display: flex; align-items: center; position: relative;">${heroImagesHtml}</div>
          <div class="compare-card-body">
            <div class="compare-card-header"><h3 class="compare-card-title">${escapeHtml(item.title)}</h3></div>
            <div class="compare-card-meta">
              <span class="compare-family-badge">🌿 ${escapeHtml(item.family || '觀賞植物')}</span>
              <span class="compare-confusion-badge">⚡ 混淆度 ${escapeHtml(item.confusionLevel || '★★★★☆')}</span>
            </div>
            ${cardMnemonic ? `
              <div class="compare-mnemonic-box">
                <span class="compare-mnemonic-icon">💡</span>
                <p class="compare-mnemonic-text">${escapeHtml(cardMnemonic).replace(/\n/g, '<br>')}</p>
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

  function getDisplayMnemonic(item) {
    if (!item) return '';
    let text = (item.mnemonic || '').trim();
    if (!text || text.endsWith('特徵差異對比')) {
      const defaultMatch = (window.DEFAULT_COMPARISON_DATA || []).find(d => (d.title || '').trim() === (item.title || '').trim());
      if (defaultMatch && defaultMatch.mnemonic && !defaultMatch.mnemonic.endsWith('特徵差異對比')) {
        text = defaultMatch.mnemonic;
      }
    }
    return text;
  }

  /**
   * 開啟相似鑑別詳情燈箱
   */
  function openCompareModal(compareId) {
    const item = (allComparisons || []).find(c => String(c.id) === String(compareId));
    if (!item) return;

    currentActiveCompare = item;

    const modalBackdrop = document.getElementById('compareModalBackdrop');
    const modalTitle = document.getElementById('compareModalTitle');
    const modalSubtitle = document.getElementById('compareModalSubtitle');
    const mnemonicText = document.getElementById('compareModalMnemonicText');
    const quickJumpBar = document.getElementById('compareQuickJumpBar');
    const tableContainer = document.getElementById('compareTableContainer');
    const notesContainer = document.getElementById('compareNotesContainer');
    const galleryContainer = document.getElementById('compareGalleryContainer');

    if (modalTitle) modalTitle.textContent = item.title;
    if (modalSubtitle) modalSubtitle.innerHTML = `<span>🌿 ${escapeHtml(item.family || '觀賞植物')}</span> <span>•</span> <span>⚡ 混淆指數：${escapeHtml(item.confusionLevel || '★★★★☆')}</span>`;
    if (mnemonicText) {
      const displayMnemonic = getDisplayMnemonic(item) || '觀察葉片、花序與氣味特徵進行精確鑑別。';
      mnemonicText.innerHTML = escapeHtml(displayMnemonic).replace(/\n/g, '<br>');
    }

    if (quickJumpBar) {
      const speciesList = item.species || [];
      quickJumpBar.innerHTML = speciesList.length > 0 ? `<span class="compare-quick-jump-title">🔍 關聯圖鑑速查：</span>` + speciesList.map(name => `<button class="compare-plant-jump-btn" onclick="window.jumpToPlantFromCompare('${escapeHtml(name)}')"><span>🪴</span> <span>查看「${escapeHtml(name)}」</span></button>`).join('') : '';
      quickJumpBar.style.display = speciesList.length > 0 ? 'flex' : 'none';
    }

    if (tableContainer) {
      if (item.comparisonTable?.rows?.length > 0) {
        const headers = item.comparisonTable.headers || [];
        const speciesCols = headers.slice(1);
        
        // 生成手機專屬的快速聚焦切換列
        const mobileNavHtml = speciesCols.length > 1 ? `
          <div class="compare-mobile-table-nav">
            <span class="mobile-nav-hint">👈 左右滑動或點擊聚焦：</span>
            <div class="mobile-nav-chips">
              <button class="mobile-col-chip active" onclick="window.scrollCompareTableToColumn(-1, this)">全覽</button>
              ${speciesCols.map((name, idx) => `
                <button class="mobile-col-chip" onclick="window.scrollCompareTableToColumn(${idx}, this)">${escapeHtml(name.split(/[\(（]/)[0] || name)}</button>
              `).join('')}
            </div>
          </div>
        ` : '';

        tableContainer.innerHTML = `
          ${mobileNavHtml}
          <div class="compare-table-wrapper" id="compareTableWrapper">
            <table class="compare-matrix-table" id="compareMatrixTable">
              <thead>
                <tr>
                  ${headers.map((h, i) => `<th class="${i === 0 ? 'col-feature' : 'col-species'}" data-col-index="${i - 1}">${escapeHtml(h)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${item.comparisonTable.rows.map(r => `
                  <tr>
                    <td class="feature-name">📌 ${escapeHtml(r.feature)}</td>
                    ${(r.values || []).map((v, i) => `<td class="col-species" data-col-index="${i}">${escapeHtml(v)}</td>`).join('')}
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

    // 5. 高清圖文對照區 (每個物種均建立獨立特寫卡片，點擊使用內建全螢幕檢視)
    if (galleryContainer) {
      const images = item.galleryImages || [];
      const speciesList = item.species || [];
      const assignedUrls = new Set();

      let galleryItemsHtml = speciesList.map(sp => {
        const cleanSp = cleanSpeciesName(sp) || sp;
        // (1) 優先從文章附圖中尋找專屬於該物種的照片
        let docImg = findDocImageForSpecies(sp, images, speciesList);
        let imgUrl = docImg;
        let caption = `${cleanSp} (鑑別專屬照片)`;

        // (2) 若無專屬附圖，從圖鑑資料庫中精確尋找
        if (!imgUrl) {
          imgUrl = findSpeciesPhoto(sp, '');
          caption = `${cleanSp} (圖鑑實物照片)`;
        }

        // 🛡️ 防重守衛：避免不同物種拿到同一張圖片
        if (imgUrl && assignedUrls.has(imgUrl)) {
          const plants = typeof window.getStoredPlants === 'function' ? window.getStoredPlants() : [];
          const hasMain = plants.some(p => p && cleanSpeciesName(p.name) === cleanSp);
          if (!hasMain) imgUrl = '';
        }
        if (imgUrl) assignedUrls.add(imgUrl);

        if (imgUrl) {
          return `
            <div class="compare-gallery-item">
              <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(caption)}" loading="lazy" onclick="window.openFullScreenPhoto ? window.openFullScreenPhoto('${escapeHtml(imgUrl)}', '${escapeHtml(caption)}') : null">
              <div class="compare-gallery-caption">${escapeHtml(caption)}</div>
            </div>
          `;
        } else {
          return `
            <div class="compare-gallery-item no-img-item">
              <span style="font-size: 2.2rem; opacity: 0.6; margin-bottom: 6px;">📷</span>
              <span style="font-size: 0.88rem; font-weight: 700; color: var(--primary-dark);">${escapeHtml(cleanSp)}</span>
              <span style="font-size: 0.76rem; color: var(--text-muted); margin-top: 4px;">(尚無實物特寫圖資)</span>
            </div>
          `;
        }
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
    if (modalBackdrop) {
      modalBackdrop.classList.add('open');
      modalBackdrop.classList.add('active');
    }
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
    const cleanTargetName = cleanSpeciesName(plantName);
    const matchedPlant = plants.find(p => cleanSpeciesName(p.name) === cleanTargetName) ||
                         plants.find(p => p.aliases && p.aliases.some(a => cleanSpeciesName(a) === cleanTargetName)) ||
                         plants.find(p => p.name.includes(cleanTargetName) || cleanTargetName.includes(p.name));

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

  /**
   * 手機版點擊標籤平滑滑動至指定物種特徵欄位
   */
  function scrollCompareTableToColumn(colIndex, chipEl) {
    const wrapper = document.getElementById('compareTableWrapper');
    if (!wrapper) return;
    
    // 更新 chip active 狀態
    const chips = document.querySelectorAll('.mobile-col-chip');
    chips.forEach(c => c.classList.remove('active'));
    if (chipEl) chipEl.classList.add('active');

    if (colIndex === -1) {
      wrapper.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      const th = wrapper.querySelector(`th[data-col-index="${colIndex}"]`);
      if (th) {
        const featureColWidth = 85;
        const targetScroll = Math.max(0, th.offsetLeft - featureColWidth);
        wrapper.scrollTo({ left: targetScroll, behavior: 'smooth' });
      }
    }
  }

  /**
   * 產生相似鑑別專屬分享連結 URL
   */
  function generateCompareShareUrl(compareItem) {
    if (!compareItem) return window.location.href;
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?compare=${encodeURIComponent(compareItem.title || compareItem.id)}`;
  }

  /**
   * 複製相似鑑別詳細頁分享連結
   */
  async function copyCompareShareLink(event) {
    if (event) event.stopPropagation();
    if (!currentActiveCompare) {
      if (typeof showToast === 'function') {
        showToast('⚠️ 未能取得鑑別資料', 2000);
      }
      return;
    }

    const shareUrl = generateCompareShareUrl(currentActiveCompare);
    const btn = document.getElementById('compareShareBtn');
    const success = typeof window.copyTextToClipboard === 'function'
      ? await window.copyTextToClipboard(shareUrl)
      : await (async () => {
          try {
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(shareUrl);
              return true;
            }
          } catch(e) {}
          return false;
        })();

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
        showToast(`🔗 已成功複製《${currentActiveCompare.title}》專屬比對分享連結！`, 3500);
      }
    } else {
      prompt('請手動複製以下鑑別分享網址：', shareUrl);
    }
  }

  /**
   * 檢查網址列是否有 ?compare=... 或 ?c=... 並自動切換至比對頁面彈出詳細燈箱
   */
  async function checkAndOpenUrlCompare() {
    try {
      const params = new URLSearchParams(window.location.search);
      const target = params.get('compare') || params.get('c');
      if (!target || !target.trim()) return false;

      const query = decodeURIComponent(target).trim().toLowerCase();
      const list = Array.isArray(allComparisons) && allComparisons.length > 0
        ? allComparisons
        : (await window.loadStoredComparisonsAsync() || []);

      const matched = list.find(c => {
        if (!c) return false;
        if (c.title && c.title.toLowerCase().includes(query)) return true;
        if (c.id && String(c.id).toLowerCase() === query) return true;
        if (c.species && Array.isArray(c.species) && c.species.some(s => s.toLowerCase().includes(query))) return true;
        return false;
      });

      if (matched) {
        // 切換至相似鑑別導覽標籤
        const compareNavBtn = document.querySelector('[data-target-view="compareView"]');
        if (compareNavBtn && !compareNavBtn.classList.contains('active')) {
          compareNavBtn.click();
        }
        setTimeout(() => {
          openCompareModal(matched.id);
        }, 150);
        return true;
      }
    } catch(e) {
      console.warn('解析 compare URL 參數錯誤:', e);
    }
    return false;
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
  window.scrollCompareTableToColumn = scrollCompareTableToColumn;
  window.jumpToPlantFromCompare = jumpToPlantFromCompare;
  window.findSpeciesPhoto = findSpeciesPhoto;
  window.copyCompareShareLink = copyCompareShareLink;
  window.generateCompareShareUrl = generateCompareShareUrl;
  window.checkAndOpenUrlCompare = checkAndOpenUrlCompare;

})();
