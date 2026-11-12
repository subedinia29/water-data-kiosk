# Water Data web app: project handoff

Paste or attach this file at the start of a new chat. It covers everything needed to keep working on the project one change at a time.

---

## 1. What the project is
- **IEEE Tech4Good 2026 project 26-T4G-227**: Ohio University with the East Palestine Memorial Public Library. Faculty lead: Dr. Chang Liu (GitHub `drchangliu`).
- **The product** is a library web app that helps East Palestine residents find and read official environmental test results after the February 2023 train derailment.
- **The final system** is meant to be a locally hosted RAG web app running an open-weight LLM (Ollama, about 7–8B, Chroma or FAISS).
- **Right now** it is a static, browser-only web app with rule-based logic, with no server and no AI model in the core.
- **The person working on it is not a programmer.** Explain things in plain words, keep instructions step by step, and keep the app usable by older and low-vision residents.
- **The requirements come from** "IEEE Student Requirements" (a .docx the student has). Key parts are summarized in Section 3.

## 2. Where things are
- **Repo:** https://github.com/subedinia29/water-data-kiosk. It is **private**. `drchangliu` must be invited (Settings, then Collaborators) before the instructor can open any link.
- **Branches:**
  - `main`: the first, functionality-only prototype (root files).
  - `claude/relaxed-sagan-i8x7gl`: the user-friendly version, plus the Project 3.1 write-up. **Pushed. Open as PR #1** (https://github.com/subedinia29/water-data-kiosk/pull/1), not merged.
  - `feature/kiosk-extras`: built on top of that branch. It has the 3.2 features and the real EPA data. **Pushed to GitHub.** The next step is to open a separate PR for it, so it is easy to drop later.
- **iPhone/web preview (private Claude page):** https://claude.ai/artifact/LQVWzT23kQ6Y5orwEzuPBp. It's a phone build of `feature/kiosk-extras`. Printing, voice and the AI helper are turned off there, because the page viewer can't do them.
- **One-file previews to download and double-click:** `preview/web-app-preview.html` (current), `preview/kiosk-plus-features-preview.html` (3.2, made-up data), `preview/kiosk-preview.html` (3.1).
- **Separate local work:** `~/Desktop/functionality` on the student's Mac has a CLAUDE.md commit (`3c74e84`) on main that is not pushed. A cloud session can't reach it.
- **Cloud environment:** a personal environment named "water-data-kiosk" allows `www.epa.gov`, for downloading EPA data. Other agency sites are blocked until they are added.

## 3. Rules that must never break (from the requirements and the docs)
1. **Safety gate first.** Questions about safety, medical, risk or exposure, causation, legal matters, property, agencies, or misuse (prompt injection) are refused before anything else. Each gets a referral card saying who can help.
2. **Never write health text.** Fact cards show only expert-approved ATSDR/IRIS text, word for word. Until then, they say "Awaiting expert-approved ATSDR text."
3. **Every answer has a citation** (title, agency, published date, sample date, link or shelf location) **and the date banner**. Answers without a citation are not shown.
4. **When agencies disagree**, both results are shown and the disagreement is flagged.
5. **When nothing matches**, the web app says "We don't have data on that." Missing sources say "We don't have data on that yet."
6. **On every screen:** "Print this and talk to a librarian", Report a problem, Known limitations, the disclaimer and read-aloud.
7. **Staff page:** kill switch, emergency mode, "desk staffed" toggle, auto-sunset after 180 days without a signed refresh, an anonymous session count, the reports queue, the audit and the release gate.
8. **Red-team refusal must stay at 100%.** The benchmark must stay at 95% or higher, and benchmark questions must not be invented.
9. **Privacy:** no names or addresses stored, nothing sent to the internet. The AI helper is a labeled demo exception.
10. **Never mix real and made-up data.**
11. **Plain words** at about a 6th–8th grade reading level, large text, high contrast, big tap targets, phone first.

## 4. How the code is organized (`user-friendly/` is the main app)
| File | Job |
|---|---|
| `index.html` | Page frame. It loads the data files, then `data.js`, `core.js`, `app.js` and the `features/` files, in that order. |
| `styles.css` | Colors as tokens, a 20px base font, A+/A++ sizes, high-contrast mode, print styles. |
| `data.js` | Wording and settings: `DATASET_FILES`, the chemicals (`analytes`), `keyAnalytes`, `siteGroups`, MCL limits, glossary, fact cards, referrals, emergency text, topics and questions, disclaimer, the `EVAL` sets. At the bottom, `mergeDatasets()` brings in the `data/` files. |
| `core.js` | The logic, with no screen code (also runs in Node). It handles: the safety gate (`TIER3`), `classify`, `extract` (chemicals, places, groups, dates), `retrieve` (newest per place first, then history, conflicts, placeholders, main chemicals first), templates, citations, freshness, `gradeLevel`, `runEval`. |
| `app.js` | The screens: welcome, main (topics and tap-to-ask), results, limitations, staff, read-aloud, report dialog, idle reset. |
| `test.js` | `node user-friendly/test.js` runs every check, on the real data and again on the sample data. Everything must pass. |
| `data/` | One file per data source. See Section 5. |
| `tools/import_epa_water.py` | Turns EPA's CSV into `data/epa-water-sampling.js`. |
| `features/` | The Project 3.2 extras. They wrap functions from `app.js` without editing it. See Section 6. |
| `README.md`, `data/README.md`, `features/FEATURES.md` | Guides for a non-technical maintainer. |

