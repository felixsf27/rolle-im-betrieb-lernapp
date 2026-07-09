// ---------- State ----------
const STORAGE_KEY = "rolleImBetrieb.progress.v1";
const STREAK_KEY = "rolleImBetrieb.streak.v1";

let state = {
  mode: "quiz",
  currentSubject: null,
  currentTopic: null,
  queue: [],
  index: 0,
  correctCount: 0,
  answered: false,
};

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveProgress(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

function bumpStreak() {
  const today = new Date().toISOString().slice(0, 10);
  let s = JSON.parse(localStorage.getItem(STREAK_KEY) || "null") || { last: null, count: 0 };
  if (s.last === today) return s.count;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  s.count = s.last === yesterday ? s.count + 1 : 1;
  s.last = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(s));
  return s.count;
}
function getStreak() {
  const s = JSON.parse(localStorage.getItem(STREAK_KEY) || "null") || { count: 0 };
  return s.count;
}

// ---------- Utilities ----------
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function $(sel) { return document.querySelector(sel); }
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  $(id).classList.remove("hidden");
}

// ---------- Subject grid rendering ----------
function renderSubjects() {
  const grid = $("#subjectGrid");
  grid.innerHTML = "";
  SUBJECTS.forEach(s => {
    const topicCount = TOPICS.filter(t => t.subject === s.id).length;
    const card = document.createElement("div");
    card.className = "topic-card";
    card.innerHTML = `
      <span class="icon">${s.icon}</span>
      <div class="title">${s.title}</div>
      <div class="meta">${topicCount} Themen</div>
    `;
    card.addEventListener("click", () => goToSubject(s.id));
    grid.appendChild(card);
  });
}

// ---------- Topic grid rendering ----------
function topicStats(topicId) {
  const qCount = QUESTIONS.filter(q => q.topic === topicId).length;
  const cCount = FLASHCARDS.filter(c => c.topic === topicId).length;
  const progress = loadProgress();
  const done = progress[topicId]?.bestScore || 0;
  const total = state.mode === "cards" ? cCount : qCount;
  return { total, done, qCount, cCount };
}

function renderTopics() {
  const grid = $("#topicGrid");
  grid.innerHTML = "";
  TOPICS.filter(t => t.subject === state.currentSubject).forEach(t => {
    const stats = topicStats(t.id);
    const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
    const card = document.createElement("div");
    card.className = "topic-card";
    card.innerHTML = `
      <span class="icon">${t.icon}</span>
      <div class="title">${t.title}</div>
      <div class="meta">${state.mode === "cards" ? stats.cCount + " Karten" : stats.qCount + " Fragen"}</div>
      <div class="mastery-bar"><div class="mastery-fill" style="width:${pct}%"></div></div>
    `;
    card.addEventListener("click", () => startTopic(t.id));
    grid.appendChild(card);
  });
  $("#streakBadge").textContent = "🔥 " + getStreak();
}

// ---------- Mode picker ----------
document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
    renderTopics();
  });
});

$("#homeBtn").addEventListener("click", goHome);
$("#backFromSubject").addEventListener("click", goHome);
$("#homeFromResult").addEventListener("click", () => goToSubject(state.currentSubject));
$("#backFromQuiz").addEventListener("click", () => goToSubject(state.currentSubject));
$("#backFromCards").addEventListener("click", () => goToSubject(state.currentSubject));

function goHome() {
  state.currentSubject = null;
  showView("#view-home");
  renderSubjects();
}

function goToSubject(subjectId) {
  state.currentSubject = subjectId;
  $("#subjectTitle").textContent = SUBJECTS.find(s => s.id === subjectId)?.title || "";
  showView("#view-subject");
  renderTopics();
}

function startTopic(topicId) {
  state.currentTopic = topicId;
  if (state.mode === "cards") startCards(topicId);
  else startQuiz(topicId);
}

// ---------- QUIZ ----------
function startQuiz(topicId) {
  const pool = shuffle(QUESTIONS.filter(q => q.topic === topicId));
  state.queue = pool;
  state.index = 0;
  state.correctCount = 0;
  showView("#view-quiz");
  renderQuestion();
}

function renderQuestion() {
  state.answered = false;
  const q = state.queue[state.index];
  const total = state.queue.length;
  $("#quizProgress").style.width = ((state.index) / total * 100) + "%";
  $("#quizScore").textContent = state.correctCount + " / " + total;
  const topicMeta = TOPICS.find(t => t.id === q.topic);
  $("#qTopicLabel").textContent = (topicMeta ? topicMeta.icon + " " + topicMeta.title : "") +
    (q.type === "multi" ? " · Mehrfachauswahl" : "");
  $("#qText").textContent = q.q;
  $("#qFeedback").classList.add("hidden");
  $("#qNextBtn").classList.add("hidden");

  const optWrap = $("#qOptions");
  optWrap.innerHTML = "";
  const order = q.options.map((opt, i) => ({ opt, i }));
  // keep option order stable (already curated), but could shuffle; shuffle for replay value
  const shuffled = shuffle(order);
  let selected = [];

  shuffled.forEach(({ opt, i }) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = opt;
    btn.addEventListener("click", () => {
      if (state.answered) return;
      if (q.type === "multi") {
        btn.classList.toggle("selected");
        const isSel = btn.classList.contains("selected");
        if (isSel) selected.push(i); else selected = selected.filter(x => x !== i);
      } else {
        selected = [i];
        submitAnswer(q, selected, shuffled);
      }
    });
    optWrap.appendChild(btn);
  });

  if (q.type === "multi") {
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "primary-btn";
    confirmBtn.textContent = "Antwort prüfen";
    confirmBtn.addEventListener("click", () => submitAnswer(q, selected, shuffled, confirmBtn));
    optWrap.appendChild(confirmBtn);
  }
}

