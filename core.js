// Core logic: pure functions, no DOM. Runs in the browser and in Node (for tests).
(function (root) {
  const D = (typeof DATA !== "undefined") ? DATA : require("./data.js").DATA;

  const norm = s => (" " + s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9µ.'\- ]+/g, " ").replace(/\s+/g, " ") + " ");

  // ---------- FR-5 / FR-8: deterministic Tier-3 gate (runs before anything else) ----------
  // Order matters: earlier categories win. Over-refusal is preferred to under-refusal.
  const TIER3 = [
    ["misuse",    /ignore (all|any|previous|prior|the|your)|system prompt|pretend|role ?play|you are now|jailbreak|developer mode|\bact as\b|forget (your|the) rules/],
    ["legal",     /settlement|lawsuit|\bsue\b|\bsuing\b|lawyer|attorney|\blegal(?! (limit|level))|compensation|payout|\bclaims?\b|eligib|deadline|\bliab/],
    ["property",  /property|home value|house value|lose value|resale|sell (my|the|our) (house|home)|insurance|mortgage|relocat|move away|moving away|should (i|we) move|real estate/],
    ["agency",    /\blying\b|\blie(d|s)?\b|cover ?up|trust (the )?(epa|agency|agencies|government|county|state)|corrupt|credib|honest about/],
    ["medical",   /symptom|\bsick|\bill\b|illness|rash|headache|cough|nausea|vomit|diagnos|doctor|blood test|screen(ing)? (me|for)|pregnan|treatment|medicine|hospital|my health|disease|asthma/],
    ["risk",      /cancer|\brisk|\bdoses?\b|exposed|exposure|chance of|likely to get|how much .*\b(i|we|my|me)\b .*(breath|drank|absorb|got)/],
    ["causation", /\bcaus|because of the|from the (train|derailment|spill|chemicals?|fire|burn)|due to the|is it from|linked to|responsible for|\bfault\b|\bblame/],
    ["safety",    /\bsafe|unsafe|dangerous|danger|\bharm|toxic|\bworr|concern|\bok(ay)? (to|for)|fine to|alright to|should (i|we) (drink|use|let|stop|be|boil|bathe|keep)|can (i|we) (drink|let|swim|fish|eat|bathe|use|cook)|let (my|the) (kids?|children|grandkids?|pets?|dogs?)|play in|water (my|the) garden|\bboil/]
  ];

  const GLOSSARY_Q = /what (is|are|does|do)|what's|whats|define|meaning of|stand for/;
  const TIER2 = /\bcompare|comparison|versus|\bvs\b|higher|lower|more than|less than|\bworse|\bbetter|trend|\bmean\b|\bmeans\b|explain|interpret|normal|elevated|\bhigh\b|\blow\b|significant|\bwhy\b|\bshould\b|tell me about|what does .* tell/;

  function classify(question) {
    const q = norm(question);
    for (const [cat, re] of TIER3) if (re.test(q)) return { tier: 3, category: cat };
    const term = findGlossaryTerm(q);
    if (term && GLOSSARY_Q.test(q)) return { tier: 1, category: "glossary", term };
    if (TIER2.test(q)) return { tier: 2, category: "interpret" };
    return { tier: 1, category: "facts" };
  }

  function findGlossaryTerm(q) {
    return Object.keys(D.glossary).sort((a, b) => b.length - a.length)
      .find(t => q.includes(" " + t.toLowerCase() + " ") || q.includes(" " + t.toLowerCase() + "s "));
  }

  // ---------- Entity extraction (for retrieval) ----------
  const MONTHS = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const hasWord = (q, w) => new RegExp("[ ]" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[ ]").test(q);

  function extract(question) {
    const q = norm(question);
    const analytes = Object.keys(D.analytes).filter(k => D.analytes[k].aliases.some(a => hasWord(q, a)));
    // A site matches if any alias appears; "private well" suppresses the generic "well" double-match.
    const sites = Object.keys(D.sites).filter(k => D.sites[k].aliases.some(a => hasWord(q, a)));
    const yearM = q.match(/\b(20\d\d)\b/);
    const month = MONTHS.findIndex(m => hasWord(q, m) || hasWord(q, m.slice(0, 3)));
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

  // ---------- Templates (FR-6) ----------
  const lc = s => s[0].toLowerCase() + s.slice(1);
  const fmtDate = iso => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  function mclText(analyte) {
    const m = D.mcl[analyte];
    const name = D.analytes[analyte].name;
    if (m === undefined) return null;
    if (m === null) return { text: `There is no federal drinking-water limit (MCL) for ${lc(name)}.`, cite: citation("D5") };
    return { text: `The federal drinking-water limit (MCL) for ${lc(name)} is ${m.value} ${m.unit}.`, cite: citation(m.docId) };
  }
  function recordText(r) {
    const a = D.analytes[r.analyte].name, s = D.sites[r.site].name;
    const result = r.detected ? `${r.value} ${r.unit}` : `not detected (the test could measure down to ${r.detectionLimit} ${r.unit})`;
    return `On ${fmtDate(r.sampleDate)}, ${r.agency} tested ${r.medium} at ${s} for ${lc(a)}. Result: ${result}.`;
  }

  // ---------- Retrieval (FR-2, FR-11, FR-12) ----------
  function retrieve(question, tract) {
    const e = extract(question);
    const q = norm(question);
    const wantsLimit = /limit|\bmcl\b|threshold|standard|allowed|legal level|maximum/.test(q);
    const wantsDocs = /where (can|do|could) (i|we) (read|find|see|get)|which (document|report)|\bdocuments?\b|\breports?\b|\bsources?\b/.test(q);
    const hasEntity = e.analytes.length || e.sites.length || tract;
    if (!hasEntity && !wantsDocs) return { relevant: false, entities: e };

    let recs = D.records.filter(r =>
      (!e.analytes.length || e.analytes.includes(r.analyte)) &&
      (!e.sites.length || e.sites.includes(r.site)) &&
      (!tract || r.tract === tract) &&
      (!e.year || r.sampleDate.startsWith(e.year)) &&
      (!e.month || Number(r.sampleDate.slice(5, 7)) === e.month));

    const out = { relevant: true, entities: e, records: recs, limits: [], docs: [], conflicts: [], absence: null };

    if (wantsLimit) out.limits = (e.analytes.length ? e.analytes : []).map(mclText).filter(Boolean);
    if (wantsDocs) {
      const ids = new Set((recs.length ? recs : D.records.filter(r => (!e.sites.length || e.sites.includes(r.site)) && (!e.analytes.length || e.analytes.includes(r.analyte)))).map(r => r.docId));
      out.docs = (ids.size ? [...ids] : D.documents.map(d => d.id)).map(id => citation(id)).filter(Boolean);
    }
    if (wantsLimit && !e.sites.length && !tract) out.records = recs = []; // limit-only question

    // Conflicts: same analyte, site, date — different agencies, different results.
    const groups = {};
    recs.forEach(r => (groups[r.analyte + r.site + r.sampleDate] ||= []).push(r));
    out.conflicts = Object.values(groups).filter(g => g.length > 1 &&
      new Set(g.map(r => r.agency)).size > 1 && new Set(g.map(r => r.detected ? r.value : "ND")).size > 1);

    if (!recs.length && !out.limits.length && !out.docs.length) {
      const parts = [];
      if (e.analytes.length) parts.push(e.analytes.map(a => D.analytes[a].name.toLowerCase()).join(" or "));
      if (e.sites.length) parts.push("at " + e.sites.map(x => D.sites[x].name).join(" or "));
      if (tract) parts.push("in your area");
      if (e.year || e.month) parts.push("in " + [e.month ? MONTHS[e.month - 1][0].toUpperCase() + MONTHS[e.month - 1].slice(1) : "", e.year || ""].join(" ").trim());
      out.absence = `We don't have data on ${parts.join(" ") || "that"}.`;
    }
    return out;
  }

  // ---------- Main entry: answer a question ----------
  // state: { suspended: {tier1, tier2, factCards} }
  function answer(question, opts = {}) {
    const cls = classify(question);
    const suspended = opts.suspended || {};
    const base = { tier: cls.tier, category: cls.category, question };

    if (cls.tier === 3) return { ...base, kind: "referral", referral: D.referrals[cls.category] };

    if (cls.category === "glossary")
      return { ...base, kind: "glossary", term: cls.term, definition: D.glossary[cls.term] };

    if ((cls.tier === 1 && suspended.tier1) || (cls.tier === 2 && suspended.tier2))
      return { ...base, kind: "suspended" };

    const r = retrieve(question, opts.tract);
    if (!r.relevant) return { ...base, kind: "noAnswer" };

    // Build cited items. Any item that can't be cited is dropped (FR-3).
    const items = r.records.map(rec => ({ text: recordText(rec), cite: citation(rec.docId, rec.sampleDate), analyte: rec.analyte }))
      .concat(r.records.length ? [...new Set(r.records.map(x => x.analyte))].map(mclText).filter(Boolean).map(m => ({ text: m.text, cite: m.cite })) : [])
      .concat(r.limits.map(m => ({ text: m.text, cite: m.cite })))
      .filter(i => i.cite);
    const uniq = []; const seen = new Set();
    for (const i of items) if (!seen.has(i.text)) { seen.add(i.text); uniq.push(i); }

    if (!uniq.length && !r.docs.length && !r.absence) return { ...base, kind: "noAnswer" };

    const res = { ...base, kind: cls.tier === 1 ? "answer" : "referenceSheet", items: uniq, docs: r.docs,
      conflicts: r.conflicts.map(g => g.map(x => ({ agency: x.agency, text: recordText(x) }))), absence: r.absence };

    if (cls.tier === 2) {
      const analytes = [...new Set(r.records.map(x => x.analyte).concat(r.entities.analytes))];
      res.factCards = analytes.map(a => {
        const fc = D.factCards[a];
        if (!fc) return { analyte: D.analytes[a].name, status: "none" };
        if (suspended.factCards || !fc.approved) return { analyte: D.analytes[a].name, status: "pending", source: fc.source };
        return { analyte: D.analytes[a].name, status: "approved", source: fc.source, text: fc.text, approvedDate: fc.approvedDate };
      });
    }
    return res;
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
    const sentences = Math.max(1, (text.match(/[.!?]+/g) || []).length);
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

  const Core = { classify, extract, retrieve, answer, citation, tractFromAddress, isStale, isSunset, daysSince, gradeLevel, runEval, fmtDate, doc };
  if (typeof module !== "undefined") module.exports = Core; else root.Core = Core;
})(this);
