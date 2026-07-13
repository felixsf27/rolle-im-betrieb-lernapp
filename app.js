// ---------- State ----------
const STORAGE_KEY = "rolleImBetrieb.progress.v1";
const STREAK_KEY = "rolleImBetrieb.streak.v1";

// Ab welcher Trefferquote der Schlüsselbegriffe eine Freitext-Antwort als "richtig" gilt.
// 0.6 = 60 %. Hier zentral anpassbar, falls die Bewertung zu streng/zu locker ist.
const OPEN_PASS_RATIO = 0.6;

let state = {
  mode: "quiz",
  currentSubject: null,
  currentCategory: null,
  currentTopic: null,
  queue: [],
  index: 0,
  correctCount: 0,
  answered: false,
  answeredLog: [],   // pro Durchlauf: { question, given, correctText, wasCorrect }
  finishedKind: null, // "quiz" | "open" | "cards" | "structure" – steuert die Ergebnis-Buttons
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
    const categoryCount = CATEGORIES.filter(c => c.subject === s.id).length;
    const card = document.createElement("div");
    card.className = "subject-card";
    card.innerHTML = `
      <span class="icon">${s.icon}</span>
      <div class="info">
        <div class="title">${s.title}</div>
        <div class="meta">${categoryCount} ${categoryCount === 1 ? "Kategorie" : "Kategorien"}</div>
      </div>
    `;
    card.addEventListener("click", () => goToSubject(s.id));
    grid.appendChild(card);
  });
}

// ---------- Category list rendering ----------
function renderCategories() {
  const grid = $("#categoryGrid");
  grid.innerHTML = "";
  CATEGORIES.filter(c => c.subject === state.currentSubject).forEach(c => {
    const topicCount = TOPICS.filter(t => t.category === c.id).length;
    const card = document.createElement("div");
    card.className = "subject-card";
    card.innerHTML = `
      <span class="icon">${c.icon}</span>
      <div class="info">
        <div class="title">${c.title}</div>
        <div class="meta">${topicCount} Themen</div>
      </div>
    `;
    card.addEventListener("click", () => goToCategory(c.id));
    grid.appendChild(card);
  });
}

// ---------- Topic grid rendering ----------
function structureFor(topicId) {
  return STRUCTURES.find(s => s.topic === topicId);
}

function openFor(topicId) {
  return (typeof OPEN_QUESTIONS !== "undefined" ? OPEN_QUESTIONS : []).filter(o => o.topic === topicId);
}

function categoryHasStructure(categoryId) {
  return TOPICS.some(t => t.category === categoryId && structureFor(t.id));
}

function categoryHasOpen(categoryId) {
  return TOPICS.some(t => t.category === categoryId && openFor(t.id).length > 0);
}

function updateModeAvailability() {
  // Gliederung und Freitext nur zeigen, wenn die aktuelle Kategorie dafür Inhalte hat.
  const availability = {
    structure: categoryHasStructure(state.currentCategory),
    open: categoryHasOpen(state.currentCategory),
  };
  Object.keys(availability).forEach(mode => {
    const btn = document.querySelector('.mode-btn[data-mode="' + mode + '"]');
    if (!btn) return;
    btn.classList.toggle("hidden", !availability[mode]);
    if (!availability[mode] && state.mode === mode) {
      state.mode = "quiz";
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === "quiz"));
    }
  });
}

function topicStats(topicId) {
  const qCount = QUESTIONS.filter(q => q.topic === topicId).length;
  const cCount = FLASHCARDS.filter(c => c.topic === topicId).length;
  const sCount = structureFor(topicId)?.items.length || 0;
  const oCount = openFor(topicId).length;
  const progress = loadProgress();
  const done = progress[topicId]?.bestScore || 0;
  const total = state.mode === "cards" ? cCount
    : state.mode === "structure" ? sCount
    : state.mode === "open" ? oCount
    : qCount;
  return { total, done, qCount, cCount, sCount, oCount };
}

function renderTopics() {
  const grid = $("#topicGrid");
  grid.innerHTML = "";
  TOPICS.filter(t => t.category === state.currentCategory)
    .filter(t => state.mode !== "structure" || structureFor(t.id))
    .filter(t => state.mode !== "open" || openFor(t.id).length > 0)
    .forEach(t => {
      const stats = topicStats(t.id);
      const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
      const card = document.createElement("div");
      card.className = "topic-card";
      const metaText = state.mode === "cards" ? stats.cCount + " Karten"
        : state.mode === "structure" ? stats.sCount + " Punkte"
        : state.mode === "open" ? stats.oCount + " Aufgaben"
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
    saveLastView({ name: "category", subjectId: state.currentSubject, categoryId: state.currentCategory, mode: state.mode });
  });
});

