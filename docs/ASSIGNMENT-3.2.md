# Project 3.2: Feature/scenario implementation

## 1. Summary of the feature set (20%)
**Scenario:** an older resident walks up to the library kiosk without knowing the "right" words. They misspell a chemical name, ask something vague, would rather talk than type, or simply need a person. The kiosk still gets them to a correct, cited answer, or to a librarian.

I added four features to the user-friendly kiosk:
1. **"Did you mean?"** fixes typos ("vinly cloride" → "vinyl chloride") and answers vague questions with big choice buttons ("Which do you mean? Tap water / Creek / Well / Soil"). It also closes a safety gap: misspelled safety questions such as "is it saef to drink" are still refused.
2. **Ask in your own words (AI helper).** When the rules don't understand a question, Claude maps it to one of the kiosk's known, tested questions ("what's going on with the creek lately" → "latest results for Sulphur Run"). The AI never writes answers. The safety gate runs before it, and the screen says that an AI helped.
3. **Get help from a librarian.** A ticket number is shown to the resident (and can be printed), and a matching queue appears on the staff page so the librarian can mark it done. No names are saved.
4. **Speak your question.** The resident speaks their question and the answer is read aloud automatically.

I also tightened the safety gate so "Is the water ok?" is now refused.

Each feature can be turned off in one file (`features/config.js`), and all of them can be removed by deleting one folder and the lines marked EXTRA FEATURES in `index.html`.

## 2. Repo URL (10%)
https://github.com/subedinia29/water-data-kiosk (private; drchangliu invited as a collaborator)
Code: branch `feature/kiosk-extras`, folder `user-friendly/features/`.

## 3. Prompts (10%)
- "Implement at least one meaningful end-to-end scenario for a live demo. Offer me a few feature options and let me pick before you build. Show me a working demo before you push. Make the changes easy to remove later."
- The LLM offered four options (AI helper, "Did you mean?", librarian ticket, voice). My answer: "Implement all and give me text that explains the new features."
- Earlier prompts in this project built the kiosk and the user-friendly version, and asked for screenshots and the write-ups.

## 4. Screenshots (20%)
See `docs/screenshots-3.2/`:
1. "Did you mean?" for a misspelled chemical
2. A misspelled safety question, still refused
3. "Which do you mean?" for a vague question
4. The AI helper's understood question, plus the kiosk's cited answer
5. A safety question flagged by the AI, showing the referral card
6. The AI helper mapping "my faucet" to tap water
7. The "Speak your question" button
8. A help ticket number
9. The staff ticket queue

## 5. Next steps (20%)
Next, I will test the AI helper with a real API key on many messy, everyday questions, and measure how often it picks the right question and how often it wrongly answers a safety question (the target is zero). I will grow the "Did you mean?" word list from how residents actually describe places and chemicals. I will replace the cloud AI with a local open-weight model on the kiosk computer, so nothing leaves the library and it works without internet, keeping the same "pick a known question only" design behind the safety gate. Then I will make voice input work offline, and add a printed ticket slip and a "now serving" display for the help desk. Finally, I will add every new question type to the automatic tests, so the safety refusal rate stays at 100%.

## 6. LLM used and reflection (20%)
I used Claude (Claude Opus 5.5) through Claude Code to plan, write, test and screenshot the features. The AI helper inside the kiosk is also built to use Claude Opus 5.5.

It met my expectations. It offered sensible feature options, built all four in one session, kept the project's safety rules, and wrote automatic tests and a plain-language guide. It also found and fixed problems while testing:
- the safety gate didn't refuse "is the water ok?"
- the typo fixer changed "the water" into "tap water"
- when the AI found no match, the kiosk showed an unrelated answer

These show that LLM-written code still needs careful testing. A limitation: in this stage the AI helper was tested with a stand-in that returns fixed answers, not with live Claude calls, so real-world accuracy is still unmeasured. Voice input also depends on the browser.