function submitAnswer(q, selected, shuffledOrder, confirmBtnEl) {
  if (state.answered) return;
  state.answered = true;
  if (confirmBtnEl) confirmBtnEl.remove();

  const correctSet = new Set(q.correct);
  const selSet = new Set(selected);
  const isCorrect = correctSet.size === selSet.size && [...correctSet].every(x => selSet.has(x));

  document.querySelectorAll("#qOptions .option").forEach((btn, idx) => {
    const originalIndex = shuffledOrder[idx].i;
    btn.disabled = true;
    if (correctSet.has(originalIndex)) btn.classList.add("correct");
    else if (selSet.has(originalIndex)) btn.classList.add("incorrect");
  });

  const fb = $("#qFeedback");
  fb.classList.remove("hidden", "good", "bad");
  if (isCorrect) {
    fb.classList.add("good");
    fb.textContent = "✅ Richtig!";
    state.correctCount++;
  } else {
    fb.classList.add("bad");
    const correctTexts = q.options.filter((_, i) => correctSet.has(i));
    fb.textContent = "❌ Nicht ganz. Richtig: " + correctTexts.join(", ");
  }
  $("#qNextBtn").classList.remove("hidden");
  $("#quizScore").textContent = state.correctCount + " / " + state.queue.length;
}

$("#qNextBtn").addEventListener("click", () => {
  state.index++;
  if (state.index >= state.queue.length) {
    finishQuiz();
  } else {
    renderQuestion();
  }
});

function finishQuiz() {
  $("#quizProgress").style.width = "100%";
  const total = state.queue.length;
  const pct = total ? Math.round((state.correctCount / total) * 100) : 0;

  const progress = loadProgress();
  const prevBest = progress[state.currentTopic]?.bestScore || 0;
  progress[state.currentTopic] = { bestScore: Math.max(prevBest, state.correctCount), total };
  saveProgress(progress);
  bumpStreak();

  $("#resultEmoji").textContent = pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚";
  $("#resultTitle").textContent = pct >= 80 ? "Stark!" : pct >= 50 ? "Gut gemacht!" : "Weiter üben!";
  $("#resultText").textContent = `Du hattest ${state.correctCount} von ${total} Fragen richtig (${pct}%).`;
  showView("#view-result");
}

$("#retryBtn").addEventListener("click", () => {
  if (state.mode === "cards") startCards(state.currentTopic);
  else startQuiz(state.currentTopic);
});

// ---------- FLASHCARDS ----------
function startCards(topicId) {
  const pool = shuffle(FLASHCARDS.filter(c => c.topic === topicId));
  state.queue = pool;
  state.index = 0;
  showView("#view-cards");
  renderCard();
}

function renderCard() {
  const c = state.queue[state.index];
  const total = state.queue.length;
  $("#cardProgress").style.width = (state.index / total * 100) + "%";
  $("#cardCount").textContent = (state.index + 1) + " / " + total;
  const topicMeta = TOPICS.find(t => t.id === c.topic);
  $("#cardTopicLabel").textContent = topicMeta ? topicMeta.icon + " " + topicMeta.title : "";
  $("#cardFront").textContent = c.front;
  $("#cardBack").textContent = c.back;
  $("#flipcard").classList.remove("flipped");
}

$("#flipcard").addEventListener("click", () => {
  $("#flipcard").classList.toggle("flipped");
});

function nextCard() {
  state.index++;
  if (state.index >= state.queue.length) {
    bumpStreak();
    $("#resultEmoji").textContent = "🗂️";
    $("#resultTitle").textContent = "Karten durch!";
    $("#resultText").textContent = `Du hast alle ${state.queue.length} Karteikarten zu diesem Thema durchgesehen.`;
    showView("#view-result");
  } else {
    renderCard();
  }
}

$("#cardKnewBtn").addEventListener("click", nextCard);
$("#cardRepeatBtn").addEventListener("click", () => {
  const c = state.queue[state.index];
  state.queue.push(c);
  nextCard();
});

// ---------- Theme toggle support (host may set data-theme on <html>) ----------
// no-op here; CSS handles via prefers-color-scheme + [data-theme] overrides

// ---------- PWA: service worker + install prompt ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}

let deferredInstallPrompt = null;
const installBtn = $("#installBtn");

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (installBtn) installBtn.classList.remove("hidden");
});

if (installBtn) {
  installBtn.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installBtn.classList.add("hidden");
  });
}

window.addEventListener("appinstalled", () => {
  if (installBtn) installBtn.classList.add("hidden");
});

// ---------- Init ----------
goHome();
