// Screens for the user-friendly kiosk. Adapted from ../app.js.
// Prototype state lives in this browser's localStorage; the real kiosk would use local SQLite.
// Uses its own storage key, so it does not mix with the root prototype.
const KEY = "ehl-kiosk-friendly-state";
const defaults = {
  ack: false, killSwitch: false, emergency: false, staffed: true,
  lastSignedRefresh: DATA.corpusUpdated, refreshLog: [{ date: DATA.corpusUpdated, signedBy: "initial load", version: DATA.corpusVersion }],
  suspended: { tier1: false, tier2: false, factCards: false },
  sessionCount: 0, tractCounts: {}, log: [], reports: [], incidents: [], audits: [], flags: []
};
let S;
try { S = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { S = { ...defaults }; }
S.suspended = { ...defaults.suspended, ...(S.suspended || {}) };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

let sessionId = null;  // random, not tied to any person (FR-21)
let last = null;       // last result, for printing / reporting
let openTopic = null;  // which topic's questions are showing

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = iso => iso ? Core.fmtDate(iso) : "";
const app = $("#app");
const go = h => { location.hash = h; };

// Topics and tap-to-ask questions live in data.js (DATA.topics).
const TOPICS = DATA.topics;

// ---------- Display settings (per person; reset by "Done") ----------
const view = { size: "1", contrast: false };
function applyView() {
  const root = document.documentElement;
  root.dataset.size = view.size;
  if (view.contrast) root.dataset.contrast = "high"; else delete root.dataset.contrast;
  $$(".size-btn").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.size === view.size)));
  const c = $(".contrast-btn"); if (c) c.setAttribute("aria-pressed", String(view.contrast));
}

// ---------- Shared pieces on every screen (FR-10, FR-13, FR-14, FR-15, NFR-9) ----------
function footer() {
  const onStaff = location.hash === "#/staff";
  return `<footer class="site-footer">
    <div class="help-bar no-print">
      <button type="button" class="btn primary print-cta" data-action="print">Print this and talk to a librarian</button>
      <button type="button" class="btn" data-action="speak">${speaking ? "Stop reading" : "Read aloud"}</button>
      <button type="button" class="btn" data-action="report">Report a problem</button>
      <button type="button" class="btn" data-action="limits">Known limitations</button>
    </div>
    <p class="print-only"><strong>Print this and talk to a librarian.</strong> Notes:</p>
    <div class="print-only notes-lines"></div><div class="print-only notes-lines"></div><div class="print-only notes-lines"></div>
    <p class="disclaimer">${esc(DATA.disclaimer)}</p>
    ${DATA.isSample ? `<p class="sample-note">Test version: all data on this kiosk is made-up sample data.</p>` : DATA.dataNote ? `<p class="sample-note">${esc(DATA.dataNote)}</p>` : ""}
    <p class="no-print">${onStaff ? `<a href="#/" class="staff-link">Back to the patron screen</a>` : `<a href="#/staff" class="staff-link">Staff</a>`}</p>
  </footer>`;
}

function startSession() {
  sessionId = Math.random().toString(36).slice(2, 10);
  S.sessionCount++; save();
}
function endSession() {
  last = null; sessionId = null; openTopic = null;
  view.size = "1"; view.contrast = false; applyView();
  stopSpeaking();
  if (location.hash && location.hash !== "#/") go("#/"); else render();
  window.scrollTo(0, 0);
}

// ---------- Patron screens ----------
function renderPatron() {
  // FR-17 emergency mode overrides everything.
  if (S.emergency) {
    app.innerHTML = `<h1>Emergency information</h1>
      <div class="card stop"><p class="big-result">${esc(DATA.emergency.advisory)}</p>
      <ul>${DATA.emergency.numbers.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>
      <p>Questions are turned off right now. Please ask a librarian.</p>${footer()}`;
    return;
  }
  // FR-14 first-use screen.
  if (!S.ack || !sessionId) { renderWelcome(); return; }

  // FR-16 kill switch, FR-22 staffing, FR-19 auto-sunset → document browser only.
  const sunset = Core.isSunset(S.lastSignedRefresh);
  if (S.killSwitch || !S.staffed || sunset) {
    const why = S.killSwitch ? "Library staff have turned questions off for now." :
      !S.staffed ? "Questions only work while a librarian is at the reference desk." :
      "The data has not been updated in over 180 days, so questions are turned off.";
    app.innerHTML = `<h1>Questions are turned off right now</h1>
      <div class="banner stop"><p>${why}</p><p>You can still look at the list of reports below.</p></div>
      ${dateBannerHTML({ corpusUpdated: DATA.corpusUpdated })}
      <h2>Reports you can read</h2>${docBrowser()}${footer()}`;
    return;
  }
  renderMain();
}

