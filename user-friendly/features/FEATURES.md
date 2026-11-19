# Extra features (Project 3.2)

Four new features that help residents who don't know the "right" words, can't type well, or need a person.

## The features

**1. "Did you mean?" (offline)**
- Fixes spelling mistakes. Typing "what is vinly cloride" gives *Did you mean "what is vinyl chloride"?* with **Yes** and **No** buttons.
- Vague questions like "show me the water numbers" get **"Which do you mean?"** with big buttons: Tap water, Sulphur Run, Leslie Run, Private wells, Soil, or All the newest results.
- **Safety:** misspelled safety questions are still refused. "is it saef to drink" is read as "is it safe to drink", and the web app shows the "A person can help with this" card.

**2. Ask in your own words (AI helper, demo only)**
- When the web app doesn't understand a typed question, it asks Claude (Anthropic's AI) which of the web app's own known questions means the same thing. For example, "what's going on with the creek lately" becomes "What are the latest results for Sulphur Run?".
- **The AI never writes answers.** It only picks a question from the web app's list, and the normal cited answer is shown. The screen says plainly that an AI helped, and offers a **That's not what I meant** button.
- Safety questions are refused by the web app's own safety gate *before* the AI is asked. If the AI thinks a question is about safety or health, the web app shows the referral card.
- **Needs internet and an API key.** If the helper isn't running, the web app skips this step and works as before.

**3. Get help from a librarian (offline)**
- A **Get help from a librarian** button appears on every screen. It gives the resident a big ticket number to show at the desk (and to print), and saves no name.
- On the staff page, librarians see a **Help tickets** list with each question, and can mark tickets done.
- If the desk isn't staffed, the button says so instead of giving a number.

**4. Speak your question**
- A **Speak your question** button sits next to the typing box. The resident talks, the question is answered, and the answer is **read aloud automatically**.
- It uses the browser's built-in speech tools and works best in Chrome and Edge. Chrome may send the voice audio to Google to turn it into text. The button doesn't appear in browsers that can't do this.

## Demo in class
1. From the project folder, start the web app:
   ```bash
   python3 -m http.server 8765
   ```
   Then open `http://localhost:8765/user-friendly/`.
2. Optional, for the AI helper: in a second Terminal window, run:
   ```bash
   pip install anthropic
   export ANTHROPIC_API_KEY=your-key-here
   python3 user-friendly/features/ai-helper.py
   ```
3. Try these, typed into "Or type your own question":
   - `what is vinly cloride`: Did you mean?
   - `is it saef to drink the well water`: safety refusal, even with the typo
   - `show me the water numbers`: Which do you mean?
   - `what's going on with the creek lately`: AI helper (needs step 2)
   - Tap **Speak your question** and say "What are the latest soil results?"
   - Tap **Get help from a librarian**, then open `#/staff` to see the ticket

## Turn features on or off
Open `features/config.js` and change any `true` to `false`. Nothing else needs to change.

## Remove all of it
1. In `user-friendly/index.html`, delete the lines marked **EXTRA FEATURES**: one stylesheet line near the top, and the comment plus 3 script lines at the bottom.
2. Delete the `user-friendly/features/` folder.

The web app then works exactly as before. This was tested.

## Checks
```bash
node user-friendly/features/test-features.js
```
```bash
node user-friendly/test.js
```
Both must end with "passed".
