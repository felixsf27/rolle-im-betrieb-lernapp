// ---------- FORMULAR-TRAINER (Modus "🧩 Formular") ----------
// Felix baut das Formular echt in Word (Entwicklertools) und zieht die fertige .docx in die App.
// Die App entpackt die Datei im Browser (nichts wird hochgeladen) und prüft:
// Steuerelemente (Typ, Einträge, Datumsformat), festen Text, Formularschutz und ggf. Eingaben.
//
// Aufbau einer Aufgabe (FORMS):
//   controls: Liste der verlangten Steuerelemente, in Dokument-Reihenfolge
//     type:   "text" | "combo" | "date" | "checkbox"  (oder Liste erlaubter Typen)
//     label:  Schlüsselwörter, die direkt neben dem Steuerelement stehen ("a|b" = eins reicht).
//             Treffer am Wortanfang, Groß-/Kleinschreibung egal.
//     name:   Anzeige im Ergebnis
//     items:  Einträge im Kombinationsfeld (Reihenfolge egal)
//     minItems: Mindestanzahl Einträge, wenn die Einträge frei sind
//     format: Datumsformat wie in Word gespeichert (z. B. "dd.MM.yyyy")
//     count:  statt label: so viele Steuerelemente dieses Typs müssen insgesamt da sein
//     fill:   true = muss ausgefüllt sein, "x" = genau x, ["a|b", "c"] = enthält alle Begriffe
//     checked: true/false für Kontrollkästchen
//     soft:   true = nur Hinweis (⚠️), zählt nicht als Fehler
//   texts:   fester Text, der im Formular stehen soll (nur Hinweis bei Abweichung)
//   protect: true = Bearbeitung einschränken → Ausfüllen von Formularen, Schutz angewendet
//   fillAll: true = jedes Steuerelement (außer Kontrollkästchen) muss ausgefüllt sein
//   checkGroups: [{ ids: [...], min: 1, name }] = von diesen Kontrollkästchen mind. min angekreuzt
//   steps:   Lösungsweg zum Aufklappen

