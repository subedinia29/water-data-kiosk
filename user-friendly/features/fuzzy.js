// "Did you mean?" helpers: fix typos and spot vague questions. Pure functions, no screen code.
// Runs in the browser and in Node (for test-features.js).
(function (root) {
  const D = (typeof DATA !== "undefined") ? DATA : require("../data.js").DATA;

  // Words we try to correct toward: chemical and place names, word-list terms, and
  // safety words (so a misspelled safety question is still caught by the safety gate).
  const SAFETY_WORDS = ["safe", "unsafe", "dangerous", "toxic", "harmful", "sick", "cancer", "doctor", "lawyer",
    "settlement", "lawsuit", "drink", "poison", "contaminated", "healthy", "worried", "exposure", "symptoms"];
  const KIOSK_WORDS = ["latest", "newest", "results", "result", "water", "limit", "tested", "report", "reports", "history", "detected"];
  // Ordinary words we never "correct" (they are close to vocabulary words but mean something else).
  const KEEP = new Set(("what when where which that this there these those have does done tell show with from your " +
    "about been were them they find read mean near some many much last here like know want need make many more most " +
    "over very just only also into than then well will would could should shall each every same wash cell sell bill fill " +
    "test time take talk walk weld wall hell held help hold soap song soul").split(" "));

  const vocab = [...new Set([
    ...Object.values(D.analytes).flatMap(a => a.aliases),
    ...Object.values(D.sites).flatMap(s => s.aliases),
    ...Object.keys(D.glossary),
    ...SAFETY_WORDS, ...KIOSK_WORDS
  ].map(v => v.toLowerCase()).filter(v => v.replace(/[^a-z]/g, "").length >= 4))];

  function lev(a, b) {
    const m = a.length, n = b.length;
    // Edit distance where a swap of two neighbouring letters ("saef" → "safe") counts as one typo.
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }
  const allowed = len => len <= 5 ? 1 : len <= 9 ? 2 : 3;

  // Returns the question with misspelled words fixed, or the same text if nothing changed.
  function correct(question) {
    const words = String(question || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9µ/.'\- ]+/g, " ").split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < words.length;) {
      let done = false;
      for (let n = 3; n >= 1 && !done; n--) {
        if (i + n > words.length) continue;
        const phrase = words.slice(i, i + n).join(" ").replace(/[.?!,]+$/, "");
        if (phrase.length < 4 || (n === 1 && KEEP.has(phrase))) continue;
        if (vocab.includes(phrase)) { out.push(phrase); i += n; done = true; break; }
        let best = null, bestD = Infinity;
        const pw = phrase.split(" ");
        for (const v of vocab) {
          const vw = v.split(" ");
          if (vw.length !== n) continue;
          // Every word must be the same, or a believable typo of a longer, uncommon word.
          if (!pw.every((w, k) => w === vw[k] || (w.length >= 4 && !KEEP.has(w) && lev(w, vw[k]) <= allowed(w.length)))) continue;
          const d = lev(phrase, v);
          if (d < bestD) { best = v; bestD = d; }
        }
        if (best && bestD > 0 && bestD <= allowed(phrase.length)) { out.push(best); i += n; done = true; }
      }
      if (!done) { out.push(words[i]); i++; }
    }
    return out.join(" ");
  }

  // Vague: about water/test results, but no place or chemical named.
  const VAGUE = /\b(water|results?|tests?|tested|samples?|levels?|chemicals?|data|creeks?|streams?|faucet|tap|wells?|soil|dirt|numbers?)\b/;
  const isVague = q => VAGUE.test(String(q || "").toLowerCase());

  // The choices shown for a vague question. Each one is a question the kiosk already answers.
  const CLARIFY = [
    { label: "Village tap water", q: "What are the latest results for the village tap water?" },
    { label: "Sulphur Run (creek)", q: "What are the latest results for Sulphur Run?" },
    { label: "Leslie Run (creek)", q: "What are the latest results for Leslie Run?" },
    { label: "Private wells", q: "What are the latest private well results?" },
    { label: "Soil", q: "What are the latest soil results?" },
    { label: "All the newest results", q: "What are the latest test results?" }
  ];

  // Known, tested questions the AI helper may choose from (never free text).
  function knownQuestions() {
    const qs = D.topics.filter(t => !t.warn).flatMap(t => t.questions || []);
    for (const a of Object.values(D.analytes)) qs.push(`What are the latest ${a.aliases[0]} results?`, `What is ${a.aliases[0]}?`);
    return [...new Set(qs)];
  }

  const Fuzzy = { correct, isVague, CLARIFY, knownQuestions, lev };
  if (typeof module !== "undefined") module.exports = Fuzzy; else root.Fuzzy = Fuzzy;
})(this);
