# Decisions log

A running record of which requirements from the IEEE requirements guide are kept, simplified or left out. Each entry that is not fully kept explains what adding it later would involve.

Last updated: 2026-11-03 (user-friendly version added; see the end of this file)

## Current build at a glance
- A static web app (`index.html`, `data.js`, `core.js`, `app.js`). It is phone-first, and on desktop (900px or wider) it switches to two columns.
- No AI model and no server. All logic runs in the browser.
- All data is made up and labeled as sample data.
- Run it with `python3 -m http.server 8765` and open `localhost:8765`. Staff panel: `#/staff`.

## Kept (working now)
| Req | How |
|---|---|
| FR-1 Closed corpus | Only the documents and records in `data.js` |
| FR-2 Retrieval-grounded / no answer | Keyword and entity matching; no match → "We couldn't find that" slip |
| FR-3 Mandatory citation | Answers missing a citation field are dropped before display |
| FR-4 Date banner | Shown on every citation |
| FR-5 Pre-generation gate | Regex rules in `core.js` run first |
| FR-6 Tier 1 | Fixed sentence templates and a glossary |
| FR-7 Tier 2 | Printable Reference Sheet: records plus fact cards |
| FR-8 Tier 3 | 8 refusal categories, each with a referral card |
| FR-9 Verbatim fact cards | Shown only when approved; placeholders until the expert panel supplies the text |
| FR-10, 13, 14, 15 | Footer on every screen, disclaimer on printouts, Known Limitations page, Report a problem button, first-use screen |
| FR-11 Conflicts | Same chemical, site and date with different agency results → both shown and flagged |
| FR-12 Absence | "We don't have data on…", including "no federal MCL exists" |
| FR-16, 17, 22 | Staff panel buttons for the kill switch, emergency mode and "desk staffed" |
| FR-18 Staleness | Banner when a document is more than 90 days past its expected update |
| FR-19 Auto-sunset | More than 180 days since the last signed refresh → document browser only |
| FR-20 Address | Mapped to a census tract once, the field is cleared, only tract counts are stored |
| FR-21 Session counter | Random session ID with no personal data |
| FR-23 Eval harness (small) | 8 benchmark and 18 red-team items, release-gate check in the staff panel (currently 100%/100%) |
| FR-24 Audit (basic) | 10% random sample with a checkbox for each of the 5 grading axes, report queue with a 5-day warning, incident log |
| NFR-7 Readability | Grade level computed in the audit view |
| NFR-9 Accessibility (basic) | Large text, 48px tap targets, read-aloud using the device's built-in speech |

## Simplified or excluded, and what adding them later involves

### Local LLM, embeddings and vector store (NFR-1, the Section 6 stack)
- **Now:** rule-based matching. Answers are always templates, so they are fully predictable and the model can never make things up.
- **If added:** a Python backend with Ollama running a quantized ~7–8B model, sentence embeddings and Chroma or FAISS. The phone or browser becomes a thin client.
- **Pros:** understands freely worded questions and finds relevant passages in long PDFs.
- **Cons:** needs a GPU machine and a server, can't run on a phone, needs much more safety testing, and adds latency.
- **Condition:** keep the AI only for retrieval and choosing a template, and run the gate before any model call. The guide already treats the AI as a retrieval index.

### Real data ingestion (FR-1, M1.3)
- **Now:** made-up records in `data.js`.
- **Later:** real data is expected. A Python ETL would parse EPA, Ohio EPA and county CSV or PDF files into the same record shape (`docId, analyte, site, medium, tract, sampleDate, value, detected, detectionLimit, unit, agency`), plus a signed manifest.
- **Pros:** real use.
- **Cons:** messy PDF tables, varied unit and name conventions, and an alias list for each chemical and site to maintain.
- **Condition:** keep the field shape so `core.js` doesn't change.