// ---------- Remember current view across reloads (e.g. Pull-to-Refresh) ----------
// Pull-to-refresh / F5 reloads index.html from scratch, which would otherwise
// always land back on the home screen. sessionStorage survives a reload (but
// not a fully closed tab/app), so we restore the last subject/category/mode
// instead of losing the user's place every time the page refreshes.
const VIEW_STORAGE_KEY = "rolleImBetrieb.lastView.v1";

function saveLastView(view) {
  try { sessionStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view)); }
  catch (e) { /* sessionStorage unavailable (e.g. private mode) - ignore */ }
}

function loadLastView() {
  try { return JSON.parse(sessionStorage.getItem(VIEW_STORAGE_KEY)); }
  catch (e) { return null; }
}

function setActiveMode(mode) {
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
}

// ---------- Navigation / hardware back-button (History API) ----------
// Every "go deeper" action pushes a history entry; every in-app back/home
// button calls history.back() so the hardware/gesture back button on
// Android always does the same thing as the on-screen back button instead
// of leaving the app.
function renderHome() {
  state.currentSubject = null;
  state.currentCategory = null;
  showView("#view-home");
  renderSubjects();
  saveLastView({ name: "home" });
}

function renderSubjectView(subjectId) {
  state.currentSubject = subjectId;
  state.currentCategory = null;
  $("#subjectTitle").textContent = SUBJECTS.find(s => s.id === subjectId)?.title || "";
  showView("#view-subject");
  renderCategories();
  saveLastView({ name: "subject", subjectId });
}

function renderCategoryView(subjectId, categoryId, mode) {
  state.currentSubject = subjectId;
  state.currentCategory = categoryId;
  if (mode) {
    state.mode = mode;
    setActiveMode(mode);
  }
  $("#categoryTitle").textContent = CATEGORIES.find(c => c.id === categoryId)?.title || "";
  showView("#view-category");
  renderTopics();
  updateModeAvailability();
  saveLastView({ name: "category", subjectId, categoryId, mode: state.mode });
}

