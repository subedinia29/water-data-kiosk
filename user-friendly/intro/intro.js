// VERSION 2 OPENING SCREEN: one welcome page with the cardinals.
// It comes BEFORE the normal Welcome page. The Welcome page (what the app can and
// cannot tell you, the disclaimer, and "I understand. Start.") is still always shown.
// To turn it off: set on to false below. To remove it: delete the
// "OPENING SCREENS" lines in ../index.html and this folder.
// (A "What's your name?" page was tried and removed at the owner's request.)
const INTRO_CONFIG = {
  on: true,
  appName: "How's My Water"
};

const Intro = {
  step: 0,          // 0 opening page, 1 finished
  enabled() { return INTRO_CONFIG.on; },
  pending() { return INTRO_CONFIG.on && this.step < 1; },
  reset() { this.step = 0; },

  render(app, esc) {
    document.body.dataset.intro = String(this.step);
    app.innerHTML = `<section class="intro intro-hello" aria-labelledby="intro-h">
      <h1 id="intro-h" class="intro-title">${esc(INTRO_CONFIG.appName)}?</h1>
      <p class="intro-lead">Simple answers about water tests in East Palestine.</p>
      <div class="intro-peek">${mascotArt("mascot intro-fade")}</div>
      <div class="intro-actions">
        <button type="button" class="btn primary" data-intro="next">Let's go</button>
      </div>
      <p class="intro-note">This app shows test results only. It is not medical or safety advice.</p>
    </section>`;
  },

  // Returns true when the intro handled the click.
  click(el) {
    if (!el.dataset.intro || el.tagName === "BODY") return false;  // body's data-intro only sets the page look
    this.step = 1;
    return true;
  },
  finish() { delete document.body.dataset.intro; }
};

if (typeof module !== "undefined") module.exports = { Intro, INTRO_CONFIG };