function renderWelcome() {
  app.innerHTML = `<h1>Welcome</h1>
    <p class="big-result">This kiosk shows official water and soil test results for the East Palestine area.</p>
    <div class="card"><h2>It can show you</h2>
      <ul><li>What was tested</li><li>Where and when it was tested</li><li>Which agency did the test</li><li>The result, and the federal limit</li><li>Where to read the full report</li></ul></div>
    <div class="card stop"><h2>It cannot tell you</h2>
      <ul><li>If something is safe</li><li>Anything about your health</li><li>Legal or money advice</li><li>Why something happened</li></ul>
      <p>For those questions, it will tell you who can help.</p></div>
    <p>Is the text too small? Tap <strong>A+</strong> or <strong>A++</strong> at the top of the screen.</p>
    <button type="button" class="btn primary wide" data-action="start">I understand. Start.</button>
    ${footer()}`;
}

function topicButton(t) {
  return `<button type="button" class="topic${t.warn ? " warn-topic" : ""}" data-topic="${t.id}" aria-expanded="${openTopic === t.id}" aria-controls="questions">
    ${esc(t.label)}<small>${esc(t.sub)}</small></button>`;
}
function questionsHTML(id) {
  const t = TOPICS.find(x => x.id === id);
  if (!t) return "";
  if (t.street) return `<div class="questions"><h2>Results near my street</h2>
    <p>Pick your street. We use it once to find your area. Then we forget it.</p>
    <label for="street">Your street</label>
    <select id="street"><option value="">Choose a street…</option>${DATA.streets.map(s => `<option>${esc(s)}</option>`).join("")}</select>
    <div class="row"><button type="button" class="btn primary wide" data-action="street">Show results near this street</button></div></div>`;
  return `<div class="questions"><h2>${esc(t.label)}</h2>
    ${t.intro ? `<p>${esc(t.intro)}</p>` : `<p>Tap a question to ask it.</p>`}
    <ul class="q-list">${t.questions.map(q => `<li><button type="button" class="q-btn" data-ask="${esc(q)}">${esc(q)}</button></li>`).join("")}</ul></div>`;
}

function renderMain() {
  app.innerHTML = `<div class="layout">
    <section class="ask-panel no-print" aria-labelledby="ask-h">
      <h1 id="ask-h">What would you like to know?</h1>
      <p>Tap a topic. Then tap a question. You don't need to type.</p>
      <div class="topics">${TOPICS.map(topicButton).join("")}</div>
      <div id="questions">${openTopic ? questionsHTML(openTopic) : ""}</div>
      <div class="panel-box">
        <form id="type-form">
          <label for="q">Or type your own question</label>
          <textarea id="q" rows="2" placeholder="Example: What is vinyl chloride?"></textarea>
          <div class="row"><button type="submit" class="btn primary wide">Ask</button></div>
        </form>
      </div>
      <div class="panel-box"><button type="button" class="btn wide" data-action="done">Done. Clear the screen for the next person.</button></div>
    </section>
    <section id="result" aria-live="polite" tabindex="-1">${last ? resultHTML(last) : placeholderHTML()}</section>
  </div>${footer()}`;
}

function placeholderHTML() {
  return `<div class="banner info no-print"><p><strong>Your answer will show here.</strong></p>
    <p>Not sure where to start? Tap <strong>Newest results</strong>.</p></div>`;
}

function askQuestion(q, opts = {}) {
  q = (q || "").trim();
  if (!q) { showResult(`<div class="banner date"><p>Please type a question first, or tap a topic.</p></div>`); return; }
  const tract = opts.tract || null;
  if (tract) S.tractCounts[tract] = (S.tractCounts[tract] || 0) + 1;
  last = Core.answer(q, { tract, suspended: S.suspended });
  // Anonymous log for audits: no names, no address, random session id only.
  S.log.push({ id: S.log.length + 1, session: sessionId, ts: new Date().toISOString(), question: q, tier: last.tier, category: last.category, kind: last.kind });
  // FR-11: agency disagreements are flagged for staff.
  if (last.conflicts && last.conflicts.length)
    S.flags.push({ id: S.flags.length + 1, ts: new Date().toISOString(), question: q, items: last.conflicts.flat().map(c => c.text) });
  save();
  showResult(resultHTML(last));
}

function showResult(html) {
  const el = $("#result");
  if (!el) return;
  stopSpeaking();
  el.innerHTML = html;
  // On a phone the answer is below the topics, so move there.
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  el.focus({ preventScroll: true });
}

// ---------- Result rendering (FR-3, FR-4, FR-6..FR-12) ----------
function dateBannerHTML(d) {
  d = d || {};
  return `<div class="banner date" role="note">
    <p><strong>Data last updated:</strong> ${fmt(d.corpusUpdated || DATA.corpusUpdated)}</p>
    ${d.newestSample ? `<p><strong>Newest test on this page:</strong> ${fmt(d.newestSample)}</p>` : ""}
    <p>This kiosk does not have live readings. It only shows results that agencies have already published.</p></div>`;
}

