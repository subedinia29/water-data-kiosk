# Decisions log

A running record of which requirements from the IEEE requirements guide are kept, simplified or left out. Each entry that is not fully kept explains what adding it later would involve.

Last updated: 2026-11-03

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
