// EXTRA FEATURES (Project 3.2): "Did you mean?", librarian help tickets, voice, and the AI helper.
// This file adds to the screens in ../app.js without editing it: it wraps a few of app.js's functions.
// Turn features on or off in config.js. Remove everything by deleting this folder and the
// "EXTRA FEATURES" lines in ../index.html.
(function () {
  const F = KIOSK_FEATURES;
  const baseAsk = askQuestion, baseFooter = footer, baseRenderMain = renderMain, baseRenderStaff = renderStaff;

  S.tickets = S.tickets || [];
  S.ticketSeq = S.ticketSeq || 0;

  const logOnly = (q, kind, tier = 1, category = kind) => {
    S.log.push({ id: S.log.length + 1, session: sessionId, ts: new Date().toISOString(), question: q, tier, category, kind });
    save();
  };
  const askedHTML = q => `<p class="you-asked"><strong>You asked:</strong> ${esc(q)}</p>`;
  const choiceButtons = list => `<div class="choice-grid">${list.map(c =>
    `<button type="button" class="btn primary" data-ask="${esc(c.q)}">${esc(c.label)}</button>`).join("")}</div>`;
  const ticketButton = () => F.helpTicket ? `<button type="button" class="btn" data-feature="ticket">Get help from a librarian</button>` : "";

  // Show a refusal card for a question the safety gate caught (through a typo fix or the AI helper).
  function showReferral(q, category, note) {
    last = { kind: "referral", tier: 3, category, question: q, referral: DATA.referrals[category], dates: { corpusUpdated: DATA.corpusUpdated } };
    logOnly(q, "referral", 3, category);
    showResult((note ? `<div class="banner info"><p>${esc(note)}</p></div>` : "") + resultHTML(last));
  }

  // ---------- The new ask flow ----------
  // 1. Safety gate on the question as typed (inside the normal answer).
  // 2. Safety gate again on the typo-fixed question, so "is it saef" is still refused.
  // 3. Normal answer if it found something. 4. "Did you mean?" for typos.
  // 5. AI helper picks one of the web app's known questions. 6. "Which do you mean?" buttons. 7. "We don't have data on that."
  async function ask(q, opts = {}) {
    q = (q || "").trim();
    if (!q || opts.tract || opts.direct) return finish(baseAsk(q, opts), opts);
    const base = Core.answer(q, { suspended: S.suspended });
    if (base.tier === 3) return finish(baseAsk(q, opts), opts);

    if (F.didYouMean) {
      const fixed = Fuzzy.correct(q);
      if (fixed !== q.toLowerCase().replace(/[?.!]+$/, "") && Core.classify(fixed).tier === 3)
        return finish(showReferral(q, Core.classify(fixed).category, `We read your question as: "${fixed}".`), opts);
      const e1 = Core.extract(q), e2 = Core.extract(fixed);
      const gained = (e2.analytes.length + e2.sites.length) > (e1.analytes.length + e1.sites.length);
      if (gained && Core.answer(fixed).kind !== "noAnswer") {
        logOnly(q, "didYouMean");
        return finish(showResult(askedHTML(q) + `<div class="card feature-card"><h2>Did you mean…</h2>
          <p class="big-result">"${esc(fixed)}"</p>
          <div class="choice-grid"><button type="button" class="btn primary" data-ask="${esc(fixed)}" data-direct="1">Yes, show me that</button>
          <button type="button" class="btn" data-ask="${esc(q)}" data-direct="1">No, use what I typed</button></div></div>`), opts);
      }
    }
    if (base.kind !== "noAnswer") return finish(baseAsk(q, opts), opts);

    if (F.ownWords) {
      showResult(askedHTML(q) + `<div class="banner info"><p><strong>Working on it…</strong> Trying to understand your question.</p></div>`);
      const ai = await aiInterpret(q);
      if (ai && ai.safety) return finish(showReferral(q, "safety", "This sounds like a question about safety or health."), opts);
      if (ai && ai.question) {
        baseAsk(ai.question, opts);
        const el = $("#result");
        if (el) el.insertAdjacentHTML("afterbegin", `<div class="banner info ai-note" role="note">
          <p><strong>You typed:</strong> ${esc(q)}</p>
          <p><strong>We understood it as:</strong> ${esc(ai.question)}</p>
          <p class="hint">Understood with help from an AI (Claude), for this demo. The answer below comes from the web app's records, not from the AI.</p>
          <div class="row no-print"><button type="button" class="btn" data-feature="not-meant" data-q="${esc(q)}">That's not what I meant</button></div></div>`);
        return finish(null, opts);
      }
    }
    if (F.didYouMean && Fuzzy.isVague(q)) {
      logOnly(q, "clarify");
      return finish(showResult(askedHTML(q) + `<div class="card feature-card"><h2>Which do you mean?</h2>
        <p>Tap one. We'll show the newest results first.</p>${choiceButtons(Fuzzy.CLARIFY)}</div>`), opts);
    }
    return finish(baseAsk(q, opts), opts);
  }
  // Voice questions: read the answer aloud when it is ready.
  function finish(_, opts) { if (opts && opts.voice && F.voice) setTimeout(() => { if (!speaking) speak(); }, 400); }

  // AI helper: sends only the typed question and the list of known questions. Never used for safety questions.
  async function aiInterpret(q) {
    const options = Fuzzy.knownQuestions();
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(F.aiHelperUrl, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, options }), signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      const r = await res.json();
      if (r.safety) return { safety: true };
      if (r.choice === null || r.choice === undefined || r.choice === "") return null; // AI found no match
      const i = Number(r.choice);
      if (!Number.isInteger(i) || i < 0 || i >= options.length) return null;
      const chosen = options[i];
      if (Core.classify(chosen).tier === 3 || Core.answer(chosen).kind === "noAnswer") return null; // double-check
      return { question: chosen };
    } catch { return null; } // helper not running or no internet → normal rules
  }

  window.askQuestion = ask;

  // ---------- Librarian help ticket ----------
  function makeTicket() {
    if (!S.staffed) {
      app.innerHTML = `<h1>Get help from a librarian</h1><div class="card stop"><p class="big-result">Nobody is at the reference desk right now.</p>
        <p>Please come back when the desk is staffed, or print this page and bring it later.</p></div>
        <div class="row no-print"><button type="button" class="btn primary" data-feature="back">‹ Go back</button></div>${footer()}`;
      return;
    }
    S.ticketSeq++;
    const t = { num: S.ticketSeq, ts: new Date().toISOString(), question: last ? last.question : "", status: "waiting" };
    S.tickets.push(t); save();
    app.innerHTML = `<h1>Your help ticket</h1>
      <div class="card ticket"><p>Your number is</p><p class="ticket-num">${t.num}</p>
      <p class="big-result">Show this number to the librarian at the reference desk.</p>
      ${t.question ? `<p><strong>Your question:</strong> ${esc(t.question)}</p>` : ""}
      <p class="hint">The librarian can see your question on their screen. We don't save your name.</p></div>
      <div class="row no-print"><button type="button" class="btn primary" data-action="print">Print my ticket</button>
      <button type="button" class="btn" data-feature="back">‹ Go back</button></div>${footer()}`;
    window.scrollTo(0, 0);
  }

  // ---------- Screen additions ----------
  window.footer = function () {
    const html = baseFooter();
    return F.helpTicket ? html.replace('<button type="button" class="btn" data-action="report">', ticketButton() + '$&') : html;
  };
  window.renderMain = function () {
    baseRenderMain();
    const form = $("#type-form");
    if (!form) return;
    if (F.voice && (window.SpeechRecognition || window.webkitSpeechRecognition))
      form.querySelector(".row").insertAdjacentHTML("afterbegin",
        `<button type="button" class="btn wide mic" data-feature="mic" aria-pressed="false"><span aria-hidden="true">🎤</span> Speak your question</button>`);
    if (F.ownWords) form.insertAdjacentHTML("beforeend",
      `<p class="hint">Demo: if the web app doesn't understand your typed question, it may ask an AI (Claude) to help. Please don't type your name or address.</p>`);
  };
  window.renderStaff = function () {
    baseRenderStaff();
    if (!F.helpTicket) return;
    const waiting = S.tickets.filter(t => t.status === "waiting");
    const box = $(".staff > .banner");
    if (box) box.insertAdjacentHTML("afterend", `<section class="card feature-card"><h2>Help tickets (${waiting.length} waiting)</h2>
      <div class="table-wrap"><table><tr><th>Number</th><th>Time</th><th>Question</th><th></th></tr>
      ${S.tickets.slice().reverse().map(t => `<tr><td><strong>${t.num}</strong></td><td>${esc(new Date(t.ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}</td>
        <td>${esc(t.question) || "–"}</td><td>${t.status === "done" ? "Done" : `<button type="button" class="btn" data-feature="ticket-done" data-num="${t.num}">Mark done</button>`}</td></tr>`).join("")
        || `<tr><td colspan="4">No tickets yet.</td></tr>`}</table></div></section>`);
  };

  // ---------- Voice input ----------
  let rec = null;
  function toggleMic(btn) {
    if (rec) { rec.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    rec = new SR(); rec.lang = "en-US"; rec.interimResults = true; rec.maxAlternatives = 1;
    const box = $("#q"); let text = "";
    stopSpeaking();
    btn.setAttribute("aria-pressed", "true"); btn.innerHTML = `<span aria-hidden="true">●</span> Listening… tap to stop`;
    rec.onresult = e => { text = [...e.results].map(r => r[0].transcript).join(" "); if (box) box.value = text; };
    rec.onerror = () => toast("Sorry, the microphone didn't work. Please type your question.");
    rec.onend = () => {
      rec = null;
      btn.setAttribute("aria-pressed", "false"); btn.innerHTML = `<span aria-hidden="true">🎤</span> Speak your question`;
      if (text.trim()) { if (box) box.value = ""; askQuestion(text, { voice: true }); }
    };
    rec.start();
  }

  // ---------- Buttons for the new features ----------
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-feature], [data-direct]");
    if (!el) return;
    if (el.dataset.direct) { e.stopImmediatePropagation(); baseAsk(el.dataset.ask); return; }
    switch (el.dataset.feature) {
      case "ticket": makeTicket(); break;
      case "back": render(); break;
      case "mic": toggleMic(el); break;
      case "ticket-done": { const t = S.tickets.find(x => x.num === Number(el.dataset.num)); if (t) { t.status = "done"; save(); render(); } break; }
      case "not-meant":
        logOnly(el.dataset.q, "aiNotMeant");
        showResult(askedHTML(el.dataset.q) + `<div class="card"><h2>Sorry about that.</h2><p>Try a topic button, or ask a librarian.</p>
          <div class="row no-print">${ticketButton()}</div></div>`);
        break;
    }
  }, true);

  render();
})();
