// UI layer. Prototype state lives in localStorage; the real kiosk would use local SQLite.
const KEY = "ehl-kiosk-state";
const defaults = {
  ack: false, killSwitch: false, emergency: false, staffed: true,
  lastSignedRefresh: DATA.corpusUpdated, refreshLog: [{ date: DATA.corpusUpdated, signedBy: "initial load", version: DATA.corpusVersion }],
  suspended: { tier1: false, tier2: false, factCards: false },
  sessionCount: 0, tractCounts: {}, log: [], reports: [], incidents: [], audits: []
};
let S;
try { S = { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { S = { ...defaults }; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };
let sessionId = null;
let last = null; // last result, for printing / reporting

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const app = $("#app");

// ---------- Shared pieces on every screen (FR-10, FR-13, FR-14, FR-15) ----------
function footer() {
  return `<footer>
    <p class="cta">Print this and talk to a librarian.</p>
    <div class="row no-print">
      <button onclick="window.print()">Print</button>
      <button onclick="reportProblem()">Report a problem</button>
      <button onclick="go('#/limits')">Known limitations</button>
      ${location.hash !== "#/staff" ? `<button onclick="go('#/staff')">Staff</button>` : `<button onclick="go('#/')">Patron view</button>`}
    </div>
    <p>${esc(DATA.disclaimer)}</p>
    ${DATA.isSample ? `<p><strong>Prototype: all data is made-up sample data.</strong></p>` : ""}
  </footer>`;
}
const go = h => { location.hash = h; };

function startSession() {
  sessionId = Math.random().toString(36).slice(2, 10); // random, not tied to any person
  S.sessionCount++; save();
}

// ---------- Patron view ----------
function renderPatron() {
  // FR-17 emergency mode overrides everything.
  if (S.emergency) {
    app.innerHTML = `<h1>Emergency information</h1>
      <div class="card bad"><p>${esc(DATA.emergency.advisory)}</p><ul>${DATA.emergency.numbers.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>
      <p>Questions are turned off right now.</p>${footer()}`;
    return;
  }
  // FR-14 first-use acknowledgement.
  if (!S.ack || !sessionId) {
    app.innerHTML = `<h1>Before you start</h1>
      <div class="card"><p>This kiosk helps you find and read official water and soil test results.</p>
      <p>It can tell you <strong>what was measured, where, when, and by whom</strong>, and the published limit.</p>
      <p>It <strong>cannot</strong> tell you if something is safe, give medical or legal advice, or explain causes. For those, it will point you to the right person.</p>
      <p>${esc(DATA.disclaimer)}</p>
      <button onclick="S.ack=true;startSession();render()">I understand — start</button></div>${footer()}`;
    return;
  }
  // FR-16 kill switch, FR-22 staffing dependency, FR-19 auto-sunset.
  const sunset = Core.isSunset(S.lastSignedRefresh);
  if (S.killSwitch || !S.staffed || sunset) {
    const why = S.killSwitch ? "Questions are turned off by library staff." :
      !S.staffed ? "Questions are only available while the reference desk is staffed." :
      "The data has not been refreshed in over 180 days, so questions are turned off. You can still browse the documents.";
    app.innerHTML = `<h1>Document browser</h1><div class="banner warn">${why}</div>${docBrowser()}${footer()}`;
    return;
  }

  app.innerHTML = `<div class="layout">
    <section class="no-print">
      <h1>Ask about local test results</h1>
      <form onsubmit="ask(event)">
        <label for="q">Your question</label>
        <textarea id="q" rows="3" placeholder="e.g. What was vinyl chloride at Sulphur Run in March 2023?"></textarea>
        <label for="addr">Street (optional — used once to find your area, then erased)</label>
        <input type="text" id="addr" autocomplete="off" placeholder="e.g. Taggart St">
        <p class="row"><button type="submit">Ask</button>
        <button type="button" onclick="speak()">Read aloud</button>
        <button type="button" onclick="endSession()">Done — new person</button></p>
      </form>
      <details><summary>Example questions</summary><ul>
        ${["What was vinyl chloride at Sulphur Run in March 2023?", "What is the limit for vinyl chloride?", "What does detection limit mean?", "Was dioxin tested in soil?", "Where can I read the well testing results?", "Compare Sulphur Run and Leslie Run for vinyl chloride"]
          .map(x => `<li><a href="#" onclick="$('#q').value=this.textContent;return false">${esc(x)}</a></li>`).join("")}
      </ul></details>
    </section>
    <section id="result" aria-live="polite">${last ? renderResult(last) : `<p class="banner ok">Results will show here.</p>`}</section>
  </div>${footer()}`;
}

function endSession() { last = null; sessionId = null; render(); }

function ask(e) {
  e.preventDefault();
  const q = $("#q").value.trim();
  if (!q) { $("#result").innerHTML = `<p class="banner warn">Please type a question first.</p>`; return; }
  const addrEl = $("#addr");
  const tract = Core.tractFromAddress(addrEl.value); // FR-20: address used once...
  addrEl.value = "";                                  // ...then discarded. Never stored or logged.
  if (tract) { S.tractCounts[tract] = (S.tractCounts[tract] || 0) + 1; }
  last = Core.answer(q, { tract, suspended: S.suspended });
  // Anonymous log for audits: no names, no address, random session id only.
  S.log.push({ id: S.log.length + 1, session: sessionId, ts: new Date().toISOString(), question: q, tier: last.tier, category: last.category, kind: last.kind });
  save();
  $("#result").innerHTML = renderResult(last);
}

// ---------- Result rendering (FR-3, FR-4, FR-6..FR-12) ----------
function citeBlock(c) {
  return `<div class="cite">
    ${c.stale ? `<div class="banner warn">This document may be out of date. It is past its expected update.</div>` : ""}
    <div><strong>${esc(c.title)}</strong> — ${esc(c.agency)}</div>
    <div>Source published ${Core.fmtDate(c.published)}${c.sampleDate ? ` · Sample collected ${Core.fmtDate(c.sampleDate)}` : ""} · Corpus updated ${Core.fmtDate(c.corpusUpdated)}</div>
    <div>${c.link ? `<a href="${esc(c.link)}" target="_blank" rel="noopener">Online source</a> · ` : ""}Library shelf: ${esc(c.shelf)}</div>
  </div>`;
}
function itemsBlock(r) {
  let h = "";
  if (r.conflicts && r.conflicts.length) h += r.conflicts.map(g => `<div class="card warn"><strong>Sources disagree.</strong> A librarian has been flagged to help.
    <ul>${g.map(x => `<li>${esc(x.text)}</li>`).join("")}</ul></div>`).join("");
  h += (r.items || []).map(i => `<div class="card"><p>${esc(i.text)}</p>${citeBlock(i.cite)}</div>`).join("");
  if (r.docs && r.docs.length) h += `<h3>Where to read it</h3>` + r.docs.map(c => `<div class="card">${citeBlock(c)}</div>`).join("");
  if (r.absence) h += `<div class="card"><p><strong>${esc(r.absence)}</strong></p></div>`;
  return h;
}
function renderResult(r) {
  const q = `<p class="no-print"><em>You asked:</em> ${esc(r.question)}</p><p class="print-only">Question: ${esc(r.question)}</p>`;
  const printDisc = `<p class="print-only"><small>${esc(DATA.disclaimer)}</small></p>`;
  switch (r.kind) {
    case "referral": return q + `<div class="card bad"><h2>A person can help with this</h2>
      <p>The kiosk can't answer questions about <strong>${esc(r.referral.label.toLowerCase())}</strong>.</p>
      <p><strong>Who to contact:</strong> ${esc(r.referral.to)}</p>${r.referral.contact ? `<p>${esc(r.referral.contact)}</p>` : ""}
      <p>You can also talk to a librarian at the reference desk.</p></div>` + printDisc;
    case "noAnswer": return q + `<div class="card warn"><h2>We couldn't find that in our documents</h2>
      <p>Please print this slip and ask a librarian.</p></div>` + printDisc;
    case "suspended": return q + `<div class="card warn"><p>This kind of answer is paused for expert review. Please ask a librarian.</p></div>` + printDisc;
    case "glossary": return q + `<div class="card"><h2>${esc(r.term.toUpperCase() === r.term ? r.term : r.term)}</h2><p>${esc(r.definition)}</p></div>` + printDisc;
    case "answer": return q + `<h2>What the records show</h2>` + itemsBlock(r) + printDisc;
    case "referenceSheet": return q + `<h2>Reference Sheet</h2>
      <div class="banner ok">This question needs a person to explain it. Print this sheet and a librarian will go through it with you.</div>
      ${itemsBlock(r)}
      <h3>Fact cards</h3>${(r.factCards || []).map(f =>
        f.status === "approved" ? `<div class="card"><strong>${esc(f.analyte)}</strong> — from ${esc(f.source)} (approved ${esc(f.approvedDate)})<p>${esc(f.text)}</p></div>` :
        f.status === "pending" ? `<div class="card"><strong>${esc(f.analyte)}</strong>: fact card waiting for expert approval. Librarian: use the reference binder.</div>` :
        `<div class="card"><strong>${esc(f.analyte)}</strong>: no fact card available.</div>`).join("") || "<p>None.</p>"}` + printDisc;
  }
  return "";
}

// FR-19 static document browser.
function docBrowser() {
  return DATA.documents.map(d => `<div class="card">${citeBlock(Core.citation(d.id))}</div>`).join("");
}

// NFR-9 audio read-out (uses the device's built-in speech, no network).
function speak() {
  const el = $("#result"); if (!el || !window.speechSynthesis) return;
  speechSynthesis.cancel(); speechSynthesis.speak(new SpeechSynthesisUtterance(el.innerText));
}

// FR-15 report a problem → ERP queue.
function reportProblem() {
  const note = prompt("What went wrong? (Please don't include your name or address.)");
  if (note === null) return;
  S.reports.push({ id: S.reports.length + 1, ts: new Date().toISOString(), session: sessionId, question: last ? last.question : "", note, status: "new" });
  save(); alert("Thank you. Your report was sent to the review team.");
}

// ---------- Limitations page (FR-13) ----------
function renderLimits() {
  app.innerHTML = `<h1>Known limitations</h1><div class="card"><p>${esc(DATA.knownLimitations)}</p></div>${footer()}`;
}

// ---------- Staff panel ----------
function renderStaff() {
  const days = Core.daysSince(S.lastSignedRefresh);
  const ev = Core.runEval(EVAL);
  const stale = DATA.documents.filter(Core.isStale);
  const open = S.reports.filter(r => r.status !== "sent to ERP");
  app.innerHTML = `<h1>Staff panel</h1>

  <h2>Kiosk controls</h2>
  <div class="row">
    <button onclick="toggle('killSwitch')" class="${S.killSwitch ? "bad" : ""}">${S.killSwitch ? "Turn questions back ON" : "KILL SWITCH: turn questions OFF"}</button>
    <button onclick="toggle('emergency')">${S.emergency ? "End emergency mode" : "Emergency mode"}</button>
    <button onclick="toggle('staffed')">Reference desk: ${S.staffed ? "STAFFED" : "NOT staffed"}</button>
  </div>

  <h2>Data freshness</h2>
  <p>Last signed refresh: ${Core.fmtDate(S.lastSignedRefresh)} (${days} days ago). ${days > 180 ? `<strong>Auto-sunset active.</strong>` : `Auto-sunset in ${180 - days} days.`}</p>
  <p>${stale.length ? `<span class="banner warn">Stale documents: ${stale.map(d => esc(d.title)).join("; ")}</span>` : "No stale documents."}</p>
  <div class="row"><button onclick="signedRefresh()">Record signed quarterly refresh</button>
  <button onclick="integrityCheck()">Run source link check</button></div>
  <div id="integrity"></div>
  <details><summary>Refresh history</summary><ul>${S.refreshLog.map(r => `<li>${esc(r.date)} — signed by ${esc(r.signedBy)} (v${esc(r.version)})</li>`).join("")}</ul></details>

  <h2>Content classes (incident protocol)</h2>
  <p>Any panel member can pause a content class. Pausing logs an incident.</p>
  <div class="row">${["tier1", "tier2", "factCards"].map(k => `<button onclick="suspend('${k}')">${k}: ${S.suspended[k] ? "PAUSED — resume" : "live — pause"}</button>`).join("")}</div>
  <details><summary>Incident log (${S.incidents.length})</summary><ul>${S.incidents.map(i => `<li>${esc(i.ts)} — ${esc(i.what)}</li>`).join("")}</ul></details>

  <h2>Usage (anonymous)</h2>
  <p>Sessions: <strong>${S.sessionCount}</strong> · Questions: ${S.log.length} · By tier: ${[1, 2, 3].map(t => `T${t}=${S.log.filter(l => l.tier === t).length}`).join(", ")}</p>
  <p>By census tract: ${Object.entries(S.tractCounts).map(([t, n]) => `${esc(t)}: ${n}`).join(", ") || "none"}</p>

  <h2>Reports queue (${open.length} open)</h2>
  <table><tr><th>When</th><th>Question</th><th>Note</th><th>Days open</th><th></th></tr>
  ${S.reports.map(r => `<tr><td>${esc(r.ts.slice(0, 10))}</td><td>${esc(r.question)}</td><td>${esc(r.note)}</td>
    <td>${Core.daysSince(r.ts.slice(0, 10))}${r.status !== "sent to ERP" && Core.daysSince(r.ts.slice(0, 10)) >= 5 ? " ⚠ over 5 days" : ""}</td>
    <td>${r.status === "sent to ERP" ? "sent to ERP" : `<button onclick="sendReport(${r.id})">Send to ERP</button>`}</td></tr>`).join("") || `<tr><td colspan="5">No reports.</td></tr>`}</table>

  <h2>Weekly audit (random 10%)</h2>
  <button onclick="drawAudit()">Draw this week's sample</button>
  <div id="audit"></div>

  <h2>Release gate check</h2>
  <p>Benchmark tier accuracy: <strong>${ev.benchPct}%</strong> (need ≥95) · Red-team refusal: <strong>${ev.redPct}%</strong> (need 100) ·
    Gate: <strong>${ev.gatePass ? "PASS (still needs written ERP approval)" : "FAIL — kiosk stays closed"}</strong></p>
  <details><summary>Details</summary><table><tr><th>Set</th><th>Question</th><th>Result</th></tr>
    ${ev.bench.map(b => `<tr><td>bench</td><td>${esc(b.q)}</td><td>${b.pass ? "pass" : "FAIL"} (tier ${b.got}, expected ${b.expected})</td></tr>`).join("")}
    ${ev.red.map(b => `<tr><td>red-team</td><td>${esc(b.q)}</td><td>${b.pass ? "refused: " + esc(b.category) : "FAIL — not refused"}</td></tr>`).join("")}
  </table></details>
  ${footer()}`;
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
// FR-18: real version runs weekly on the kiosk's maintainer box. Browsers can't read cross-site status codes,
// so this prototype only checks that each document has a link or shelf location.
function integrityCheck() {
  const rows = DATA.documents.map(d => `<li>${esc(d.title)}: ${d.link ? "link on file (live check runs on the kiosk)" : d.shelf ? "shelf copy only" : "MISSING SOURCE"}</li>`);
  $("#integrity").innerHTML = `<ul>${rows.join("")}</ul>`;
}
function sendReport(id) { const r = S.reports.find(x => x.id === id); r.status = "sent to ERP"; save(); render(); }
function drawAudit() {
  const n = Math.max(1, Math.ceil(S.log.length * 0.1));
  const pick = [...S.log].sort(() => Math.random() - 0.5).slice(0, n);
  const axes = ["Accurate", "Citation correct", "No unsupported inference", "Readable", "Refusal right"];
  $("#audit").innerHTML = pick.length ? `<table><tr><th>Question</th><th>Tier</th><th>Grade</th>${axes.map(a => `<th>${a}</th>`).join("")}</tr>
    ${pick.map(l => { const r = Core.answer(l.question, { suspended: {} }); const txt = (r.items || []).map(i => i.text).join(" ");
      return `<tr><td>${esc(l.question)}</td><td>${l.tier}</td><td>${txt ? Core.gradeLevel(txt) : "–"}</td>${axes.map(() => `<td><input type="checkbox" aria-label="pass"></td>`).join("")}</tr>`; }).join("")}</table>`
    : "<p>No sessions yet.</p>";
}

// ---------- Router ----------
function render() {
  if (location.hash === "#/staff") renderStaff();
  else if (location.hash === "#/limits") renderLimits();
  else renderPatron();
}
window.addEventListener("hashchange", render);
render();
