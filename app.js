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

// ---------- Subject list rendering ----------
function renderSubjects() {
  const grid = $("#subjectGrid");
  grid.innerHTML = "";
  SUBJECTS.forEach(s => {
    const topicCount = TOPICS.filter(t => t.subject === s.id).length;
    const card = document.createElement("div");
    card.className = "subject-card";
    card.innerHTML = `
      <span class="icon">${s.icon}</span>
      <div class="info">
        <div class="title">${s.title}</div>
        <div class="meta">${topicCount} Themen</div>
      </div>
    `;
    card.addEventListener("click", () => goToSubject(s.id));
    grid.appendChild(card);
  });
}

// ---------- Topic grid rendering ----------
function structureFor(topicId) {
  return STRUCTURES.find(s => s.topic === topicId);
}

function subjectHasStructure(subjectId) {
  return TOPICS.some(t => t.subject === subjectId && structureFor(t.id));
}

function updateModeAvailability() {
  const hasStructure = subjectHasStructure(state.currentSubject);
  const structureBtn = document.querySelector('.mode-btn[data-mode="structure"]');
  if (!structureBtn) return;
  structureBtn.classList.toggle("hidden", !hasStructure);
  if (!hasStructure && state.mode === "structure") {
    state.mode = "quiz";
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === "quiz"));
  }
}

function topicStats(topicId) {
  const qCount = QUESTIONS.filter(q => q.topic === topicId).length;
  const cCount = FLASHCARDS.filter(c => c.topic === topicId).length;
  const sCount = structureFor(topicId)?.items.length || 0;
  const progress = loadProgress();
  const done = progress[topicId]?.bestScore || 0;
  const total = state.mode === "cards" ? cCount : state.mode === "structure" ? sCount : qCount;
  return { total, done, qCount, cCount, sCount };
}