const FORMS = [
  {
    id: "form-telefonnotiz-bauen",
    topic: "formulare-uebungen",
    title: "Telefonnotiz: Formular nachbauen",
    source: "Interner Schriftverkehr › Formularerstellung - Telefonnotiz mit Formular › Formularbeispiel.pdf",
    task: "Aufgabe 1 aus dem Kurs. Baue das Formular \"Telefonnotiz zum Kundengespräch\" aus dem Formularbeispiel nach. Datum als Datumsauswahl, Zeit als Textfeld. Bei \"Anruf von\", \"Angenommen durch\" und \"Weiterleitung zur Bearbeitung an\" kommt zuerst ein Kombinationsfeld mit den Elementen Herrn und Frau, danach ein Textfeld für den Namen. Sachverhalt als Textfeld. Unten drei Kontrollkästchen: zurückrufen (mit Textfeld für die Nummer), E-Mail (mit Textfeld für die Adresse) und kommt persönlich vorbei. Zum Schluss das Formular schützen und als .docx speichern.",
    texts: ["Telefonnotiz zum Kundengespräch", "Sachverhalt", "Der Kunde"],
    controls: [
      { id: "datum", name: "Datum", type: "date", label: "datum" },
      { id: "zeit", name: "Zeit", type: "text", label: "zeit" },
      { id: "anruf-anrede", name: "Anruf von: Anrede", type: "combo", label: "anruf von", items: ["Herrn", "Frau"] },
      { id: "anruf-name", name: "Anruf von: Name", type: "text", label: "anruf von" },
      { id: "angenommen-anrede", name: "Angenommen durch: Anrede", type: "combo", label: "angenommen", items: ["Herrn", "Frau"] },
      { id: "angenommen-name", name: "Angenommen durch: Name", type: "text", label: "angenommen" },
      { id: "weiter-anrede", name: "Weiterleitung an: Anrede", type: "combo", label: "weiterleitung", items: ["Herrn", "Frau"] },
      { id: "weiter-name", name: "Weiterleitung an: Name", type: "text", label: "weiterleitung" },
      { id: "sachverhalt", name: "Sachverhalt", type: "text", label: "sachverhalt" },
      { id: "cb-rueckruf", name: "Kontrollkästchen zurückrufen", type: "checkbox", label: "zurückgerufen|rückruf" },
      { id: "rueckruf-nr", name: "Rückrufnummer", type: "text", label: "zurückgerufen|rückruf" },
      { id: "cb-mail", name: "Kontrollkästchen E-Mail", type: "checkbox", label: "e-mail|email|mail" },
      { id: "mail-adr", name: "E-Mail-Adresse", type: "text", label: "e-mail|email|mail" },
      { id: "cb-persoenlich", name: "Kontrollkästchen persönlich", type: "checkbox", label: "persönlich" },
    ],
    protect: true,
    steps: [
      "Entwicklertools einblenden: Datei › Optionen › Menüband anpassen › rechts Haken bei Entwicklertools › OK",
      "Entwicklertools › Entwurfsmodus einschalten",
      "Festen Text tippen (Überschrift, Datum:, Zeit:, Anruf von: …)",
      "Cursor hinter \"Datum:\" › Datumsauswahl-Inhaltssteuerelement",
      "Hinter \"Zeit:\" › Nur-Text-Inhaltssteuerelement (Aa)",
      "Hinter \"Anruf von:\" › Kombinationsfeld › Eigenschaften › Hinzufügen: Herrn, dann Frau › OK, danach ein Textfeld für den Namen",
      "Dasselbe bei \"Angenommen durch\" und \"Weiterleitung zur Bearbeitung an\" (Kombinationsfeld kopieren spart Zeit)",
      "Kontrollkästchen vor die drei Zeilen unten, hinter \"unter:\" je ein Textfeld",
      "Entwurfsmodus ausschalten",
      "Bearbeitung einschränken › Punkt 2: Haken setzen › \"Ausfüllen von Formularen\" › Ja, Schutz jetzt anwenden",
      "Als Word-Dokument (.docx) speichern",
    ],
  },
  {
    id: "form-telefonnotiz-ausfuellen",
    topic: "formulare-uebungen",
    title: "Telefonnotiz: Gespräch mit Herrn Blume eintragen",
    source: "Interner Schriftverkehr › Formularerstellung - Telefonnotiz mit Formular › Telefonisches Kundengespräch und Formular.pdf",
    task: "Aufgabe 2 aus dem Kurs. Du arbeitest bei Herrn Winter in der Verkaufsabteilung der Leipziger Möbelfabrik OHG und nimmst heute um 7:20 Uhr einen Anruf an. Herr Blume von der Gohliser Holz OHG möchte einen Termin, um mit Herrn Winter über den bestehenden Rahmenvertrag zu verhandeln. Du lädst ihn für nächsten Dienstag um 10:30 Uhr zum persönlichen Gespräch ins Unternehmen ein. Fülle dein geschütztes Formular aus Aufgabe 1 für Herrn Winter aus (als Nutzer, nicht im Entwurfsmodus) und speichere es.",
    controls: [
      { id: "datum", name: "Datum", type: "date", label: "datum", fill: true },
      { id: "zeit", name: "Zeit", type: "text", label: "zeit", fill: ["7:20|07:20"] },
      { id: "anruf-anrede", name: "Anruf von: Anrede", type: "combo", label: "anruf von", items: ["Herrn", "Frau"], fill: "Herrn" },
      { id: "anruf-name", name: "Anruf von: Name", type: "text", label: "anruf von", fill: ["blume"] },
      { id: "angenommen-anrede", name: "Angenommen durch: Anrede", type: "combo", label: "angenommen", items: ["Herrn", "Frau"], fill: true },
      { id: "angenommen-name", name: "Angenommen durch: Name", type: "text", label: "angenommen", fill: true },
      { id: "weiter-anrede", name: "Weiterleitung an: Anrede", type: "combo", label: "weiterleitung", items: ["Herrn", "Frau"], fill: "Herrn" },
      { id: "weiter-name", name: "Weiterleitung an: Name", type: "text", label: "weiterleitung", fill: ["winter"] },
      { id: "sachverhalt", name: "Sachverhalt", type: "text", label: "sachverhalt", fill: ["rahmenvertrag", "10:30", "dienstag|termin", "gohliser"] },
      { id: "cb-rueckruf", name: "Kontrollkästchen zurückrufen", type: "checkbox", label: "zurückgerufen|rückruf", checked: false, soft: true },
      { id: "rueckruf-nr", name: "Rückrufnummer", type: "text", label: "zurückgerufen|rückruf" },
      { id: "cb-mail", name: "Kontrollkästchen E-Mail", type: "checkbox", label: "e-mail|email|mail", checked: false, soft: true },
      { id: "mail-adr", name: "E-Mail-Adresse", type: "text", label: "e-mail|email|mail" },
      { id: "cb-persoenlich", name: "Kontrollkästchen persönlich", type: "checkbox", label: "persönlich", checked: true, soft: true },
    ],
    protect: true,
    steps: [
      "Geschütztes Formular aus Aufgabe 1 öffnen (Entwurfsmodus muss aus sein)",
      "Datum: heutiges Datum im Kalender wählen",
      "Zeit: 7:20 Uhr",
      "Anruf von: Herrn › Blume, Gohliser Holz OHG",
      "Angenommen durch: deine Anrede und dein Name",
      "Weiterleitung an: Herrn › Winter",
      "Sachverhalt in ganzen Sätzen: Herr Blume möchte über den bestehenden Rahmenvertrag verhandeln. Termin am nächsten Dienstag (Datum) um 10:30 Uhr bei uns im Haus.",
      "Er kommt persönlich vorbei › dieses Kontrollkästchen ankreuzen",
      "Speichern",
    ],
  },
  {
    id: "form-umfrage",
    topic: "formulare-uebungen",
    title: "Umfrage zur Fortbildung",
    source: "Interner Schriftverkehr › Formulargestaltung - Umfrage Fortbildung › Aufgabe Umfrage Fortbildung.pdf",
    task: "Gestalte das Formular \"Umfrage zur Fortbildung\" nach (Tabelle mit Frage und Antwort). In der Überschrift ein Feld für das Datum. Das Thema als Kombinationsfeld mit Word, Excel, Access, PowerPoint, Outlook und Publisher. Bei der Abteilung ein Kombinationsfeld mit Einkauf, Verkauf, Marketing und Rechnungswesen. Alle anderen Felder sind Textfelder oder Kontrollkästchen (täglich, mehrmals in einer Arbeitswoche, nur selten). Formular schützen, dann vom Urheber zum Nutzer wechseln und das Formular komplett ausfüllen.",
    texts: ["Umfrage zur Fortbildung am", "Ihre Personalnummer", "Ihre Abteilung", "Wie oft nutzen Sie das Programm", "Vielen Dank für Ihre Mitarbeit", "Seminarkoordinator"],
    needTable: true,
    controls: [
      { id: "datum", name: "Datum in der Überschrift", type: "date", label: "fortbildung am|umfrage" },
      { id: "thema", name: "Thema", type: "combo", label: "thema", items: ["Word", "Excel", "Access", "PowerPoint", "Outlook", "Publisher"] },
      { id: "personalnr", name: "Personalnummer", type: "text", label: "personalnummer" },
      { id: "abteilung", name: "Abteilung", type: "combo", label: "abteilung", items: ["Einkauf", "Verkauf", "Marketing", "Rechnungswesen"] },
      { id: "letzte", name: "Letzte Schulung", type: ["text", "date"], label: "letzte schulung" },
      { id: "themen", name: "Themen aus dem Programm", type: "text", label: "themen aus|interessieren" },
      { id: "cb-taeglich", name: "Kontrollkästchen täglich", type: "checkbox", label: "täglich" },
      { id: "cb-mehrmals", name: "Kontrollkästchen mehrmals", type: "checkbox", label: "mehrmals" },
      { id: "cb-selten", name: "Kontrollkästchen nur selten", type: "checkbox", label: "selten|nur selten" },
    ],
    protect: true,
    fillAll: true,
    checkGroups: [{ ids: ["cb-taeglich", "cb-mehrmals", "cb-selten"], min: 1, name: "Wie oft nutzen Sie das Programm? (eins ankreuzen)" }],
    steps: [
      "Überschrift tippen, dahinter Datumsauswahl",
      "Einleitung tippen, hinter \"zum Thema\" ein Kombinationsfeld › Eigenschaften › Hinzufügen: Word, Excel, Access, PowerPoint, Outlook, Publisher",
      "Tabelle mit 2 Spalten einfügen, Kopfzeile Frage | Antwort",
      "Antwort-Spalte: Textfelder, bei Abteilung ein Kombinationsfeld (Einkauf, Verkauf, Marketing, Rechnungswesen)",
      "Bei \"Wie oft nutzen Sie das Programm?\" die Zelle verbinden bzw. teilen, hinter täglich / mehrmals / nur selten je ein Kontrollkästchen",
      "Schlusstext und Max Muster, Ihr Seminarkoordinator",
      "Entwurfsmodus aus, Bearbeitung einschränken › Ausfüllen von Formularen › Ja, Schutz jetzt anwenden",
      "Als Nutzer alles ausfüllen und ein Kontrollkästchen ankreuzen, speichern",
    ],
  },
  {
    id: "form-onlinebewerbung",
    topic: "formulare-uebungen",
    title: "Onlinebewerbung um einen Praktikumsplatz",
    source: "Interner Schriftverkehr › Onlineformular - Vorlage › Onlinebewerbung_Praktikum.docx",
    task: "Übung von mir nach der Kursvorlage (im Kurs steht nur die Vorlage, ohne Aufgabentext). Öffne die Vorlage und setze hinter jede Angabe das passende Steuerelement. Geschlecht: Kombinationsfeld mit weiblich, männlich, divers. Name, Vorname: Textfeld. Geburtsdatum: Datumsauswahl im Format TT.MM.JJJJ. Adresse: Textfeld. Praktikum im Bereich: Kombinationsfeld mit Einkauf, Verkauf, Marketing, Rechnungswesen, E-Commerce. Praktikum als: Textfeld. Zeitraum: von (Datum) bis (Datum), also zwei Datumsauswahlen. Sonstiges: Textfeld. Datum: Datumsauswahl. Achtung: In der Vorlage ist der Schutz schon vorbereitet, aber nicht angewendet. Formular schützen und speichern.",
    texts: ["Online-Bewerbung um einen Praktikumsplatz"],
    controls: [
      { id: "geschlecht", name: "Geschlecht", type: "combo", label: "geschlecht", items: ["weiblich", "männlich", "divers"] },
      { id: "name", name: "Name, Vorname", type: "text", label: "name" },
      { id: "geburt", name: "Geburtsdatum", type: "date", label: "geburtsdatum", format: "dd.MM.yyyy" },
      { id: "adresse", name: "Adresse", type: "text", label: "adresse" },
      { id: "bereich", name: "Praktikum im Bereich", type: "combo", label: "bereich", items: ["Einkauf", "Verkauf", "Marketing", "Rechnungswesen", "E-Commerce"] },
      { id: "als", name: "Praktikum als", type: ["text", "combo"], label: "praktikum als" },
      { id: "von", name: "Zeitraum von", type: "date", label: "zeitraum" },
      { id: "bis", name: "Zeitraum bis", type: "date", label: "zeitraum|bis" },
      { id: "sonstiges", name: "Sonstiges", type: "text", label: "sonstiges" },
      { id: "datum", name: "Datum", type: "date", label: "datum" },
    ],
    protect: true,
    steps: [
      "Vorlage Onlinebewerbung_Praktikum.docx öffnen, Entwurfsmodus an",
      "Hinter Geschlecht: Kombinationsfeld › Eigenschaften › Hinzufügen: weiblich, männlich, divers",
      "Name, Adresse, Praktikum als, Sonstiges: Nur-Text-Inhaltssteuerelement",
      "Geburtsdatum: Datumsauswahl › Eigenschaften › Datumsanzeige TT.MM.JJJJ",
      "Bereich: Kombinationsfeld mit den fünf Bereichen",
      "Zeitraum: \"von\" Datumsauswahl \"bis\" Datumsauswahl",
      "Datum unten: Datumsauswahl",
      "Entwurfsmodus aus, Bearbeitung einschränken › Ausfüllen von Formularen › Ja, Schutz jetzt anwenden, speichern",
    ],
  },
  {
    id: "form-bestellformular",
    topic: "formulare-uebungen",
    title: "Bestellformular Leipziger Möbelfabrik",
    source: "Interner Schriftverkehr › Bestellformular - Vorlage › Formular-Vorlage TN.docx",
    task: "Übung von mir nach der Kursvorlage (im Kurs steht nur die Vorlage mit \"Bestellformular\" und \"Neuer Kunde\"). Vor \"Neuer Kunde\" ein Kontrollkästchen. Darunter: Kundennummer, Firma, Ansprechpartner und Anschrift als Textfelder, Bestelldatum als Datumsauswahl im Format TT.MM.JJJJ. Dann Artikel als Kombinationsfeld mit Schreibtisch, Bürostuhl, Aktenschrank, Rollcontainer und Menge als Textfeld. Lieferung als Kombinationsfeld mit Abholung, Spedition, Paketdienst. Ganz unten ein Kontrollkästchen \"Ich habe die AGB gelesen.\" Gerne als Tabelle. Schützen und speichern.",
    texts: ["Bestellformular", "Neuer Kunde"],
    controls: [
      { id: "cb-neu", name: "Kontrollkästchen Neuer Kunde", type: "checkbox", label: "neuer kunde" },
      { id: "kdnr", name: "Kundennummer", type: "text", label: "kundennummer|kunden-nr|kd.-nr" },
      { id: "firma", name: "Firma", type: "text", label: "firma" },
      { id: "ansprech", name: "Ansprechpartner", type: "text", label: "ansprechpartner" },
      { id: "anschrift", name: "Anschrift", type: "text", label: "anschrift|adresse" },
      { id: "bestelldatum", name: "Bestelldatum", type: "date", label: "bestelldatum|datum", format: "dd.MM.yyyy" },
      { id: "artikel", name: "Artikel", type: "combo", label: "artikel", items: ["Schreibtisch", "Bürostuhl", "Aktenschrank", "Rollcontainer"] },
      { id: "menge", name: "Menge", type: "text", label: "menge|anzahl" },
      { id: "lieferung", name: "Lieferung", type: "combo", label: "lieferung|versand", items: ["Abholung", "Spedition", "Paketdienst"] },
      { id: "cb-agb", name: "Kontrollkästchen AGB", type: "checkbox", label: "agb" },
    ],
    protect: true,
    steps: [
      "Vorlage Formular-Vorlage TN.docx öffnen, Entwurfsmodus an",
      "Cursor vor \"Neuer Kunde\" › Kontrollkästchen",
      "Tabelle mit Beschriftung links und Steuerelement rechts anlegen",
      "Textfelder für Kundennummer, Firma, Ansprechpartner, Anschrift, Menge",
      "Bestelldatum: Datumsauswahl › Eigenschaften › TT.MM.JJJJ",
      "Artikel und Lieferung: Kombinationsfeld › Eigenschaften › Hinzufügen",
      "Unten Kontrollkästchen + \"Ich habe die AGB gelesen.\"",
      "Entwurfsmodus aus, Bearbeitung einschränken › Ausfüllen von Formularen › Ja, Schutz jetzt anwenden, speichern",
    ],
  },
  {
    id: "form-mimimi",
    topic: "formulare-uebungen",
    title: "Zusatzformular: MIMIMI",
    source: "Interner Schriftverkehr › Zusatzformular › MIMIMI_Formular.pdf",
    task: "Das Spaßformular aus dem Kurs nachbauen. Name des MIMImierenden als Textfeld, Datum des MIMIMI-Ereignisses als Datumsauswahl. Danach alle Kontrollkästchen aus der Vorlage: Worauf basiert es (4), wo kann es eingeordnet werden (6) und die vier Ja/Nein-Fragen mit je 3 Antworten (12). Das sind 22 Kontrollkästchen. Schützen und speichern.",
    texts: ["MIMIMI Formular", "Haben Sie geweint", "Sind Sie bereit"],
    controls: [
      { id: "name", name: "Name des MIMImierenden", type: "text", label: "name" },
      { id: "datum", name: "Datum des Ereignisses", type: "date", label: "datum" },
      { id: "cbs", name: "Kontrollkästchen", type: "checkbox", count: 22 },
    ],
    protect: true,
    steps: [
      "Überschrift und Fragen tippen",
      "Hinter Name: Textfeld, hinter Datum: Datumsauswahl",
      "Vor jede Antwort ein Kontrollkästchen (einmal einfügen, dann kopieren und einfügen geht schneller)",
      "Entwurfsmodus aus, Bearbeitung einschränken › Ausfüllen von Formularen › Ja, Schutz jetzt anwenden, speichern",
    ],
  },
];

