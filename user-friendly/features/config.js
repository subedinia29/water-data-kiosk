// EXTRA FEATURES (Project 3.2) — on/off switches.
// Set any of these to false to turn that feature off. Nothing else needs to change.
// To remove all extra features: delete the "EXTRA FEATURES" lines in ../index.html and this folder.
const KIOSK_FEATURES = {
  didYouMean: true,   // Fixes typos and asks "Which do you mean?" for vague questions. Offline.
  helpTicket: true,   // "Get help from a librarian" ticket + staff queue. Offline.
  voice: true,        // "Speak your question" button + answer read aloud. Uses the browser's speech tools.
  ownWords: true,     // AI helper (Claude) understands questions in everyday words. Needs ai-helper.py running.
  aiHelperUrl: "http://localhost:8766/interpret"
};
