/**
 * 「捻花惹草」花草知識測驗引擎 (Quiz Engine)
 * 5 題照片選擇題、每題 20 分、滿分 100 分、答完一併結算
 * 支援「錯題強化複習機制」：答錯自動加入複習池優先出題，答對後自動消除
 */

const QUIZ_WRONG_POOL_KEY = 'nian_hua_re_cao_quiz_wrong_pool';

let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = []; // 儲存 { questionIndex, selectedPlantName, correctPlantName, isCorrect }

/**
 * 取得目前錯題池中的植物 ID 清單
 */
function getWrongPlantIds() {
  try {
    const raw = localStorage.getItem(QUIZ_WRONG_POOL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

/**
 * 更新錯題池記錄：
 * - 答錯的植物加入錯題池
 * - 答對的植物從錯題池中移除（代表已學會/消除）
 */
function updateWrongPlantPool(correctPlantIds, wrongPlantIds) {
  try {
    const currentPool = new Set(getWrongPlantIds());
    
    // 1. 答錯的加入錯題池
    wrongPlantIds.forEach(id => {
      if (id) currentPool.add(id);
    });

    // 2. 答對的從錯題池中移除
    correctPlantIds.forEach(id => {
      currentPool.delete(id);
    });

    localStorage.setItem(QUIZ_WRONG_POOL_KEY, JSON.stringify(Array.from(currentPool)));
  } catch (e) {
    console.warn('無法儲存測驗錯題池記錄:', e);
  }
}

function startNewQuiz() {
  const allPlants = getStoredPlants();
  if (!allPlants || allPlants.length < 4) {
    alert('資料庫花草數量少於 4 種，無法產生 4 選 1 選擇題！請先增加花草資料。');
    return;
  }

  const quizCount = Math.min(5, allPlants.length);

  // 1. 智慧抽題：錯題優先抽取 + 剩餘花草隨機補足
  const wrongIds = getWrongPlantIds();
  // 找出目前仍存在資料庫中的錯題花草
  const wrongPlants = allPlants.filter(p => wrongIds.includes(p.id));

  // 錯題最多抽取 3 題（若錯題少於 3 題則取全部，保留至少 2 題給新題目）
  const maxWrongCount = Math.min(3, wrongPlants.length);
  const shuffledWrong = [...wrongPlants].sort(() => 0.5 - Math.random());
  const selectedWrongPlants = shuffledWrong.slice(0, maxWrongCount);

  // 剩餘題數從未被選取的花草中隨機補足
  const selectedWrongIds = new Set(selectedWrongPlants.map(p => p.id));
  const remainingPlants = allPlants.filter(p => !selectedWrongIds.has(p.id));
  const shuffledRemaining = [...remainingPlants].sort(() => 0.5 - Math.random());
  const neededCount = quizCount - selectedWrongPlants.length;
  const selectedRemainingPlants = shuffledRemaining.slice(0, neededCount);

  // 合併錯題與隨機題目，並再次隨機洗牌打散題目順序
  const selectedTargetPlants = [...selectedWrongPlants, ...selectedRemainingPlants].sort(() => 0.5 - Math.random());

  // 2. 為每題構建 4 個隨機選項 (包含 1 個正解與 3 個干擾項)
  quizQuestions = selectedTargetPlants.map((target, idx) => {
    // 找出所有其他花草作為干擾項
    const distractors = allPlants
      .filter(p => p.id !== target.id)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // 混合 1 正解 + 3 干擾項並隨機洗牌
    const options = [target, ...distractors].sort(() => 0.5 - Math.random());

    return {
      index: idx + 1,
      targetPlant: target,
      options: options.map(o => o.name),
      isReview: selectedWrongIds.has(target.id) // 標記是否為弱點強化題
    };
  });

  currentQuestionIndex = 0;
  userAnswers = [];

  // 顯示測驗遊戲介面，隱藏結算畫面
  document.getElementById('quizPlayingContainer').style.display = 'block';
  document.getElementById('quizResultContainer').style.display = 'none';

  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  if (currentQuestionIndex >= quizQuestions.length) {
    finishQuizAndShowResults();
    return;
  }

  const q = quizQuestions[currentQuestionIndex];
  
  // 更新進度與計數器
  document.getElementById('quizCounter').textContent = `第 ${q.index} / ${quizQuestions.length} 題`;
  const progressPercent = (q.index / quizQuestions.length) * 100;
  document.getElementById('quizProgressFill').style.width = `${progressPercent}%`;

  // 題目僅顯示照片（符合使用者 /grill-me 需求）
  document.getElementById('quizPhotoImg').src = q.targetPlant.imageUrl;

  // 渲染 4 個選項按鈕
  const optionsGrid = document.getElementById('quizOptionsGrid');
  const prefixes = ['A', 'B', 'C', 'D'];

  optionsGrid.innerHTML = q.options.map((optName, idx) => `
    <button class="quiz-option-btn" data-option="${optName}">
      <span class="option-prefix">${prefixes[idx]}</span>
      <span class="option-name-text">${optName}</span>
    </button>
  `).join('');

  // 綁定選項點擊事件
  optionsGrid.querySelectorAll('.quiz-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedName = btn.getAttribute('data-option');
      handleAnswerSelect(selectedName);
    });
  });
}

