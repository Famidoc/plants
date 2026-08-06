/**
 * 「捻花惹草」花草知識測驗引擎 (Quiz Engine)
 * 5 題照片選擇題、每題 20 分、滿分 100 分、答完一併結算
 */

let quizQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = []; // 儲存 { questionIndex, selectedPlantName, correctPlantName, isCorrect }

function startNewQuiz() {
  const allPlants = getStoredPlants();
  if (!allPlants || allPlants.length < 4) {
    alert('資料庫花草數量少於 4 種，無法產生 4 選 1 選擇題！請先增加花草資料。');
    return;
  }

  // 1. 隨機選出 5 個不重複的主題花草 (若總數小於 5 則取全部)
  const quizCount = Math.min(5, allPlants.length);
  const shuffled = [...allPlants].sort(() => 0.5 - Math.random());
  const selectedTargetPlants = shuffled.slice(0, quizCount);

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
      options: options.map(o => o.name)
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
  const correctCount = userAnswers.filter(a => a.isCorrect).length;
  const totalScore = correctCount * 20;

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
    rankDesc = "合格！再多翻閱幾次「捻花惹草」圖鑑，很快就能拿滿分囉！";
  } else {
    rankTitle = "🌾 花草實習生";
    rankDesc = "別灰心！點擊下方答題明細中的「複習卡片」，立即重溫這些花草吧！";
  }

  // 填入成績圓環
  document.getElementById('scoreNum').textContent = totalScore;
  document.getElementById('scoreRankTitle').textContent = rankTitle;
  document.getElementById('scoreDescText').textContent = rankDesc;

  // 產生成績單明細列表
  const breakdownList = document.getElementById('quizBreakdownList');
  breakdownList.innerHTML = userAnswers.map((ans, idx) => `
    <div class="breakdown-item ${ans.isCorrect ? 'correct' : 'wrong'}">
      <div class="breakdown-info">
        <img src="${ans.targetPlant.imageUrl}" alt="${ans.targetPlant.name}" class="breakdown-thumb" onerror="this.src='./assets/images/ferns.jpg'">
        <div>
          <div class="breakdown-text-title">第 ${idx + 1} 題：${ans.targetPlant.name}</div>
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
  `).join('');

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