// ===================== DOCX LESEN =====================
const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const W14_NS = "http://schemas.microsoft.com/office/word/2010/wordml";

// Minimaler ZIP-Leser (Central Directory), entpackt mit DecompressionStream("deflate-raw").
async function readZipEntries(buf, wanted) {
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Das ist keine gültige Word-Datei (.docx).");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commLen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commLen;
    if (!wanted.includes(name)) continue;
    const lNameLen = dv.getUint16(local + 26, true), lExtraLen = dv.getUint16(local + 28, true);
    const data = new Uint8Array(buf, local + 30 + lNameLen + lExtraLen, csize);
    let bytes;
    if (method === 0) bytes = data;
    else if (method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error("Unbekannte Komprimierung in der Datei.");
    out[name] = dec.decode(bytes);
  }
  return out;
}

function wAttr(el, name) {
  return el ? (el.getAttributeNS(W_NS, name) ?? el.getAttribute("w:" + name)) : null;
}
function wChild(el, local, ns = W_NS) {
  if (!el) return null;
  for (const c of el.children) if (c.localName === local && c.namespaceURI === ns) return c;
  return null;
}
function closestW(el, local) {
  let e = el.parentElement;
  while (e) { if (e.localName === local && e.namespaceURI === W_NS) return e; e = e.parentElement; }
  return null;
}