function handleAnswerSelect(selectedName) {
  const q = quizQuestions[currentQuestionIndex];
  const isCorrect = (selectedName === q.targetPlant.name);

  // 記錄答案（根據 /grill-me 需求：作答時不透露對錯，直接進入下一題）
  userAnswers.push({
    questionIndex: q.index,
    targetPlant: q.targetPlant,
    selectedName: selectedName,
    correctName: q.targetPlant.name,
    isCorrect: isCorrect
  });

  currentQuestionIndex++;
  renderCurrentQuestion();
}

/**
 * 結算測驗並顯示 100 分制成績單與明細
 */
function finishQuizAndShowResults() {
  document.getElementById('quizPlayingContainer').style.display = 'none';
  const resultContainer = document.getElementById('quizResultContainer');
  resultContainer.style.display = 'block';

  // 每題 20 分，計算總分 (滿分 100)
  const correctAnswers = userAnswers.filter(a => a.isCorrect);
  const wrongAnswers = userAnswers.filter(a => !a.isCorrect);
  const totalScore = correctAnswers.length * 20;

  // 1. 自動更新錯題強化池（答錯加入，答對消除）
  const correctIds = correctAnswers.map(a => a.targetPlant.id);
  const wrongIds = wrongAnswers.map(a => a.targetPlant.id);
  updateWrongPlantPool(correctIds, wrongIds);

  // 評語與稱號
  let rankTitle = "";
  let rankDesc = "";
  if (totalScore === 100) {
    rankTitle = "🏆 綠手指花草大師！";
    rankDesc = "太厲害了！5 題全部答對，您對植物有著驚人的觀察力與博學視野！";
  } else if (totalScore >= 80) {
    rankTitle = "🌿 植物達人！";
    rankDesc = "相當優異的表現！您對大部分的花草外觀都非常熟悉。";
  } else if (totalScore >= 60) {
    rankTitle = "🌱 綠植同好者！";
    rankDesc = "合格！答錯的花草已自動加入複習庫，下次測驗會優先為您加強！";
  } else {
    rankTitle = "🌾 花草實習生";
    rankDesc = "別灰心！答錯的花草已納入複習庫，點擊下方「檢視卡片」或重測立即加強！";
  }

  // 填入成績圓環
  document.getElementById('scoreNum').textContent = totalScore;
  document.getElementById('scoreRankTitle').textContent = rankTitle;
  document.getElementById('scoreDescText').textContent = rankDesc;

  // 產生成績單明細列表
  const breakdownList = document.getElementById('quizBreakdownList');
  breakdownList.innerHTML = userAnswers.map((ans, idx) => {
    // 檢查該題在出題時是否為弱點複習題
    const originalQ = quizQuestions.find(q => q.index === ans.questionIndex);
    const isReview = originalQ ? originalQ.isReview : false;

    return `
    <div class="breakdown-item ${ans.isCorrect ? 'correct' : 'wrong'}">
      <div class="breakdown-info">
        <img src="${ans.targetPlant.imageUrl}" alt="${ans.targetPlant.name}" class="breakdown-thumb" onerror="this.src='./assets/images/ferns.jpg'">
        <div>
          <div class="breakdown-text-title">
            第 ${idx + 1} 題：${ans.targetPlant.name}
            ${isReview ? (ans.isCorrect ? '<span style="font-size:0.75rem; color:#2e7d32; background:#e8f5e9; padding:1px 6px; border-radius:4px; margin-left:6px; font-weight:normal;">🎯 弱點克服！</span>' : '<span style="font-size:0.75rem; color:#e65100; background:#fff3e0; padding:1px 6px; border-radius:4px; margin-left:6px; font-weight:normal;">🔄 弱點複習題</span>') : ''}
          </div>
          <div class="breakdown-answers">
            您的回答：<strong style="color: ${ans.isCorrect ? '#388e3c' : '#d32f2f'};">${ans.selectedName}</strong> 
            ${!ans.isCorrect ? `(正確答案：<strong style="color:#388e3c;">${ans.correctName}</strong>)` : ''}
          </div>
        </div>
      </div>
      <div>
        <span class="breakdown-status-tag ${ans.isCorrect ? 'correct' : 'wrong'}">
          ${ans.isCorrect ? '✓ +20分' : '✗ 答錯'}
        </span>
        <button class="btn-primary review-btn" style="padding: 0.3rem 0.75rem; font-size: 0.8rem; margin-top: 4px;" data-id="${ans.targetPlant.id}">
          🔍 檢視卡片
        </button>
      </div>
    </div>
  `;
  }).join('');

  // 綁定檢視卡片按鈕
  breakdownList.querySelectorAll('.review-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pId = btn.getAttribute('data-id');
      const allP = getStoredPlants();
      const target = allP.find(p => p.id === pId);
      if (target) {
        openPlantDetailModal(target);
      }
    });
  });
}
