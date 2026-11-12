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

## 2026-11-12: Real EPA data added (user-friendly version)
Source: the public U.S. EPA East Palestine water sampling page listed in the requirements guide (https://www.epa.gov/east-palestine-oh-train-derailment/water-sampling-data), "EPA Lab Results: Water (through 09/30/2025)" CSV.

### What changed
- **Data lives in `user-friendly/data/`, one file per source.** `data.js` now holds only wording and settings, and merges the data files when the page loads. Adding, removing or replacing a source means one file plus one line in `DATASET_FILES` and one `<script>` line in `index.html`. A test checks that these two lists match.
- **Real data:** `tools/import_epa_water.py` converts the CSV into `data/epa-water-sampling.js`: 3,943 of 3,944 rows, 183 chemicals, 56 sampling points, Feb 2023 to Aug 2025. The one row EPA's lab marked "R" (rejected) is skipped. Results EPA marks "J" are shown as "estimated", and "Prelim" ones as "preliminary". Units are normalized (ug/L, UG/L and ppb become µg/L).
- **Placeholders** (`data/not-yet-available.js`): village tap water, county private wells, soil and dioxins, and the creek names Sulphur Run and Leslie Run. Asking about one gives "We don't have data on that yet" and names the missing source. Missing federal limits show "not entered yet".
- **Made-up data** moved to `data/sample-made-up.js` and is switched off. Switching it on hides all real data, so the two are never mixed. The staff page warns when it is on. `test.js` runs its checks in both modes.
- **Readability with real volumes:** when no chemical is named, the kiosk shows the main derailment chemicals first and counts the rest. When there are more than 12 results, it shows a short summary per chemical, lists only the places where it was found, and puts every result behind "Show every place".
- **Everyday group words:** "creek(s)", "stream(s)", "surface water" cover all EPA stream points, and "monitoring well(s)" and "groundwater" cover all EPA wells. Monitoring wells are labeled as not being home drinking-water wells.
- **Word questions** now count only when nothing else is asked ("What does monitoring well mean?"), so "latest monitoring well results" shows results.
- **Topics** were rewritten for the real data. "Near my street" is hidden because EPA's file has no census tracts.

### What could not be done, and why
- **Location names:** EPA's CSV only has codes like `SW01-SR`. Names appear only in EPA's interactive map on another site (epa.maps.arcgis.com). The kiosk shows codes, and `data/location-names.js` has a placeholder for each code. Names must be confirmed before they are typed in.
- **Census tracts:** not in the CSV, so "Near my street" can't work with real data yet.
- **Disagreements between agencies:** only one agency's data is loaded, so nothing is flagged yet. The logic is still tested with the sample data.
- **Other sources in the guide** (Ohio EPA, the village water system, county wells, soil and dioxins, the TASC summary, ATSDR fact cards) were not downloaded. They are listed as placeholders on the staff page.
- **Shelf location** for the printed EPA file is a placeholder.
- **Network:** epa.gov was blocked in the cloud environment, so a personal environment that allows `www.epa.gov` was created to download the file.

## 2026-11-12: Calling it a web app, not a kiosk
This is a web application, so every screen and guide now says "web app" instead of "kiosk".
- **Changed:** all wording people see (welcome page, answers, "We don't have data" messages, the staff page heading, now "Web app controls"), the README files, `data/README.md`, `features/FEATURES.md`, `PROJECT-HANDOFF.md`, code comments, and the AI helper's instructions.
- **New one-file preview:** `preview/web-app-preview.html`, rebuilt from `user-friendly/` with the new wording. It replaces `preview/kiosk-real-data-preview.html`.
- **Kept as they were:** internal code names such as `KIOSK_USE_SAMPLE` and `KIOSK_DATASETS`, and the browser's saved-settings name (renaming them changes nothing on screen and could break things or wipe saved settings); branch names and the repo name `water-data-kiosk`; past commits; the root prototype files; the submitted write-ups in `docs/` and the older previews they link to; and earlier entries in this file, which record what was true at the time.

## 2026-11-12: Cleanup, only the app stays
The repo now holds only what the web app needs.
- **Removed:** the assignment write-ups and screenshots (`docs/`), the one-file previews (`preview/`), and the first prototype files in the main folder (`index.html`, `data.js`, `core.js`, `app.js`). They stay in git history if ever needed.
- **Taken off GitHub but kept on the owner's Mac:** `PROJECT-HANDOFF.md`.
- **Kept:** this file, the raw EPA spreadsheet in `user-friendly/data/raw/` (needed to refresh the data), and everything in `user-friendly/`.
- **Saved versions:** `version 1.html` is a single-file snapshot of the app as of this date, kept on the owner's Mac (not uploaded) so later changes can be compared against it.

## 2026-11-12: Version 2 begins, new opening screens
Two new screens now come before the Welcome page, using the app name "How's My Water" and a cardinal mascot named Ruby: (1) a cream page with the name, one line about the app and two cardinals fading in, and (2) "Hi! I'm Ruby. What's your name?" with a name box, Continue and Skip. A red splash screen was tried first and dropped at the owner's request.
- **Layout idea only:** the flow follows a sample design the owner shared. None of its art, logo or character was copied.
- **Art:** `user-friendly/intro/cardinals.png` is two cardinals and their branch, cut out of a photo the owner supplied and outlined in white (cut out on the Mac with Apple's built-in subject lifting). Where the photo came from and its license are not yet recorded; confirm both before the app goes public. To swap the art, replace that file or change `MASCOT_IMAGE` in `intro/mascot.js`. The fade-in is turned off for people whose device asks for less motion.
- **Name privacy:** the name is optional. It is kept in memory only to say "Nice to meet you" on the Welcome page. It is never saved, logged or sent, and "Done" or the 10-minute timer clears it. Only letters are kept. A test checks this.
- **Safety unchanged:** emergency mode still comes first, and the Welcome page with the disclaimer and "I understand. Start." still always shows after the new screens. The new screens also say the app is not medical or safety advice.
- **Colors:** cardinal red `#a8102a` with white text (about 7.6:1, AAA). High contrast mode turns these screens black and yellow. The rest of the app is unchanged for now.
- **Switch:** `on: false` in `user-friendly/intro/intro.js` turns the screens off; `askName: false` drops only the name screen. To remove them fully, delete the "OPENING SCREENS" lines in `index.html` and the `intro/` folder.
- `version 2.html` is a single-file snapshot kept on the owner's Mac to compare with `version 1.html`.
- **No blue top bar (every page):** the colored bar with the app title is gone. The text-size buttons (A, A+, A++) and high contrast (◐) are now round buttons at the top right of every page, at least 52px and growing with the text size. The title is still in the page for screen readers, and printouts still carry their own heading.
- **Red instead of blue (whole app):** every blue color is now cardinal red (`#a8102a` buttons and links, `#7d0a1e` hover and fact-card borders, cream fact-card background). All text pairs still meet AAA contrast. High contrast mode stays black and yellow; its blue fact-card border is now white and its focus ring magenta. The "a person can help" cards stay red as before, so they now look closer to normal buttons.
- **Library name:** "Water & Soil Test Results" and "East Palestine Memorial Public Library" now show only at the bottom of the first opening screen, as the owner asked.
- **Opening page reworked (owner's to-do list):** the "What's your name?" page was removed, so no name is asked for at all. The opening page now reads, top to bottom: text-size buttons, the library lines, "How's My Water", the one-line description, the cardinals, the buttons, then the "not medical or safety advice" note. It fits one phone screen without scrolling. Its text is 18px.
- **Smaller text everywhere else:** normal text is now 16px (was 20px). A+ is 20px and A++ is 24px. The 48px tap-target minimum is unchanged.
- **Pill-shaped buttons:** all buttons are fully rounded. On the opening page the two buttons are as wide as the longer label and match each other. Topic tiles have rounder corners (24px).
- **Welcome page restyled:** it now matches the opening page (cream background, centered, 18px text, pill button) without the picture or the red title. The disclaimer cards and "I understand. Start." are unchanged in wording.
- **"Done. Clear the screen for the next person" removed** from the question page at the owner's request. The 10-minute idle timer still clears the screen. The idea is kept in `KIOSK-SUGGESTIONS.md` for a future kiosk version.
- **Question page (page 3):** same cream look and 18px text as the first two pages. The typing box now comes first ("Type your question"), then "Or tap a topic. Then tap a question." and the topic tiles.
- **Welcome page:** the "Welcome" heading was removed; the line "This web app shows official water and soil test results…" is now the page heading.

## 2026-11-12: Answers open on their own page
Asking a question (typed, topic, street or "Did you mean?") now opens a separate answer page at `#/answer`. Its only back button, "‹ Back to questions", returns to a fresh question page with every topic closed. The phone's back gesture does the same. The answer page keeps everything it showed before: the citation, date banner, print, read aloud, report a problem, known limitations and the disclaimer. Reloading the page with no answer in memory shows the question page. Answers are never saved, so this changes nothing for privacy. The question page is now a single column on wide screens too, and the topics are one column of full-width pills.
- **Page 2 (Welcome) bottom buttons:** at the owner's request, only Read aloud shows there. Print, Report a problem, Known limitations and help tickets are hidden on that page only (CSS in `intro/intro.css`). The disclaimer still shows. This page has no results yet. Note: the requirements ask for these buttons on every screen, so confirm with the project lead.
- **Question box label:** "Type your question" is hidden on screen but kept for screen readers.
- **Read aloud (every screen):** now a round speaker button at the top left, next to the text-size buttons. It turns red while reading and its label changes to "Stop reading". It was removed from the bottom button row. On phones the words "Text size" are hidden so the buttons fit on one row.
- **Date panel:** on the answer page it now comes after the answer instead of before it. Every answer still shows it.
- **Opening page colors:** red page (`#8c0d22`, between the button red and the darker hover red) with cream text and cream pill buttons (cream on this red is well above AAA). The title is now "How's My Water?". The "Water & Soil Test Results / East Palestine Memorial Public Library" line moved from the opening page to the top of page 2. High contrast mode stays black and yellow.
- **Opening page title font:** a rounded font the device already has (SF Rounded on Apple, Arial Rounded where installed, else Trebuchet or Verdana). No font files are downloaded. The picture and tagline are smaller, with more room under the top buttons.
- **Less text on answers:** each source shows one line ("Source: agency, date") that opens to the full title, binder location and link. The date panel is one line ("Updated … · Newest test …") that opens to the note about live readings. "What these words mean" is closed until tapped. Printing opens all of them, so printouts keep the full citation.
- **Page 2 (Welcome) text:** shortened to three items per list ("What was tested / Where and when / The result and the federal limit" and "If it's safe / Health, legal or money advice / Why it happened"). The "Is the text too small?" tip was removed; the text-size buttons are at the top of every page.