function citeHTML(c) {
  if (!c) return "";
  return `<div class="cite">
    ${c.stale ? `<p class="stale">This report may be out of date. A newer one was expected by now.</p>` : ""}
    <p><strong>Source:</strong> ${esc(c.title)} (${esc(c.agency)})</p>
    <p>Published ${fmt(c.published)}.${c.sampleDate ? ` Sample taken ${fmt(c.sampleDate)}.` : ""}</p>
    <p><strong>Read it:</strong> Library binder: ${esc(c.shelf)}${c.link ? ` · <a href="${esc(c.link)}" target="_blank" rel="noopener">Online copy</a>` : ""}</p>
  </div>`;
}

function recordCard(i) {
  return `<div class="card result-card">
    <p class="chem">${esc(i.analyteName)}</p>
    ${i.conflict ? `<span class="flag-badge">Agencies disagree on this test. See the note about agencies.</span>` : ""}
    <dl class="facts">
      <dt>Result</dt><dd><span class="big-result">${i.detected ? `${esc(i.value)} ${esc(i.unit)}` : "Not found"}</span>
        ${i.estimated ? " (estimated)" : ""}
        ${i.detected ? "" : `<br>This test can find as little as ${esc(i.detectionLimit)} ${esc(i.unit)}.`}
        ${i.preliminary ? `<br>Preliminary result: not fully checked yet.` : ""}</dd>
      <dt>Tested on</dt><dd>${fmt(i.date)}</dd>
      <dt>Tested by</dt><dd>${esc(i.agency)}</dd>
      <dt>Sample</dt><dd>${esc(i.kindOfSample)}${i.sampleId ? ` (sample ${esc(i.sampleId)})` : ""}</dd>
    </dl>
    ${citeHTML(i.cite)}
  </div>`;
}

// Many results (e.g. dozens of sampling points): a short summary per chemical, the "found" results
// as cards, and every result behind one button, so the page stays readable.
function summaryBlock(items) {
  const chems = [...new Set(items.map(i => i.analyteName))];
  const rows = chems.map(c => {
    const its = items.filter(i => i.analyteName === c), found = its.filter(i => i.detected);
    const dates = its.map(i => i.date).sort();
    return `<tr><th scope="row">${esc(c)}</th><td>${new Set(its.map(i => i.place)).size}</td><td>${found.length}</td><td>${dates[0] === dates[dates.length - 1] ? fmt(dates[0]) : `${fmt(dates[0])} to ${fmt(dates[dates.length - 1])}`}</td></tr>`;
  }).join("");
  const found = items.filter(i => i.detected);
  return `<p>Newest test at each place, in short:</p>
    <div class="table-wrap"><table class="summary"><tr><th>Chemical</th><th>Places tested</th><th>Places where it was found</th><th>Dates of these tests</th></tr>${rows}</table></div>
    ${found.length ? `<h3>Where it was found (newest test)</h3>${byPlace(found)}` : `<p class="big-result">It was not found in the newest test at any of these places.</p>`}
    <details class="history"><summary><span class="when-closed">Show every place</span><span class="when-open">Hide every place</span>&nbsp;(${items.length} results)</summary>${byPlace(items)}</details>`;
}

// Group result cards under a heading for each place.
function byPlace(items) {
  const groups = [];
  items.forEach(i => { let g = groups.find(x => x.place === i.place); if (!g) groups.push(g = { place: i.place, items: [] }); g.items.push(i); });
  return groups.map(g => `<h3 class="place-head">${esc(g.place)}</h3>${g.items.map(recordCard).join("")}`).join("");
}