// Text eines Knotens, Inhalte von Steuerelementen werden übersprungen (nur fester Text).
// Liefert Segmente: Text zwischen den Steuerelementen, damit "direkt davor/danach" bestimmbar ist.
function segmentsOf(node, sdtList) {
  const segs = [""];
  const walk = el => {
    for (const c of el.children) {
      if (c.namespaceURI === W_NS && c.localName === "sdt") { sdtList.push(c); segs.push(""); continue; }
      if (c.namespaceURI === W_NS && c.localName === "fldChar" && wAttr(c, "fldCharType") === "begin" && wChild(c, "ffData")) {
        sdtList.push(c); segs.push(""); continue;
      }
      if (c.namespaceURI === W_NS && (c.localName === "t")) segs[segs.length - 1] += c.textContent;
      else if (c.namespaceURI === W_NS && (c.localName === "tab" || c.localName === "br")) segs[segs.length - 1] += " ";
      else if (c.namespaceURI === W_NS && c.localName === "instrText") continue;
      else walk(c);
    }
  };
  walk(node);
  return segs;
}
function plainText(node) {
  return segmentsOf(node, []).join(" ").replace(/\s+/g, " ").trim();
}

function sdtValue(sdt) {
  const content = wChild(sdt, "sdtContent");
  if (!content) return "";
  let s = "";
  content.querySelectorAll("*").forEach(e => {
    if (e.namespaceURI === W_NS && e.localName === "t") s += e.textContent;
    else if (e.namespaceURI === W_NS && (e.localName === "tab" || e.localName === "br")) s += " ";
  });
  return s.replace(/\s+/g, " ").trim();
}

