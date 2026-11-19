# Spec: "How's My Water?" web app

What the app does **today** (as of 2026-11-19, `main`). The code is in `user-friendly/`. Requirement numbers (`FR-`, `NFR-`) refer to the IEEE student requirements guide, which is not in this repo. Why each choice was made is in `DECISIONS.md`.

## 1. Purpose and users
- **R1.1** Residents of East Palestine, Ohio look up official water and soil test results from after the 2023 train derailment.
- **R1.2** Main users are residents on their own phones, including older and low-vision people. It also works on a library computer.
- **R1.3** The app answers only from official documents, cites every answer, and sends health, safety and legal questions to a person.

## 2. Hard rules (must never break)
- **R2.1 Safety gate first.** Every question is checked by the safety gate before anything else. Questions about safety, health effects, medical advice, personal risk, causation, the settlement or lawsuits, property value, opinions about agencies, or attempts to misuse the app are refused with a "who can help" card (8 categories). When in doubt, refuse. (FR-5, FR-8)
- **R2.2 No written health text.** Health text comes only from expert-approved ATSDR/IRIS fact cards, shown word for word. Until approved, every card says "Awaiting expert-approved ATSDR text." (FR-9)
- **R2.3 Every answer is cited** (title, agency, date, and link or binder location) and shows the date line. Anything that can't be cited is dropped. (FR-3, FR-4)
- **R2.4 Disagreements are shown.** When two agencies report different results for the same chemical, place and date, both are shown and flagged, and staff see the flag. (FR-11)
- **R2.5 Missing data is stated.** "We don't have data on…", including "no federal limit exists". (FR-12)
- **R2.6 Neutral wording.** No reassurance, no alarm, no red or green on numbers, no comments on agencies.
- **R2.7 Real and made-up data are never mixed.** Switching on the sample data hides all real data, and the staff page warns.
- **R2.8 Privacy.** No names, addresses or identifiers are stored. A question is never linked to a person. Only a random session ID and census-tract counts are kept. (FR-20, FR-21)
- **R2.9 Works offline.** No cloud services, analytics or downloaded fonts in the main app. (The optional AI helper in section 6 is the one exception and is demo only.)

## 3. Screens and flow
- **R3.1 Opening page:** red and cream page with the cardinal picture, the title "How's My Water?" and a "Let's go" button. It saves and sends nothing.
- **R3.2 Welcome page:** what the app can and can't answer (short lists), the disclaimer, and "I understand. Start." (FR-14)
- **R3.3 Question page:** topic buttons (Newest results, Tap water, Creeks, Wells, Soil, Chemicals, Words explained, Find the reports, Help me understand, Health, safety, or legal) plus a box to type a question.
- **R3.4 Answer page** (`#/answer`): results, sources (tap to open), the date line, "What these words mean", Print, Read aloud, Report a problem and Known Limitations. One "Back to questions" button. The phone's back gesture works too.
- **R3.5 Known Limitations page** (`#/limits`). (FR-15)
- **R3.6 Staff page** (`#/staff`): kill switch, emergency mode, "desk staffed", release-gate check, audit sample, report queue, disagreement list, help tickets. No password, on purpose. (FR-16, FR-17, FR-22, FR-24)
- **R3.7 Text size and read-aloud buttons** at the top of every page. High-contrast mode is black and yellow.
- **R3.8 "Done"** and 10 minutes with no touch clear the screen and settings for the next person.

## 4. How a question is answered
1. **Safety gate** (Tier 3): refuse and show the referral card.
2. **Word definitions:** "What does MCL mean?" uses the word list only.
3. **Help me understand** (Tier 2): a printable sheet to take to a librarian.
4. **Test results** (Tier 1): search by chemical, place, year and month.
   - "What is <chemical>?" shows that chemical's fact card, its federal limit and how many tests exist.
   - The newest result for each place comes first. Older ones are behind "Show history". "Latest", "right now" and "current" are understood.
   - With no chemical named, the main derailment chemicals come first (vinyl chloride, butyl acrylate, ethylhexyl acrylate, EGBE, dioxins) and the rest are counted.
   - More than 12 results show a one-line summary per chemical.
   - Federal limits are listed, but the app never compares a result to a limit.
5. **No match:** "We couldn't find that."

## 5. Data
- **R5.1 Real data:** the U.S. EPA East Palestine water sampling file (lab results through 2025-09-30): 3,943 results, 183 chemicals, 56 sampling points, Feb 2023 to Aug 2025. Rejected results are skipped. "J" shows as "estimated", "Prelim" as "preliminary".
- **R5.2 Made-up sample data** is in `data/sample-made-up.js` and is off by default.
- **R5.3 Not yet available:** census tracts (so "Near my street" is hidden with real data), soil data and other agencies' data are listed as not added yet.
- **R5.4 Record shape:** `docId, analyte, site, medium, tract, sampleDate, value, detected, detectionLimit, unit, agency`.
- **R5.5 Staleness:** a warning when a document is more than 90 days past its expected update. After 180 days with no refresh, only the document list is shown. (FR-18, FR-19)

## 6. Extra features (can be switched off in `features/config.js`)
- **R6.1 Did you mean?** fixes typos and offers big buttons for vague questions. Misspelled safety questions are still refused.
- **R6.2 AI helper (demo only):** if a typed question isn't understood, an AI picks one of the app's own known questions. It never writes answers, runs only after the safety gate, needs internet and a key, and is labeled on screen.
- **R6.3 Get help from a librarian:** gives a ticket number. No name is saved.
- **R6.4 Speak your question:** uses the browser's speech tools and reads the answer aloud.

## 7. Accessibility and wording
- **R7.1** Patron text at a 6th–8th grade reading level. (NFR-7)
- **R7.2** Large text and tap targets of at least 48px. (NFR-9)
- **R7.3** Chemical names stay as published.

## 8. Checks (must all pass before going live)
```bash
node user-friendly/test.js
node user-friendly/features/test-features.js
```
They cover: safety refusals at 100% and benchmark routing, fact cards, newest-first results, citations and date info on every answer, disagreement flags, "no data" answers, every topic button, streets, reading level, data files loaded, the opening page saving nothing, the same checks on the sample data, and the extra features.

## 9. Known gaps
- Fact cards, contact numbers and Known Limitations text are placeholders until the expert panel and library supply them.
- Only one agency's data is loaded, so no disagreements are flagged with real data yet.
- The benchmark has 8 questions, not the 200 real staff questions the guide asks for.
- The cardinal photo's source and rights need confirming before public use.