function recordsBlock(r) {
  let h = "";
  // FR-11: show each disagreement next to the results it is about (newest, or inside history).
  const conflictCard = g => `<div class="card flag" role="note">
    <h3>Agencies reported different results</h3>
    <p>Two agencies tested the same place on the same day. They got different results. We show both. This has been flagged for library staff.</p>
    <ul>${g.map(x => `<li>${esc(x.text)}</li>`).join("")}</ul>
    <p>A librarian can help you look at both reports.</p></div>`;
  const isNewest = g => (r.items || []).some(i => i.conflict && i.date === g[0].date);
  const newConf = (r.conflicts || []).filter(isNewest), oldConf = (r.conflicts || []).filter(g => !isNewest(g));
  h += newConf.map(conflictCard).join("");
  if (oldConf.length) h += `<div class="banner stop" role="note"><p><strong>Note:</strong> In the older results, agencies reported different results for the same test. Tap <strong>Show history</strong> to see both.</p></div>`;

  if (r.waiting && r.waiting.length) h += r.waiting.map(w => `<div class="banner date" role="note"><p><strong>Not added yet:</strong> ${esc(w)}</p></div>`).join("");
  if (r.otherChemicals) h += `<div class="banner info"><p>We show the main derailment chemicals first. <strong>${r.otherChemicals} other chemicals</strong> were also tested. Ask about one by name, for example "benzene in the creeks".</p></div>`;
  if (r.items && r.items.length) {
    h += r.wantsLatest
      ? `<div class="banner info"><p><strong>You asked about the newest results.</strong> These are the latest tests on file for each place. They are not live readings.</p></div>`
      : `<div class="banner info"><p>The newest result for each place is shown first.${r.history && r.history.length ? ` Older results are under <strong>Show history</strong>.` : ""}</p></div>`;
    h += `<h2>Newest results</h2>` + (r.items.length > 12 ? summaryBlock(r.items) : byPlace(r.items));
  }
  if (r.history && r.history.length) {
    const n = r.history.length;
    h += `<details class="history"><summary><span class="when-closed">Show history</span><span class="when-open">Hide history</span>&nbsp;(${n} older result${n === 1 ? "" : "s"})</summary>
      <h2>Older results</h2><p>Newest first.</p>${oldConf.map(conflictCard).join("")}${byPlace(r.history)}</details>`;
  }
  if (r.limits && r.limits.length) {
    h += `<h2>Federal drinking-water limits</h2>
      <p>This is the published limit. The kiosk does not compare results to it. A librarian can help you read both.</p>` +
      r.limits.map(l => `<div class="card"><p>${esc(l.text)}</p>${citeHTML(l.cite)}</div>`).join("");
  }
  if (r.docs && r.docs.length) h += `<h2>Where to read it</h2>` + r.docs.map(c => `<div class="card">${citeHTML(c)}</div>`).join("");
  if (r.absence) h += `<div class="card"><h2>${/^We don't have data on that yet\./.test(r.absence) ? "We don't have data on that yet." : "We don't have data on that."}</h2>
    <p>${esc(r.absence.replace(/^We don't have data on that yet\. /, ""))}</p>
    <p>Try a topic button, or print this page and ask a librarian.</p></div>`;
  return h;
}

function wordsHTML(r) {
  const w = Core.wordsUsed(r);
  if (!w.length) return "";
  return `<section class="words"><h2>What these words mean</h2><dl>
    ${w.map(x => `<dt>${esc(termLabel(x.term))}</dt><dd>${esc(x.definition)}</dd>`).join("")}</dl></section>`;
}
function termLabel(t) {
  const special = { "mcl": "MCL", "ppb": "ppb", "µg/l": "µg/L", "ng/kg": "ng/kg", "epa": "EPA", "ohio epa": "Ohio EPA", "atsdr": "ATSDR" };
  return special[t] || t[0].toUpperCase() + t.slice(1);
}

function factCardHTML(f, opts = {}) {
  const h = opts.heading ? `<h3>${esc(f.name)}: fact card</h3>` : `<h3>Fact card</h3>`;
  if (f.status === "approved") return `<div class="card fact">${h}<p>${esc(f.text)}</p>
    <p class="hint">Copied word for word from ${esc(f.source)}. Approved by experts on ${fmt(f.approvedDate)}.</p>${citeHTML(f.cite)}</div>`;
  return `<div class="card fact">${h}
    <p class="big-result">Awaiting expert-approved ATSDR text.</p>
    <p>This kiosk does not write health information itself. When experts approve it, this card will show official text, word for word${f.source ? `, from: <strong>${esc(f.source)}</strong>` : ""}.</p>
    <p>A librarian can help you find official fact sheets now.</p></div>`;
}

