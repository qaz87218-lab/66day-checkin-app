(() => {
  'use strict';

  // Keep the original storage key so existing users are migrated in place.
  const STORAGE_KEY = '66days-checkin-v1';
  const APP_VERSION = 4;
  const CUSTOM_DAILY_EXP_CAP = 200;

  const DEFAULT_HABITS = [
    { id: 'run', icon: '🏃', title: '每天跑步', detail: '有出去跑就算完成', difficulty: 3, exp: 30 },
    { id: 'pushups', icon: '💪', title: '每天伏地挺身', detail: '完成今天為自己設定的組數', difficulty: 2, exp: 20 },
    { id: 'read', icon: '📖', title: '每天讀 10 頁', detail: '任何你想讀的書都可以', difficulty: 2, exp: 20 },
    { id: 'water', icon: '💧', title: '喝 3.5 公升水', detail: '今天累積 3.5 L', difficulty: 1, exp: 10 },
    { id: 'meditate', icon: '🧘', title: '冥想 20 分鐘', detail: '一次完成或分段都可以', difficulty: 2, exp: 20 },
    { id: 'wake', icon: '🌅', title: '7 點前起床', detail: '07:00 前離開床', difficulty: 2, exp: 20 },
    { id: 'cold', icon: '🚿', title: '冷水澡一次', detail: '完成一次冷水沖洗', difficulty: 2, exp: 20 },
    { id: 'social', icon: '📵', title: '不用社群媒體', detail: '今天不滑社群動態', difficulty: 3, exp: 30 },
    { id: 'exercise', icon: '🏋️', title: '運動 1 小時', detail: '累積運動滿 60 分鐘', difficulty: 4, exp: 40 },
    { id: 'journal', icon: '✍️', title: '每天寫日記', detail: '長短不限，留下紀錄即可', difficulty: 2, exp: 20 },
    { id: 'gratitude', icon: '✨', title: '心存感激', detail: '寫下或想起至少一件感激的事', difficulty: 1, exp: 10 },
  ];

  const STREAK_BONUSES = new Map([
    [7, 30],
    [30, 100],
    [66, 200],
    [100, 300],
    [365, 1000],
  ]);

  const TITLES = [
    { level: 1, icon: '◈', title: '無名之人', copy: '一切尚未被命名。從今天開始，用行動刻下第一道痕跡。' },
    { level: 10, icon: '✦', title: '誓約者', copy: '你已經不再只靠一時的衝動，而是開始履行對自己的誓約。' },
    { level: 20, icon: '⚔️', title: '戒律行者', copy: '規則不再是束縛，而是你選擇前進的道路。' },
    { level: 30, icon: '⛓️', title: '鋼鐵意志', copy: '惰性開始失去支配你的力量。你的意志正在成形。' },
    { level: 40, icon: '🔥', title: '破惰者', copy: '你已跨過一次又一次想放棄的瞬間，斬斷舊有慣性。' },
    { level: 50, icon: '🛡️', title: '自律騎士', copy: '自律已不是任務，而是你的戰鬥方式。' },
    { level: 60, icon: '⚜️', title: '戒律騎士長', copy: '你不只守住承諾，也開始能駕馭自己的節奏。' },
    { level: 70, icon: '☄️', title: '命運執行者', copy: '不再等待狀態與時機。你開始主動執行自己選擇的命運。' },
    { level: 80, icon: '♛', title: '不屈之王', copy: '中斷不再等於結束。你學會一次次重新站回自己的王座。' },
    { level: 90, icon: '✧', title: '超越者', copy: '你的對手已經不是昨天的懶惰，而是今天能否超越昨天的自己。' },
    { level: 100, icon: '👑', title: '自我支配者', copy: '第一階段完成。你不再被習慣支配，而開始支配自己的習慣。' },
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

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[char]);
  }

  function defaultState() {
    return {
      version: APP_VERSION,
      startDate: localDateKey(),
      days: {},
      customHabits: [],
      defaultHabitOverrides: {},
    };
  }

  function migrateState(rawState) {
    const base = defaultState();
    if (!rawState || typeof rawState !== 'object') return base;

    const migrated = {
      ...base,
      ...rawState,
      version: APP_VERSION,
      days: rawState.days && typeof rawState.days === 'object' ? rawState.days : {},
      customHabits: Array.isArray(rawState.customHabits) ? rawState.customHabits : [],
      defaultHabitOverrides: rawState.defaultHabitOverrides && typeof rawState.defaultHabitOverrides === 'object' ? rawState.defaultHabitOverrides : {},
    };

    Object.entries(migrated.days).forEach(([key, day]) => {
      if (!day || typeof day !== 'object') migrated.days[key] = { habits: {}, note: '' };
      migrated.days[key].habits = migrated.days[key].habits && typeof migrated.days[key].habits === 'object'
        ? migrated.days[key].habits
        : {};
      migrated.days[key].note = migrated.days[key].note || '';
      migrated.days[key].corrections = Array.isArray(migrated.days[key].corrections) ? migrated.days[key].corrections : [];
      // Old v1 fields such as `completed` are intentionally left in place for backup compatibility,
      // but v2 no longer uses them to decide whether a day counts.
    });

    migrated.customHabits = migrated.customHabits.map((habit) => ({
      ...habit,
      difficulty: Math.min(5, Math.max(1, Number(habit.difficulty) || 2)),
      exp: Number(habit.exp) || (Math.min(5, Math.max(1, Number(habit.difficulty) || 2)) * 10),
      createdAt: habit.createdAt || migrated.startDate,
      active: habit.active !== false,
      archivedAt: habit.archivedAt || null,
      custom: true,
    }));

    return migrated;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? migrateState(JSON.parse(raw)) : defaultState();
    } catch {
      return defaultState();
    }
  }

  let state = loadState();
  let toastTimer;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getAllHabits(includeArchived = true) {
    const defaults = DEFAULT_HABITS.map((habit) => {
      const override = state.defaultHabitOverrides?.[habit.id] || {};
      return {
        ...habit,
        createdAt: state.startDate,
        archivedAt: override.archivedAt || null,
        active: override.active !== false,
        custom: false,
      };
    });
    const all = [...defaults, ...state.customHabits];
    return includeArchived ? all : all.filter((habit) => habit.active !== false);
  }

  function getActiveHabits() {
    return getAllHabits(false);
  }

  function getHabitMap() {
    return new Map(getAllHabits(true).map((habit) => [habit.id, habit]));
  }

  function habitAvailableOnDate(habit, key) {
    if (!habit) return false;
    if (habit.createdAt && key < habit.createdAt) return false;
    if (habit.archivedAt && key > habit.archivedAt) return false;
    return true;
  }

  function ensureDay(key = localDateKey()) {
    if (!state.days[key]) state.days[key] = { habits: {}, note: '' };
    const day = state.days[key];
    day.habits = day.habits && typeof day.habits === 'object' ? day.habits : {};
    getActiveHabits().forEach((habit) => {
      if (!(habit.id in day.habits)) day.habits[habit.id] = false;
    });
    day.note = day.note || '';
    day.corrections = Array.isArray(day.corrections) ? day.corrections : [];
    return day;
  }

  function completedKeysForHabit(habitId) {
    const habit = getHabitMap().get(habitId);
    if (!habit) return [];
    return Object.keys(state.days)
      .filter((key) => key <= localDateKey() && habitAvailableOnDate(habit, key) && !!state.days[key]?.habits?.[habitId])
      .sort();
  }

  function getHabitStats(habitId) {
    const keys = completedKeysForHabit(habitId);
    let best = 0;
    let segment = 0;
    let previous = null;

    keys.forEach((key) => {
      segment = previous && dayDiff(previous, key) === 1 ? segment + 1 : 1;
      best = Math.max(best, segment);
      previous = key;
    });

    let current = 0;
    if (keys.length) {
      const last = keys[keys.length - 1];
      const today = localDateKey();
      if (last === today || last === addDays(today, -1)) {
        current = 1;
        for (let i = keys.length - 2; i >= 0; i -= 1) {
          if (dayDiff(keys[i], keys[i + 1]) === 1) current += 1;
          else break;
        }
      }
    }

    return { total: keys.length, current, best };
  }

  function buildXpLedger() {
    const habitMap = getHabitMap();
    const ledger = {};
    const today = localDateKey();

    Object.keys(state.days).filter((key) => key <= today).forEach((key) => {
      const day = state.days[key];
      let builtInBase = 0;
      let customBase = 0;

      Object.entries(day.habits || {}).forEach(([habitId, done]) => {
        if (!done) return;
        const habit = habitMap.get(habitId);
        if (!habit || !habitAvailableOnDate(habit, key)) return;
        if (habit.custom) customBase += habit.exp;
        else builtInBase += habit.exp;
      });

      ledger[key] = builtInBase + Math.min(CUSTOM_DAILY_EXP_CAP, customBase);
    });

    habitMap.forEach((habit, habitId) => {
      const keys = completedKeysForHabit(habitId);
      let streak = 0;
      let previous = null;
      keys.forEach((key) => {
        streak = previous && dayDiff(previous, key) === 1 ? streak + 1 : 1;
        const bonus = STREAK_BONUSES.get(streak) || 0;
        if (bonus) ledger[key] = (ledger[key] || 0) + bonus;
        previous = key;
      });
    });

    return ledger;
  }

  function totalExp() {
    return Object.values(buildXpLedger()).reduce((sum, value) => sum + value, 0);
  }

  function expNeededForLevel(level) {
    return level >= 100 ? 2080 : 100 + (level - 1) * 20;
  }

  function levelFromExp(exp) {
    let level = 1;
    let remaining = Math.max(0, exp);
    while (remaining >= expNeededForLevel(level)) {
      remaining -= expNeededForLevel(level);
      level += 1;
    }
    return {
      level,
      currentExp: remaining,
      neededExp: expNeededForLevel(level),
    };
  }

  function titleForLevel(level) {
    return [...TITLES].reverse().find((entry) => level >= entry.level) || TITLES[0];
  }

  function disciplineDateKeys() {
    const habitMap = getHabitMap();
    return Object.keys(state.days)
      .filter((key) => key <= localDateKey())
      .filter((key) => Object.entries(state.days[key]?.habits || {}).some(([habitId, done]) => {
        const habit = habitMap.get(habitId);
        return !!done && habitAvailableOnDate(habit, key);
      }))
      .sort();
  }

  function dailyCompletedCount(key) {
    const habitMap = getHabitMap();
    return Object.entries(state.days[key]?.habits || {}).filter(([habitId, done]) => {
      const habit = habitMap.get(habitId);
      return !!done && habitAvailableOnDate(habit, key);
    }).length;
  }

  function availableHabitCountOnDate(key) {
    return getAllHabits(true).filter((habit) => {
      if (!habitAvailableOnDate(habit, key)) return false;
      // If a task is removed today before it was completed, it should stop counting immediately.
      if (habit.active === false && habit.archivedAt === key && !state.days[key]?.habits?.[habit.id]) return false;
      return true;
    }).length;
  }

  function renderHeader() {
    const exp = totalExp();
    const info = levelFromExp(exp);
    const title = titleForLevel(info.level);
    const progress = info.neededExp ? (info.currentExp / info.neededExp) * 100 : 0;

    $('#levelNumber').textContent = info.level;
    $('#currentTitle').textContent = title.title;
    $('#progressHeadline').textContent = `距離 Lv.${info.level + 1}`;
    $('#levelProgressText').textContent = `${info.currentExp.toLocaleString()} / ${info.neededExp.toLocaleString()} EXP`;
    $('#disciplineDays').textContent = disciplineDateKeys().length.toLocaleString();
    $('#totalExp').textContent = exp.toLocaleString();
    $('#progressRing').style.setProperty('--progress', `${Math.min(100, progress) * 3.6}deg`);
    $('#xpBarFill').style.width = `${Math.min(100, progress)}%`;
  }

  function renderToday() {
    const key = localDateKey();
    const day = ensureDay(key);
    const habits = getActiveHabits();
    const count = habits.filter((habit) => !!day.habits[habit.id]).length;
    const ledger = buildXpLedger();

    $('#todayDate').textContent = formatDate(key);
    $('#todayCount').textContent = `${count} / ${habits.length}`;
    $('#todayXp').textContent = `+${(ledger[key] || 0).toLocaleString()} EXP`;

    const messages = [
      '每完成一項，就算今天向前一步。',
      '不是全部做完才算數；每一項完成都會留下紀錄。',
      '連續很強，但中斷也不會抹掉你曾經累積的天數。',
      '把最難的一項先斬掉，今天就會容易很多。',
      '66 天不是終點，只是你會經過的一座里程碑。',
    ];
    $('#dailyMessage').firstElementChild.textContent = messages[Math.abs(dayDiff(state.startDate, key)) % messages.length];

    $('#habitList').innerHTML = habits.map((habit) => {
      const checked = !!day.habits[habit.id];
      const stats = getHabitStats(habit.id);
      const stars = '★'.repeat(habit.difficulty);
      return `
        <div class="habit-row ${checked ? 'done locked' : ''}" data-habit="${escapeHtml(habit.id)}" role="button" tabindex="0" aria-pressed="${checked}">
          <span class="habit-icon">${escapeHtml(habit.icon)}</span>
          <span class="habit-copy">
            <span class="habit-title-line"><strong>${escapeHtml(habit.title)}</strong><em>+${habit.exp} EXP</em></span>
            <small>${escapeHtml(habit.detail || `${stars} 難度`)}</small>
            <span class="habit-stats"><b>累積 ${stats.total}</b><b>🔥 ${stats.current}</b><b>最佳 ${stats.best}</b></span>
            ${checked ? `<button class="habit-undo" type="button" data-undo-habit="${escapeHtml(habit.id)}">誤點？撤回</button>` : ''}
          </span>
          <button class="habit-delete" type="button" data-delete-habit="${escapeHtml(habit.id)}" aria-label="刪除 ${escapeHtml(habit.title)}">×</button>
          <span class="habit-check" aria-label="${checked ? '已完成並鎖定' : '未完成'}">${checked ? '✓' : ''}</span>
        </div>`;
    }).join('');

    const note = $('#dailyNote');
    note.value = day.note;
    note.disabled = false;
    $('#noteCounter').textContent = `${day.note.length} / 240`;
  }

  function renderHistory() {
    const today = localDateKey();
    const total = disciplineDateKeys().length;
    const ledger = buildXpLedger();
    $('#historyDoneBadge').textContent = `${total.toLocaleString()} 天`;

    const elapsed = Math.max(1, dayDiff(state.startDate, today) + 1);
    const displayDays = Math.min(70, elapsed);
    const rangeStart = addDays(today, -(displayDays - 1));

    $('#challengeCalendar').innerHTML = Array.from({ length: displayDays }, (_, index) => {
      const key = addDays(rangeStart, index);
      const done = dailyCompletedCount(key) > 0;
      const isToday = key === today;
      return `<div class="day-dot ${done ? 'done' : 'missed'} ${isToday ? 'today' : ''}" title="${formatDate(key, false)} · ${dailyCompletedCount(key)} 項">${parseLocalDate(key).getDate()}</div>`;
    }).join('');

    const recentDays = Math.min(14, elapsed);
    const keys = Array.from({ length: recentDays }, (_, index) => addDays(today, -index));
    $('#historyList').innerHTML = keys.map((key) => {
      const doneCount = dailyCompletedCount(key);
      const totalTasks = availableHabitCountOnDate(key);
      const isDisciplineDay = doneCount > 0;
      const note = state.days[key]?.note?.trim();
      return `<div class="history-row">
        <div class="left">
          <span class="history-status ${isDisciplineDay ? 'done' : ''}">${isDisciplineDay ? '✓' : '·'}</span>
          <div><strong>${formatDate(key)}</strong><small>${note ? escapeHtml(note) : (isDisciplineDay ? '今日有完成任務' : '沒有完成紀錄')}</small></div>
        </div>
        <span class="history-score">${doneCount}/${totalTasks}<small>+${(ledger[key] || 0).toLocaleString()} EXP</small></span>
      </div>`;
    }).join('');
  }

  function renderRewards() {
    const level = levelFromExp(totalExp()).level;
    const unlocked = TITLES.filter((title) => level >= title.level).length;
    $('#rewardCountBadge').textContent = `${unlocked} / ${TITLES.length}`;

    $('#rewardGrid').innerHTML = TITLES.map((title) => {
      const isUnlocked = level >= title.level;
      const isCurrent = titleForLevel(level).level === title.level;
      return `<article class="reward-card ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'current-rank' : ''}">
        <span class="reward-day">LV.${title.level}</span>
        ${isUnlocked ? '' : '<span class="reward-lock">⌁</span>'}
        <span class="reward-emoji">${isUnlocked ? title.icon : '◇'}</span>
        <h3>${isUnlocked ? title.title : `Lv.${title.level} 解放`}</h3>
        <p>${isUnlocked ? title.copy : `還需要 ${Math.max(0, title.level - level)} 個等級。`}</p>
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
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
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

  function showTitleUnlock(title) {
    $('#giftBurst').textContent = title.icon;
    $('#rewardModalTitle').textContent = `Lv.${title.level} · ${title.title}`;
    $('#rewardModalCopy').textContent = title.copy;
    $('#rewardModal').hidden = false;
    launchConfetti();
  }

  function maybeShowLevelChange(beforeExp, afterExp) {
    const before = levelFromExp(beforeExp);
    const after = levelFromExp(afterExp);
    if (after.level <= before.level) return false;

    const newlyUnlocked = TITLES.filter((title) => title.level > before.level && title.level <= after.level).pop();
    if (newlyUnlocked) {
      showTitleUnlock(newlyUnlocked);
      return true;
    }

    launchConfetti();
    showToast(`LEVEL UP！Lv.${after.level}`);
    return true;
  }

  function setPage(target) {
    $$('.page').forEach((page) => page.classList.toggle('active', page.dataset.page === target));
    $$('.nav-item').forEach((button) => {
      const active = button.dataset.target === target;
      button.classList.toggle('active', active);
      active ? button.setAttribute('aria-current', 'page') : button.removeAttribute('aria-current');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function completeHabit(habitId) {
    const habit = getHabitMap().get(habitId);
    if (!habit || !habit.active) return;

    const day = ensureDay();
    const wasDone = !!day.habits[habitId];
    if (wasDone) {
      showToast('這項任務已完成並鎖定；若真的點錯，請使用「誤點？撤回」');
      return;
    }

    const beforeExp = totalExp();
    day.habits[habitId] = true;
    saveState();
    const afterExp = totalExp();
    const afterStats = getHabitStats(habitId);
    renderAll();

    const gained = Math.max(0, afterExp - beforeExp);
    const bonus = STREAK_BONUSES.get(afterStats.current) || 0;
    if (!maybeShowLevelChange(beforeExp, afterExp)) {
      showToast(bonus ? `+${gained} EXP · 🔥 ${afterStats.current} 天里程碑！` : `+${gained} EXP · ${habit.title}`);
    }

    if (navigator.vibrate) navigator.vibrate(18);
  }

  function archiveHabit(habitId) {
    const habit = getHabitMap().get(habitId);
    if (!habit || habit.active === false) return;
    const today = localDateKey();
    const ok = confirm(`要刪除「${habit.title}」嗎？\n\n它會立刻從每日任務中消失，但過去的完成紀錄、累積天數與已取得 EXP 都會保留。`);
    if (!ok) return;

    if (habit.custom) {
      const target = state.customHabits.find((item) => item.id === habitId);
      if (!target) return;
      target.active = false;
      target.archivedAt = today;
    } else {
      state.defaultHabitOverrides[habitId] = { active: false, archivedAt: today };
    }

    saveState();
    renderAll();
    showToast('任務已刪除，歷史紀錄保留');
  }

  let pendingUndoHabitId = null;

  function openUndoModal(habitId) {
    const habit = getHabitMap().get(habitId);
    const day = ensureDay();
    if (!habit || !day.habits[habitId]) return;
    pendingUndoHabitId = habitId;
    $('#undoTaskName').textContent = habit.title;
    $('#undoReasonInput').value = '';
    $('#undoModal').hidden = false;
    setTimeout(() => $('#undoReasonInput').focus(), 50);
  }

  function closeUndoModal() {
    pendingUndoHabitId = null;
    $('#undoModal').hidden = true;
    $('#undoReasonInput').value = '';
  }

  $('#habitList').addEventListener('click', (event) => {
    const deleteButton = event.target.closest('[data-delete-habit]');
    if (deleteButton) {
      event.stopPropagation();
      archiveHabit(deleteButton.dataset.deleteHabit);
      return;
    }

    const undoButton = event.target.closest('[data-undo-habit]');
    if (undoButton) {
      event.stopPropagation();
      openUndoModal(undoButton.dataset.undoHabit);
      return;
    }

    const row = event.target.closest('[data-habit]');
    if (!row) return;
    completeHabit(row.dataset.habit);
  });

  $('#habitList').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('[data-delete-habit], [data-undo-habit]')) return;
    const row = event.target.closest('[data-habit]');
    if (!row) return;
    event.preventDefault();
    completeHabit(row.dataset.habit);
  });

  $$('[data-close-undo]').forEach((button) => button.addEventListener('click', closeUndoModal));
  $('#undoModal').addEventListener('click', (event) => { if (event.target === $('#undoModal')) closeUndoModal(); });

  $('#undoForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!pendingUndoHabitId) return;
    const reason = $('#undoReasonInput').value.trim();
    if (reason.length < 2) {
      $('#undoReasonInput').setCustomValidity('請寫下取消理由');
      $('#undoReasonInput').reportValidity();
      return;
    }
    $('#undoReasonInput').setCustomValidity('');

    const habitId = pendingUndoHabitId;
    const habit = getHabitMap().get(habitId);
    const day = ensureDay();
    if (!habit || !day.habits[habitId]) {
      closeUndoModal();
      return;
    }

    const beforeExp = totalExp();
    day.habits[habitId] = false;
    day.corrections.push({
      habitId,
      reason,
      cancelledAt: new Date().toISOString(),
    });
    saveState();
    const afterExp = totalExp();
    const lost = Math.max(0, beforeExp - afterExp);
    closeUndoModal();
    renderAll();
    showToast(lost ? `已撤回完成 · -${lost} EXP` : '已撤回今天的完成紀錄');
  });

  $('#dailyNote').addEventListener('input', (event) => {
    const day = ensureDay();
    day.note = event.target.value;
    $('#noteCounter').textContent = `${day.note.length} / 240`;
    $('#noteSaved').textContent = '已儲存';
    saveState();
  });

  $('#addTaskButton').addEventListener('click', () => {
    $('#taskForm').reset();
    $('#taskIconInput').value = '⚔️';
    $('#taskDifficultyInput').value = '2';
    $('#taskModal').hidden = false;
    setTimeout(() => $('#taskTitleInput').focus(), 50);
  });

  $$('[data-close-task]').forEach((button) => button.addEventListener('click', () => { $('#taskModal').hidden = true; }));
  $('#taskModal').addEventListener('click', (event) => { if (event.target === $('#taskModal')) $('#taskModal').hidden = true; });

  $('#taskForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const title = $('#taskTitleInput').value.trim();
    if (!title) return;
    const detail = $('#taskDetailInput').value.trim();
    const icon = $('#taskIconInput').value.trim() || '⚔️';
    const difficulty = Math.min(5, Math.max(1, Number($('#taskDifficultyInput').value) || 2));

    state.customHabits.push({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      icon,
      title,
      detail,
      difficulty,
      exp: difficulty * 10,
      createdAt: localDateKey(),
      archivedAt: null,
      active: true,
      custom: true,
    });

    saveState();
    $('#taskModal').hidden = true;
    renderAll();
    showToast(`新任務已建立 · +${difficulty * 10} EXP/天`);
  });

  $$('.nav-item').forEach((button) => button.addEventListener('click', () => setPage(button.dataset.target)));

  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => { $('#rewardModal').hidden = true; }));
  $('#rewardModal').addEventListener('click', (event) => { if (event.target === $('#rewardModal')) $('#rewardModal').hidden = true; });

  $('#settingsButton').addEventListener('click', () => {
    $('#startDateInput').value = state.startDate;
    $('#settingsModal').hidden = false;
  });
  $$('[data-close-settings]').forEach((button) => button.addEventListener('click', () => { $('#settingsModal').hidden = true; }));
  $('#settingsModal').addEventListener('click', (event) => { if (event.target === $('#settingsModal')) $('#settingsModal').hidden = true; });

  $('#startDateInput').addEventListener('change', (event) => {
    if (!event.target.value) return;
    const oldStart = state.startDate;
    state.startDate = event.target.value;
    // Built-in habits follow the journey start. Custom task creation dates remain unchanged.
    if (oldStart !== state.startDate) renderAll();
    showToast('開始使用日已更新');
  });

  $('#exportButton').addEventListener('click', () => {
    const payload = JSON.stringify({ app: '66 自律', version: APP_VERSION, exportedAt: new Date().toISOString(), data: state }, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `66-self-discipline-backup-${localDateKey()}.json`;
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
      state = migrateState(imported);
      saveState();
      renderAll();
      $('#settingsModal').hidden = true;
      showToast('備份已匯入');
    } catch {
      alert('這個檔案不是有效的 66 自律備份。');
    } finally {
      event.target.value = '';
    }
  });

  $('#resetButton').addEventListener('click', () => {
    const ok = confirm('確定要清除全部任務、EXP 與打卡紀錄嗎？這個動作無法復原。');
    if (!ok) return;
    state = defaultState();
    saveState();
    renderAll();
    $('#settingsModal').hidden = true;
    setPage('today');
    showToast('全部紀錄已清除');
  });

  let renderedDateKey = localDateKey();

  function handleDateRollover() {
    const nowKey = localDateKey();
    if (nowKey === renderedDateKey) return;
    renderedDateKey = nowKey;
    ensureDay(nowKey);
    renderAll();
    setPage('today');
    showToast('新的一天開始了，今日任務已更新');
  }

  // Keep an installed PWA correct even if it stays open across midnight.
  setInterval(handleDateRollover, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) handleDateRollover(); });
  window.addEventListener('focus', handleDateRollover);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  ensureDay();
  renderAll();
})();