function describeControl(el) {
  // Altes Formularfeld (Vorversionentools)
  if (el.localName === "fldChar") {
    const ff = wChild(el, "ffData");
    const c = { legacy: true, el };
    if (wChild(ff, "checkBox")) {
      const cb = wChild(ff, "checkBox");
      c.type = "checkbox";
      const ch = wChild(cb, "checked") || wChild(cb, "default");
      c.checked = !!ch && wAttr(ch, "val") !== "0" && wAttr(ch, "val") !== "false";
      c.filled = true;
    } else if (wChild(ff, "ddList")) {
      c.type = "combo"; c.subtype = "dropdown";
      c.items = [...wChild(ff, "ddList").children].filter(x => x.localName === "listEntry").map(x => wAttr(x, "val"));
      c.filled = true;
    } else {
      const ti = wChild(ff, "textInput");
      const t = wChild(ti, "type");
      c.type = t && wAttr(t, "val") === "date" ? "date" : "text";
      if (c.type === "date") { const f = wChild(ti, "format"); c.format = f ? wAttr(f, "val") : ""; }
      c.filled = null; // bei alten Feldern nicht sicher auslesbar
    }
    return c;
  }
  const pr = wChild(el, "sdtPr");
  const c = { legacy: false, el, value: sdtValue(el) };
  const alias = wChild(pr, "alias"), tag = wChild(pr, "tag");
  c.title = [alias && wAttr(alias, "val"), tag && wAttr(tag, "val")].filter(Boolean).join(" ");
  c.placeholder = !!wChild(pr, "showingPlcHdr");
  const cb = pr && [...pr.children].find(x => x.localName === "checkbox" && x.namespaceURI === W14_NS);
  if (cb) {
    c.type = "checkbox";
    const ch = [...cb.children].find(x => x.localName === "checked");
    const v = ch ? (ch.getAttributeNS(W14_NS, "val") ?? ch.getAttribute("w14:val")) : "0";
    c.checked = v === "1" || v === "true";
    c.filled = true;
  } else if (wChild(pr, "comboBox") || wChild(pr, "dropDownList")) {
    c.type = "combo";
    c.subtype = wChild(pr, "comboBox") ? "combo" : "dropdown";
    const list = wChild(pr, "comboBox") || wChild(pr, "dropDownList");
    c.items = [...list.children].filter(x => x.localName === "listItem")
      .map(x => (wAttr(x, "displayText") || wAttr(x, "value") || "").trim())
      .filter(t => t && !/^wählen sie ein element aus/i.test(t) && !/^choose an item/i.test(t));
    c.filled = !c.placeholder && c.value !== "";
  } else if (wChild(pr, "date")) {
    c.type = "date";
    const f = wChild(wChild(pr, "date"), "dateFormat");
    c.format = f ? wAttr(f, "val") : "";
    c.filled = !c.placeholder && c.value !== "";
  } else if (wChild(pr, "picture") || wChild(pr, "docPartObj") || wChild(pr, "group") || wChild(pr, "citation") || wChild(pr, "bibliography")) {
    c.type = "other";
  } else {
    c.type = "text";
    c.subtype = wChild(pr, "text") ? "plain" : "rich";
    c.filled = !c.placeholder && c.value !== "";
  }
  return c;
}

// Alle Steuerelemente mit Umgebungstext (direkt davor/danach, Absatz/Zelle, Nachbarabsätze).
function collectControls(doc) {
  const body = doc.getElementsByTagNameNS(W_NS, "body")[0];
  const paras = [...body.getElementsByTagNameNS(W_NS, "p")];
  const controls = [];
  const seen = new Set();
  const paraText = paras.map(p => plainText(p));
  const isBlankCtx = s => !s.replace(/[\s:.,;\-–]/g, "");
  // Umgebung: eigener Absatz bzw. eigene Tabellenzelle (leer → Zelle links daneben),
  // sonst die Nachbarabsätze davor und danach.
  const setContext = (c, anchor, pi) => {
    c.own = pi >= 0 ? paraText[pi] : "";
    const tc = closestW(anchor, "tc");
    if (tc) {
      c.own = plainText(tc);
      if (isBlankCtx(c.own)) {
        let prev = tc.previousElementSibling;
        while (prev && prev.localName !== "tc") prev = prev.previousElementSibling;
        if (prev) c.own = plainText(prev);
      }
    }
    c.neighbors = "";
    if (isBlankCtx(c.own)) {
      if (pi < 0) {
        const firstP = anchor.getElementsByTagNameNS(W_NS, "p")[0];
        pi = firstP ? paras.indexOf(firstP) : -1;
      }
      if (pi >= 0) {
        const prevT = paraText.slice(0, pi).reverse().find(t => !isBlankCtx(t)) || "";
        const nextT = paraText.slice(pi + 1).find(t => !isBlankCtx(t)) || "";
        c.neighbors = prevT + " | " + nextT;
      }
    }
  };

  paras.forEach((p, pi) => {
    const list = [];
    const segs = segmentsOf(p, list);
    list.forEach((el, k) => {
      // ein Block-Steuerelement mit mehreren Absätzen nur einmal zählen
      const key = el.localName === "fldChar" ? el : el;
      if (seen.has(key)) return;
      seen.add(key);
      const c = describeControl(el);
      if (c.type === "other") return;
      c.near = (segs[k] + " " + segs[k + 1]).trim();
      setContext(c, p, pi);
      c.order = controls.length;
      controls.push(c);
    });
  });

  // Block-Steuerelemente (umschließen ganze Absätze), die oben nicht über einen Absatz gefunden wurden
  [...body.getElementsByTagNameNS(W_NS, "sdt")].forEach(el => {
    if (seen.has(el)) return;
    let inner = el.parentElement, nested = false;
    while (inner) { if (seen.has(inner)) { nested = true; break; } inner = inner.parentElement; }
    if (nested) return;
    seen.add(el);
    const c = describeControl(el);
    if (c.type === "other") return;
    c.near = "";
    setContext(c, el, -1);
    c.order = controls.length;
    controls.push(c);
  });
  return controls;
}