function resultHTML(r) {
  const asked = `<p class="you-asked"><strong>You asked:</strong> ${esc(r.question)}</p>`;
  const back = `<div class="row no-print back-to-topics"><button type="button" class="btn" data-action="back">‹ Back to topics</button></div>`;
  const banner = dateBannerHTML(r.dates);
  let body = "";
  switch (r.kind) {
    case "referral":
      body = `<div class="card stop"><h2>A person can help with this</h2>
        <p>This kiosk can't answer questions about <strong>${esc(r.referral.label)}</strong>. It only shows published test results.</p>
        <dl class="facts"><dt>Who can help</dt><dd>${esc(r.referral.to)}</dd>
        ${r.referral.contact ? `<dt>How to reach them</dt><dd>${esc(r.referral.contact)}</dd>` : ""}</dl>
        <p>You can also talk to a librarian at the reference desk.</p></div>`;
      break;
    case "noAnswer":
      body = `<div class="card"><h2>We don't have data on that.</h2>
        <p>This kiosk only has published water and soil test results for the East Palestine area.</p>
        <p>Try a topic button, or print this page and ask a librarian.</p></div>`;
      break;
    case "suspended":
      body = `<div class="card stop"><h2>This answer is paused</h2><p>Experts are checking this kind of answer. Please ask a librarian.</p></div>`;
      break;
    case "glossary":
      body = `<div class="card"><h2>${esc(termLabel(r.term))}</h2><p class="big-result">${esc(r.definition)}</p>${citeHTML(r.cite)}</div>` + wordsHTML(r);
      break;
    case "factCard": {
      const alias = DATA.analytes[r.analyte].aliases[0];
      body = `<h2>${esc(r.name)}</h2>${factCardHTML(r.card)}
        ${r.items.map(l => `<div class="card"><h3>Federal drinking-water limit</h3><p>${esc(l.text)}</p>${citeHTML(l.cite)}</div>`).join("")}
        ${r.limitPending ? `<div class="banner date"><p><strong>Federal drinking-water limit:</strong> not entered in the kiosk yet. A librarian can look it up.</p></div>` : ""}
        <div class="card"><h3>Test results on file</h3>
        ${r.testCount ? `<p>${r.testCount} test result${r.testCount === 1 ? "" : "s"}. Newest test: ${fmt(r.newestTest)}.</p>
          <div class="row no-print"><button type="button" class="btn primary" data-ask="${esc(`What are the latest ${alias} results?`)}">Show the test results</button></div>`
          : `<p>${esc(r.absence)}</p>`}</div>` + wordsHTML(r);
      break;
    }
    case "answer":
      body = recordsBlock(r) + wordsHTML(r);
      break;
    case "referenceSheet":
      body = `<h2>Reference sheet</h2>
        <div class="banner stop"><p><strong>This question asks what the results mean.</strong> A person needs to explain that.</p>
        <p>Print this sheet. A librarian will go over it with you.</p></div>
        ${recordsBlock(r)}
        <h2>Fact cards</h2>${(r.factCards || []).map(f => factCardHTML(f, { heading: true })).join("") || "<p>None.</p>"}` + wordsHTML(r);
      break;
  }
  return back + asked + banner + body + `<div class="row no-print"><button type="button" class="btn" data-action="back">Ask another question</button></div>`;
}

// FR-19 static document browser.
function docBrowser() {
  return DATA.documents.map(d => Core.citation(d.id)).filter(Boolean).map(c => `<div class="card">${citeHTML(c)}</div>`).join("");
}

// ---------- Read aloud (NFR-9): the device's built-in speech, no network ----------
let speaking = false;
function readableText(root) {
  const skip = "button, select, textarea, input, .no-print, .print-only, script, style";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let out = "", lastBlock = null, n;
  while ((n = walker.nextNode())) {
    const p = n.parentElement;
    if (!p || p.closest(skip) || !p.getClientRects().length) continue;
    const t = n.textContent.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const block = p.closest("h1,h2,h3,p,li,dt,dd,summary,div");
    if (block !== lastBlock && out && !/[.!?:]$/.test(out)) out += ".";
    out += " " + t; lastBlock = block;
  }
  return out.replace(/µg\/L/g, "micrograms per liter").replace(/ng\/kg/g, "nanograms per kilogram").trim();
}
function speak() {
  if (!("speechSynthesis" in window)) { toast("Read aloud is not available on this device."); return; }
  if (speaking) { stopSpeaking(); return; }
  const res = $("#result");
  const target = res && last ? res : app;
  const u = new SpeechSynthesisUtterance(readableText(target));
  u.lang = "en-US"; u.rate = 0.9;
  u.onend = u.onerror = () => { speaking = false; updateSpeakButtons(); };
  speechSynthesis.cancel(); speechSynthesis.speak(u);
  speaking = true; updateSpeakButtons();
}
function stopSpeaking() { if ("speechSynthesis" in window) speechSynthesis.cancel(); speaking = false; updateSpeakButtons(); }
function updateSpeakButtons() { $$('[data-action="speak"]').forEach(b => { b.textContent = speaking ? "Stop reading" : "Read aloud"; }); }

// ---------- Print ----------
function printPage() {
  $$("details.history").forEach(d => { d.open = true; });
  const pd = $("#print-date"); if (pd) pd.textContent = Core.fmtDate(new Date().toISOString().slice(0, 10));
  window.print();
}
window.addEventListener("beforeprint", () => {
  $$("details.history").forEach(d => { d.open = true; });
  const pd = $("#print-date"); if (pd) pd.textContent = Core.fmtDate(new Date().toISOString().slice(0, 10));
});

