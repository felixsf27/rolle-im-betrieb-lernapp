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
  showArchived: false, // abgeschlossene Fächer (archived: true) erst nach Klick auf den Archiv-Link zeigen
};

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveProgress(p) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

function bumpStreak() {
  const today = new Date().toISOString().slice(0, 10);
  let s = JSON.parse(localStorage.getItem(STREAK_KEY) || "null") || { last: null, count: 0, days: [] };
  if (!Array.isArray(s.days)) s.days = []; // alte Datensätze ohne days-Liste abfangen
  let changed = false;
  if (!s.days.includes(today)) { s.days.push(today); changed = true; }
  if (s.last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    s.count = s.last === yesterday ? s.count + 1 : 1;
    s.last = today;
    changed = true;
  }
  if (changed) localStorage.setItem(STREAK_KEY, JSON.stringify(s));
  return s.count;
}
function getStreak() {
  const s = JSON.parse(localStorage.getItem(STREAK_KEY) || "null") || { count: 0 };
  return s.count;
}
function getActiveDays() {
  const s = JSON.parse(localStorage.getItem(STREAK_KEY) || "null") || { days: [] };
  return Array.isArray(s.days) ? s.days : [];
}
// Aktualisiert die Flammen-Anzeige im Header. Wird von jeder View aufgerufen, die den
// Header zeigt (also praktisch allen) - vorher stand hier nur an einer Stelle im Code
// (renderTopics), wodurch die Flamme auf der Startseite nach dem Neuladen fälschlich auf
// dem im HTML hart codierten "0" stehen blieb, obwohl der echte Wert im localStorage
// korrekt gespeichert war.
function updateStreakBadge() {
  $("#streakCount").textContent = getStreak();
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
  const archivedCount = SUBJECTS.filter(s => s.archived).length;
  SUBJECTS.filter(s => !s.archived || state.showArchived).forEach(s => {
    const categoryCount = CATEGORIES.filter(c => c.subject === s.id).length;
    const card = document.createElement("div");
    card.className = "subject-card" + (s.archived ? " subject-card-archived" : "");
    card.innerHTML = `
      <span class="icon">${s.icon}</span>
      <div class="info">
        <div class="title">${s.title}${s.archived ? " (abgeschlossen)" : ""}</div>
        <div class="meta">${categoryCount} ${categoryCount === 1 ? "Kategorie" : "Kategorien"}</div>
      </div>
    `;
    card.addEventListener("click", () => goToSubject(s.id));
    grid.appendChild(card);
  });

  const toggle = $("#archiveToggle");
  if (toggle) {
    if (archivedCount === 0) {
      toggle.classList.add("hidden");
    } else {
      toggle.classList.remove("hidden");
      toggle.textContent = state.showArchived
        ? "Abgeschlossene Fächer ausblenden"
        : `Abgeschlossene Fächer anzeigen (${archivedCount})`;
    }
  }
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

function bookingsFor(topicId) {
  return (typeof BOOKINGS !== "undefined" ? BOOKINGS : []).filter(b => b.topic === topicId);
}

function lettersFor(topicId) {
  return (typeof LETTERS !== "undefined" ? LETTERS : []).filter(l => l.topic === topicId);
}

function categoryHasLetters(categoryId) {
  return TOPICS.some(t => t.category === categoryId && lettersFor(t.id).length > 0);
}

function categoryHasStructure(categoryId) {
  return TOPICS.some(t => t.category === categoryId && structureFor(t.id));
}

function categoryHasOpen(categoryId) {
  return TOPICS.some(t => t.category === categoryId && openFor(t.id).length > 0);
}

function categoryHasBookings(categoryId) {
  return TOPICS.some(t => t.category === categoryId && bookingsFor(t.id).length > 0);
}

function updateModeAvailability() {
  // Gliederung, Freitext und Buchung nur zeigen, wenn die aktuelle Kategorie dafür Inhalte hat.
  const availability = {
    structure: categoryHasStructure(state.currentCategory),
    open: categoryHasOpen(state.currentCategory),
    booking: categoryHasBookings(state.currentCategory),
    letter: categoryHasLetters(state.currentCategory),
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
  const bCount = bookingsFor(topicId).length;
  const lCount = lettersFor(topicId).length;
  const progress = loadProgress();
  const done = progress[topicId]?.bestScore || 0;
  const total = state.mode === "cards" ? cCount
    : state.mode === "structure" ? sCount
    : state.mode === "open" ? oCount
    : state.mode === "booking" ? bCount
    : state.mode === "letter" ? lCount
    : qCount;
  return { total, done, qCount, cCount, sCount, oCount, bCount, lCount };
}

function renderTopics() {
  const grid = $("#topicGrid");
  grid.innerHTML = "";
  TOPICS.filter(t => t.category === state.currentCategory)
    .filter(t => state.mode !== "structure" || structureFor(t.id))
    .filter(t => state.mode !== "open" || openFor(t.id).length > 0)
    .filter(t => state.mode !== "booking" || bookingsFor(t.id).length > 0)
    .filter(t => state.mode !== "letter" || lettersFor(t.id).length > 0)
    .filter(t => state.mode !== "quiz" || QUESTIONS.some(q => q.topic === t.id))
    .filter(t => state.mode !== "cards" || FLASHCARDS.some(c => c.topic === t.id))
    .forEach(t => {
      const stats = topicStats(t.id);
      const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
      const card = document.createElement("div");
      card.className = "topic-card";
      const metaText = state.mode === "cards" ? stats.cCount + " Karten"
        : state.mode === "structure" ? stats.sCount + " Punkte"
        : state.mode === "open" ? stats.oCount + " Aufgaben"
        : state.mode === "booking" ? stats.bCount + " Buchungen"
        : state.mode === "letter" ? stats.lCount + (stats.lCount === 1 ? " Brief" : " Briefe")
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
  updateStreakBadge();
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
  updateStreakBadge();
  saveLastView({ name: "home" });
}

function renderSubjectView(subjectId) {
  state.currentSubject = subjectId;
  state.currentCategory = null;
  $("#subjectTitle").textContent = SUBJECTS.find(s => s.id === subjectId)?.title || "";
  showView("#view-subject");
  renderCategories();
  updateStreakBadge();
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
$("#backFromBooking").addEventListener("click", () => history.back());
$("#backFromLetter").addEventListener("click", () => history.back());

function startTopic(topicId) {
  state.currentTopic = topicId;
  if (state.mode === "cards") startCards(topicId);
  else if (state.mode === "structure") startStructure(topicId);
  else if (state.mode === "open") startOpen(topicId);
  else if (state.mode === "booking") startBooking(topicId);
  else if (state.mode === "letter") startLetter(topicId);
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
  updateStreakBadge(); // Flamme sofort aktualisieren, nicht erst bei der naechsten Navigation
  const reviewEl = $("#resultReview");
  const retryBtn = $("#retryBtn");
  const retryWrongBtn = $("#retryWrongBtn");

  // Frage-für-Frage-Durchsicht nur für Fragen-Modi (Quiz/Freitext/Buchung), nicht für Karten/Gliederung.
  const showReview = (kind === "quiz" || kind === "open" || kind === "booking" || kind === "letter") && state.answeredLog.length;
  reviewEl.classList.toggle("hidden", !showReview);
  reviewEl.innerHTML = "";
  let wrongCount = 0;
  if (showReview) {
    state.answeredLog.forEach((entry, n) => {
      if (!entry.wasCorrect) wrongCount++;
      const item = document.createElement("div");
      item.className = "review-item " + (entry.wasCorrect ? "correct" : "incorrect");
      item.innerHTML =
        '<div class="review-q">' + (n + 1) + ". " + escapeHtml(entry.question.q || entry.question.situation) + '</div>' +
        '<div class="review-line"><span class="review-label">Deine Antwort: </span>' +
        '<span class="review-given ' + (entry.wasCorrect ? "correct-text" : "wrong-text") + '">' +
        escapeHtml(entry.given) + (entry.wasCorrect ? " ✅" : " ❌") + '</span></div>' +
        (entry.wasCorrect ? "" :
          '<div class="review-line"><span class="review-label">' +
          (kind === "open" ? "Musterantwort: " : kind === "letter" ? "Fehler: " : "Richtig: ") + '</span>' +
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
  else if (kind === "booking") startBooking(state.currentTopic, false);
  else if (kind === "letter") startLetter(state.currentTopic, false);
  else startQuiz(state.currentTopic, false);
});

$("#retryWrongBtn").addEventListener("click", () => {
  const wrong = state.answeredLog.filter(e => !e.wasCorrect).map(e => e.question);
  if (!wrong.length) return;
  if (state.finishedKind === "open") startOpen(state.currentTopic, false, wrong);
  else if (state.finishedKind === "booking") {
    // answeredLog speichert bei Buchung nur { situation }, daher die vollen BOOKINGS-Objekte
    // anhand der situation zurückholen statt der verkürzten question-Objekte aus dem Log.
    const wrongBookings = bookingsFor(state.currentTopic).filter(b => wrong.some(w => w.situation === b.situation));
    startBooking(state.currentTopic, false, wrongBookings);
  }
  else if (state.finishedKind === "letter") {
    const wrongLetters = lettersFor(state.currentTopic).filter(l => wrong.some(w => w.letterId === l.id));
    startLetter(state.currentTopic, false, wrongLetters);
  }
  else startQuiz(state.currentTopic, false);
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

// ---------- BUCHUNGSSATZ-TRAINER ----------
// Welches Konto meint die Eingabe? Jedes Konto bekommt Punkte für alle Schreibweisen, die per
// Wortgrenze in der Eingabe vorkommen (Summe der Längen). Gewinner ist das Konto mit den
// meisten Punkten, bei Gleichstand gelten alle Gleichplatzierten (Darlehen/Hypothek sind im
// Unterricht Synonyme). So gewinnt "Aufwendungen für Rohstoffe" gegen "Rohstoffe" und
// "Verb. a. LL" gegen "Forderungen a. LL", obwohl beide "a. LL" enthalten.
function aliasHit(norm, alias) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(^|[^a-z0-9])" + escaped + "([^a-z0-9]|$)").test(norm);
}

function resolveAccount(input) {
  const norm = normalizeText(input).replace(/\s+/g, " ").trim();
  let best = 0, keys = [];
  Object.keys(ACCOUNT_ALIASES).forEach(key => {
    const score = ACCOUNT_ALIASES[key].aliases.reduce((sum, a) => sum + (aliasHit(norm, a) ? a.length : 0), 0);
    if (score > best) { best = score; keys = [key]; }
    else if (score > 0 && score === best) keys.push(key);
  });
  return keys;
}

function accountMatches(input, accountKey) {
  return resolveAccount(input).includes(accountKey);
}

// Deutsche Beträge: 1.900,00 / 1900 / 1.900 / 1900,5 € → Zahl (oder null)
function parseAmount(input) {
  let s = (input || "").replace(/[€\s]/g, "").replace(/eur$/i, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function amountMatches(input, expected) {
  const n = parseAmount(input);
  return n !== null && Math.abs(n - expected) < 0.005;
}

function formatEuro(n) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

// Einfache Buchung (soll/haben als Schlüssel + amount) und zusammengesetzte Buchung
// (soll/haben als Liste [[Schlüssel, Betrag], ...]) auf ein Format bringen.
function bookingRows(b) {
  if (typeof b.soll === "string") {
    return { soll: [{ key: b.soll, amount: b.amount }], haben: [{ key: b.haben, amount: b.amount }] };
  }
  const map = rows => rows.map(([key, amount]) => ({ key, amount }));
  return { soll: map(b.soll), haben: map(b.haben) };
}

function bookingSatzText(b) {
  const rows = bookingRows(b);
  const side = list => list.map(r => ACCOUNT_ALIASES[r.key].account + " " + formatEuro(r.amount)).join(", ");
  if (rows.soll.length === 1 && rows.haben.length === 1) {
    return ACCOUNT_ALIASES[rows.soll[0].key].account + " an " + ACCOUNT_ALIASES[rows.haben[0].key].account + ", " + formatEuro(rows.soll[0].amount);
  }
  return side(rows.soll) + " an " + side(rows.haben);
}

function startBooking(topicId, pushHistory = true, presetPool = null) {
  if (pushHistory) history.pushState({ name: "booking", subjectId: state.currentSubject, categoryId: state.currentCategory }, "");
  const pool = presetPool ? shuffle(presetPool) : shuffle(bookingsFor(topicId));
  state.queue = pool;
  state.index = 0;
  state.correctCount = 0;
  state.answeredLog = [];
  showView("#view-booking");
  renderBooking();
}

function addBookingRow(side, focus = false) {
  const wrap = $(side === "soll" ? "#bookingSollRows" : "#bookingHabenRows");
  const n = wrap.children.length + 1;
  const row = document.createElement("div");
  row.className = "booking-row";
  const label = side === "soll" ? "Soll" : "Haben";
  row.innerHTML =
    '<input type="text" class="booking-acc" aria-label="' + label + '-Konto ' + n + '" placeholder="' + label + '-Konto">' +
    '<input type="text" inputmode="decimal" class="booking-amt" aria-label="Betrag ' + label + ' ' + n + '" placeholder="Betrag">';
  wrap.appendChild(row);
  if (focus) row.querySelector(".booking-acc").focus();
}

function renderBooking() {
  state.answered = false;
  const b = state.queue[state.index];
  const total = state.queue.length;
  $("#bookingProgress").style.width = (state.index / total * 100) + "%";
  $("#bookingScore").textContent = state.correctCount + " / " + total;
  const topicMeta = TOPICS.find(t => t.id === b.topic);
  $("#bookingTopicLabel").textContent = (topicMeta ? topicMeta.icon + " " + topicMeta.title : "") + " · Buchungssatz";
  $("#bookingText").textContent = b.situation;
  $("#bookingSollRows").innerHTML = "";
  $("#bookingHabenRows").innerHTML = "";
  addBookingRow("soll");
  addBookingRow("haben");
  document.querySelectorAll(".booking-add").forEach(btn => btn.disabled = false);
  $("#bookingFeedback").classList.add("hidden");
  $("#bookingExplain").classList.add("hidden");
  $("#bookingCheckBtn").classList.remove("hidden");
  $("#bookingNextBtn").classList.add("hidden");
}

function readBookingSide(side) {
  const wrap = $(side === "soll" ? "#bookingSollRows" : "#bookingHabenRows");
  return [...wrap.querySelectorAll(".booking-row")]
    .map(r => ({ acc: r.querySelector(".booking-acc").value.trim(), amtText: r.querySelector(".booking-amt").value.trim() }))
    .filter(r => r.acc || r.amtText);
}

function checkBookingAnswer() {
  if (state.answered) return;
  const b = state.queue[state.index];
  const soll = readBookingSide("soll");
  const haben = readBookingSide("haben");
  if (!soll.length || !haben.length || soll.some(r => !r.acc) || haben.some(r => !r.acc)) return;

  // Betrag nur auf einer Seite eingetragen? Bei genau einer Zeile auf der anderen Seite
  // wird die Summe übernommen, damit man einfache Buchungen nicht doppelt tippen muss.
  const sum = rows => rows.reduce((s, r) => s + (parseAmount(r.amtText) || 0), 0);
  if (soll.length === 1 && !soll[0].amtText) soll[0].amtText = String(sum(haben)).replace(".", ",");
  if (haben.length === 1 && !haben[0].amtText) haben[0].amtText = String(sum(soll)).replace(".", ",");
  if ([...soll, ...haben].some(r => parseAmount(r.amtText) === null)) return;

  state.answered = true;
  document.querySelectorAll("#view-booking .booking-row input").forEach(el => el.disabled = true);
  document.querySelectorAll(".booking-add").forEach(btn => btn.disabled = true);
  $("#bookingCheckBtn").classList.add("hidden");

  const expected = bookingRows(b);
  const matchSide = (given, exp) => {
    const used = new Set();
    const results = exp.map(e => {
      const idx = given.findIndex((g, i) => !used.has(i) && accountMatches(g.acc, e.key) && amountMatches(g.amtText, e.amount));
      if (idx >= 0) used.add(idx);
      return idx >= 0;
    });
    return { ok: results.every(Boolean) && given.length === exp.length, results };
  };
  const sollRes = matchSide(soll, expected.soll);
  const habenRes = matchSide(haben, expected.haben);
  const isCorrect = sollRes.ok && habenRes.ok;
  const correctSatz = bookingSatzText(b);

  const fb = $("#bookingFeedback");
  fb.classList.remove("hidden", "good", "bad");
  if (isCorrect) {
    fb.classList.add("good");
    fb.textContent = "✅ Richtig! " + correctSatz;
    state.correctCount++;
  } else {
    fb.classList.add("bad");
    fb.textContent = "❌ Soll: " + (sollRes.ok ? "✓" : "✗") + " · Haben: " + (habenRes.ok ? "✓" : "✗") +
      ". Richtig wäre: " + correctSatz;
  }

  const explain = $("#bookingExplain");
  explain.classList.remove("hidden");
  explain.innerHTML = '<span class="open-sample-label">' + escapeHtml(b.art) + '</span>' + escapeHtml(b.explanation);

  const sideText = rows => rows.map(r => r.acc + " " + r.amtText).join(", ");
  state.answeredLog.push({
    question: { situation: b.situation },
    given: sideText(soll) + " an " + sideText(haben),
    correctText: correctSatz,
    wasCorrect: isCorrect,
  });

  $("#bookingScore").textContent = state.correctCount + " / " + state.queue.length;
  $("#bookingNextBtn").classList.remove("hidden");
}

function finishBooking() {
  $("#bookingProgress").style.width = "100%";
  const total = state.queue.length;
  const pct = total ? Math.round((state.correctCount / total) * 100) : 0;
  bumpStreak();
  $("#resultEmoji").textContent = pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚";
  $("#resultTitle").textContent = pct >= 80 ? "Stark!" : pct >= 50 ? "Gut gemacht!" : "Weiter üben!";
  $("#resultText").textContent = `Du hattest ${state.correctCount} von ${total} Buchungssätzen komplett richtig (${pct}%).`;
  showResult("booking");
}

$("#bookingCheckBtn").addEventListener("click", checkBookingAnswer);
$("#bookingNextBtn").addEventListener("click", () => {
  state.index++;
  if (state.index >= state.queue.length) finishBooking();
  else renderBooking();
});
document.querySelectorAll(".booking-add").forEach(btn => {
  btn.addEventListener("click", () => addBookingRow(btn.dataset.side, true));
});

// ---------- BRIEF-TRAINER (Serienbriefe & interner Schriftverkehr) ----------
// Mini-Seriendruck: Zeilen mit «Feld» und {WENN Feld = "x" "Dann" "Sonst"} werden für jeden
// Datensatz ausgewertet, genau wie Word es in der Vorschau macht. Verglichen wird das
// Ergebnis, nicht die Schreibweise. Wer also die Bedingung andersherum formuliert
// (Herrn statt Frau prüfen), ist trotzdem richtig, solange überall das Richtige herauskommt.
const MONTHS = ["januar", "februar", "marz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];

function normalizeQuotes(s) {
  return (s || "").replace(/[„“”″]/g, '"').replace(/[‚‘’]/g, "'");
}

// Die Zeichenklasse [ ] unten enthält die zwei geschützten Leerzeichen (U+00A0, U+202F),
// die z. B. Word oder die Handytastatur einfügt. Sie zählen wie normale Leerzeichen.
function normLine(s) {
  return (s || "").replace(/[  ]/g, " ").trim();
}

// Für das Ergebnis einer Zeile: Leerzeichen am Anfang bleiben stehen (in Word sichtbar,
// z. B. wenn bei Leuten ohne Titel ein Leerzeichen vor dem Vornamen übrig bleibt).
function normOut(s) {
  return (s || "").replace(/[  ]/g, " ").replace(/\s+$/, "");
}

// Liest ab Position i einen Ausdruck bis zur passenden schließenden Klammer (Klammern und
// Anführungszeichen dürfen verschachtelt sein).
function readBalanced(src, i, open, close) {
  let depth = 0, j = i;
  for (; j < src.length; j++) {
    if (src[j] === open) depth++;
    else if (src[j] === close) { depth--; if (depth === 0) return j; }
  }
  throw new Error("Klammer " + open + " wird nicht geschlossen");
}

// Ein Anführungszeichen-Text darf selbst {Regeln} enthalten: das Ende ist das erste ",
// das außerhalb von { } steht.
function readQuoted(src, i) {
  let depth = 0;
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") depth--;
    else if (src[j] === '"' && depth === 0) return j;
  }
  throw new Error("Anführungszeichen wird nicht geschlossen");
}

function parseTemplate(src) {
  src = normalizeQuotes(src);
  const nodes = [];
  let i = 0, text = "";
  const flush = () => { if (text) { nodes.push({ t: "text", v: text }); text = ""; } };
  while (i < src.length) {
    const c = src[i];
    if (c === "«") {
      const end = src.indexOf("»", i);
      if (end < 0) throw new Error("« ohne »");
      flush(); nodes.push({ t: "field", name: src.slice(i + 1, end).trim() }); i = end + 1;
    } else if (c === "<" && /^<[A-Za-zÄÖÜäöüß_][\wÄÖÜäöüß.\-]*>/.test(src.slice(i))) {
      const end = src.indexOf(">", i);
      flush(); nodes.push({ t: "field", name: src.slice(i + 1, end).trim() }); i = end + 1;
    } else if (c === "{") {
      const end = readBalanced(src, i, "{", "}");
      flush(); nodes.push(parseFieldCode(src.slice(i + 1, end))); i = end + 1;
    } else if (c === "}") {
      throw new Error("} ohne {");
    } else { text += c; i++; }
  }
  flush();
  return nodes;
}

// Inhalt einer { }-Klammer: MERGEFIELD Name, WENN/IF ... oder nur ein Feldname.
function parseFieldCode(inner) {
  const s = inner.trim();
  const m = s.match(/^MERGEFIELD\s+("?)([^"\\\s]+)\1/i);
  if (m) return { t: "field", name: m[2] };
  const w = s.match(/^(WENN|IF)\s+/i);
  if (!w) {
    if (/^[\wÄÖÜäöüß.\-]+$/.test(s)) return { t: "field", name: s };
    throw new Error("Unbekannte Feldfunktion: {" + s + "}");
  }
  let i = w[0].length;
  const tokens = [];
  while (i < s.length && tokens.length < 5) {
    while (s[i] === " ") i++;
    if (i >= s.length) break;
    const c = s[i];
    if (c === '"') { const end = readQuoted(s, i); tokens.push({ q: true, v: s.slice(i + 1, end) }); i = end + 1; }
    else if (c === "{") { const end = readBalanced(s, i, "{", "}"); tokens.push({ code: s.slice(i + 1, end) }); i = end + 1; }
    else if (c === "«") { const end = s.indexOf("»", i); if (end < 0) throw new Error("« ohne »"); tokens.push({ field: s.slice(i + 1, end).trim() }); i = end + 1; }
    else if (/[=<>]/.test(c)) { let j = i; while (/[=<>]/.test(s[j])) j++; tokens.push({ op: s.slice(i, j) }); i = j; }
    else { let j = i; while (j < s.length && !/[\s"=<>{]/.test(s[j])) j++; tokens.push({ bare: s.slice(i, j) }); i = j; }
  }
  if (tokens.length < 4) throw new Error("Regel unvollständig: Feld, Vergleich, Wert, Dann-Text (und Sonst-Text) fehlen");
  const [left, op, right, thenT, elseT] = tokens;
  if (!op.op || !["=", "<>", "<", ">", "<=", ">="].includes(op.op)) throw new Error("Vergleich fehlt oder unbekannt (=, <>, <, >, <=, >=)");
  const leftNode = left.field ? { t: "field", name: left.field }
    : left.code ? parseFieldCode(left.code)
    : left.bare ? { t: "field", name: left.bare }
    : null;
  if (!leftNode) throw new Error("Links vom Vergleich muss ein Feld stehen");
  const asNodes = tok => !tok ? [] : tok.q ? parseTemplate(tok.v) : tok.code ? [parseFieldCode(tok.code)] : tok.field ? [{ t: "field", name: tok.field }] : [{ t: "text", v: tok.bare || "" }];
  return { t: "if", left: leftNode, op: op.op, right: asNodes(right), then: asNodes(thenT), else: asNodes(elseT) };
}

function fieldValue(rec, name) {
  const key = Object.keys(rec).find(k => k.toLowerCase() === name.toLowerCase());
  if (key === undefined) throw new Error("Feld «" + name + "» gibt es in der Datenquelle nicht");
  return rec[key] ?? "";
}

function compareValues(a, b, op) {
  const num = v => { const n = parseAmount(String(v).replace(/[^\d,.\-]/g, "")); return /\d/.test(v) && /^[-\d.,\s€%]+$/.test(String(v).trim()) ? n : null; };
  const date = v => { const m = String(v).trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); return m ? new Date(+m[3], +m[2] - 1, +m[1]).getTime() : null; };
  let x, y;
  if (date(a) !== null && date(b) !== null) { x = date(a); y = date(b); }
  else if (num(a) !== null && num(b) !== null) { x = num(a); y = num(b); }
  else { x = String(a).trim().toLowerCase(); y = String(b).trim().toLowerCase(); }
  switch (op) {
    case "=": return x === y;
    case "<>": return x !== y;
    case "<": return x < y;
    case ">": return x > y;
    case "<=": return x <= y;
    case ">=": return x >= y;
  }
  return false;
}

// mask = true: Felder im Text erscheinen als «Feld» statt mit ihrem Wert (die Bedingungen
// rechnen trotzdem mit den echten Werten). So lässt sich prüfen, ob zwei Datensätze denselben
// Regel-Zweig bekommen, auch wenn z. B. «Uhrzeit» verschieden ist.
function evalNodes(nodes, rec, mask = false) {
  return nodes.map(n => {
    if (n.t === "text") return n.v;
    if (n.t === "field") { const v = fieldValue(rec, n.name); return mask ? "«" + n.name.toLowerCase() + "»" : v; }
    const leftVal = evalNodes([n.left], rec);
    const rightVal = evalNodes(n.right, rec);
    return evalNodes(compareValues(leftVal, rightVal, n.op) ? n.then : n.else, rec, mask);
  }).join("");
}

function renderLine(src, rec) {
  return normOut(evalNodes(parseTemplate(src), rec));
}

function usedFields(nodes, out = new Set()) {
  nodes.forEach(n => {
    if (n.t === "field") out.add(n.name.toLowerCase());
    if (n.t === "if") { usedFields([n.left], out); usedFields(n.right, out); usedFields(n.then, out); usedFields(n.else, out); }
  });
  return out;
}

function hasRule(nodes) {
  return nodes.some(n => n.t === "if");
}

// "a|b" = eine der Varianten muss vorkommen
function keyHit(normText, key) {
  return key.split("|").some(k => normText.includes(normalizeText(k)));
}

function showSpaces(s) {
  return s === "" ? "(leer)" : s.replace(/ /g, "·");
}

const DATE_NUM = /^\d{2}\.\d{2}\.\d{4}$/;
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const DATE_ALPHA = /^\d{1,2}\. (januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember) \d{4}$/i;

// Prüft eine Zeile. Ergebnis: { ok, msg, preview } (preview = Tabelle je Datensatz)
function checkLetterLine(line, input, letter) {
  const value = normLine(input);
  const recs = letter.records;
  const fail = msg => ({ ok: false, msg });
  if (line.type === "static") return { ok: true, msg: "" };
  if (!value && !(line.type === "group" && line.empty)) return fail("Leer. Musterlösung: " + letterSolution(line));

  if (line.type === "text") {
    if (line.expect.some(e => normLine(e) === value)) return { ok: true, msg: "" };
    const loose = line.expect.find(e => normalizeText(normLine(e)).replace(/\s+/g, " ") === normalizeText(value).replace(/\s+/g, " "));
    return fail((loose ? "Fast: Groß-/Kleinschreibung, Umlaute oder Leerzeichen stimmen nicht. " : "") + "Richtig: " + line.expect[0]);
  }
  if (line.type === "date") {
    if (line.alpha) return DATE_ALPHA.test(value) ? { ok: true, msg: "" } : fail("Alphanumerisch verlangt, z. B. 18. Oktober 2026");
    return DATE_NUM.test(value) || DATE_ISO.test(value) || DATE_ALPHA.test(value) ? { ok: true, msg: "" } : fail("Format: 18.10.2026, 2026-10-18 oder 18. Oktober 2026");
  }
  if (line.type === "zeichen") {
    const abt = line.abt;
    const re = new RegExp("^([a-zäöü]{1,4}-" + abt + "|" + abt + "-[a-zäöü]{1,4}|" + abt + ")$", "i");
    return re.test(value) ? { ok: true, msg: "" } : fail("Kurzzeichen und Abteilung, z. B. ab-" + abt);
  }
  if (line.type === "email") {
    const re = new RegExp("^[^\\s@]+@" + line.domain.replace(/[.\-]/g, "\\$&") + "$", "i");
    return re.test(value) ? { ok: true, msg: "" } : fail("Form: name@" + line.domain);
  }
  if (line.type === "vollmacht") {
    return /^i\. A\.(\s+\S.*)?$/.test(value) ? { ok: true, msg: "" } : fail("Artvollmacht → i. A. (mit Leerzeichen, am besten geschützt), danach dein Name");
  }

  // Ab hier: Zeilen mit Feldern und Regeln
  let nodes;
  try { nodes = parseTemplate(value); } catch (e) { return fail("Nicht lesbar: " + e.message); }
  let outputs;
  let masked;
  try {
    outputs = recs.map(r => normOut(evalNodes(nodes, r)));
    masked = recs.map(r => normLine(evalNodes(nodes, r, true)));
  } catch (e) { return fail(e.message); }

  if (line.type === "free") {
    const used = usedFields(nodes);
    const missing = (line.needFields || []).filter(f => !used.has(f.toLowerCase()));
    const norm = normalizeText(value);
    const hits = line.keyPoints.filter(k => keyHit(norm, k)).length;
    const ratio = line.keyPoints.length ? hits / line.keyPoints.length : 1;
    const ok = !missing.length && ratio >= OPEN_PASS_RATIO;
    let msg = hits + "/" + line.keyPoints.length + " Kernpunkte erkannt.";
    if (missing.length) msg += " Fehlende Seriendruckfelder: " + missing.map(f => "«" + f + "»").join(", ") + ".";
    return { ok, msg: (ok ? "" : msg + " ") + "Beispiel: " + line.sample };
  }

  const preview = recs.map((r, idx) => ({ label: recordLabel(letter, idx), got: outputs[idx] }));

  if (line.type === "merge") {
    let best = null;
    for (const exp of line.expect) {
      const want = recs.map(r => renderLine(exp, r));
      const wrong = want.filter((w, idx) => w !== outputs[idx]).length;
      if (!best || wrong < best.wrong) best = { want, wrong };
    }
    preview.forEach((p, idx) => { p.want = best.want[idx]; p.ok = p.got === best.want[idx]; });
    return best.wrong === 0 ? { ok: true, msg: "", preview } : { ok: false, msg: best.wrong + " von " + recs.length + " Datensätzen falsch. Musterlösung: " + line.expect[0], preview };
  }

  if (line.type === "group") {
    const problems = [];
    if (!hasRule(nodes)) problems.push("Hier fehlt eine Regel {WENN ...}.");
    line.groups.forEach((g, gi) => {
      const outs = g.map(idx => outputs[idx].trim());
      if (new Set(g.map(idx => masked[idx])).size > 1) problems.push("Datensätze, die gleich behandelt werden müssten, bekommen verschiedene Texte (" + g.map(idx => recordLabel(letter, idx)).join(", ") + ").");
      const isEmpty = (line.empty || []).includes(gi);
      if (isEmpty && outs[0] !== "") problems.push(g.map(idx => recordLabel(letter, idx)).join(", ") + " sollte(n) hier gar nichts bekommen.");
      if (!isEmpty && outs[0] === "") problems.push(g.map(idx => recordLabel(letter, idx)).join(", ") + " bekommt/bekommen leeren Text.");
      const keys = (line.keys || [])[gi] || [];
      const missingKeys = keys.filter(k => !keyHit(normalizeText(outs[0]), k));
      if (!isEmpty && missingKeys.length) problems.push("Bei " + recordLabel(letter, g[0]) + " fehlt: " + missingKeys.map(k => k.split("|")[0]).join(", ") + ".");
    });
    for (let a = 0; a < line.groups.length; a++) for (let b = a + 1; b < line.groups.length; b++) {
      if (masked[line.groups[a][0]] === masked[line.groups[b][0]]) problems.push("Zwei Fälle, die verschieden sein müssen, bekommen denselben Text.");
    }
    preview.forEach((p, idx) => { const gi = line.groups.findIndex(g => g.includes(idx)); p.group = gi; });
    const uniq = [...new Set(problems)];
    return uniq.length ? { ok: false, msg: uniq.join(" ") + " Beispiel: " + line.sample, preview } : { ok: true, msg: "", preview };
  }
  return fail("Unbekannter Zeilentyp");
}

function letterSolution(line) {
  if (line.type === "text") return line.expect[0];
  if (line.type === "merge") return line.expect[0];
  if (line.type === "date") return line.alpha ? "18. Oktober 2026" : "18.10.2026";
  if (line.type === "zeichen") return "ab-" + line.abt;
  if (line.type === "email") return "name@" + line.domain;
  if (line.type === "vollmacht") return "i. A. Vorname Name";
  return line.sample || "";
}

function recordLabel(letter, idx) {
  const r = letter.records[idx] || {};
  const name = r.Name || r.Ansprechpartner || r.Vorname || r.Firma || "";
  const first = r.Firma && r.Firma !== name ? r.Firma : "";
  return (name || first || "Datensatz " + (idx + 1)) + (first && name ? " (" + first + ")" : "");
}

const LETTER_ZONES = { ruecksende: "Rücksendeangabe", anschrift: "Anschriftenfeld", info: "Informationsblock", body: "Brief" };
let letterState = { letter: null, results: null, previewIdx: 0, lastInput: null };

function startLetter(topicId, pushHistory = true, presetPool = null) {
  if (pushHistory) history.pushState({ name: "letter", subjectId: state.currentSubject, categoryId: state.currentCategory }, "");
  state.queue = presetPool ? presetPool.slice() : lettersFor(topicId);
  state.index = 0;
  state.correctCount = 0;
  state.answeredLog = [];
  showView("#view-letter");
  renderLetter();
}

function letterDraftKey(letter) { return "umschulung.brief." + letter.id; }

function renderLetter() {
  state.answered = false;
  const L = state.queue[state.index];
  letterState = { letter: L, results: null, previewIdx: 0, lastInput: null };
  const total = state.queue.length;
  $("#letterProgress").style.width = (state.index / total * 100) + "%";
  $("#letterScore").textContent = state.correctCount + " / " + total;
  const topicMeta = TOPICS.find(t => t.id === L.topic);
  $("#letterTopicLabel").textContent = (topicMeta ? topicMeta.icon + " " + topicMeta.title : "") + " · " + (state.index + 1) + "/" + total;
  $("#letterTitle").textContent = L.title;
  $("#letterTask").textContent = L.task;

  // Datenquelle als Tabelle
  const dq = $("#letterDQ");
  if (L.fields.length) {
    dq.classList.remove("hidden");
    dq.innerHTML = '<div class="dq-caption">Datenquelle (' + L.records.length + ' Datensätze)</div><div class="dq-scroll"><table class="dq-table"><thead><tr>' +
      L.fields.map(f => "<th>" + escapeHtml(f) + "</th>").join("") + "</tr></thead><tbody>" +
      L.records.map(r => "<tr>" + L.fields.map(f => "<td>" + escapeHtml(r[f] || "") + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></div>";
  } else dq.classList.add("hidden");

  // Einfüge-Leiste: Felder + Regel-Gerüst
  const bar = $("#letterInsertBar");
  bar.innerHTML = "";
  const addChip = (label, text, cls) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "insert-chip " + (cls || ""); b.textContent = label;
    b.addEventListener("mousedown", e => e.preventDefault()); // Fokus im Eingabefeld behalten
    b.addEventListener("click", () => insertIntoLetter(text));
    bar.appendChild(b);
  };
  L.fields.forEach(f => addChip("«" + f + "»", "«" + f + "»"));
  if (L.fields.length) {
    addChip("WENN-Regel", '{WENN  = "" "" ""}', "chip-rule");
    addChip('" "', '""', "chip-rule");
  }
  bar.classList.toggle("hidden", !L.fields.length);

  // Briefbogen
  const sheet = $("#letterSheet");
  sheet.className = "letter-sheet " + (L.layout === "formular" ? "is-form" : "is-letter");
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(letterDraftKey(L))) || {}; } catch (e) { draft = {}; }
  const head = '<div class="sheet-head">' + escapeHtml(L.sender) + "</div>";
  const zoneHtml = zone => {
    const lines = L.lines.map((ln, i) => ({ ln, i })).filter(x => x.ln.zone === zone);
    if (!lines.length) return "";
    const zoneTitle = L.layout === "formular" && zone === "info" ? "Kopf der Vorlage" : LETTER_ZONES[zone];
    return '<div class="sheet-zone zone-' + zone + '"><div class="zone-title">' + zoneTitle + "</div>" +
      lines.map(({ ln, i }) => {
        const id = "lline-" + i;
        const field = ln.type === "static"
          ? '<div class="line-static">' + escapeHtml(ln.value) + "</div>"
          : (ln.type === "free" || ln.type === "group" || (ln.type === "merge" && ln.expect[0].length > 60))
            ? '<textarea id="' + id + '" class="line-input" rows="2" spellcheck="false" autocomplete="off" autocapitalize="off">' + escapeHtml(draft[i] || "") + "</textarea>"
            : '<input id="' + id + '" class="line-input" type="text" spellcheck="false" autocomplete="off" autocapitalize="off" value="' + escapeHtml(draft[i] || "").replace(/"/g, "&quot;") + '">';
        return '<div class="sheet-line" data-i="' + i + '"><label for="' + id + '" class="line-label">' + escapeHtml(ln.label) +
          (ln.hint ? ' <button type="button" class="hint-btn" aria-label="Tipp anzeigen" data-i="' + i + '">?</button>' : "") +
          '</label>' + field + '<div class="line-hint hidden">' + escapeHtml(ln.hint || "") + '</div><div class="line-result hidden"></div></div>';
      }).join("") + "</div>";
  };
  sheet.innerHTML = head +
    '<div class="sheet-top">' + '<div class="sheet-left">' + zoneHtml("ruecksende") + zoneHtml("anschrift") + "</div>" +
    '<div class="sheet-right">' + zoneHtml("info") + "</div></div>" + zoneHtml("body") +
    (L.footer ? '<div class="sheet-foot">' + escapeHtml(L.footer) + "</div>" : "");

  sheet.querySelectorAll(".line-input").forEach(el => {
    el.addEventListener("focus", () => { letterState.lastInput = el; });
    el.addEventListener("input", () => { saveLetterDraft(); autoGrow(el); });
    if (el.tagName === "TEXTAREA") autoGrow(el);
  });
  sheet.querySelectorAll(".hint-btn").forEach(btn => btn.addEventListener("click", () => {
    btn.closest(".sheet-line").querySelector(".line-hint").classList.toggle("hidden");
  }));

  $("#letterFeedback").classList.add("hidden");
  $("#letterPreview").classList.add("hidden");
  $("#letterCheckBtn").textContent = "Brief prüfen";
  $("#letterNextBtn").classList.add("hidden");
  $("#letterPreviewBtn").classList.toggle("hidden", !L.fields.length);
  window.scrollTo(0, 0);
}

function autoGrow(el) {
  if (el.tagName !== "TEXTAREA") return;
  el.style.height = "auto";
  el.style.height = Math.max(el.scrollHeight + 2, 48) + "px";
}

function saveLetterDraft() {
  const L = letterState.letter;
  const draft = {};
  L.lines.forEach((ln, i) => { const el = document.getElementById("lline-" + i); if (el) draft[i] = el.value; });
  try { localStorage.setItem(letterDraftKey(L), JSON.stringify(draft)); } catch (e) { /* Speicher voll/gesperrt: Entwurf geht verloren, Übung läuft trotzdem */ }
}

function insertIntoLetter(text) {
  const el = letterState.lastInput;
  if (!el) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  el.value = el.value.slice(0, start) + text + el.value.slice(end);
  // Cursor bei der Regel direkt hinter "WENN " bzw. zwischen die Anführungszeichen setzen
  const caret = text.startsWith("{WENN") ? start + 6 : text === '""' ? start + 1 : start + text.length;
  el.focus();
  el.setSelectionRange(caret, caret);
  saveLetterDraft();
  autoGrow(el);
}

function checkLetter() {
  const L = letterState.letter;
  const results = L.lines.map((ln, i) => {
    const el = document.getElementById("lline-" + i);
    return checkLetterLine(ln, el ? el.value : "", L);
  });
  letterState.results = results;
  const counted = L.lines.map((ln, i) => ({ ln, r: results[i] })).filter(x => x.ln.type !== "static");
  const okCount = counted.filter(x => x.r.ok).length;
  const allOk = okCount === counted.length;

  L.lines.forEach((ln, i) => {
    const lineEl = document.querySelector('.sheet-line[data-i="' + i + '"]');
    if (!lineEl || ln.type === "static") return;
    const r = results[i];
    lineEl.classList.toggle("is-ok", r.ok);
    lineEl.classList.toggle("is-bad", !r.ok);
    const box = lineEl.querySelector(".line-result");
    box.classList.remove("hidden");
    let html = '<div class="line-verdict">' + (r.ok ? "✓ Richtig" : "✗ Noch nicht richtig") + "</div>";
    if (r.msg) html += '<div class="line-msg">' + escapeHtml(r.msg) + "</div>";
    if (!r.ok && r.preview) {
      html += '<div class="line-preview"><div class="preview-cap">So sieht deine Zeile je Datensatz aus (· = Leerzeichen):</div>' +
        r.preview.map(p => '<div class="preview-row ' + (p.ok === false ? "bad" : p.ok ? "good" : "") + '"><span class="preview-who">' + escapeHtml(p.label) + '</span><span class="preview-got">' +
          escapeHtml(showSpaces(p.got)) + "</span>" + (p.want !== undefined && !p.ok ? '<span class="preview-want">Soll: ' + escapeHtml(showSpaces(p.want)) + "</span>" : "") + "</div>").join("") + "</div>";
    }
    box.innerHTML = html;
  });

  const fb = $("#letterFeedback");
  fb.classList.remove("hidden", "good", "bad");
  fb.classList.add(allOk ? "good" : "bad");
  fb.textContent = allOk ? "✅ Alles richtig! " + okCount + " von " + counted.length + " Zeilen."
    : "📝 " + okCount + " von " + counted.length + " Zeilen richtig. Korrigiere die roten Zeilen und prüfe nochmal.";

  if (!state.answered) {
    // Gezählt wird der erste Prüfversuch, danach darf beliebig verbessert werden.
    state.answered = true;
    if (allOk) state.correctCount++;
    state.answeredLog.push({
      question: { q: L.title, letterId: L.id },
      given: okCount + " von " + counted.length + " Zeilen richtig",
      correctText: counted.filter(x => !x.r.ok).map(x => x.ln.label).join(", "),
      wasCorrect: allOk,
    });
  }
  $("#letterScore").textContent = state.correctCount + " / " + state.queue.length;
  $("#letterCheckBtn").textContent = "Nochmal prüfen";
  $("#letterNextBtn").classList.remove("hidden");
  const firstBad = document.querySelector(".sheet-line.is-bad");
  if (firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
}

// Vorschau wie in Word: der ganze Brief mit den Daten eines Datensatzes
function renderLetterPreview() {
  const L = letterState.letter;
  const box = $("#letterPreview");
  const idx = letterState.previewIdx;
  const rec = L.records[idx];
  const lineOut = (ln, i) => {
    if (ln.type === "static") return ln.value;
    const el = document.getElementById("lline-" + i);
    const v = el ? el.value : "";
    try { return normOut(evalNodes(parseTemplate(v), rec)); } catch (e) { return "⚠ " + e.message; }
  };
  const zone = z => L.lines.map((ln, i) => ({ ln, i })).filter(x => x.ln.zone === z)
    .map(({ ln, i }) => '<div class="pv-line"><span class="pv-label">' + escapeHtml(ln.label) + '</span>' + escapeHtml(lineOut(ln, i) || " ") + "</div>").join("");
  box.innerHTML = '<div class="pv-nav"><button type="button" class="secondary-btn" id="pvPrev" aria-label="Vorheriger Datensatz">◀</button><span>Datensatz ' + (idx + 1) + " / " + L.records.length + ": " + escapeHtml(recordLabel(L, idx)) +
    '</span><button type="button" class="secondary-btn" id="pvNext" aria-label="Nächster Datensatz">▶</button></div>' +
    '<div class="pv-sheet">' + zone("ruecksende") + zone("anschrift") + zone("info") + zone("body") + "</div>";
  box.classList.remove("hidden");
  $("#pvPrev").addEventListener("click", () => { letterState.previewIdx = (idx - 1 + L.records.length) % L.records.length; renderLetterPreview(); });
  $("#pvNext").addEventListener("click", () => { letterState.previewIdx = (idx + 1) % L.records.length; renderLetterPreview(); });
}

function finishLetter() {
  $("#letterProgress").style.width = "100%";
  const total = state.queue.length;
  const pct = total ? Math.round((state.correctCount / total) * 100) : 0;
  const progress = loadProgress();
  const prevBest = progress[state.currentTopic]?.bestScore || 0;
  progress[state.currentTopic] = { bestScore: Math.max(prevBest, state.correctCount), total };
  saveProgress(progress);
  bumpStreak();
  $("#resultEmoji").textContent = pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚";
  $("#resultTitle").textContent = pct >= 80 ? "Stark!" : pct >= 50 ? "Gut gemacht!" : "Weiter üben!";
  $("#resultText").textContent = `${state.correctCount} von ${total} Briefen waren beim ersten Prüfen komplett richtig (${pct}%).`;
  showResult("letter");
}

$("#letterCheckBtn").addEventListener("click", checkLetter);
$("#letterPreviewBtn").addEventListener("click", () => {
  const box = $("#letterPreview");
  if (!box.classList.contains("hidden")) { box.classList.add("hidden"); return; }
  renderLetterPreview();
});
$("#letterResetBtn").addEventListener("click", () => {
  const L = letterState.letter;
  if (!confirm("Alle Eingaben in diesem Brief löschen?")) return;
  try { localStorage.removeItem(letterDraftKey(L)); } catch (e) { /* ignorieren */ }
  const keepAnswered = state.answered;
  renderLetter();
  state.answered = keepAnswered;
});
$("#letterNextBtn").addEventListener("click", () => {
  // Entwurf nur bis zum Weitergehen aufheben (Schutz vor versehentlichem Zurück),
  // danach leer starten, damit "Nochmal üben" wirklich neu getippt wird.
  try { localStorage.removeItem(letterDraftKey(letterState.letter)); } catch (e) { /* ignorieren */ }
  state.index++;
  if (state.index >= state.queue.length) finishLetter();
  else renderLetter();
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

// ---------- LERN-KALENDER (Klick auf die Flamme zeigt, an welchen Tagen geuebt wurde) ----------
let calendarViewDate = new Date(); // Monat, der gerade im Kalender angezeigt wird

function pad2(n) { return String(n).padStart(2, "0"); }
function dateKey(y, m, d) { return y + "-" + pad2(m + 1) + "-" + pad2(d); }

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

function renderCalendar() {
  const y = calendarViewDate.getFullYear();
  const m = calendarViewDate.getMonth();
  $("#calMonthLabel").textContent = MONTH_NAMES[m] + " " + y;

  const activeDays = new Set(getActiveDays());
  const todayKey = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(y, m, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // JS: 0=So..6=Sa -> hier 0=Mo..6=So
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const grid = $("#calendarGrid");
  grid.innerHTML = "";
  for (let i = 0; i < firstWeekday; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day empty";
    grid.appendChild(empty);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(y, m, d);
    const cell = document.createElement("div");
    cell.className = "cal-day" + (activeDays.has(key) ? " active" : "") + (key === todayKey ? " today" : "");
    cell.textContent = d;
    grid.appendChild(cell);
  }

  $("#streakModalSub").textContent =
    `Aktuelle Serie: ${getStreak()} Tag(e) am Stück · insgesamt ${activeDays.size} Lerntag(e)`;
}

let streakModalOpenerEl = null; // Element, das den Dialog geoeffnet hat - bekommt beim Schliessen den Fokus zurueck

function openStreakModal() {
  streakModalOpenerEl = document.activeElement;
  calendarViewDate = new Date();
  renderCalendar();
  $("#streakModal").classList.remove("hidden");
  $(".modal-card").focus();
}
function closeStreakModal() {
  $("#streakModal").classList.add("hidden");
  (streakModalOpenerEl || $("#streakBadge")).focus();
}

// Einfache Fokus-Falle: Tab/Shift+Tab bleiben innerhalb des offenen Dialogs, damit
// Tastatur-Nutzer nicht versehentlich hinter das Modal auf die verdeckte Seite tabben.
function trapFocus(e) {
  if (e.key !== "Tab" || $("#streakModal").classList.contains("hidden")) return;
  const focusable = $("#streakModal").querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

$("#streakBadge").addEventListener("click", openStreakModal);
$("#closeStreakModal").addEventListener("click", closeStreakModal);
$("#streakModal").addEventListener("click", (e) => {
  if (e.target.id === "streakModal") closeStreakModal(); // Klick auf den abgedunkelten Hintergrund
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#streakModal").classList.contains("hidden")) closeStreakModal();
  else trapFocus(e);
});
$("#calPrevBtn").addEventListener("click", () => {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
  renderCalendar();
});
$("#calNextBtn").addEventListener("click", () => {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
  renderCalendar();
});

// ---------- Theme toggle support (host may set data-theme on <html>) ----------
// no-op here; CSS handles via prefers-color-scheme + [data-theme] overrides

// ---------- PWA: service worker + install prompt ----------
// Ohne das Folgende kann eine bereits installierte/geoeffnete App noch tagelang die
// alte Version zeigen: Browser pruefen von sich aus nur selten (bis zu 24h) auf eine
// neue service-worker.js, und selbst nachdem der neue Worker aktiv ist, laedt die
// bereits offene Seite ihr JS/CSS nicht von selbst neu. reg.update() erzwingt die
// Pruefung bei jedem Start, controllerchange erkennt den Wechsel auf den neuen Worker
// und laedt die Seite dann genau einmal automatisch neu.
if ("serviceWorker" in navigator) {
  // Nur reloaden, wenn diese Seite beim Laden bereits von einem Worker kontrolliert
  // wurde - sonst wuerde jede Erstinstallation (kein vorheriger Worker -> claim()
  // durch den ersten Worker feuert controllerchange auch) einen unnoetigen Reload
  // direkt beim allerersten Besuch ausloesen.
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").then((reg) => {
      reg.update();
    }).catch(() => {});
  });
  let reloadedForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadControllerAtLoad || reloadedForUpdate) return;
    reloadedForUpdate = true;
    window.location.reload();
  });
}

const archiveToggle = $("#archiveToggle");
if (archiveToggle) {
  archiveToggle.addEventListener("click", () => {
    state.showArchived = !state.showArchived;
    renderSubjects();
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
