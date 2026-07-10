# Lernkarten – Umschulung

Kostenlose, offline-fähige Lern-App für die Umschulung. Aufbau: **Fach → Kategorie
(ein Testblock) → Thema → Quiz/Karteikarten/Gliederung**. Die Kategorie-Ebene hält die
Themen eines bereits geschriebenen Tests zusammen, damit ein neuer Test im selben Fach
später als eigene Kategorie danebengelegt werden kann, statt mit alten Themen zu vermischen.

Aktuell drei Fächer:

- **Rolle im Betrieb** → Kategorie "Jugend- und Arbeitsrecht": Betriebsrat, JAV,
  Tarifvertragsrecht, Arbeitskampf & Streik, duale Ausbildung (BBiG), Jugendarbeitsschutzgesetz
  (JArbSchG), Betriebsvereinbarungen, Vorbereitungsklausur.
- **Rechnungswesen** → Kategorie "Inventur & Inventar": Aufgaben & Bereiche des
  Rechnungswesens, Buchführung & Inventur, Inventar, Bilanz.
- **Tabellenkalkulation** → Kategorie "Grundlagen & Bezüge": Grundlagen & Funktionen
  (SUMME, MIN, MAX, MITTELWERT, ANZAHL/ANZAHL2), Zellbezüge (relativ, absolut, gemischt),
  UND & ODER.

## Neues Fach, neue Kategorie oder neues Thema hinzufügen

Alles steckt in `data.js`, keine Änderung an `index.html` oder `app.js` nötig:

- **Neues Fach:** Zeile in `SUBJECTS` ergänzen (`id`, `title`, `icon`).
- **Neue Kategorie (z. B. für den nächsten Test in einem bestehenden Fach):** Zeile in
  `CATEGORIES` ergänzen, `subject` muss auf eine bestehende Fach-`id` zeigen.
- **Neues Thema:** Zeile in `TOPICS` ergänzen, `subject` und `category` müssen zusammenpassen.
- **Neue Fragen/Karten:** Einträge in `QUESTIONS` bzw. `FLASHCARDS` mit passender Themen-`id` ergänzen.
- **Neue Gliederungs-Übung:** Eintrag in `STRUCTURES` ergänzen (`topic`-id + `items` in der korrekten Reihenfolge).

Nach Änderungen an den Dateien in `service-worker.js` den `CACHE_NAME` hochzählen,
damit bereits installierte Versionen der App das Update laden.

## Nutzen

- **Als App installieren (empfohlen):** Seite öffnen → im Browser auf "App installieren" bzw.
  "Zum Startbildschirm hinzufügen" tippen (Android/Chrome: Button erscheint automatisch in der App;
  iPhone/Safari: Teilen-Button → "Zum Home-Bildschirm"). Läuft danach wie eine echte App mit eigenem
  Icon, Vollbild ohne Browserleiste und funktioniert offline.
- **Im Browser:** über GitHub Pages (Desktop & Handy), auch ohne Installation
- **Als Dateien:** Repo als ZIP herunterladen ("Code" → "Download ZIP") und `index.html` lokal öffnen

## Modi

- **Quiz** – Multiple-Choice-Fragen pro Thema mit direktem Feedback
- **Karteikarten** – Begriffe zum Umdrehen und Auswendiglernen
- **Gliederung** – Reihenfolge/Struktur eines Themas (z. B. den Aufbau des Inventars) aus
  durcheinandergewürfelten Bausteinen selbst richtig zusammensetzen (nur bei Themen mit
  einem Eintrag in `STRUCTURES`)

Der Lernfortschritt wird lokal im Browser gespeichert (`localStorage`), es gibt keinen Server
und keine Datenübertragung an Dritte.

## Tech

Reines HTML/CSS/JavaScript, keine Frameworks, keine Build-Schritte – funktioniert direkt
durch Öffnen von `index.html` oder per GitHub Pages.