function labelScore(c, label) {
  if (!label) return 0;
  const keys = label.split("|").map(k => k.trim().toLowerCase()).filter(Boolean);
  const hit = txt => {
    const t = (txt || "").toLowerCase();
    return keys.some(k => new RegExp("(^|[^a-zäöüß0-9])" + k.replace(/[.*+?^${}()[\]\\]/g, "\\$&")).test(t));
  };
  if (hit(c.near) || hit(c.title)) return 3;
  if (hit(c.own)) return 2;
  if (hit(c.neighbors)) return 1;
  return 0;
}

const FORM_TYPE_NAMES = { text: "Textfeld", combo: "Kombinationsfeld", date: "Datumsauswahl", checkbox: "Kontrollkästchen" };
const FORM_TYPE_EIN = { text: "ein Textfeld", combo: "ein Kombinationsfeld", date: "eine Datumsauswahl", checkbox: "ein Kontrollkästchen" };
const FORM_TYPE_KEIN = { text: "kein Textfeld", combo: "kein Kombinationsfeld", date: "keine Datumsauswahl", checkbox: "kein Kontrollkästchen" };
function typeName(t) { return Array.isArray(t) ? t.map(x => FORM_TYPE_NAMES[x]).join(" oder ") : FORM_TYPE_NAMES[t]; }
function wordFormat(f) {
  return (f || "").replace(/yyyy/g, "JJJJ").replace(/yy/g, "JJ").replace(/dd/g, "TT").replace(/MMMM/g, "Monat").replace(/MM/g, "MM").replace(/d/g, "T");
}
function normItem(s) { return (s || "").toLowerCase().replace(/\s+/g, " ").trim(); }

function checkFill(spec, c) {
  if (spec.fill === undefined) return null;
  const v = (c.value || "").toLowerCase();
  if (c.filled === null) return { status: "info", text: spec.name + ": Eingabe in alten Formularfeldern kann die App nicht sicher lesen, bitte selbst kontrollieren." };
  if (!c.filled) return { status: "bad", text: spec.name + ": noch leer (zeigt noch den Platzhaltertext)." };
  if (spec.fill === true) return { status: "ok", text: spec.name + ": ausgefüllt (" + c.value + ")" };
  if (typeof spec.fill === "string") {
    return normItem(c.value) === normItem(spec.fill)
      ? { status: "ok", text: spec.name + ": " + c.value }
      : { status: "bad", text: spec.name + ": \"" + c.value + "\" steht drin, gehört aber \"" + spec.fill + "\"." };
  }
  const missing = spec.fill.filter(k => !k.split("|").some(a => v.includes(a.toLowerCase())));
  return missing.length
    ? { status: "bad", text: spec.name + ": es fehlt noch " + missing.map(m => "\"" + m.split("|")[0] + "\"").join(", ") + "." }
    : { status: "ok", text: spec.name + ": passt (" + (c.value.length > 60 ? c.value.slice(0, 60) + " …" : c.value) + ")" };
}

