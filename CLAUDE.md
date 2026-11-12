# Water Data Help Desk (IEEE Tech4Good 26-T4G-227)

A library kiosk for East Palestine, Ohio. Residents ask about official water and soil test results from after the 2023 train derailment. The kiosk answers only from official documents, cites every answer, and sends health, safety and legal questions to a person.

Project lead: Chang Liu (Ohio University EECS). The source of truth is the IEEE student requirements guide, `IEEE-Student-Requirements.docx`, which is not in this repo. `FR-`, `NFR-` and `M` numbers in the code and docs refer to it.

This is a working prototype. All data is made up, and the fact cards, contact numbers, emergency text and Known Limitations text are placeholders.

## Commands
```bash
python3 -m http.server 8765
```
Patron view: `http://localhost:8765`. Staff panel: `http://localhost:8765/#/staff`.

Release-gate check, which must print `100 100`:
```bash
node -e 'const C=require("./core.js");const {EVAL}=require("./data.js");const r=C.runEval(EVAL);console.log(r.benchPct, r.redPct)'
```
There is no build step, no dependencies and no linter. Reset the app state with `localStorage.clear()` in the browser console.

## Layout
- `data.js`: all content (documents, records, analytes, sites, MCLs, glossary, fact cards, referrals, disclaimer) and the `EVAL` test questions. Most edits go here.
- `core.js`: pure logic with no DOM. It runs in the browser and in Node, so keep it that way.
- `app.js`: screens (patron, staff, printing, reports). State lives in `localStorage` under `ehl-kiosk-state`.
- `index.html`: page shell and CSS. Scripts load in the order data, core, app.
- `DECISIONS.md`: what was kept, simplified or left out of the requirements, and why. Update it whenever a decision changes.
- `README.md`: written for a non-technical maintainer. Keep it that way.

## How a question flows (`Core.answer`)
1. `TIER3` regex gate: refuse and show a referral card. Categories are checked in order and the first match wins.
2. Glossary: "what does X mean" for a known term.
3. `TIER2` regex: printable Reference Sheet for a librarian.
4. Facts: search records by chemical, site, year and month, or by census tract.
5. No match: "We couldn't find that" slip. A recognized topic with no data gets "We don't have data on…".

Matching runs on `norm()` output, which is lowercased and space-padded. Aliases must be lowercase, and `TIER3` and `TIER2` patterns must match normalized text.

## Rules that can't be broken
These come from the guide, which calls them non-negotiable. If a request conflicts with one, stop and say so.

- **Never write, edit, paraphrase or summarize health text.** It comes only from expert-panel-approved ATSDR/IRIS fact cards, shown word for word. Set `approved: true` only with panel sign-off. Glossary entries and UI copy must not drift into health claims either.
- **The safety gate runs first, always.** A Tier 3 question must never reach retrieval or any model. When in doubt, refuse.
- **Never handle:** safety verdicts, medical advice or diagnosis, personal risk or dose, causation, or anything about the settlement, claims or litigation.
- **Every answer needs a citation** (title, agency, publication date, and link or shelf location) and the date banner. If an item can't be cited, drop it.
- **Show both sources when they disagree.** Say plainly when data is missing.
- **Stay neutral.** No reassurance and no alarm. Never comment on an agency's credibility or imply anyone caused harm. Agencies are not project partners, so never describe them that way.
- **Privacy (ORC 149.432).** Never store names, identifiers or raw addresses, or link a question to a person. Keep only census-tract counts. Addresses are used once and cleared.
- **Nothing leaves the kiosk.** No cloud APIs, analytics, CDNs or remote fonts. No proprietary models or paid services; open-source components only (code Apache-2.0, content CC-BY-4.0).
- **Don't invent benchmark questions.** The 200 benchmark questions must be real ones from library staff and the EPA TASC FAQ. Red-team items may be added.
- **Patron text targets a 6th–8th grade reading level.** Design for elderly and low-vision users: large text and 48px tap targets at minimum.

## Making changes
- **New refusal pattern:** add it to `TIER3`, add a matching question to `EVAL.redTeam`, then rerun the gate. Red-team must stay at 100%.
- **Regex edits:** a looser `TIER2` or a tighter `TIER3` can change routing without any error, so always rerun the gate. Note the gate only tests routing, not answer accuracy, so check real answers in the browser too.
- **Records:** keep the field shape (`docId, analyte, site, medium, tract, sampleDate, value, detected, detectionLimit, unit, agency`). Real data will be converted into this shape so `core.js` doesn't change.
- **Documents:** need a `link` or `shelf`, or they won't display. **Chemicals:** also add an `mcl` entry (`null` means no federal limit exists).
- **Staff panel has no password on purpose:** the guide says the kill switch must need no permission. A public deployment must keep patrons away from that route.

## Current state
- `main` holds the functionality-only prototype, with no AI model: understanding is regex rules and answers are templates. Any future local LLM may only retrieve and pick templates or cards, after the gate. It must never write answers. See `DECISIONS.md`.
- Known gaps on `main`: "What is vinyl chloride?" lists results instead of the fact card, and "right now", "latest" and "current" are ignored (results show oldest first).
- [PR #1](https://github.com/subedinia29/water-data-kiosk/pull/1) is open and unmerged. It adds `user-friendly/`, a separate copy of the app for older and low-vision patrons, with both gaps fixed and its own test (`node user-friendly/test.js`). That folder has its own `core.js` and `data.js`, so once it is merged, logic and safety fixes must be applied to both copies.

## Open questions
- For Chang: can the audit log keep question text under ORC 149.432, or should it be dropped after the audit window?
- Which chemicals are in scope beyond vinyl chloride and dioxins? The others in `data.js` are likely but unconfirmed against real EPA data.

## Working with the owner
Nia is steering this project and isn't working as a traditional developer. Keep explanations concise and in plain language, and keep user-facing docs readable by non-technical people. Ask before pushing, merging or making the repo public.

### How Nia wants questions handled
- **Ask all your questions before starting a task**, in one go. Don't stop midway to ask more if you can avoid it.
- **Give sample answer options with every question** (for example: "A) bigger button, B) different color, C) leave as is").
- **Keep pondering minimal**, especially on non-technical things. Pick a sensible default when the choice doesn't matter much.
- **For "do changes" tasks:** write your questions into `to-do-changes.md`, under the change they are about, before making that change. Wait for Nia's answers there.
- **Visual changes:** before starting, give Nia options to pick from (a short description of each, with a sample image when useful). After the change, send a PNG screenshot of the updated look.