// ---------- Report a problem (FR-15) → staff queue ----------
function reportProblem() {
  const dlg = $("#report-dialog");
  if (!dlg || typeof dlg.showModal !== "function") {
    const note = prompt("What went wrong? (Please don't include your name or address.)");
    if (note !== null) saveReport(note);
    return;
  }
  $("#report-form").reset();
  dlg.showModal();
}
$("#report-dialog").addEventListener("close", () => {
  const dlg = $("#report-dialog");
  if (dlg.returnValue !== "send") return;
  const what = (new FormData($("#report-form")).get("what")) || "";
  const extra = $("#report-note").value.trim();
  saveReport(what + (extra ? `: ${extra}` : ""));
});
function saveReport(note) {
  S.reports.push({ id: S.reports.length + 1, ts: new Date().toISOString(), session: sessionId, question: last ? last.question : "", note, status: "new" });
  save(); toast("Thank you. Library staff will see your report.");
}

let toastTimer;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 5000);
}

// ---------- Known limitations (FR-13) ----------
function renderLimits() {
  app.innerHTML = `<h1>Known limitations</h1>
    <div class="card"><p>${esc(DATA.knownLimitations)}</p></div>
    <div class="row no-print"><button type="button" class="btn primary" data-action="home">‹ Go back</button></div>${footer()}`;
}