// Prüft ein Formular gegen die Aufgabe. Rückgabe: Liste von { status: ok|bad|warn|info, text }.
function checkFormDoc(form, docXml, settingsXml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("Die Datei konnte nicht gelesen werden.");
  const results = [];
  const controls = collectControls(doc);
  const used = new Set();
  const matched = {};

  if (!controls.length) {
    results.push({ status: "bad", text: "Keine Steuerelemente gefunden. Hast du sie über Entwicklertools › Steuerelemente eingefügt (nicht nur Text oder Unterstriche)?" });
  }
  if (controls.some(c => c.legacy)) {
    results.push({ status: "info", text: "Du hast Formularfelder aus den Vorversionentools benutzt. Geht auch, im Kurs sind aber die neuen Inhaltssteuerelemente der Standard." });
  }

  form.controls.forEach(spec => {
    const types = Array.isArray(spec.type) ? spec.type : [spec.type];
    if (spec.count) {
      const n = controls.filter(c => types.includes(c.type)).length;
      results.push(n >= spec.count
        ? { status: "ok", text: n + " " + spec.name + " gefunden (verlangt: " + spec.count + ")." }
        : { status: "bad", text: "Nur " + n + " " + spec.name + " gefunden, verlangt sind " + spec.count + "." });
      return;
    }
    let best = null, bestScore = 0;
    controls.forEach(c => {
      if (used.has(c) || !types.includes(c.type)) return;
      const s = labelScore(c, spec.label);
      if (s > bestScore) { best = c; bestScore = s; }
    });
    if (!best) {
      // falscher Typ direkt an der Beschriftung? (nicht verbrauchen, könnte zu einer anderen Vorgabe gehören)
      const wrong = controls.find(c => !used.has(c) && labelScore(c, spec.label) >= 3);
      if (wrong) {
        results.push({ status: spec.soft ? "warn" : "bad", text: spec.name + ": da steht " + (FORM_TYPE_EIN[wrong.type] || wrong.type) + ", verlangt ist " + (Array.isArray(spec.type) ? typeName(spec.type) : FORM_TYPE_EIN[spec.type]) + "." });
      } else {
        results.push({ status: spec.soft ? "warn" : "bad", text: spec.name + ": " + types.map(t => FORM_TYPE_KEIN[t]).join(" und ") + " gefunden. Steht es direkt neben der Beschriftung?" });
      }
      return;
    }
    used.add(best);
    matched[spec.id] = best;
    const notes = [];
    let bad = false;
    if (best.type === "combo") {
      if (best.subtype === "dropdown") notes.push({ status: "warn", text: spec.name + ": Das ist eine Dropdownliste. Verlangt ist meist ein Kombinationsfeld (da kann man auch selbst etwas eintippen)." });
      if (spec.items) {
        const have = best.items.map(normItem);
        const missing = spec.items.filter(i => !have.includes(normItem(i)));
        const extra = best.items.filter(i => !spec.items.map(normItem).includes(normItem(i)));
        if (missing.length) { bad = true; notes.push({ status: "bad", text: spec.name + ": Einträge fehlen oder sind anders geschrieben: " + missing.join(", ") + (extra.length ? " (bei dir: " + extra.join(", ") + ")" : "") + "." }); }
        else if (extra.length) notes.push({ status: "warn", text: spec.name + ": zusätzliche Einträge: " + extra.join(", ") + "." });
      } else if (spec.minItems && best.items.length < spec.minItems) {
        bad = true; notes.push({ status: "bad", text: spec.name + ": nur " + best.items.length + " Einträge, mindestens " + spec.minItems + " gehören rein (Eigenschaften › Hinzufügen)." });
      }
    }
    if (best.type === "date" && spec.format && !best.legacy && best.format !== spec.format) {
      bad = true; notes.push({ status: "bad", text: spec.name + ": Datumsformat ist " + (wordFormat(best.format) || "nicht eingestellt") + ", verlangt ist " + wordFormat(spec.format) + " (Eigenschaften › Datumsanzeige)." });
    }
    if (best.type === "checkbox" && spec.checked !== undefined && best.checked !== spec.checked) {
      notes.push({ status: spec.soft ? "warn" : "bad", text: spec.name + (spec.checked ? ": sollte angekreuzt sein." : ": sollte hier nicht angekreuzt sein.") });
      if (!spec.soft) bad = true;
    }
    const fillRes = checkFill(spec, best);
    if (!bad && !notes.some(n => n.status === "bad")) {
      const extra = best.type === "combo" ? " mit " + best.items.length + " Einträgen" : best.type === "date" && best.format ? " (" + wordFormat(best.format) + ")" : "";
      results.push({ status: "ok", text: spec.name + ": " + FORM_TYPE_NAMES[best.type] + extra + " ✓" });
    }
    results.push(...notes);
    if (fillRes) results.push(fillRes);
  });

  if (form.fillAll) {
    const empty = form.controls.filter(s => matched[s.id] && matched[s.id].type !== "checkbox" && matched[s.id].filled === false);
    results.push(empty.length
      ? { status: "bad", text: "Noch nicht ausgefüllt: " + empty.map(s => s.name).join(", ") + ". Wechsle zum Nutzer (Entwurfsmodus aus, Schutz an) und fülle alles aus." }
      : { status: "ok", text: "Alle Felder ausgefüllt." });
  }
  (form.checkGroups || []).forEach(g => {
    const n = g.ids.filter(id => matched[id] && matched[id].checked).length;
    results.push(n >= g.min ? { status: "ok", text: g.name + ": angekreuzt." } : { status: "bad", text: g.name + ": noch nichts angekreuzt." });
  });

  const fullText = plainText(doc.getElementsByTagNameNS(W_NS, "body")[0]).toLowerCase();
  const squash = s => s.toLowerCase().replace(/[\s ]+/g, " ").replace(/[„“"?!:.]/g, "").trim();
  const missingTexts = (form.texts || []).filter(t => !squash(fullText).includes(squash(t)));
  if (form.texts && form.texts.length) {
    results.push(missingTexts.length
      ? { status: "warn", text: "Fester Text fehlt oder ist anders geschrieben: " + missingTexts.map(t => "\"" + t + "\"").join(", ") + "." }
      : { status: "ok", text: "Fester Text (Überschrift, Beschriftungen) passt." });
  }
  if (form.needTable && !doc.getElementsByTagNameNS(W_NS, "tbl").length) {
    results.push({ status: "warn", text: "Keine Tabelle gefunden. In der Vorlage stehen Frage und Antwort in einer Tabelle." });
  }

  if (form.protect) {
    const s = settingsXml ? parser.parseFromString(settingsXml, "application/xml") : null;
    const prot = s ? s.getElementsByTagNameNS(W_NS, "documentProtection")[0] : null;
    const edit = prot ? wAttr(prot, "edit") : null;
    const enf = prot ? wAttr(prot, "enforcement") : null;
    const on = enf === "1" || enf === "true" || enf === "on";
    if (!prot || !edit) results.push({ status: "bad", text: "Formular ist nicht geschützt. Entwicklertools › Bearbeitung einschränken › Punkt 2: \"Ausfüllen von Formularen\" › Ja, Schutz jetzt anwenden." });
    else if (edit !== "forms") results.push({ status: "bad", text: "Schutz ist an, aber nicht auf \"Ausfüllen von Formularen\" gestellt (bei dir: " + ({ readOnly: "Keine Änderungen (Schreibgeschützt)", comments: "Kommentare", trackedChanges: "Überarbeitungen" }[edit] || edit) + ")." });
    else if (!on) results.push({ status: "bad", text: "\"Ausfüllen von Formularen\" ist eingestellt, aber der Schutz wurde nicht angewendet. Klick noch auf \"Ja, Schutz jetzt anwenden\"." });
    else results.push({ status: "ok", text: "Formular ist geschützt (Ausfüllen von Formularen)." });
  }

  const extraControls = controls.filter(c => !used.has(c)).length;
  if (extraControls && !form.controls.some(s => s.count)) {
    results.push({ status: "info", text: extraControls + " weitere" + (extraControls === 1 ? "s Steuerelement" : " Steuerelemente") + " in der Datei, die die App keiner Vorgabe zuordnen konnte." });
  }
  return results;
}

async function checkFormFile(form, file) {
  if (/\.doc$/i.test(file.name)) throw new Error("Das ist das alte .doc-Format. Bitte in Word als Word-Dokument (.docx) speichern.");
  const buf = await file.arrayBuffer();
  const parts = await readZipEntries(buf, ["word/document.xml", "word/settings.xml"]);
  if (!parts["word/document.xml"]) throw new Error("In der Datei steckt kein Word-Dokument. Ist es wirklich eine .docx?");
  return checkFormDoc(form, parts["word/document.xml"], parts["word/settings.xml"]);
}

// ===================== MODUS-UI =====================
let formState = { form: null, results: null };

function formsFor(topicId) {
  return FORMS.filter(f => f.topic === topicId);
}

function formRequirementList(form) {
  const li = form.controls.map(s => {
    if (s.count) return s.count + " × " + s.name;
    let t = s.name + ": " + typeName(s.type);
    if (s.items) t += " (" + s.items.join(", ") + ")";
    if (s.format) t += ", Format " + wordFormat(s.format);
    if (s.fill === true) t += ", ausfüllen";
    else if (typeof s.fill === "string") t += ", auswählen: " + s.fill;
    else if (Array.isArray(s.fill)) t += ", Inhalt mit " + s.fill.map(f => f.split("|")[0]).join(", ");
    if (s.checked === true) t += ", ankreuzen";
    return t;
  });
  if (form.fillAll) li.push("Alles als Nutzer ausfüllen");
  if (form.protect) li.push("Formular schützen: Ausfüllen von Formularen");
  return li;
}

function startForm(topicId, pushHistory = true, presetPool = null) {
  if (pushHistory) history.pushState({ name: "form", subjectId: state.currentSubject, categoryId: state.currentCategory }, "");
  state.queue = presetPool ? presetPool.slice() : formsFor(topicId);
  state.index = 0;
  state.correctCount = 0;
  state.answeredLog = [];
  showView("#view-form");
  renderForm();
}

function renderForm() {
  state.answered = false;
  const F = state.queue[state.index];
  formState = { form: F, results: null };
  const total = state.queue.length;
  document.getElementById("formProgress").style.width = (state.index / total * 100) + "%";
  document.getElementById("formScore").textContent = state.correctCount + " / " + total;
  const topicMeta = TOPICS.find(t => t.id === F.topic);
  document.getElementById("formTopicLabel").textContent = (topicMeta ? topicMeta.icon + " " + topicMeta.title : "") + " · " + (state.index + 1) + "/" + total;
  document.getElementById("formTitle").textContent = F.title;
  document.getElementById("formTask").textContent = F.task;
  document.getElementById("formSource").textContent = "Vorlage im Vault: Textverarbeitung › " + F.source;
  document.getElementById("formReqList").innerHTML = formRequirementList(F).map(t => "<li>" + escapeHtml(t) + "</li>").join("");
  document.getElementById("formSteps").innerHTML = F.steps.map(t => "<li>" + escapeHtml(t) + "</li>").join("");
  document.getElementById("formResults").innerHTML = "";
  document.getElementById("formResults").classList.add("hidden");
  const fb = document.getElementById("formFeedback");
  fb.classList.add("hidden");
  fb.classList.remove("good", "bad");
  document.getElementById("formFileName").textContent = "";
  document.getElementById("formFile").value = "";
  document.getElementById("formNextBtn").classList.add("hidden");
  document.getElementById("formDrop").classList.remove("has-file");
}

async function handleFormFile(file) {
  if (!file) return;
  const F = formState.form;
  const box = document.getElementById("formResults");
  const fb = document.getElementById("formFeedback");
  document.getElementById("formFileName").textContent = file.name;
  document.getElementById("formDrop").classList.add("has-file");
  let results;
  try {
    results = await checkFormFile(F, file);
  } catch (e) {
    box.classList.add("hidden");
    fb.classList.remove("hidden", "good");
    fb.classList.add("bad");
    fb.textContent = "⚠️ " + e.message;
    return;
  }
  const icon = { ok: "✅", bad: "❌", warn: "⚠️", info: "ℹ️" };
  const order = { bad: 0, warn: 1, info: 2, ok: 3 };
  const sorted = results.slice().sort((a, b) => order[a.status] - order[b.status]);
  box.innerHTML = sorted.map(r => '<li class="form-res ' + r.status + '"><span class="form-res-icon" aria-hidden="true">' + icon[r.status] + "</span><span>" + escapeHtml(r.text) + "</span></li>").join("");
  box.classList.remove("hidden");
  const bad = results.filter(r => r.status === "bad").length;
  const okCount = results.filter(r => r.status === "ok").length;
  const allOk = bad === 0;
  fb.classList.remove("hidden", "good", "bad");
  fb.classList.add(allOk ? "good" : "bad");
  fb.textContent = allOk ? "✅ Formular passt! " + okCount + " Punkte erfüllt." + (results.some(r => r.status === "warn") ? " Schau dir die Hinweise trotzdem an." : "")
    : "📝 " + bad + " Fehler. Verbessere die Datei in Word, speichere und lade sie nochmal.";

  if (!state.answered) {
    // Gezählt wird der erste Prüfversuch, danach darf beliebig verbessert werden.
    state.answered = true;
    if (allOk) state.correctCount++;
    state.answeredLog.push({
      question: { q: F.title, formId: F.id },
      given: bad ? bad + " Fehler beim ersten Prüfen" : "alles richtig",
      correctText: results.filter(r => r.status === "bad").map(r => r.text).join(" "),
      wasCorrect: allOk,
    });
  }
  document.getElementById("formScore").textContent = state.correctCount + " / " + state.queue.length;
  document.getElementById("formNextBtn").classList.remove("hidden");
}

function finishForm() {
  document.getElementById("formProgress").style.width = "100%";
  const total = state.queue.length;
  const pct = total ? Math.round((state.correctCount / total) * 100) : 0;
  const progress = loadProgress();
  const prevBest = progress[state.currentTopic]?.bestScore || 0;
  progress[state.currentTopic] = { bestScore: Math.max(prevBest, state.correctCount), total };
  saveProgress(progress);
  bumpStreak();
  document.getElementById("resultEmoji").textContent = pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚";
  document.getElementById("resultTitle").textContent = pct >= 80 ? "Stark!" : pct >= 50 ? "Gut gemacht!" : "Weiter üben!";
  document.getElementById("resultText").textContent = `${state.correctCount} von ${total} Formularen waren beim ersten Prüfen komplett richtig (${pct}%).`;
  showResult("form");
}

function initForms() {
  const input = document.getElementById("formFile");
  const drop = document.getElementById("formDrop");
  input.addEventListener("change", () => handleFormFile(input.files[0]));
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("drag"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("drag"); }));
  drop.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) handleFormFile(f); });
  document.getElementById("backFromForm").addEventListener("click", () => history.back());
  document.getElementById("formNextBtn").addEventListener("click", () => {
    state.index++;
    if (state.index >= state.queue.length) finishForm();
    else renderForm();
  });
}
