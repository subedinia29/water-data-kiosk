// Checks for the extra features. Run from the repo folder: node user-friendly/features/test-features.js
const path = require("path");
const Core = require(path.join(__dirname, "..", "core.js"));
const F = require(path.join(__dirname, "fuzzy.js"));
let failed = 0;
const check = (name, ok, d) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && d ? "  (" + d + ")" : ""}`); if (!ok) failed++; };

// Did you mean: typos fixed
for (const [typed, want] of [["what is vinly cloride", "what is vinyl chloride"], ["latest results for sulfer runn", "latest results for sulfur run"],
  ["whats the newest from lesley run", "whats the newest from leslie run"]]) check(`Typo fixed: "${typed}"`, F.correct(typed) === want, F.correct(typed));
// Ordinary words are left alone
for (const q of ["show me the water numbers", "tell me about dioxin", "where can i read the reports"]) check(`Not changed: "${q}"`, F.correct(q) === q, F.correct(q));
// Misspelled safety questions are still refused
for (const q of ["is it saef to drink", "is the tap water saef", "can i drnik the well water", "is the creek dangerus"])
  check(`Misspelled safety question refused: "${q}"`, Core.classify(F.correct(q)).tier === 3, F.correct(q));
// Vague questions get choices, and every choice has an answer
check(`"water results" counts as vague`, F.isVague("water results"));
for (const c of F.CLARIFY) check(`Choice "${c.label}" has an answer`, Core.answer(c.q).kind === "answer");
// The AI may only pick from known questions: all must be answerable and none may be a safety question
const k = F.knownQuestions();
check(`AI choice list: ${k.length} questions, all answerable`, k.every(q => Core.answer(q).kind !== "noAnswer"), k.filter(q => Core.answer(q).kind === "noAnswer").join(" | "));
check(`AI choice list has no safety questions`, k.every(q => Core.classify(q).tier !== 3));
console.log(failed ? `\n${failed} check(s) FAILED.` : "\nAll feature checks passed.");
process.exit(failed ? 1 : 0);
