# Water & Soil Test Results kiosk: easy-to-use version

This folder is the version of the kiosk meant for patrons: older residents, people with low vision, and anyone who doesn't want to type. It does the same job as the prototype in the main folder. It is easier to read and use.

**Data:** it now uses **real U.S. EPA water lab results** (through September 30, 2025). Other sources (village tap water, county private wells, soil, Ohio EPA) are placeholders that say "not added yet". Fact cards and contact numbers are still placeholders, so do not use it with the public until the expert panel approves them. See `data/README.md`.

## What patrons see
- **Big text and strong colors.** Buttons at the top make text bigger (A+, A++) or switch to white-on-black (High contrast).
- **Topic buttons.** Patrons tap a topic like "Tap water" or "Chemicals", then tap a ready-made question. No typing needed. There is still a box to type a question.
- **Newest results first.** For each place, the newest test shows first. Older tests are behind a **Show history** button.
- **"What is vinyl chloride?"** shows that chemical's fact card. Until experts approve the text, it says "Awaiting expert-approved ATSDR text."
- **Words explained.** Under each answer, a box explains words like MCL and µg/L.
- **On every screen:** "Print this and talk to a librarian", Read aloud, Report a problem, Known limitations, and the disclaimer.
- **Questions it won't answer** (safety, health, legal, property and similar) get a card that says who can help.
- **Done button.** It clears the screen for the next person. The screen also clears itself after 10 minutes with no touch.

## How to open it
1. Open Terminal and go to the project folder (the one that holds this `user-friendly` folder). For example:
   ```bash
   cd ~/Desktop/water-data-kiosk
   ```
2. Start a small local web server:
   ```bash
   python3 -m http.server 8765
   ```
3. In a browser, go to `http://localhost:8765/user-friendly/`
4. Staff page: `http://localhost:8765/user-friendly/#/staff`
5. To try it on a phone on the same Wi-Fi, use `http://<your computer's IP>:8765/user-friendly/`

Double-clicking `index.html` also works. Nothing is sent to the internet.

## What's in this folder
| File | What it is | When you'd touch it |
|---|---|---|
| `index.html` | The page frame | Rarely |
| `styles.css` | Colors, text size, layout | Changing the look |
| `data/` | **The test results**, one file per source, plus placeholders. See `data/README.md` | Adding or updating data |
| `tools/import_epa_water.py` | Turns EPA's CSV into `data/epa-water-sampling.js` | When EPA posts a new file |
| `data.js` | **All the words and settings:** reports, test results, chemicals, places, limits, word list, fact cards, who-to-call cards, disclaimer, topic buttons and their questions, test questions | Most changes happen here |
| `core.js` | The "brain": safety check, finding results, sentence templates, tests | Changing how questions are understood |
| `app.js` | The screens: patron screens, staff page, printing, reports | Changing what screens show |
| `test.js` | Automatic checks | Run after every change |

The files in the main folder (the first prototype) are separate. Changing this folder does not change them.

## Before you put any change on the kiosk
Run the checks. In Terminal, from the project folder:
```bash
node user-friendly/test.js
```
Every line must say **PASS**, and the last line must say **All checks passed.** If anything says FAIL, don't use the change. Ask the project team.

You can also see the release-gate numbers on the staff page. Red-team refusal must be **100%**.

## Common tasks
Wording and settings are in `data.js`; test results are in `data/` (see `data/README.md`). Copy an existing line and change it. Keep commas and quote marks the same.

- **Add or update test results:** see `data/README.md`. For EPA updates, re-run the import script; don't edit results by hand.
- **Add a federal limit for a chemical:** add it to `mcl` in `data.js` (use `null` if no federal limit exists). Until then the kiosk says "not entered yet".
- **Name an EPA sampling point:** edit `data/location-names.js`.
- **Approve a fact card:** paste the exact ATSDR/IRIS text into `factCards`, set `approved: true` and set `approvedDate`. **Only do this with written expert panel sign-off.** Never write or reword health text yourself.
- **Change contact numbers:** edit `referrals` and `emergency`. Every `[CONFIRM NUMBER]` must be replaced before real use.
- **Change the topic buttons or their questions:** edit `topics`. Then run the checks. They test every question on every button.
- **Add a word to the word list:** add it to `glossary`. Write short sentences. Explain words only. Never write health advice.
- **"Near my street":** hidden until results include census tracts. EPA's file has none.
- **Reset the kiosk's saved info:** open the browser's developer console and run `localStorage.clear()`, then reload. This clears reports, counts and staff settings on that one browser.

## Adding or updating data
All test results are in the `data/` folder, one file per source. `data/README.md` explains how to update the EPA data, add a new source, name a sampling point, remove a source, or switch on the made-up demo data. Real and made-up data are never mixed.

## Staff page (`#/staff`)
- **Kill switch:** turns questions off right away. Patrons then only see the list of reports.
- **Emergency mode:** shows only the emergency text and phone numbers.
- **Reference desk staffed / not staffed:** questions only work while the desk is staffed.
- **Auto-sunset:** if no signed refresh happens for 180 days, questions turn off by themselves.
- **Pause a kind of answer:** pauses fact answers, reference sheets or fact cards. This logs an incident.
- **Usage:** number of sessions and questions. No names or addresses are kept.
- **Agency disagreements:** questions where patrons saw two agencies with different results.
- **Problem reports:** what patrons reported. Send them to the expert panel (ERP). Reports open 5 days or more are marked.
- **Weekly audit** and **Release gate check.**

## Rules that must not change
- The safety check runs first, before anything else.
- Never write health text. It only comes from expert-approved ATSDR/IRIS text, word for word.
- Every answer shows its source and the date banner.
- If agencies disagree, show both and flag it.
- If nothing matches, say "We don't have data on that."
- Nothing is sent to the internet. No names or addresses are stored.

See `../DECISIONS.md` for why things work the way they do.

## One-file preview
`preview/kiosk-preview.html` (in the main folder) is the whole kiosk in a single file, for quick viewing: download it and double-click. It is a copy, so it does **not** update by itself. After changing anything in `user-friendly/`, ask the project team to rebuild it, or delete it.