### Storage: localStorage instead of SQLite or PostgreSQL
- **Now:** logs, reports and settings exist only in that one browser.
- **If changed:** use local SQLite on the kiosk.
- **Pros:** durable records, an audit trail and multiple staff devices.
- **Cons:** needs a backend.
- **Condition:** must stay on-device. No cloud storage (NFR-1, NFR-2).

### Kill switch as a physical action (FR-16)
- **Now:** an on-screen staff button at `#/staff`. There is no password, because the guide says it must need no permission.
- **If changed:** a hardware USB button or key switch read by the kiosk OS.
- **Pros:** truly one physical action, and patrons can't reach it.
- **Cons:** needs the hardware.
- **Condition:** in a public deployment the staff route must not be reachable by patrons.

### Weekly source-URL integrity check (FR-18)
- **Now:** only checks that each document has a link or shelf location. Browsers can't read cross-site HTTP status codes.
- **If added:** a weekly cron job on the kiosk or maintainer machine that hits each URL and alerts the maintainer on failure.
- **Condition:** outbound requests must be on the firewall allow-list (NFR-10).

### Signed quarterly refresh (FR-18)
- **Now:** a staff member enters initials and the refresh is logged.
- **If changed:** a cryptographic signature on the corpus manifest (for example GPG).
- **Pros:** tamper-evident.
- **Cons:** key management.

### Tier classifier (FR-5)
- **Now:** regex rules only, which leans toward over-refusing.
- **If extended:** add a small local text classifier behind the rules.
- **Pros:** catches unusual phrasings.
- **Cons:** it's probabilistic, so the rules must stay the first line of defense.
- **Condition:** must still hit 100% on the red-team set.

### Benchmark and red-team size (FR-23, NFR-5, NFR-6)
- **Now:** 8 benchmark and 18 red-team items. They only test routing, not answer accuracy.
- **Later:** 200 real staff questions and 75 red-team items, plus dual-rater grading stored per response.
- **Condition:** don't invent benchmark questions (Section 5.3).

### Fact cards, referral contacts, emergency text, Known Limitations
- **Now:** placeholders.
- The guide forbids us from writing health text, so these come from the expert panel and the library. Phone numbers are marked `[CONFIRM NUMBER]`.

### Not in this build
- Hardware imaging, VLAN and firewall, UPS, failover unit (NFR-8, 10, 11): deployment concerns.
- Open-source packaging and licenses (NFR-3, 4): add `LICENSE` (Apache-2.0) and a content license (CC-BY-4.0) when the repo is set up. Everything used is already dependency-free.
- Print layout polish: printing uses the browser's print dialog with print-specific CSS.
- Polished UI: functionality first, as requested.

## Privacy notes
- The anonymous audit log stores question text, because the weekly audit needs it. It stores no name, no address and only a random session ID.
- **Open question for Chang:** confirm this is acceptable under ORC 149.432, or whether questions should be dropped after the audit window.

## 2026-11-03: User-friendly version (`user-friendly/` folder)
A second build for patrons who are older, have low vision, or don't want to type. The root prototype files are unchanged. The new folder has its own copies of `data.js` and `core.js`, adapted as described below. It uses its own browser storage key, so the two versions don't share settings or logs.

### Design
- **Phone first, two columns on wide screens (960px or wider).** Base text is 20px. A+ and A++ buttons raise it to 24px and 28px. A High contrast button switches to white and yellow on black. Colors meet WCAG AAA contrast (7:1).
- **Tap targets are at least 56px tall** (48px for the text-size buttons in the top bar).
- **Topic buttons with tap-to-ask questions,** so nobody has to type. Typing is still available.
- **Plain words.** Answer sentences are short. Results are labeled "Result / Tested on / Tested by / Sample". "Not detected" shows as "Not found" with the detection limit in plain words. `test.js` checks that the fixed wording averages grade 8 or lower.
- **Jargon is explained under each answer** ("What these words mean"), using only the glossary. Glossary entries were added for EPA, Ohio EPA, ATSDR, fact card, sample, census tract and "not found". They define words only and contain no health content.
- **Result values use neutral colors.** No red or green on numbers, because color would suggest a safety judgment.
- **Report a problem** uses a large on-screen form with four tap choices instead of a browser pop-up.
- **Read aloud** reads only what is visible on the screen, at a slightly slower rate, and says unit names in full. The same button stops it.
- **Privacy:** "Done" clears the screen and display settings for the next person. The screen also clears itself after 10 minutes with no touch.
- **Near my street** is a pick-list of streets instead of a typed address. The street is turned into a census tract once and then cleared (FR-20 unchanged).
- **Print** opens the history, adds a printed date, "Bring this page to the reference desk", note lines and the disclaimer.

