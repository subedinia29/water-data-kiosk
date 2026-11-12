# Water Data Help Desk: functionality prototype

A working prototype of the library web app from the IEEE Tech4Good project (26-T4G-227). It focuses on behavior, not looks. All data is made up.

## How to open it
1. Open Terminal and run:
   ```bash
   cd ~/Desktop/functionality
   python3 -m http.server 8765
   ```
2. In a browser, go to `http://localhost:8765`.
3. For the staff panel, go to `http://localhost:8765/#/staff`.
4. To try it on a phone on the same Wi-Fi, use `http://<your-Mac's-IP>:8765`. You can find the IP in System Settings → Wi-Fi → Details.

Opening `index.html` directly by double-clicking also mostly works.

## What's in the folder
| File | What it is | When you'd touch it |
|---|---|---|
| `index.html` | The page shell and basic styling | Changing layout or looks |
| `data.js` | **All content:** documents, test results, chemical names, limits, glossary, fact cards, referral contacts, disclaimer, test questions | Most edits happen here |
| `core.js` | The "brain": question sorting (tiers), searching, answer templates, freshness rules, test harness | Changing how questions are understood |
| `app.js` | The screens: patron view, staff panel, printing, reports | Changing what screens show |
| `DECISIONS.md` | What we kept or skipped from the requirements doc, and why | Keep it updated as decisions change |

## How a question is handled
1. **Safety gate** (`TIER3` in `core.js`): if a question matches a health, safety, legal, property, causation, agency or misuse pattern, it's refused and a referral card is shown.
2. **Glossary:** "What does X mean?" questions about a known term get a definition.
3. **Interpret** (`TIER2`): words like compare, explain, mean, higher or why produce a printable Reference Sheet for a librarian.
4. **Facts:** everything else searches the records by chemical, site, year and month, or by area if a street was entered.
5. No match → a "We couldn't find that" slip.

## Common tasks
- **Add a test result:** add a line to `records` in `data.js`, following the existing ones.
- **Add a document:** add to `documents`. A document needs a `link` or a `shelf` location, or it won't be shown.
- **Add a chemical or site:** add to `analytes` or `sites`, including the `aliases` people might type. Add the chemical's limit to `mcl`, or `null` if there is none.
- **Add a referral contact:** edit `referrals`. Every `[CONFIRM NUMBER]` must be replaced before real use.
- **Approve a fact card:** paste the verbatim ATSDR/IRIS text into `factCards`, set `approved: true` and add `approvedDate`. Only do this with expert panel sign-off.
- **Add a refusal pattern:** edit `TIER3` in `core.js`, add a matching question to `EVAL.redTeam` in `data.js`, then check that the staff panel shows red-team refusal at 100%.
- **Reset the prototype:** in the browser console, run `localStorage.clear()` and reload.

## Testing
Check the release-gate numbers in the staff panel, or run this in Terminal:
```bash
cd ~/Desktop/functionality
node -e 'const C=require("./core.js");const {EVAL}=require("./data.js");const r=C.runEval(EVAL);console.log(r.benchPct, r.redPct)'
```
Both numbers should be 100. The safety number must stay at 100.

## Known gaps
- "What is vinyl chloride?" lists test results instead of a description. It should show the fact card.
- "Right now", "latest" and "current" are ignored. Results are shown oldest first.
- There is no AI model. Question understanding is keyword rules, so unusual wording may be missed.
- Saved data (reports, counts, settings) lives only in that one browser.
- The fact cards, contact numbers, emergency text and Known Limitations text are placeholders.

See `DECISIONS.md` for the full list and what adding each feature later would involve.

## Rules to keep (from the project)
- Never write health text yourself. It comes only from expert-approved ATSDR/IRIS cards, word for word.
- The safety gate runs before anything else.
- Nothing gets sent to the internet, and no personal data is stored.
- Every answer needs a citation, or it isn't shown.