function renderTopics() {
  const grid = $("#topicGrid");
  grid.innerHTML = "";
  TOPICS.filter(t => t.subject === state.currentSubject)
    .filter(t => state.mode !== "structure" || structureFor(t.id))
    .forEach(t => {
      const stats = topicStats(t.id);
      const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
      const card = document.createElement("div");
      card.className = "topic-card";
      const metaText = state.mode === "cards" ? stats.cCount + " Karten"
        : state.mode === "structure" ? stats.sCount + " Punkte"
        : stats.qCount + " Fragen";
      card.innerHTML = `
        <span class="icon">${t.icon}</span>
        <div class="title">${t.title}</div>
        <div class="meta">${metaText}</div>
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

// ---------- Navigation / hardware back-button (History API) ----------
// Every "go deeper" action pushes a history entry; every in-app back/home
// button calls history.back() so the hardware/gesture back button on
// Android always does the same thing as the on-screen back button instead
// of leaving the app.
function renderHome() {
  state.currentSubject = null;
  showView("#view-home");
  renderSubjects();
}

function renderSubjectView(subjectId) {
  state.currentSubject = subjectId;
  $("#subjectTitle").textContent = SUBJECTS.find(s => s.id === subjectId)?.title || "";
  showView("#view-subject");
  renderTopics();
  updateModeAvailability();
}

function applyHistoryState(viewState) {
  if (!viewState || viewState.name === "home") {
    renderHome();
    return;
  }
  // subject, quiz, cards and structure entries all land on the subject view:
  // resuming a quiz/cards/structure run mid-way isn't supported, and the
  // subject view is exactly where the matching on-screen back button goes too.
  renderSubjectView(viewState.subjectId);
}

window.addEventListener("popstate", (e) => applyHistoryState(e.state));

function goHome() {
  history.pushState({ name: "home" }, "");
  renderHome();
}

function goToSubject(subjectId) {
  history.pushState({ name: "subject", subjectId }, "");
  renderSubjectView(subjectId);
}

$("#homeBtn").addEventListener("click", goHome);
$("#backFromSubject").addEventListener("click", () => history.back());
$("#homeFromResult").addEventListener("click", () => history.back());
$("#backFromQuiz").addEventListener("click", () => history.back());
$("#backFromCards").addEventListener("click", () => history.back());
$("#backFromStructure").addEventListener("click", () => history.back());

function startTopic(topicId) {
  state.currentTopic = topicId;
  if (state.mode === "cards") startCards(topicId);
  else if (state.mode === "structure") startStructure(topicId);
  else startQuiz(topicId);
}

// ---------- QUIZ ----------
function startQuiz(topicId, pushHistory = true) {
  if (pushHistory) history.pushState({ name: "quiz", subjectId: state.currentSubject }, "");
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
  if (state.mode === "cards") startCards(state.currentTopic, false);
  else if (state.mode === "structure") startStructure(state.currentTopic, false);
  else startQuiz(state.currentTopic, false);
});

// ---------- STRUCTURE (Gliederung selbst aufbauen) ----------
let structureState = { topicId: null, items: [], expectedIndex: 0, pool: [], mistakes: 0 };

function startStructure(topicId, pushHistory = true) {
  if (pushHistory) history.pushState({ name: "structure", subjectId: state.currentSubject }, "");
  const struct = structureFor(topicId);
  if (!struct) return;
  structureState = {
    topicId,
    items: struct.items,
    expectedIndex: 0,
    pool: shuffle(struct.items.map((text, i) => ({ text, i }))),
    mistakes: 0,
  };
  showView("#view-structure");
  renderStructure();
}

function renderStructure() {
  const total = structureState.items.length;
  $("#structureProgress").style.width = (structureState.expectedIndex / total * 100) + "%";
  $("#structureScore").textContent = structureState.expectedIndex + " / " + total +
    (structureState.mistakes ? " · " + structureState.mistakes + " Fehlversuche" : "");
  const topicMeta = TOPICS.find(t => t.id === structureState.topicId);
  $("#structureTopicLabel").textContent = topicMeta ? topicMeta.icon + " " + topicMeta.title : "";

  const built = $("#structureBuilt");
  built.innerHTML = "";
  structureState.items.slice(0, structureState.expectedIndex).forEach(text => {
    const li = document.createElement("li");
    li.textContent = text;
    built.appendChild(li);
  });

  const pool = $("#structurePool");
  pool.innerHTML = "";
  structureState.pool.forEach(({ text, i }) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = text;
    btn.addEventListener("click", () => handleStructureTap(i, btn));
    pool.appendChild(btn);
  });
}

function handleStructureTap(i, btnEl) {
  if (i === structureState.expectedIndex) {
    structureState.pool = structureState.pool.filter(p => p.i !== i);
    structureState.expectedIndex++;
    if (structureState.expectedIndex >= structureState.items.length) {
      finishStructure();
    } else {
      renderStructure();
    }
  } else {
    structureState.mistakes++;
    btnEl.classList.add("wrong");
    setTimeout(() => btnEl.classList.remove("wrong"), 300);
    $("#structureScore").textContent = structureState.expectedIndex + " / " + structureState.items.length +
      " · " + structureState.mistakes + " Fehlversuche";
  }
}

function finishStructure() {
  $("#structureProgress").style.width = "100%";
  bumpStreak();
  const perfect = structureState.mistakes === 0;
  $("#resultEmoji").textContent = perfect ? "🏆" : "💪";
  $("#resultTitle").textContent = perfect ? "Perfekt!" : "Geschafft!";
  $("#resultText").textContent = `Du hast die Gliederung mit ${structureState.mistakes} Fehlversuch(en) rekonstruiert.`;
  showView("#view-result");
}

// ---------- FLASHCARDS ----------
function startCards(topicId, pushHistory = true) {
  if (pushHistory) history.pushState({ name: "cards", subjectId: state.currentSubject }, "");
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
history.replaceState({ name: "home" }, "");
renderHome();
