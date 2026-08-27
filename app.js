(() => {
  'use strict';

  const STORAGE_KEY = '66days-checkin-v1';
  const GOAL_DAYS = 66;

  const HABITS = [
    { id: 'run', icon: '🏃', title: '每天跑步', detail: '有出去跑就算完成' },
    { id: 'pushups', icon: '💪', title: '每天伏地挺身', detail: '完成今天為自己設定的組數' },
    { id: 'read', icon: '📖', title: '每天讀 10 頁', detail: '任何你想讀的書都可以' },
    { id: 'water', icon: '💧', title: '喝 3.5 公升水', detail: '今天累積 3.5 L' },
    { id: 'meditate', icon: '🧘', title: '冥想 20 分鐘', detail: '一次完成或分段都可以' },
    { id: 'wake', icon: '🌅', title: '7 點前起床', detail: '07:00 前離開床' },
    { id: 'cold', icon: '🚿', title: '冷水澡一次', detail: '完成一次冷水沖洗' },
    { id: 'social', icon: '📵', title: '不用社群媒體', detail: '今天不滑社群動態' },
    { id: 'exercise', icon: '🏋️', title: '運動 1 小時', detail: '累積運動滿 60 分鐘' },
    { id: 'journal', icon: '✍️', title: '每天寫日記', detail: '長短不限，留下紀錄即可' },
    { id: 'gratitude', icon: '✨', title: '心存感激', detail: '寫下或想起至少一件感激的事' },
  ];

  const REWARDS = [
    { day: 5, emoji: '☕', title: '小小補給', copy: '給自己一杯最喜歡的飲料，慶祝你真的開始了。' },
    { day: 10, emoji: '🍰', title: '甜點時間', copy: '挑一份你喜歡的小甜點，慢慢吃完，不用急。' },
    { day: 15, emoji: '🎬', title: '電影之夜', copy: '找一部一直想看的電影，留一個晚上給自己。' },
    { day: 20, emoji: '📚', title: '一本新書', copy: '挑一本真的想看的書，當作第 20 天的紀念。' },
    { day: 25, emoji: '🍜', title: '想吃的那一餐', copy: '去吃一頓你最近一直想吃的東西。' },
    { day: 30, emoji: '🎧', title: '30 天徽章', copy: '一個月了。送自己一個不昂貴、但會常用的小東西。' },
    { day: 35, emoji: '🌿', title: '半日放鬆', copy: '安排半天散步、咖啡或安靜獨處，讓身體恢復。' },
    { day: 40, emoji: '🎨', title: '興趣補給', copy: '買一樣和興趣有關的小用品，繼續把生活過得有感覺。' },
    { day: 45, emoji: '🕹️', title: '無罪惡感休息', copy: '給自己兩小時完全自由的休息時間。' },
    { day: 50, emoji: '🍽️', title: '50 天紀念餐', copy: '找一家喜歡的店，認真慶祝這 50 天。' },
    { day: 55, emoji: '🧸', title: '一件小物', copy: '挑一件你會看到就記得這段挑戰的小物。' },
    { day: 60, emoji: '🌟', title: '大里程碑', copy: '只剩最後 6 天。給自己一個比平常稍微特別的獎勵。' },
    { day: 65, emoji: '🎁', title: '最後一個禮物箱', copy: '明天就是第 66 天。今晚只需要好好休息。' },
    { day: 66, emoji: '👑', title: '66 DAYS 完成', copy: '你完成了整個挑戰。這不是連續按了 66 次按鈕，而是 66 次把承諾做完。' },
  ];

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseLocalDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  function addDays(key, amount) {
    const date = parseLocalDate(key);
    date.setDate(date.getDate() + amount);
    return localDateKey(date);
  }

  function dayDiff(fromKey, toKey) {
    const a = parseLocalDate(fromKey);
    const b = parseLocalDate(toKey);
    return Math.round((b - a) / 86400000);
  }

  function formatDate(key, withWeekday = true) {
    return new Intl.DateTimeFormat('zh-TW', {
      month: 'long', day: 'numeric', ...(withWeekday ? { weekday: 'long' } : {})
    }).format(parseLocalDate(key));
  }

  function emptyToday() {
    return Object.fromEntries(HABITS.map(h => [h.id, false]));
  }

  function defaultState() {
    return {
      version: 1,
      startDate: localDateKey(),
      days: {},
      seenRewards: [],
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {
        ...defaultState(),
        ...parsed,
        days: parsed.days || {},
        seenRewards: Array.isArray(parsed.seenRewards) ? parsed.seenRewards : [],
      };
    } catch {
      return defaultState();
    }
  }

  let state = loadState();
  let activePage = 'today';
  let toastTimer;

  function ensureDay(key = localDateKey()) {
    if (!state.days[key]) {
      state.days[key] = { habits: emptyToday(), note: '', completed: false, completedAt: null };
    }
    const existing = state.days[key];
    existing.habits = { ...emptyToday(), ...(existing.habits || {}) };
    existing.note = existing.note || '';
    return existing;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function completedDateKeys() {
    return Object.entries(state.days)
      .filter(([, value]) => value.completed)
      .map(([key]) => key)
      .sort();
  }

  function completedDaysCount() {
    return completedDateKeys().length;
  }

  function getStreak() {
    const today = localDateKey();
    let cursor = today;
    if (!state.days[cursor]?.completed) cursor = addDays(cursor, -1);
    let streak = 0;
    while (state.days[cursor]?.completed) {
      streak += 1;
      cursor = addDays(cursor, -1);
    }
    return streak;
  }

  function elapsedChallengeDays() {
    return Math.max(1, Math.min(GOAL_DAYS, dayDiff(state.startDate, localDateKey()) + 1));
  }

  function completionRate() {
    const elapsed = Math.max(1, Math.min(GOAL_DAYS, dayDiff(state.startDate, localDateKey()) + 1));
    const eligibleCompleted = completedDateKeys().filter(key => dayDiff(state.startDate, key) >= 0 && dayDiff(state.startDate, key) < GOAL_DAYS).length;
    return Math.round((eligibleCompleted / elapsed) * 100);
  }

  function currentHabitCount() {
    const day = ensureDay();
    return HABITS.filter(h => day.habits[h.id]).length;
  }

  function nextReward(total) {
    return REWARDS.find(reward => reward.day > total) || null;
  }

  function renderHeader() {
    const total = completedDaysCount();
    const progress = Math.min(100, total / GOAL_DAYS * 100);
    $('#completedDays').textContent = total;
    $('#streakCount').textContent = getStreak();
    $('#perfectRate').textContent = `${completionRate()}%`;
    $('#progressRing').style.setProperty('--progress', `${progress * 3.6}deg`);

    const calendarDay = dayDiff(state.startDate, localDateKey()) + 1;
    if (total >= GOAL_DAYS) {
      $('#challengeStatus').textContent = '挑戰完成';
      $('#progressHeadline').textContent = '66 天達成';
      $('#nextGiftText').textContent = '你已經把整個挑戰走完了。';
    } else {
      $('#challengeStatus').textContent = calendarDay <= 0 ? '尚未開始' : '挑戰進行中';
      $('#progressHeadline').textContent = calendarDay > 0 ? `第 ${Math.min(calendarDay, GOAL_DAYS)} 天` : `還有 ${Math.abs(calendarDay) + 1} 天開始`;
      const next = nextReward(total);
      $('#nextGiftText').textContent = next ? `再完成 ${next.day - total} 天解鎖「${next.title}」` : '繼續保持。';
    }
  }

  function renderToday() {
    const key = localDateKey();
    const day = ensureDay(key);
    const count = currentHabitCount();
    $('#todayDate').textContent = `${formatDate(key)} · ${day.completed ? '今天已完成' : '今天'}`;
    $('#todayCount').textContent = `${count} / ${HABITS.length}`;

    const messages = [
      '今天只需要把今天做好。',
      '不要等有動力，先完成下一個小項目。',
      '你不是在追求完美，你是在建立可重複的生活。',
      '把最難的一項先做掉，後面會變輕。',
      '66 天很長，但今天只有一天。',
    ];
    $('#dailyMessage').firstElementChild.textContent = day.completed ? '今天已經完成。可以安心休息。' : messages[(dayDiff(state.startDate, key) % messages.length + messages.length) % messages.length];

    const list = $('#habitList');
    list.innerHTML = HABITS.map(habit => {
      const checked = !!day.habits[habit.id];
      return `
        <button class="habit-row ${checked ? 'done' : ''} ${day.completed ? 'locked' : ''}" data-habit="${habit.id}" ${day.completed ? 'aria-disabled="true"' : ''}>
          <span class="habit-icon">${habit.icon}</span>
          <span class="habit-copy"><strong>${habit.title}</strong><small>${habit.detail}</small></span>
          <span class="habit-check" aria-label="${checked ? '已完成' : '未完成'}">${checked ? '✓' : ''}</span>
        </button>`;
    }).join('');

    const note = $('#dailyNote');
    note.value = day.note;
    note.disabled = day.completed;
    $('#noteCounter').textContent = `${day.note.length} / 240`;

    const button = $('#completeDayButton');
    if (day.completed) {
      button.disabled = false;
      button.classList.add('completed');
      $('#completeButtonText').textContent = '今天已完成 · 點此重新編輯';
    } else {
      button.classList.remove('completed');
      button.disabled = count !== HABITS.length;
      $('#completeButtonText').textContent = count === HABITS.length ? '完成今天的打卡' : `還差 ${HABITS.length - count} 項`;
    }
  }

  function renderHistory() {
    const today = localDateKey();
    const total = completedDaysCount();
    $('#historyDoneBadge').textContent = `${total} 天`;

    const calendar = $('#challengeCalendar');
    const currentIndex = dayDiff(state.startDate, today);
    calendar.innerHTML = Array.from({ length: GOAL_DAYS }, (_, index) => {
      const key = addDays(state.startDate, index);
      const isDone = !!state.days[key]?.completed;
      const isToday = key === today;
      const isFuture = index > currentIndex;
      const isMissed = index < currentIndex && !isDone;
      return `<div class="day-dot ${isDone ? 'done' : ''} ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${isMissed ? 'missed' : ''}" title="第 ${index + 1} 天 · ${formatDate(key, false)}">${index + 1}</div>`;
    }).join('');

    const relevant = Object.keys(state.days)
      .filter(key => dayDiff(state.startDate, key) >= 0 && key <= today)
      .sort((a,b) => b.localeCompare(a))
      .slice(0, 14);

    $('#historyList').innerHTML = relevant.length ? relevant.map(key => {
      const day = state.days[key];
      const score = HABITS.filter(h => day.habits?.[h.id]).length;
      return `<div class="history-row">
        <div class="left">
          <span class="history-status ${day.completed ? 'done' : ''}">${day.completed ? '✓' : '·'}</span>
          <div><strong>${formatDate(key)}</strong><small>${day.completed ? '成功打卡' : '尚未完成'}</small></div>
        </div>
        <span class="history-score">${score}/${HABITS.length}</span>
      </div>`;
    }).join('') : '<p class="section-description">還沒有紀錄。從今天開始。</p>';
  }

  function renderRewards() {
    const total = completedDaysCount();
    const unlocked = REWARDS.filter(r => total >= r.day).length;
    $('#rewardCountBadge').textContent = `${unlocked} / ${REWARDS.length}`;
    $('#rewardGrid').innerHTML = REWARDS.map(reward => {
      const isUnlocked = total >= reward.day;
      return `<article class="reward-card ${isUnlocked ? 'unlocked' : ''} ${reward.day === 66 ? 'final' : ''}">
        <span class="reward-day">DAY ${reward.day}</span>
        ${isUnlocked ? '' : '<span class="reward-lock">⌁</span>'}
        <span class="reward-emoji">${isUnlocked ? reward.emoji : '🎁'}</span>
        <h3>${isUnlocked ? reward.title : `完成 ${reward.day} 天解鎖`}</h3>
        <p>${isUnlocked ? reward.copy : `還差 ${Math.max(0, reward.day - total)} 個成功打卡日。`}</p>
      </article>`;
    }).join('');
  }

  function renderAll() {
    renderHeader();
    renderToday();
    renderHistory();
    renderRewards();
    saveState();
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function launchConfetti() {
    const host = $('#confetti');
    host.innerHTML = '';
    const palette = ['#ffd56a','#ff7a22','#f04d28','#6ee7a8','#fff8f1'];
    for (let i = 0; i < 55; i += 1) {
      const piece = document.createElement('i');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = palette[Math.floor(Math.random() * palette.length)];
      piece.style.setProperty('--fall', `${1.7 + Math.random() * 1.5}s`);
      piece.style.setProperty('--drift', `${-90 + Math.random() * 180}px`);
      piece.style.setProperty('--rotate', `${Math.random() * 180}deg`);
      piece.style.animationDelay = `${Math.random() * .35}s`;
      host.appendChild(piece);
    }
    setTimeout(() => { host.innerHTML = ''; }, 3500);
  }

  function maybeShowNewReward(previousTotal, newTotal) {
    const reward = REWARDS.find(r => r.day > previousTotal && r.day <= newTotal && !state.seenRewards.includes(r.day));
    if (!reward) return;
    state.seenRewards.push(reward.day);
    saveState();
    $('#giftBurst').textContent = reward.emoji;
    $('#rewardModalTitle').textContent = `第 ${reward.day} 天 · ${reward.title}`;
    $('#rewardModalCopy').textContent = reward.copy;
    $('#rewardModal').hidden = false;
    launchConfetti();
  }

  function setPage(target) {
    activePage = target;
    $$('.page').forEach(page => page.classList.toggle('active', page.dataset.page === target));
    $$('.nav-item').forEach(button => {
      const active = button.dataset.target === target;
      button.classList.toggle('active', active);
      active ? button.setAttribute('aria-current','page') : button.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $('#habitList').addEventListener('click', (event) => {
    const row = event.target.closest('[data-habit]');
    if (!row) return;
    const day = ensureDay();
    if (day.completed) return;
    const id = row.dataset.habit;
    day.habits[id] = !day.habits[id];
    renderToday();
    saveState();
    if (navigator.vibrate) navigator.vibrate(18);
  });

  $('#dailyNote').addEventListener('input', (event) => {
    const day = ensureDay();
    if (day.completed) return;
    day.note = event.target.value;
    $('#noteCounter').textContent = `${day.note.length} / 240`;
    $('#noteSaved').textContent = '已儲存';
    saveState();
  });

  $('#completeDayButton').addEventListener('click', () => {
    const key = localDateKey();
    const day = ensureDay(key);
    if (day.completed) {
      const ok = confirm('要重新編輯今天嗎？重新編輯後，今天會先取消成功打卡，直到你再次完成 11 項。');
      if (!ok) return;
      day.completed = false;
      day.completedAt = null;
      renderAll();
      showToast('今天已重新開放編輯');
      return;
    }

    const count = currentHabitCount();
    if (count !== HABITS.length) return;
    const previousTotal = completedDaysCount();
    day.completed = true;
    day.completedAt = new Date().toISOString();
    saveState();
    const newTotal = completedDaysCount();
    renderAll();
    launchConfetti();
    showToast(`第 ${newTotal} 個成功日完成 ✓`);
    maybeShowNewReward(previousTotal, newTotal);
  });

  $$('.nav-item').forEach(button => button.addEventListener('click', () => setPage(button.dataset.target)));

  $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => { $('#rewardModal').hidden = true; }));
  $('#rewardModal').addEventListener('click', (event) => { if (event.target === $('#rewardModal')) $('#rewardModal').hidden = true; });

  $('#settingsButton').addEventListener('click', () => {
    $('#startDateInput').value = state.startDate;
    $('#settingsModal').hidden = false;
  });
  $$('[data-close-settings]').forEach(button => button.addEventListener('click', () => { $('#settingsModal').hidden = true; }));
  $('#settingsModal').addEventListener('click', (event) => { if (event.target === $('#settingsModal')) $('#settingsModal').hidden = true; });

  $('#startDateInput').addEventListener('change', (event) => {
    if (!event.target.value) return;
    state.startDate = event.target.value;
    renderAll();
    showToast('開始日已更新');
  });

  $('#exportButton').addEventListener('click', () => {
    const payload = JSON.stringify({ app: '66 DAYS', exportedAt: new Date().toISOString(), data: state }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `66days-backup-${localDateKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('備份已匯出');
  });

  $('#importInput').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const imported = parsed.data || parsed;
      if (!imported.startDate || typeof imported.days !== 'object') throw new Error('invalid');
      state = { ...defaultState(), ...imported };
      saveState();
      renderAll();
      $('#settingsModal').hidden = true;
      showToast('備份已匯入');
    } catch {
      alert('這個檔案不是有效的 66 DAYS 備份。');
    } finally {
      event.target.value = '';
    }
  });

  $('#resetButton').addEventListener('click', () => {
    const ok = confirm('確定要清除全部打卡紀錄嗎？這個動作無法復原。');
    if (!ok) return;
    state = defaultState();
    saveState();
    renderAll();
    $('#settingsModal').hidden = true;
    setPage('today');
    showToast('全部紀錄已清除');
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  ensureDay();
  renderAll();
})();
