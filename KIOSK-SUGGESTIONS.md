# Suggestions for a future kiosk version

Ideas that were taken out of the web app but would make sense if it is rebuilt as a library kiosk (one shared screen).

## "Done. Clear the screen for the next person" button
- **What it did:** one tap wiped the current visit (answers on screen, text size, high contrast, read-aloud) and went back to the opening page.
- **Why it was removed (2026-11-12):** on a personal phone it isn't needed, and it cluttered the question page.
- **Why a kiosk would want it back:** the next patron should never see the last person's questions. Privacy rules (ORC 149.432) also say a question must not be linked to a person.
- **Still in the app:** the 10-minute idle timer still clears the screen on its own. The code behind the button (`endSession()` in `user-friendly/app.js`, action `"done"`) is still there, so bringing it back is one line in `renderMain()`.
