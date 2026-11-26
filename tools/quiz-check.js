// Prüft, ob die richtige Antwort im Quiz durch ihre Länge auffällt.
// Aufruf: node tools/quiz-check.js [subject-id | --alle]   (ohne Argument: alle aktiven Fächer)
// Fehler, wenn
//  - single: die richtige Antwort die längste ist UND mehr als 25 % (mind. 8 Zeichen) länger als die zweitlängste
//  - multi: die kürzeste richtige Antwort länger ist als die längste falsche
//  - pro Thema: die richtige Antwort bei mehr als 40 % der Fragen die längste ist (ab 5 Fragen)
const fs = require("fs"), path = require("path");
const ctx = {};
new Function("ctx", fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8") +
  ";ctx.Q=QUESTIONS;ctx.T=TOPICS;ctx.S=SUBJECTS;")(ctx);
const only = process.argv[2];
const active = new Set(ctx.S.filter(s => only === "--alle" ? true : only ? s.id === only : !s.archived).map(s => s.id));
const topicSubject = Object.fromEntries(ctx.T.map(t => [t.id, t.subject]));
const L = s => String(s).length;
const bad = [], perTopic = {};
for (const q of ctx.Q) {
  if (!active.has(topicSubject[q.topic]) || q.options.length < 2) continue;
  const lens = q.options.map(L);
  const right = q.correct.map(i => lens[i]);
  const wrong = lens.filter((_, i) => !q.correct.includes(i));
  if (!wrong.length) continue;
  const t = perTopic[q.topic] ||= { n: 0, longest: 0 };
  t.n++;
  const maxWrong = Math.max(...wrong);
  if (q.type === "multi") {
    if (Math.min(...right) > maxWrong) bad.push([q.topic, "multi: alle richtigen länger als jede falsche", q.q]);
  } else {
    const r = right[0];
    if (r > maxWrong) t.longest++;
    if (r > maxWrong && r - maxWrong >= 8 && r > maxWrong * 1.25) bad.push([q.topic, `richtig ${r} vs. längste falsche ${maxWrong} Zeichen`, q.q]);
  }
}
const topicBad = Object.entries(perTopic).filter(([, t]) => t.n >= 5 && t.longest / t.n > 0.4);
bad.forEach(b => console.log("✗ [" + b[0] + "] " + b[1] + " :: " + b[2]));
topicBad.forEach(([id, t]) => console.log(`✗ Thema ${id}: richtige Antwort bei ${t.longest} von ${t.n} Fragen die längste`));
console.log(`\n${bad.length} Fragen und ${topicBad.length} Themen auffällig (geprüft: ${Object.values(perTopic).reduce((a, t) => a + t.n, 0)} Fragen)`);
process.exitCode = bad.length || topicBad.length ? 1 : 0;