// ---------- Staff page ----------
function renderStaff() {
  const days = Core.daysSince(S.lastSignedRefresh);
  const ev = Core.runEval(EVAL);
  const stale = DATA.documents.filter(Core.isStale);
  const open = S.reports.filter(r => r.status !== "sent to ERP");
  const onOff = (on, a, b) => on ? a : b;
  app.innerHTML = `<div class="staff"><h1>Staff panel</h1>
  <div class="banner info"><p>This page is for library staff. Settings are saved in this browser only.</p></div>

  <h2>Right now</h2>
  <div class="status-grid">
    <div class="status"><div>Questions</div><div class="big">${onOff(S.killSwitch, "OFF (kill switch)", "ON")}</div></div>
    <div class="status"><div>Emergency mode</div><div class="big">${onOff(S.emergency, "ON", "Off")}</div></div>
    <div class="status"><div>Reference desk</div><div class="big">${onOff(S.staffed, "Staffed", "NOT staffed")}</div></div>
    <div class="status"><div>Data age</div><div class="big">${days} days</div><div>${days > 180 ? "Auto-sunset is ON" : `Auto-sunset in ${180 - days} days`}</div></div>
  </div>

  <h2>Kiosk controls</h2>
  <div class="row">
    <button type="button" class="btn ${S.killSwitch ? "on" : "primary"}" data-action="toggle" data-key="killSwitch">${S.killSwitch ? "Turn questions back ON" : "KILL SWITCH: turn questions OFF"}</button>
    <button type="button" class="btn ${S.emergency ? "on" : ""}" data-action="toggle" data-key="emergency">${S.emergency ? "End emergency mode" : "Start emergency mode"}</button>
    <button type="button" class="btn ${S.staffed ? "" : "on"}" data-action="toggle" data-key="staffed">${S.staffed ? "Mark desk NOT staffed" : "Mark desk staffed"}</button>
  </div>
  <p class="hint">Kill switch, desk not staffed, or data older than 180 days: patrons only see the list of reports. Emergency mode shows only the emergency text and numbers.</p>

  <h2>Data freshness</h2>
  <p>Last signed refresh: <strong>${Core.fmtDate(S.lastSignedRefresh)}</strong> (${days} days ago). ${days > 180 ? `<strong>Auto-sunset is active.</strong>` : `Auto-sunset in ${180 - days} days.`}</p>
  ${stale.length ? `<div class="banner date"><p><strong>Out-of-date reports:</strong> ${stale.map(d => esc(d.title)).join("; ")}</p></div>` : "<p>No out-of-date reports.</p>"}
  <div class="row"><button type="button" class="btn" data-action="refresh">Record signed quarterly refresh</button>
  <button type="button" class="btn" data-action="integrity">Run source link check</button></div>
  <div id="integrity"></div>
  <details class="more"><summary>Refresh history</summary><ul>${S.refreshLog.map(r => `<li>${esc(r.date)}: signed by ${esc(r.signedBy)} (v${esc(r.version)})</li>`).join("")}</ul></details>

  <h2>Data sources</h2>
  ${DATA.isSample ? `<div class="banner stop"><p><strong>Made-up sample data is ON.</strong> Real data is hidden. Switch it off in data/sample-made-up.js.</p></div>` : ""}
  <ul>${DATA.documents.map(d => `<li>${esc(d.title)} (${esc(d.agency)})</li>`).join("")}</ul>
  ${(DATA.importNotes || []).map(n => `<p class="hint">${esc(n.id)}: ${n.imported} of ${n.sourceRows} rows imported from ${esc(n.sourceFile)} on ${esc(n.importedOn)}.</p>`).join("")}
  ${DATA.missingSources && DATA.missingSources.length ? `<details class="more"><summary>Not added yet (${DATA.missingSources.length})</summary><ul>${DATA.missingSources.map(m => `<li>${esc(m)}</li>`).join("")}</ul></details>` : ""}

  <h2>Pause a kind of answer (incident protocol)</h2>
  <p>Any panel member can pause a kind of answer. Pausing logs an incident.</p>
  <div class="row">${[["tier1", "Fact answers (Tier 1)"], ["tier2", "Reference sheets (Tier 2)"], ["factCards", "Fact cards"]].map(([k, label]) =>
    `<button type="button" class="btn ${S.suspended[k] ? "on" : ""}" data-action="suspend" data-key="${k}">${label}: ${S.suspended[k] ? "PAUSED. Tap to resume" : "live. Tap to pause"}</button>`).join("")}</div>
  <details class="more"><summary>Incident log (${S.incidents.length})</summary><ul>${S.incidents.map(i => `<li>${esc(i.ts)}: ${esc(i.what)}</li>`).join("") || "<li>None.</li>"}</ul></details>

  <h2>Usage (anonymous)</h2>
  <div class="status-grid">
    <div class="status"><div>Sessions</div><div class="big">${S.sessionCount}</div></div>
    <div class="status"><div>Questions</div><div class="big">${S.log.length}</div><div>${[1, 2, 3].map(t => `Tier ${t}: ${S.log.filter(l => l.tier === t).length}`).join(" · ")}</div></div>
    <div class="status"><div>By census tract</div><div>${Object.entries(S.tractCounts).map(([t, n]) => `${esc(t)}: ${n}`).join(", ") || "none"}</div></div>
  </div>

  <h2>Agency disagreements patrons saw (${S.flags.length})</h2>
  <p class="hint">Each time a patron sees two agencies with different results, it is flagged here so a librarian can follow up.</p>
  <details class="more"><summary>Show flagged questions</summary>
  <div class="table-wrap"><table><tr><th>When</th><th>Question</th><th>Results shown</th></tr>
  ${S.flags.map(f => `<tr><td>${esc(f.ts.slice(0, 10))}</td><td>${esc(f.question)}</td><td>${(f.items || []).map(esc).join("<br>")}</td></tr>`).join("") || `<tr><td colspan="3">None.</td></tr>`}
  </table></div></details>

  <h2>Problem reports (${open.length} open)</h2>
  <div class="table-wrap"><table><tr><th>When</th><th>Question</th><th>Report</th><th>Days open</th><th></th></tr>
  ${S.reports.map(r => `<tr><td>${esc(r.ts.slice(0, 10))}</td><td>${esc(r.question)}</td><td>${esc(r.note)}</td>
    <td>${Core.daysSince(r.ts.slice(0, 10))}${r.status !== "sent to ERP" && Core.daysSince(r.ts.slice(0, 10)) >= 5 ? " ⚠ over 5 days" : ""}</td>
    <td>${r.status === "sent to ERP" ? "sent to ERP" : `<button type="button" class="btn" data-action="sendReport" data-id="${r.id}">Send to ERP</button>`}</td></tr>`).join("") || `<tr><td colspan="5">No reports.</td></tr>`}</table></div>

  <h2>Weekly audit (random 10%)</h2>
  <button type="button" class="btn" data-action="audit">Draw this week's sample</button>
  <div id="audit"></div>

  <h2>Release gate check</h2>
  <p>Benchmark tier accuracy: <strong>${ev.benchPct}%</strong> (need 95 or more) · Red-team refusal: <strong>${ev.redPct}%</strong> (need 100) ·
    Gate: <strong>${ev.gatePass ? "PASS (still needs written ERP approval)" : "FAIL. The kiosk stays closed."}</strong></p>
  <details class="more"><summary>Details</summary><div class="table-wrap"><table><tr><th>Set</th><th>Question</th><th>Result</th></tr>
    ${ev.bench.map(b => `<tr><td>benchmark</td><td>${esc(b.q)}</td><td>${b.pass ? "pass" : "FAIL"} (tier ${b.got}, expected ${b.expected})</td></tr>`).join("")}
    ${ev.red.map(b => `<tr><td>red-team</td><td>${esc(b.q)}</td><td>${b.pass ? "refused: " + esc(b.category) : "FAIL: not refused"}</td></tr>`).join("")}
  </table></div></details>
  </div>${footer()}`;
}

