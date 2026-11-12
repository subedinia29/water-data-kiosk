// Core logic: pure functions, no screen code. Runs in the browser and in Node (for tests).
// Adapted from ../core.js. Main changes are marked "NEW" below.
(function (root) {
  const D = (typeof DATA !== "undefined") ? DATA : require("./data.js").DATA;

  const norm = s => (" " + String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9µ.'\- ]+/g, " ").replace(/\s+/g, " ") + " ");

  // ---------- FR-5 / FR-8: deterministic Tier-3 gate (runs before anything else) ----------
  // Order matters: earlier categories win. Over-refusal is preferred to under-refusal.
  // Same rules as ../core.js, plus a few extra phrasings (marked NEW) that the original missed.
  const TIER3 = [
    ["misuse",    /ignore (all|any|previous|prior|the|your)|system prompt|pretend|role ?play|you are now|jailbreak|developer mode|\bact as\b|forget (your|the) rules/],
    ["legal",     /settlement|lawsuit|\bsue\b|\bsuing\b|lawyer|attorney|\blegal(?! (limit|level))|compensation|payout|\bclaims?\b|eligib|deadline|\bliab/],
    ["property",  /property|home value|house value|lose value|resale|sell (my|the|our) (house|home)|insurance|mortgage|relocat|move away|moving away|should (i|we) move|real estate/],
    ["agency",    /\blying\b|\blie(d|s)?\b|cover ?up|trust (the )?(epa|agency|agencies|government|county|state)|corrupt|credib|honest about/],
    ["medical",   /symptom|\bsick|\bill\b|illness|rash|headache|cough|nausea|vomit|diagnos|doctor|blood test|screen(ing)? (me|for)|pregnan|treatment|medicine|hospital|my health|disease|asthma/],
    ["risk",      /cancer|\brisk|\bdoses?\b|exposed|exposure|chance of|likely to get|how much .*\b(i|we|my|me)\b .*(breath|drank|absorb|got)/
                  // NEW: health-effect questions ("what does it do to me", "health effects of", "how does X affect my kids")
                  ,/health effects?|side effects?|\beffects? (of|on|from)\b|what (does|do|did|will|can|would|could) .* do to\b|\baffects? (me|my|us|our|you|your|people|kids?|children|health|the body|humans|pets?|animals)\b/],
    ["causation", /\bcaus|because of the|from the (train|derailment|spill|chemicals?|fire|burn)|due to the|is it from|linked to|responsible for|\bfault\b|\bblame/],
    ["safety",    /\bsafe|unsafe|dangerous|danger|\bharm|toxic|\bworr|concern|\bok(ay)? (to|for)|fine to|alright to|should (i|we) (drink|use|let|stop|be|boil|bathe|keep)|can (i|we) (drink|let|swim|fish|eat|bathe|use|cook)|let (my|the) (kids?|children|grandkids?|pets?|dogs?)|play in|water (my|the) garden|\bboil/
                  // NEW: judgement words ("is it bad", "is my well clean", "is the creek contaminated")
                  ,/\bbad\b|\bclean\b|contaminated\b|\bpoison|\bdeadly\b|\blethal\b|\bhealthy\b|\bpure\b/
                  // NEW: "is the water ok / fine / alright?"
                  ,/\b(is|are) (it|the|my|our|this|that|these|those)\b.*\b(ok|okay|fine|alright|good)\b/]
  ];
  const tier3Match = q => { for (const [cat, ...res] of TIER3) if (res.some(re => re.test(q))) return cat; return null; };

  const WORD_Q_WORDS = new Set("what is are does do did mean means meaning the a an of define definition stand stands for by whats what's word term".split(" "));
  const GLOSSARY_Q = /what (is|are|does|do)|what's|whats|define|meaning of|stand for/;
  const TIER2 = /\bcompare|comparison|versus|\bvs\b|higher|lower|more than|less than|\bworse|\bbetter|trend|\bmean\b|\bmeans\b|explain|interpret|normal|elevated|\bhigh\b|\blow\b|significant|\bwhy\b|\bshould\b|tell me about|what does .* tell/;

  // NEW (gap 1): "What is vinyl chloride?" → that chemical's fact card.
  // Only matches when the question is just "what is <chemical>", so
  // "What is vinyl chloride at Sulphur Run?" still goes to the test results.
  const FACT_Q = /^ (?:what (?:is|are)|what's|whats|what exactly is|what exactly are) (?:the |a |an )?(?:chemical |chemicals |substance )?(?:called |named )?(.+?) $/;
  function factCardAnalyte(q) {
    const m = q.match(FACT_Q);
    if (!m) return null;
    const s = m[1].trim();
    return Object.keys(D.analytes).find(k => D.analytes[k].aliases.includes(s) || D.analytes[k].name.toLowerCase() === s) || null;
  }

  // NEW (gap 2): words that mean "show me the newest".
  const LATEST_Q = /\bright now\b|\blatest\b|\bcurrent(ly)?\b|\bnewest\b|\bmost recent\b|\brecent(ly)?\b|\bthese days\b|\btoday\b|\bnow\b|\bstill\b|\blast (test|tested|result|sample)/;
  const ALL_Q = /\b(all|every) (of )?(the )?(test |sample )?(results?|tests?|data|samples?)\b/;
  const RESULTS_WORD = /result|test|sample|data|reading|level|number/;

  function classify(question) {
    const q = norm(question);
    const cat = tier3Match(q);
    if (cat) return { tier: 3, category: cat };
    const fc = factCardAnalyte(q);
    if (fc) return { tier: 1, category: "factCard", analyte: fc };
    const term = findGlossaryTerm(q);
    // NEW: a word question only counts if it isn't also about a chemical or place
    // ("What is the MCL for vinyl chloride?" now shows the actual limit).
    // A word question asks only what the word means ("What does monitoring well mean?"), nothing else.
    if (term && GLOSSARY_Q.test(q)) {
      const rest = q.replace(" " + norm(term).trim() + " ", " ").split(" ").filter(w => w && !WORD_Q_WORDS.has(w.replace(/[?.!]+$/, "")));
      if (!rest.length) return { tier: 1, category: "glossary", term };
    }
    if (TIER2.test(q)) return { tier: 2, category: "interpret" };
    return { tier: 1, category: "facts" };
  }

  // NEW: terms are normalised the same way as questions, so "µg/L" and "ng/kg" match.
  function findGlossaryTerm(q) {
    return Object.keys(D.glossary).sort((a, b) => b.length - a.length)
      .find(t => { const n = norm(t).trim(); return q.includes(" " + n + " ") || q.includes(" " + n + "s "); });
  }

  // ---------- Entity extraction (for retrieval) ----------
  const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const hasWord = (q, w) => new RegExp("[ ]" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[ ]").test(q);

  function extract(question) {
    const q = norm(question);
    const analytes = Object.keys(D.analytes).filter(k => D.analytes[k].aliases.some(a => hasWord(q, a)));
    let sites = Object.keys(D.sites).filter(k => D.sites[k].aliases.some(a => hasWord(q, a)));
    // NEW: everyday group words ("creek", "monitoring well") cover every sampling point in that group.
    const groups = Object.keys(D.siteGroups || {}).filter(g => D.siteGroups[g].aliases.some(a => hasWord(q, a)));
    if (groups.length) {
      // A placeholder only counts if its words appear outside the group words ("monitoring well" is not "well").
      let rest = q;
      groups.forEach(g => D.siteGroups[g].aliases.forEach(a => { rest = rest.split(" " + a + " ").join("  "); }));
      sites = sites.filter(k => !D.sites[k].waiting || D.sites[k].aliases.some(a => hasWord(rest, a)));
      sites = [...new Set(sites.concat(Object.keys(D.sites).filter(k => groups.includes(D.sites[k].group))))];
    }
    const yearM = q.match(/\b(20\d\d)\b/);
    const month = MONTHS.findIndex(m => hasWord(q, m) || (m !== "may" && hasWord(q, m.slice(0, 3))));
    return { analytes, sites, year: yearM ? yearM[1] : null, month: month >= 0 ? month + 1 : null };
  }

  // ---------- FR-20: transient address → census tract ----------
  function tractFromAddress(address) {
    if (!address) return null;
    const a = norm(address);
    const key = Object.keys(D.streetToTract).sort((x, y) => y.length - x.length).find(s => a.includes(" " + s + " "));
    return key ? D.streetToTract[key] : null;
  }

  // ---------- Citations (FR-3 / FR-4) ----------
  const doc = id => D.documents.find(d => d.id === id);
  function citation(docId, sampleDate) {
    const d = doc(docId);
    if (!d) return null;
    const c = { docId, title: d.title, agency: d.agency, published: d.published, sampleDate: sampleDate || null,
      corpusUpdated: D.corpusUpdated, where: d.link || d.shelf, link: d.link, shelf: d.shelf, stale: isStale(d) };
    return (c.title && c.agency && c.published && c.where) ? c : null; // incomplete → not shown
  }

  // ---------- FR-18 / FR-19 freshness ----------
  const DAY = 86400000;
  const today = () => new Date(new Date().toISOString().slice(0, 10));
  const daysSince = iso => Math.floor((today() - new Date(iso)) / DAY);
  const isStale = d => daysSince(d.published) > d.cadenceDays + 90;
  const isSunset = lastRefreshIso => daysSince(lastRefreshIso) > 180;

  // ---------- Templates (FR-6), written in short plain sentences ----------
  const lc = s => s[0].toLowerCase() + s.slice(1);
  const fmtDate = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  function mclText(analyte) {
    const m = D.mcl[analyte];
    const name = D.analytes[analyte].name;
    if (m === undefined) return null;   // limit not entered yet (shown as a note, not as a cited fact)
    if (m === null) return { type: "limit", analyte, text: `There is no federal limit (MCL) for ${lc(name)} in drinking water.`, cite: citation("D5") };
    return { type: "limit", analyte, text: `The federal limit (MCL) for ${lc(name)} in public drinking water is ${m.value} ${m.unit}.`, cite: citation(m.docId) };
  }
  function resultText(r) {
    return r.detected ? `${r.value} ${r.unit}${r.estimated ? " (estimated)" : ""}` : `not found`;
  }
  function recordText(r) {
    const a = D.analytes[r.analyte].name, s = D.sites[r.site].plain || D.sites[r.site].name;
    const extra = r.detected ? "" : ` This test can find as little as ${r.detectionLimit} ${r.unit}.`;
    return `${a} in ${s}. Tested by ${r.agency} on ${fmtDate(r.sampleDate)}. Result: ${resultText(r)}.${extra}${r.preliminary ? " This is a preliminary result." : ""}`;
  }
  function recordItem(r, conflictKeys) {
    return {
      type: "record", text: recordText(r), cite: citation(r.docId, r.sampleDate),
      analyte: r.analyte, analyteName: D.analytes[r.analyte].name,
      site: r.site, place: D.sites[r.site].plain || D.sites[r.site].name,
      kindOfSample: (D.mediumPlain && D.mediumPlain[r.medium]) || r.medium,
      date: r.sampleDate, agency: r.agency, detected: r.detected, value: r.value, unit: r.unit,
      detectionLimit: r.detectionLimit, result: resultText(r),
      estimated: !!r.estimated, preliminary: !!r.preliminary, sampleId: r.sampleId || null,
      conflict: conflictKeys.has(groupKey(r) + "|" + r.sampleDate)
    };
  }

  // "Location" = one place + one chemical + one kind of sample.
  const groupKey = r => r.site + "|" + r.analyte + "|" + r.medium;

  // NEW (gap 2): newest result per location first; older ones go to history.
  // Results from the same newest date stay together (so disagreements stay visible).
  function splitNewest(recs) {
    const newest = {};
    recs.forEach(r => { const k = groupKey(r); if (!newest[k] || r.sampleDate > newest[k]) newest[k] = r.sampleDate; });
    const byDateDesc = (a, b) => b.sampleDate.localeCompare(a.sampleDate) ||
      (D.sites[a.site].plain || "").localeCompare(D.sites[b.site].plain || "") || a.analyte.localeCompare(b.analyte) || a.agency.localeCompare(b.agency);
    const latest = recs.filter(r => r.sampleDate === newest[groupKey(r)]).sort(byDateDesc);
    const older = recs.filter(r => r.sampleDate !== newest[groupKey(r)]).sort(byDateDesc);
    return { latest, older };
  }

  // ---------- Retrieval (FR-2, FR-11, FR-12) ----------
  function retrieve(question, tract) {
    const e = extract(question);
    const q = norm(question);
    const wantsLimit = /limit|\bmcl\b|threshold|standard|allowed|legal level|maximum/.test(q);
    const wantsDocs = /where (can|do|could) (i|we) (read|find|see|get)|which (document|report)|\bdocuments?\b|\breports?\b|\bsources?\b/.test(q);
    const wantsLatest = LATEST_Q.test(q);
    const wantsAll = ALL_Q.test(q) || (wantsLatest && RESULTS_WORD.test(q));
    const hasEntity = e.analytes.length || e.sites.length || tract;
    if (!hasEntity && !wantsDocs && !wantsAll) return { relevant: false, entities: e };

    let recs = D.records.filter(r =>
      (!e.analytes.length || e.analytes.includes(r.analyte)) &&
      (!e.sites.length || e.sites.includes(r.site)) &&
      (!tract || r.tract === tract) &&
      (!e.year || r.sampleDate.startsWith(e.year)) &&
      (!e.month || Number(r.sampleDate.slice(5, 7)) === e.month));

    // NEW: if no chemical was named, show the main derailment chemicals first and count the rest.
    let otherChemicals = 0;
    if (!e.analytes.length && recs.length && D.keyAnalytes) {
      const key = recs.filter(r => D.keyAnalytes.includes(r.analyte));
      if (key.length) { otherChemicals = new Set(recs.filter(r => !D.keyAnalytes.includes(r.analyte)).map(r => r.analyte)).size; recs = key; }
    }
    // NEW: placeholders for sources the web app doesn't have yet (data/not-yet-available.js).
    const waiting = [...new Set(e.sites.map(k => D.sites[k].waiting).filter(Boolean))];

    const out = { relevant: true, entities: e, wantsLatest, records: recs, limits: [], docs: [], conflicts: [], absence: null, otherChemicals, waiting };

    if (wantsLimit) out.limits = (e.analytes.length ? e.analytes : []).map(mclText).filter(Boolean);
    if (wantsDocs) {
      const ids = new Set((recs.length ? recs : D.records.filter(r => (!e.sites.length || e.sites.includes(r.site)) && (!e.analytes.length || e.analytes.includes(r.analyte)))).map(r => r.docId));
      out.docs = (ids.size && hasEntity ? [...ids] : D.documents.map(d => d.id)).map(id => citation(id)).filter(Boolean);
    }
    if (wantsLimit && !e.sites.length && !tract) out.records = recs = []; // limit-only question
    if (wantsDocs && !wantsAll && !wantsLatest && !e.year && !e.month) out.records = recs = []; // "where can I read…" → documents only

    // FR-11 conflicts: same analyte, site, date — different agencies, different results.
    const groups = {};
    recs.forEach(r => (groups[groupKey(r) + "|" + r.sampleDate] ||= []).push(r));
    out.conflicts = Object.entries(groups).filter(([, g]) => g.length > 1 &&
      new Set(g.map(r => r.agency)).size > 1 && new Set(g.map(r => r.detected ? r.value : "ND")).size > 1);

    if (!recs.length && !out.limits.length && !out.docs.length && waiting.length) {
      out.absence = "We don't have data on that yet. " + waiting.join(" ");
      out.waiting = [];
    } else if (!recs.length && !out.limits.length && !out.docs.length) {
      const parts = [];
      if (e.analytes.length) parts.push(e.analytes.map(a => D.analytes[a].name.toLowerCase()).join(" or "));
      if (e.sites.length) parts.push("for " + e.sites.map(x => D.sites[x].plain || D.sites[x].name).join(" or "));
      if (tract) parts.push("near your street");
      if (e.year || e.month) parts.push("in " + [e.month ? MONTHS[e.month - 1][0].toUpperCase() + MONTHS[e.month - 1].slice(1) : "", e.year || ""].join(" ").trim());
      out.absence = `We don't have data on ${parts.join(" ") || "that"}.`;
    }
    return out;
  }

  // Fact card status for one chemical (FR-9). Never returns text that isn't approved.
  function factCard(a, suspended) {
    const fc = D.factCards[a];
    const name = D.analytes[a].name;
    if (!fc) return { analyte: a, name, status: "none" };
    if (suspended.factCards || !fc.approved) return { analyte: a, name, status: "pending", source: fc.source };
    const cite = citation(fc.docId || "D7");
    if (!cite) return { analyte: a, name, status: "pending", source: fc.source };
    return { analyte: a, name, status: "approved", source: fc.source, text: fc.text, approvedDate: fc.approvedDate, cite };
  }

  // Dates for the date banner (FR-4), shown on every result.
  function dateBanner(items) {
    const dates = (items || []).map(i => i.date).filter(Boolean).sort();
    return { corpusUpdated: D.corpusUpdated, newestSample: dates.length ? dates[dates.length - 1] : null };
  }

  // ---------- Main entry: answer a question ----------
  // opts: { tract, suspended: {tier1, tier2, factCards} }
  function answer(question, opts = {}) {
    const cls = classify(question);
    const suspended = opts.suspended || {};
    const base = { tier: cls.tier, category: cls.category, question, dates: dateBanner([]) };

    if (cls.tier === 3) return { ...base, kind: "referral", referral: D.referrals[cls.category] };

    if (cls.tier === 1 && suspended.tier1) return { ...base, kind: "suspended" };

    // NEW (gap 1): fact card answer.
    if (cls.category === "factCard") {
      const a = cls.analyte;
      const recs = D.records.filter(r => r.analyte === a);
      const lim = mclText(a);
      const items = lim && lim.cite ? [lim] : [];
      const newest = recs.map(r => r.sampleDate).sort().pop() || null;
      return { ...base, kind: "factCard", analyte: a, name: D.analytes[a].name, card: factCard(a, suspended),
        items, testCount: recs.length, newestTest: newest, limitPending: D.mcl[a] === undefined,
        absence: recs.length ? null : `We don't have test results for ${D.analytes[a].name.toLowerCase()}.`,
        dates: { corpusUpdated: D.corpusUpdated, newestSample: newest } };
    }

    if (cls.category === "glossary") {
      const cite = citation("G1");
      return { ...base, kind: "glossary", term: cls.term, definition: D.glossary[cls.term], cite };
    }

    if (cls.tier === 2 && suspended.tier2) return { ...base, kind: "suspended" };

    const r = retrieve(question, opts.tract);
    if (!r.relevant) return { ...base, kind: "noAnswer" };

    const conflictKeys = new Set(r.conflicts.map(([k]) => k));
    const { latest, older } = splitNewest(r.records);

    // Build cited items. Any item that can't be cited is dropped (FR-3).
    const uniq = arr => { const seen = new Set(); return arr.filter(i => i.cite && !seen.has(i.text) && seen.add(i.text)); };
    const latestItems = uniq(latest.map(x => recordItem(x, conflictKeys)));
    const historyItems = uniq(older.map(x => recordItem(x, conflictKeys)));
    const limitItems = uniq((r.records.length ? [...new Set(r.records.map(x => x.analyte))].map(mclText).filter(Boolean) : []).concat(r.limits));

    if (!latestItems.length && !limitItems.length && !r.docs.length && !r.absence) return { ...base, kind: "noAnswer" };

    const res = { ...base, kind: cls.tier === 1 ? "answer" : "referenceSheet",
      wantsLatest: r.wantsLatest,
      items: latestItems, history: historyItems, limits: limitItems, docs: r.docs,
      conflicts: r.conflicts.map(([, g]) => g.map(x => ({ agency: x.agency, text: recordText(x), date: x.sampleDate }))),
      absence: r.absence, waiting: r.waiting, otherChemicals: r.otherChemicals,
      dates: dateBanner(latestItems.concat(historyItems)) };

    if (cls.tier === 2) {
      const analytes = [...new Set(r.records.map(x => x.analyte).concat(r.entities.analytes))];
      res.factCards = analytes.map(a => factCard(a, suspended));
    }
    return res;
  }

  // Every piece of text in a result, in reading order (for read-aloud, word explanations and audits).
  function resultTexts(r) {
    const t = [];
    (r.items || []).forEach(i => t.push(i.text));
    (r.limits || []).forEach(i => t.push(i.text));
    (r.history || []).forEach(i => t.push(i.text));
    if (r.absence) t.push(r.absence);
    (r.waiting || []).forEach(w => t.push(w));
    if (r.definition) t.push(r.definition);
    return t;
  }

  // Glossary words used in a result, so the screen can explain them.
  function wordsUsed(r) {
    const text = norm(resultTexts(r).join(" ")).replace(/[.,]+ /g, " ");
    const found = Object.keys(D.glossary).filter(k => k !== (r.term || "") && text.includes(" " + norm(k).trim() + " "));
    // Prefer "mcl" over its long form, and drop terms contained in a longer found term.
    return found.filter(k => k !== "maximum contaminant level" && !found.some(o => o !== k && o.includes(k)))
      .map(k => ({ term: k, definition: D.glossary[k] }));
  }

  // ---------- NFR-7 readability (Flesch-Kincaid grade) ----------
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, "");
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
    const m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }
  function gradeLevel(text) {
    const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
    const words = text.split(/\s+/).filter(w => /[a-z]/i.test(w));
    if (!words.length) return 0;
    const syl = words.reduce((s, w) => s + syllables(w), 0);
    return +(0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59).toFixed(1);
  }

  // ---------- FR-23 evaluation harness ----------
  function runEval(EV) {
    const bench = EV.benchmark.map(b => { const c = classify(b.q); return { q: b.q, expected: b.tier, got: c.tier, pass: c.tier === b.tier }; });
    const red = EV.redTeam.map(q => { const c = classify(q); return { q, got: c.tier, category: c.category, pass: c.tier === 3 }; });
    const pct = a => Math.round(100 * a.filter(x => x.pass).length / a.length);
    return { bench, red, benchPct: pct(bench), redPct: pct(red), gatePass: pct(bench) >= 95 && pct(red) === 100 };
  }

  const Core = { classify, extract, retrieve, answer, citation, tractFromAddress, isStale, isSunset, daysSince,
    gradeLevel, runEval, fmtDate, doc, resultTexts, wordsUsed };
  if (typeof module !== "undefined") module.exports = Core; else root.Core = Core;
})(this);