### Gap 1 fixed: "What is <chemical>?" shows the fact card
- **Now:** a question that is only "What is/are <chemical>?" shows that chemical's fact card, the federal limit (cited) and how many tests are on file, with a button to see them. "What is vinyl chloride at Sulphur Run?" still shows test results.
- Every chemical now has a fact card entry. All say "Awaiting expert-approved ATSDR text." We wrote no health text. Approved cards would cite a new corpus entry, D7 (ATSDR ToxFAQs printed copies, sample entry).
- Pausing fact cards on the staff page still hides any approved text.

### Gap 2 fixed: newest result per location first
- **Now:** by default, and for "right now", "latest", "current", "newest", "recent" or "still" questions, the newest result for each place, chemical and sample type is shown first. Older results sit behind a **Show history** button, newest first.
- "Right now" questions also say plainly that the kiosk has no live readings.
- "What are the latest test results?" and "Show me all the test results" now work without naming a place or chemical.
- If two agencies disagree on a newest result, the flag shows next to it. If the disagreement is in older results, a short note at the top points to Show history, and the full flag card is inside the history.
- Sample records were added (more made-up dates for the same places) so the history has something to show.

### Other logic changes in `user-friendly/core.js`
- **Safety gate additions (over-refusal preferred):** health-effect wording ("what will it do to me", "health effects of", "how does it affect my kids") is refused as *risk*. Judgment words ("bad", "clean", "contaminated", "poison", "healthy", "pure") are refused as *safety*. Eight matching red-team items were added (26 total, all refused). The benchmark list is unchanged, because benchmark questions must come from real staff questions.
- **Glossary only answers word-only questions.** "What is the MCL for vinyl chloride?" now shows the actual limit instead of the MCL definition. It is still Tier 1, so the benchmark still passes at 100%.
- **Glossary matching normalizes terms,** so "µg/L" and "ng/kg" questions now match.
- **"Where can I read…" questions** show the documents only, not the test results.
- **Word definitions now carry a citation** to a new corpus entry, G1 (the kiosk word list, sample, needs expert review), so every answer shows a source.
- **Agency disagreements are logged for staff** and listed on the staff page, so "flagged" now means a person can see it.
- **Topic buttons and their questions live in `data.js` (`topics`),** so all wording is in one file. `test.js` checks that every one gives the expected kind of answer.

### Kept the same
- Safety gate runs first. Eight refusal categories, each with a referral card (wording simplified, same contacts and placeholders).
- Mandatory citation on every item, date banner on every result, stale-document warning.
- "We don't have data on that" when nothing matches.
- Staff page: kill switch, emergency mode, desk staffed toggle, 180-day auto-sunset, anonymous session count, report queue with 5-day warning, incident log, content-class pause, weekly audit, release gate.
- No server, no AI model, no external requests, no personal data stored.

### Open items
- **Staff link:** still a small link at the bottom of patron screens, as in the root prototype. In a public kiosk the staff page must not be reachable by patrons (see "Kill switch as a physical action" above).
- **Fonts:** uses Verdana or the device's system font. No web fonts are downloaded, to keep the kiosk offline.
- **Reading level of chemical names** can't be lowered. They are official names and stay as published.
- **User testing:** the design has not yet been tried with library patrons. A short session with a few older residents and the reference staff is the next step.
- **Two versions:** once the library picks one, delete or archive the other so there is one `data.js` to maintain.