function toggle(k) { S[k] = !S[k]; save(); render(); }
function suspend(k) {
  S.suspended[k] = !S.suspended[k];
  S.incidents.push({ ts: new Date().toISOString(), what: `${k} ${S.suspended[k] ? "paused" : "resumed"}. Notify project lead within 24 hours.` });
  save(); render();
}
function signedRefresh() {
  const by = prompt("Initials of the person signing this refresh:");
  if (!by) return;
  const date = new Date().toISOString().slice(0, 10);
  S.lastSignedRefresh = date; S.refreshLog.push({ date, signedBy: by, version: DATA.corpusVersion }); save(); render();
}
// FR-18: the real check runs weekly on the kiosk's maintainer machine. Browsers can't read cross-site
// status codes, so this prototype only checks that each document has a link or shelf location.
function integrityCheck() {
  const rows = DATA.documents.map(d => `<li>${esc(d.title)}: ${d.link ? "link on file (live check runs on the kiosk)" : d.shelf ? "shelf copy only" : "MISSING SOURCE"}</li>`);
  $("#integrity").innerHTML = `<ul>${rows.join("")}</ul>`;
}
function sendReport(id) { const r = S.reports.find(x => x.id === id); if (r) { r.status = "sent to ERP"; save(); render(); } }
function drawAudit() {
  const n = Math.max(1, Math.ceil(S.log.length * 0.1));
  const pick = [...S.log].sort(() => Math.random() - 0.5).slice(0, n);
  const axes = ["Accurate", "Citation correct", "No unsupported inference", "Readable", "Refusal right"];
  $("#audit").innerHTML = pick.length ? `<div class="table-wrap"><table><tr><th>Question</th><th>Tier</th><th>Reading grade</th>${axes.map(a => `<th>${a}</th>`).join("")}</tr>
    ${pick.map(l => { const r = Core.answer(l.question, { suspended: {} }); const txt = Core.resultTexts(r).join(" ");
      return `<tr><td>${esc(l.question)}</td><td>${l.tier}</td><td>${txt ? Core.gradeLevel(txt) : "–"}</td>${axes.map(a => `<td><input type="checkbox" aria-label="${esc(a)}: pass"></td>`).join("")}</tr>`; }).join("")}</table></div>`
    : "<p>No questions asked yet.</p>";
}

// ---------- One click handler for every button ----------
document.addEventListener("click", e => {
  const el = e.target.closest("[data-ask], [data-action], [data-topic], [data-size]");
  if (!el) return;
  if (el.dataset.size) { view.size = el.dataset.size; applyView(); return; }
  if (el.dataset.topic) {
    openTopic = openTopic === el.dataset.topic ? null : el.dataset.topic;
    $$(".topic").forEach(b => b.setAttribute("aria-expanded", String(b.dataset.topic === openTopic)));
    const box = $("#questions"); box.innerHTML = openTopic ? questionsHTML(openTopic) : "";
    if (openTopic) box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    return;
  }
  if (el.dataset.ask) { e.preventDefault(); askQuestion(el.dataset.ask); return; }
  switch (el.dataset.action) {
    case "start": S.ack = true; startSession(); render(); window.scrollTo(0, 0); break;
    case "done": endSession(); break;
    case "print": printPage(); break;
    case "speak": speak(); break;
    case "report": reportProblem(); break;
    case "limits": go("#/limits"); break;
    case "home": go("#/"); break;
    case "contrast": view.contrast = !view.contrast; applyView(); break;
    case "back": {
      stopSpeaking();
      const panel = $(".ask-panel"); if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      const t = openTopic ? $(`.topic[data-topic="${openTopic}"]`) : $(".topic"); if (t) t.focus({ preventScroll: true });
      break;
    }
    case "street": {
      const sel = $("#street");
      const street = sel ? sel.value : "";
      if (!street) { toast("Please choose a street first."); return; }
      const tract = Core.tractFromAddress(street); // FR-20: used once...
      sel.value = "";                               // ...then cleared. Never stored or logged.
      askQuestion("Test results near my street", { tract });
      break;
    }
    case "toggle": toggle(el.dataset.key); break;
    case "suspend": suspend(el.dataset.key); break;
    case "refresh": signedRefresh(); break;
    case "integrity": integrityCheck(); break;
    case "sendReport": sendReport(Number(el.dataset.id)); break;
    case "audit": drawAudit(); break;
  }
});
document.addEventListener("submit", e => {
  if (e.target.id !== "type-form") return;
  e.preventDefault();
  const box = $("#q"); const q = box.value; box.value = "";
  askQuestion(q);
});

// ---------- Privacy: clear the screen after 10 minutes with no touch ----------
let lastActivity = Date.now();
["pointerdown", "keydown", "scroll", "touchstart"].forEach(ev => window.addEventListener(ev, () => { lastActivity = Date.now(); }, { passive: true }));
setInterval(() => {
  if (sessionId && Date.now() - lastActivity > 10 * 60 * 1000 && location.hash !== "#/staff") endSession();
}, 30000);

// ---------- Router ----------
function render() {
  stopSpeaking();
  if (location.hash === "#/staff") renderStaff();
  else if (location.hash === "#/limits") renderLimits();
  else renderPatron();
}
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });
applyView();
render();