function applyHistoryState(viewState) {
  if (!viewState || viewState.name === "home") {
    renderHome();
    return;
  }
  if (viewState.name === "subject") {
    renderSubjectView(viewState.subjectId);
    return;
  }
  // category, quiz, cards and structure entries all land on the category view:
  // resuming a quiz/cards/structure run mid-way isn't supported, and the
  // category view is exactly where the matching on-screen back button goes too.
  renderCategoryView(viewState.subjectId, viewState.categoryId, viewState.mode);
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

function goToCategory(categoryId) {
  const cat = CATEGORIES.find(c => c.id === categoryId);
  history.pushState({ name: "category", subjectId: cat.subject, categoryId }, "");
  renderCategoryView(cat.subject, categoryId);
}

$("#homeBtn").addEventListener("click", goHome);
$("#backFromSubject").addEventListener("click", () => history.back());
$("#backFromCategory").addEventListener("click", () => history.back());
$("#homeFromResult").addEventListener("click", () => history.back());
$("#backFromQuiz").addEventListener("click", () => history.back());
$("#backFromCards").addEventListener("click", () => history.back());
$("#backFromStructure").addEventListener("click", () => history.back());
$("#backFromOpen").addEventListener("click", () => history.back());

function startTopic(topicId) {
  state.currentTopic = topicId;
  if (state.mode === "cards") startCards(topicId);
  else if (state.mode === "structure") startStructure(topicId);
  else if (state.mode === "open") startOpen(topicId);
  else startQuiz(topicId);
}

// ---------- QUIZ ----------
function startQuiz(topicId, pushHistory = true, presetPool = null) {
  if (pushHistory) history.pushState({ name: "quiz", subjectId: state.currentSubject, categoryId: state.currentCategory }, "");
  // presetPool = nur eine Teilmenge (z. B. "Nur Fehler nochmal"), sonst alle Fragen des Themas
  const pool = presetPool ? shuffle(presetPool) : shuffle(QUESTIONS.filter(q => q.topic === topicId));
  state.queue = pool;
  state.index = 0;
  state.correctCount = 0;
  state.answeredLog = [];
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

  const correctTexts = q.options.filter((_, i) => correctSet.has(i));
  const givenTexts = q.options.filter((_, i) => selSet.has(i));
  state.answeredLog.push({
    question: q,
    given: givenTexts.length ? givenTexts.join(", ") : "(keine Antwort)",
    correctText: correctTexts.join(", "),
    wasCorrect: isCorrect,
  });

  const fb = $("#qFeedback");
  fb.classList.remove("hidden", "good", "bad");
  if (isCorrect) {
    fb.classList.add("good");
    fb.textContent = "✅ Richtig!";
    state.correctCount++;
  } else {
    fb.classList.add("bad");
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
  showResult("quiz");
}

// ---------- Ergebnis-Ansicht (Review + Wiederholungs-Buttons) ----------
function escapeHtml(s) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function showResult(kind) {
  state.finishedKind = kind;
  const reviewEl = $("#resultReview");
  const retryBtn = $("#retryBtn");
  const retryWrongBtn = $("#retryWrongBtn");

  // Frage-für-Frage-Durchsicht nur für Fragen-Modi (Quiz/Freitext), nicht für Karten/Gliederung.
  const showReview = (kind === "quiz" || kind === "open") && state.answeredLog.length;
  reviewEl.classList.toggle("hidden", !showReview);
  reviewEl.innerHTML = "";
  let wrongCount = 0;
  if (showReview) {
    state.answeredLog.forEach((entry, n) => {
      if (!entry.wasCorrect) wrongCount++;
      const item = document.createElement("div");
      item.className = "review-item " + (entry.wasCorrect ? "correct" : "incorrect");
      item.innerHTML =
        '<div class="review-q">' + (n + 1) + ". " + escapeHtml(entry.question.q) + '</div>' +
        '<div class="review-line"><span class="review-label">Deine Antwort: </span>' +
        '<span class="review-given ' + (entry.wasCorrect ? "correct-text" : "wrong-text") + '">' +
        escapeHtml(entry.given) + (entry.wasCorrect ? " ✅" : " ❌") + '</span></div>' +
        (entry.wasCorrect ? "" :
          '<div class="review-line"><span class="review-label">' +
          (kind === "open" ? "Musterantwort: " : "Richtig: ") + '</span>' +
          '<span class="review-correct">' + escapeHtml(entry.correctText) + '</span></div>');
      reviewEl.appendChild(item);
    });
  }

  if (kind === "structure") {
    retryBtn.textContent = "Nochmal";
    retryWrongBtn.classList.add("hidden");
  } else if (kind === "cards") {
    retryBtn.textContent = "Nochmal üben";
    retryWrongBtn.classList.add("hidden");
  } else {
    retryBtn.textContent = "Alle nochmal";
    retryWrongBtn.classList.toggle("hidden", wrongCount === 0);
  }

  showView("#view-result");
}

$("#retryBtn").addEventListener("click", () => {
  const kind = state.finishedKind;
  if (kind === "cards") startCards(state.currentTopic, false);
  else if (kind === "structure") startStructure(state.currentTopic, false, true); // Retry: Nummerierung strippen
  else if (kind === "open") startOpen(state.currentTopic, false);
  else startQuiz(state.currentTopic, false);
});

$("#retryWrongBtn").addEventListener("click", () => {
  const wrong = state.answeredLog.filter(e => !e.wasCorrect).map(e => e.question);
  if (!wrong.length) return;
  if (state.finishedKind === "open") startOpen(state.currentTopic, false, wrong);
  else startQuiz(state.currentTopic, false, wrong);
});

// ---------- STRUCTURE (Gliederung selbst aufbauen) ----------
let structureState = { topicId: null, items: [], expectedIndex: 0, pool: [], mistakes: 0 };

// Entfernt führende Gliederungszeichen ("1.", "II.", "A." …) nur für die Anzeige.
// Die interne Reihenfolge/Prüfung bleibt anhand des Original-Arrays unverändert.
function stripStructureLabel(text) {
  return text.replace(/^([IVXLCDM]+\.|[A-Z]\.|\d+\.)\s*/, "");
}
function structureDisplay(text) {
  return structureState.strip ? stripStructureLabel(text) : text;
}

function startStructure(topicId, pushHistory = true, stripNumbering = false) {
  if (pushHistory) history.pushState({ name: "structure", subjectId: state.currentSubject, categoryId: state.currentCategory }, "");
  const struct = structureFor(topicId);
  if (!struct) return;
  structureState = {
    topicId,
    items: struct.items,
    expectedIndex: 0,
    pool: shuffle(struct.items.map((text, i) => ({ text, i }))),
    mistakes: 0,
    strip: stripNumbering, // beim Wiederholen: Nummerierung verstecken, damit es nicht zu leicht ist
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
    li.textContent = structureDisplay(text);
    built.appendChild(li);
  });

  const pool = $("#structurePool");
  pool.innerHTML = "";
  structureState.pool.forEach(({ text, i }) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = structureDisplay(text);
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
  showResult("structure");
}

// ---------- OPEN (Freitext-Aufgaben) ----------
// Umlaut-/akzent-tolerantes Normalisieren für den Teilstring-Abgleich der Kernbegriffe.
function normalizeText(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Akzente/Umlaut-Punkte entfernen (ä->a, é->e ...)
    .replace(/ß/g, "ss");
}

// Einfache Heuristik: zählt, wie viele keyPoints als Teilstring vorkommen. Keine echte
// Inhaltsprüfung – daher wird danach immer die Musterantwort zum Selbstvergleich gezeigt.
function evaluateOpen(openQ, text) {
  const norm = normalizeText(text);
  const total = openQ.keyPoints.length;
  const hits = openQ.keyPoints.filter(kp => norm.includes(normalizeText(kp))).length;
  const ratio = total ? hits / total : 0;
  return { pass: ratio >= OPEN_PASS_RATIO, hits, total };
}

function startOpen(topicId, pushHistory = true, presetPool = null) {
  if (pushHistory) history.pushState({ name: "open", subjectId: state.currentSubject, categoryId: state.currentCategory }, "");
  const pool = presetPool ? shuffle(presetPool) : shuffle(openFor(topicId));
  state.queue = pool;
  state.index = 0;
  state.correctCount = 0;
  state.answeredLog = [];
  showView("#view-open");
  renderOpen();
}

function renderOpen() {
  state.answered = false;
  const o = state.queue[state.index];
  const total = state.queue.length;
  $("#openProgress").style.width = (state.index / total * 100) + "%";
  $("#openScore").textContent = state.correctCount + " / " + total;
  const topicMeta = TOPICS.find(t => t.id === o.topic);
  $("#openTopicLabel").textContent = (topicMeta ? topicMeta.icon + " " + topicMeta.title : "") + " · Freitext";
  $("#openText").textContent = o.q;
  const input = $("#openInput");
  input.value = "";
  input.disabled = false;
  $("#openFeedback").classList.add("hidden");
  $("#openSample").classList.add("hidden");
  $("#openCheckBtn").classList.remove("hidden");
  $("#openNextBtn").classList.add("hidden");
}

function checkOpenAnswer() {
  if (state.answered) return;
  const o = state.queue[state.index];
  const text = $("#openInput").value.trim();
  if (!text) return; // ohne Eingabe wird nicht geprüft
  state.answered = true;
  $("#openInput").disabled = true;
  $("#openCheckBtn").classList.add("hidden");

  const res = evaluateOpen(o, text);
  const fb = $("#openFeedback");
  fb.classList.remove("hidden", "good", "bad");
  if (res.pass) {
    fb.classList.add("good");
    fb.textContent = `✅ Richtig! (${res.hits}/${res.total} Kernbegriffe erkannt)`;
    state.correctCount++;
  } else {
    fb.classList.add("bad");
    fb.textContent = `🤔 Nicht ganz (${res.hits}/${res.total} Kernbegriffe erkannt). Vergleiche selbst mit der Musterantwort – wenn es sinngemäß stimmt, zähl es dir als richtig.`;
  }

  const sample = $("#openSample");
  sample.classList.remove("hidden");
  sample.innerHTML = '<span class="open-sample-label">Musterantwort</span>' + escapeHtml(o.sampleAnswer);

  state.answeredLog.push({
    question: o,
    given: text,
    correctText: o.sampleAnswer,
    wasCorrect: res.pass,
  });

  $("#openScore").textContent = state.correctCount + " / " + state.queue.length;
  $("#openNextBtn").classList.remove("hidden");
}

function finishOpen() {
  $("#openProgress").style.width = "100%";
  const total = state.queue.length;
  const pct = total ? Math.round((state.correctCount / total) * 100) : 0;
  bumpStreak();
  $("#resultEmoji").textContent = pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚";
  $("#resultTitle").textContent = pct >= 80 ? "Stark!" : pct >= 50 ? "Gut gemacht!" : "Weiter üben!";
  $("#resultText").textContent = `Selbsteinschätzung: ${state.correctCount} von ${total} Freitext-Antworten wurden als richtig gewertet (${pct}%). Bei Freitext zählt am Ende dein eigener Abgleich mit der Musterantwort.`;
  showResult("open");
}

$("#openCheckBtn").addEventListener("click", checkOpenAnswer);
$("#openNextBtn").addEventListener("click", () => {
  state.index++;
  if (state.index >= state.queue.length) finishOpen();
  else renderOpen();
});

// ---------- FLASHCARDS ----------
function startCards(topicId, pushHistory = true) {
  if (pushHistory) history.pushState({ name: "cards", subjectId: state.currentSubject, categoryId: state.currentCategory }, "");
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
    showResult("cards");
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
const lastView = loadLastView();
const canRestore = lastView && (
  (lastView.name === "subject" && SUBJECTS.some(s => s.id === lastView.subjectId)) ||
  (lastView.name === "category" && CATEGORIES.some(c => c.id === lastView.categoryId))
);
if (canRestore) {
  history.replaceState(lastView, "");
  applyHistoryState(lastView);
} else {
  history.replaceState({ name: "home" }, "");
  renderHome();
}
