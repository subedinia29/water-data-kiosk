// VERSION 2 OPENING SCREENS: splash, hello, and "What's your name?".
// They come BEFORE the normal Welcome page. The Welcome page (what the app can and
// cannot tell you, the disclaimer, and "I understand. Start.") is still always shown.
// To turn these screens off: set on to false below. To remove them: delete the
// "OPENING SCREENS" lines in ../index.html and this folder.
const INTRO_CONFIG = {
  on: true,
  appName: "How's My Water",
  mascotName: "Ruby",       // the cardinal's name
  askName: true             // false skips the "What's your name?" screen
};

// The typed name lives only in this variable for the current visit.
// It is never saved to the browser, never logged, and never sent anywhere.
// "Done" and the 10-minute privacy timer clear it.
const Intro = {
  step: 0,          // 0 splash, 1 hello, 2 name, 3 finished
  name: "",
  enabled() { return INTRO_CONFIG.on; },
  pending() { return INTRO_CONFIG.on && this.step < 3; },
  reset() { this.step = 0; this.name = ""; },
  greeting() { return this.name ? `Nice to meet you, ${this.name}!` : ""; },

  render(app, esc) {
    const C = INTRO_CONFIG;
    const name = esc(C.appName), bird = esc(C.mascotName);
    const readBtn = `<button type="button" class="btn intro-read" data-action="speak">Read aloud</button>`;
    const note = `<p class="intro-note">This app shows test results only. It is not medical or safety advice.</p>`;
    document.body.dataset.intro = String(this.step);

    if (this.step === 0) {
      app.innerHTML = `<section class="intro intro-splash" aria-labelledby="intro-h">
        <div class="intro-face">${mascotArt("mascot")}</div>
        <h1 id="intro-h" class="intro-title">${name}</h1>
        <button type="button" class="btn intro-go" data-intro="next">Tap to begin</button>
      </section>`;
    } else if (this.step === 1) {
      app.innerHTML = `<section class="intro intro-hello" aria-labelledby="intro-h">
        <h1 id="intro-h" class="intro-title">${name}</h1>
        <p class="intro-lead">Simple answers about water tests in East Palestine.</p>
        <div class="row intro-actions">
          <button type="button" class="btn primary wide" data-intro="next">Let's go</button>
          ${readBtn}
        </div>
        ${note}
        <div class="intro-peek">${mascotArt("mascot")}</div>
      </section>`;
    } else {
      app.innerHTML = `<section class="intro intro-name" aria-labelledby="intro-h">
        <div class="intro-bubble-wrap">
          ${mascotArt("mascot mascot-small")}
          <h1 id="intro-h" class="intro-bubble">Hi! I'm ${bird}.<br>What's your name?</h1>
        </div>
        <form id="intro-form" class="intro-form" autocomplete="off">
          <label for="intro-name">Your first name (you can skip this)</label>
          <input id="intro-name" name="intro-name" type="text" maxlength="30"
            autocomplete="off" autocapitalize="words" spellcheck="false" value="${esc(this.name)}">
          <p class="intro-hint">We only use it to say hello. We do not save it.</p>
          <button type="submit" class="btn primary wide">Continue</button>
          <button type="button" class="btn wide" data-intro="skip">Skip</button>
          ${readBtn}
        </form>
        ${note}
      </section>`;
    }
  },

  // Returns true when the intro handled the click.
  click(el) {
    if (!el.dataset.intro) return false;
    if (el.dataset.intro === "skip") { this.name = ""; this.step = 3; }
    else this.next();
    return true;
  },
  submit(form) {
    const box = form.querySelector("#intro-name");
    this.name = (box.value || "").replace(/[^\p{L}\p{M}' .-]/gu, "").trim().slice(0, 30);
    box.value = "";
    this.step = 3;
  },
  next() {
    this.step++;
    if (this.step === 2 && !INTRO_CONFIG.askName) this.step = 3;
  },
  finish() { delete document.body.dataset.intro; }
};

if (typeof module !== "undefined") module.exports = { Intro, INTRO_CONFIG };