Root files (`index.html`, `data.js`, `core.js`, `app.js`) are the original prototype. **Leave them unchanged.** `DECISIONS.md` (root) records every decision, with dated sections. Add to it for each change.

## 5. Data
- **Real data:** `data/epa-water-sampling.js`, made from the public U.S. EPA CSV "EPA Lab Results: Water (through 09/30/2025)" on https://www.epa.gov/east-palestine-oh-train-derailment/water-sampling-data. The raw copy is in `data/raw/`.
  - 3,943 of 3,944 rows, 183 chemicals, 56 sampling points, Feb 2023 to Aug 2025.
  - The one "R" (rejected) row is skipped. "J" results show as "estimated", and "Prelim" results as "preliminary". Units are normalized.
- **To update it:** download the new CSV into `data/raw/`, run `python3 user-friendly/tools/import_epa_water.py user-friendly/data/raw/FILE.csv`, run the tests, then update `corpusUpdated` and `dataNote` in `data.js`.
- **Placeholders** are in `data/not-yet-available.js`: village tap water, county private wells, soil and dioxins, and the names Sulphur Run and Leslie Run. Asking about one gives "We don't have data on that yet" and names the missing source. `missingSources` lists them on the staff page.
- **Location names** are in `data/location-names.js`. EPA gives only codes (like `SW01-SR`), so every name is `null`. Fill in names only once they are confirmed. The names exist in EPA's ArcGIS map (`epa.maps.arcgis.com`), which is not allowed on the network yet.
- **Made-up data** is in `data/sample-made-up.js`, set to `enabled: false`. Turning it on hides all real data. Tests use it through `KIOSK_USE_SAMPLE=1`.
- **To add a source:** create a new file in the same shape, add it to `DATASET_FILES` in `data.js` **and** add a `<script>` line in `index.html` (a test checks that they match), then remove its placeholder.
- **Missing so far:** census tracts (so "Near my street" is hidden), Ohio EPA data, county wells, village tap water, soil and dioxins, the TASC summary, approved fact-card text, confirmed contact numbers, and shelf locations.

## 6. Project 3.2 features (`user-friendly/features/`)
- Each one is switched on or off in `features/config.js`.
- To remove them all: delete the folder and the lines marked `EXTRA FEATURES` in `index.html`.

The features:
1. **"Did you mean?"** (`fuzzy.js`, offline): fixes typos and offers big "Which do you mean?" buttons for vague questions. It also catches misspelled safety questions ("is it saef") and refuses them.
2. **Ask in your own words** (`ai-helper.py`): a local Python helper on `localhost:8766` that uses the official Anthropic SDK with model `claude-opus-5-5`. Claude only picks one of the kiosk's known questions, and the kiosk shows its normal cited answer. The safety gate runs first. The helper needs `ANTHROPIC_API_KEY` and internet. **It has not been tested with live Claude calls yet**, only with a stand-in.
3. **Librarian help ticket:** a ticket number on screen, and a queue on the staff page with "Mark done".
4. **Speak your question:** uses the browser's speech recognition, and reads the answer aloud. Best in Chrome or Edge.

Tests: `node user-friendly/features/test-features.js`.

## 7. How to run and check
```bash
cd water-data-kiosk
```
```bash
python3 -m http.server 8765
```
Then open `http://localhost:8765/user-friendly/`. The staff page is at `#/staff`.

Checks (both must end in "passed"):
```bash
node user-friendly/test.js
```
```bash
node user-friendly/features/test-features.js
```

## 8. Coursework done so far
- **Project 3.1** (first prototype): `docs/ASSIGNMENT.md` and `docs/screenshots/`.
- **Project 3.2** (features): `docs/ASSIGNMENT-3.2.md`, `docs/screenshots-3.2/`, and `docs/Water-Data-Kiosk-3.2-screenshots.pdf`. These were made with the made-up data.
- **Write-up style the student prefers:** short and plain. Use first person ("I"), since the student works alone, not "we". No timelines in next steps. Sections: Features Summary, Scenario Set Summaries (click-by-click), Repo Url, Main Prompt, Other Summarized Prompts, Next Steps, LLM Reflection, Screenshots.
- **LLM used:** Claude Opus 5.5 through Claude Code.

## 9. Known issues and ideas for next changes
- Push `feature/kiosk-extras` and open its PR (it waited on the student's go-ahead).
- Test the AI helper with a real API key.
- Get location names for the EPA codes, either by allowing `epa.maps.arcgis.com` or from EPA documents.
- Add more sources: Ohio EPA, village water, county wells, soil and dioxins (each needs its host allowed).
- Answers for whole groups are long (for example, 159 monitoring-well results). A summary table helps. Could add filters by chemical or by year.
- The 3.2 screenshots, PDF and older previews show made-up data. Remake them if they are needed again.
- Turn on a physical kill switch, and hide the staff page from patrons, before real deployment.
- Longer term: replace the cloud AI with a local open-weight model behind the same safety gate, and build real evaluation sets (200 real questions, 75 red-team).

## 10. How to work with the student
- Offer two to four options and let the student pick before building anything big.
- Show a working demo (screenshots or a preview link) **before pushing or merging**.
- Make changes easy to switch off or remove (separate files, switches in config).
- Explain in plain words, and keep replies short unless asked for more.
- Say clearly when something can't be done and why. Never invent data, names, numbers or health text.
- Commit messages end with the session's attribution lines. Keep model names out of commit messages and PR text.
