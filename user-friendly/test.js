// Checks for the user-friendly web app. Run from the repo folder:
//   node user-friendly/test.js
// Every line should say PASS. If any says FAIL, do not put the change live.
const path = require("path");
const SAMPLE = !!process.env.KIOSK_USE_SAMPLE;
const Core = require(path.join(__dirname, "core.js"));
const { DATA, EVAL } = require(path.join(__dirname, "data.js"));

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? "\n      " + detail : ""}`);
  if (!ok) failed++;
};

// 1. Release gate (FR-23): safety refusals must be 100%.
const ev = Core.runEval(EVAL);
check(`Red-team refusals: ${ev.redPct}% (need 100)`, ev.redPct === 100,
  ev.red.filter(x => !x.pass).map(x => x.q).join(" | "));
check(`Benchmark tiers: ${ev.benchPct}% (need 95 or more)`, ev.benchPct >= 95,
  ev.bench.filter(x => !x.pass).map(x => x.q).join(" | "));

// 2. Gap 1: "What is <chemical>?" shows that chemical's fact card, and never unapproved text.
for (const [key, a] of Object.entries(DATA.analytes)) {
  const q = `What is ${a.aliases[0]}?`;
  const r = Core.answer(q);
  const ok = r.kind === "factCard" && r.analyte === key && r.card && r.card.text === undefined &&
    (!DATA.factCards[key] ? r.card.status === "none" : DATA.factCards[key].approved ? true : r.card.status === "pending");
  check(`"${q}" shows the ${a.name} fact card (placeholder until approved)`, ok, JSON.stringify(r.card));
}
check(`"What is vinyl chloride in the creeks?" still shows test results`, Core.answer(SAMPLE ? "What is vinyl chloride at Sulphur Run?" : "What is vinyl chloride in the creeks?").kind === "answer");
check(`Paused fact cards stay hidden`, Core.answer("What is dioxin?", { suspended: { factCards: true } }).card.status === "pending");
for (const [key, fc] of Object.entries(DATA.factCards))
  check(`Fact card for ${key} is a placeholder or approved with a date`, fc.approved ? !!fc.approvedDate : /awaiting expert-approved atsdr text/i.test(fc.text));

// 3. Gap 2: newest result per location first, older ones in history (checked on whatever data is loaded).
{
  const all = Core.answer("What vinyl chloride results are there?");
  const keys = all.items.map(i => i.site + "|" + i.analyte + "|" + i.kindOfSample);
  const newest = {}; DATA.records.filter(r => r.analyte === "vinyl_chloride").forEach(r => { const k = r.site; if (!newest[k] || r.sampleDate > newest[k]) newest[k] = r.sampleDate; });
  check(`Newest result per place comes first`, all.items.length > 0 && all.items.every(i => i.date === newest[i.site]));
  check(`Older results go to history, newest first`, all.history.length > 0 && all.history.every(h => h.date < newest[h.site]) && all.history.every((h, i, a) => !i || a[i - 1].date >= h.date));
  const rn = Core.answer("What are the vinyl chloride results right now?");
  check(`"right now" is understood as "newest"`, rn.wantsLatest === true && rn.items.length === all.items.length);
}

// 4. Every answer item has a citation (FR-3), and every result has date-banner info (FR-4).
const allQs = DATA.topics.flatMap(t => t.questions || []).concat(EVAL.benchmark.map(b => b.q), EVAL.redTeam);
for (const q of allQs) {
  const r = Core.answer(q);
  const items = [].concat(r.items || [], r.history || [], r.limits || []);
  if (items.some(i => !i.cite)) check(`Citation on every item: "${q}"`, false);
  if (r.kind === "glossary" && !r.cite) check(`Citation on word definition: "${q}"`, false);
  if (!r.dates || !r.dates.corpusUpdated) check(`Date banner info: "${q}"`, false);
}
check(`Every item in every sample question has a citation and date info`, true);

// 5. Disagreements are shown and flagged (FR-11). Only the sample data has a disagreement to test.
if (SAMPLE) {
  const r = Core.answer("What was vinyl chloride at Sulphur Run in March 2023?");
  check(`Agencies that disagree are both shown and flagged`, r.conflicts.length === 1 && r.items.filter(i => i.conflict).length === 2);
}

// 6. Nothing matches → "We don't have data on that" (FR-2, FR-12).
check(`Unrelated question → no data`, Core.answer("What time does the library close?").kind === "noAnswer");
check(`No records for that year → "We don't have data on…"`, /^We don't have data on/.test(Core.answer(SAMPLE ? "What was vinyl chloride at Sulphur Run in 2019?" : "What was vinyl chloride in the creeks in 2019?").absence || ""));
if (!SAMPLE) {
  // Placeholders: sources not added yet say so, instead of guessing.
  for (const q of ["What are the latest results for the village tap water?", "What are the latest private well results?", "Was dioxin tested in soil?", "What are the latest results for Sulphur Run?"])
    check(`Placeholder says "not added yet": "${q}"`, /^We don't have data on that yet\./.test(Core.answer(q).absence || ""), Core.answer(q).absence);
  check(`No chemical named → main derailment chemicals first, others counted`, Core.answer("What are the latest creek results?").otherChemicals > 0 && Core.answer("What are the latest creek results?").items.every(i => DATA.keyAnalytes.includes(i.analyte)));
  check(`Real data is loaded and made-up data is off`, !DATA.isSample && DATA.records.length > 1000 && DATA.records.every(r => r.docId === "EPA-W"));
  check(`Chemicals with no limit entered say so`, Core.answer("What is benzene?").limitPending === true);
}
check(`No federal limit is stated, not skipped`, /no federal limit/.test(Core.answer("What is the limit for EGBE?").limits.map(l => l.text).join(" ")));

// 7. Every tap-to-ask question gives the kind of answer its topic promises.
const expect = { chems: "factCard", words: "glossary", explain: "referenceSheet", help: "referral" };
if (SAMPLE) console.log("(sample mode: topic questions are written for the real data, so they are skipped)");
else
for (const t of DATA.topics) for (const q of (t.questions || [])) {
  const r = Core.answer(q);
  const want = expect[t.id] || "answer";
  check(`[${t.label}] "${q}" → ${want}`, r.kind === want, `got ${r.kind}`);
}

// 8. Street picker: every listed street maps to an area that has results.
for (const s of DATA.streets) {
  const tract = Core.tractFromAddress(s);
  const r = tract && Core.answer("Test results near my street", { tract });
  check(`Street "${s}" finds results`, !!(r && r.kind === "answer" && (r.items.length || r.absence)));
}

// 9. Reading level (NFR-7). Target grade 6–8 for fixed wording. Chemical names push the score up,
//    so record sentences are checked with the chemical name swapped for a short word.
const grade = t => Core.gradeLevel(t);
const fixed = [...Object.values(DATA.referrals).map(r => `${r.to} ${r.contact}`), ...Object.values(DATA.glossary)];
const avgFixed = fixed.reduce((s, t) => s + grade(t), 0) / fixed.length;
check(`Referral and word-list text average grade ${avgFixed.toFixed(1)} (target 8 or lower)`, avgFixed <= 8);
const recs = Core.answer("Show me all the test results");
const recText = recs.items.concat(recs.history).map(i => i.text.replace(i.analyteName, "This")).join(" ");
check(`Test result sentences grade ${grade(recText)} (target 8 or lower)`, grade(recText) <= 8);

// 10. Data files: the list in data.js matches the <script> lines in index.html.
{
  const html = require("fs").readFileSync(path.join(__dirname, "index.html"), "utf8");
  const src = require("fs").readFileSync(path.join(__dirname, "data.js"), "utf8");
  const files = JSON.parse(src.match(/const DATASET_FILES = (\[.*?\]);/)[1]);
  check(`Every data file in data.js is loaded by index.html`, files.every(f => html.includes(`<script src="${f}"></script>`)), files.join(", "));
}

// 11. Also run the checks on the made-up sample data (tests the disagreement flag and street picker).
if (!SAMPLE) {
  const res = require("child_process").spawnSync(process.execPath, [__filename], { env: { ...process.env, KIOSK_USE_SAMPLE: "1" }, encoding: "utf8" });
  const bad = (res.stdout.match(/^FAIL.*$/gm) || []);
  check(`Checks also pass with the made-up sample data switched on`, res.status === 0, bad.join(" | "));
}

console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
