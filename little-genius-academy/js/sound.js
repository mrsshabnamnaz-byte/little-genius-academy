// Little Genius Academy — sound.js
// Shared sound helper for games: spoken words + tiny happy/try-again tones.
// Everything is optional. If sound is off or not supported, the games still work
// because every message is also shown on screen.

window.LGA = window.LGA || {};

LGA.sound = (function () {
  let muted = false;
  try { muted = localStorage.getItem("lga-mute") === "1"; } catch (e) { /* ignore */ }
  let ctx = null;

  function setMuted(v) {
    muted = v;
    try { localStorage.setItem("lga-mute", v ? "1" : "0"); } catch (e) { /* ignore */ }
    if (v && window.speechSynthesis) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  }

  // ---------- choosing the nicest voice the device has ----------
  // Every phone/computer has different voices. We rank them: "natural/neural/online" and well-known
  // friendly voices first, robotic ones last. The grown-up can also pick a voice by hand.
  const RATES = { slow: 0.72, normal: 0.85 };
  let rateKey = "normal", voiceName = "auto";
  try {
    const r = localStorage.getItem("lga-rate"); if (RATES[r]) rateKey = r;
    voiceName = localStorage.getItem("lga-voice") || "auto";
  } catch (e) { /* ignore */ }

  function englishVoices() {
    try { return (window.speechSynthesis ? window.speechSynthesis.getVoices() : []).filter((v) => /^en([-_]|$)/i.test(v.lang)); }
    catch (e) { return []; }
  }
  function score(v) {
    const n = v.name || "";
    if (/espeak|compact|novelty|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|organ|trinoids|whisper|zarvox|albert|fred|junior|kathy|ralph|superstar|grandma|grandpa|rocko|eddy|flo\b|reed|sandy|shelley/i.test(n)) return -100;
    let sc = 0;
    if (/natural|neural|online|premium|enhanced/i.test(n)) sc += 60;
    if (/google (us|uk) english/i.test(n)) sc += 45;
    if (/samantha|karen|moira|serena|aria|jenny|ava\b|allison|zoe|siri|libby|sonia|catherine|susan|hazel|zira|michelle|emma|joanna|ivy|kendra|salli/i.test(n)) sc += 30;
    if (/^en[-_]US/i.test(v.lang)) sc += 6; else if (/^en[-_]GB/i.test(v.lang)) sc += 5; else if (/^en[-_](AU|IN|IE|ZA)/i.test(v.lang)) sc += 3;
    if (v.localService === false) sc += 4;     // cloud voices are usually smoother
    return sc;
  }
  function pickVoice() {
    const list = englishVoices();
    if (!list.length) return null;
    if (voiceName !== "auto") { const m = list.find((v) => v.name === voiceName); if (m) return m; }
    return list.slice().sort((a, b) => score(b) - score(a))[0];
  }
  function setVoice(name) {
    voiceName = name || "auto";
    try { localStorage.setItem("lga-voice", voiceName); } catch (e) { /* ignore */ }
  }
  function setRate(key) {
    if (!RATES[key]) return; rateKey = key;
    try { localStorage.setItem("lga-rate", key); } catch (e) { /* ignore */ }
  }
  function makeUtterance(part) {
    const u = new SpeechSynthesisUtterance(part);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-US";
    u.rate = RATES[rateKey]; u.pitch = 1.05;
    return u;
  }

  // speak("text") or speak(["a", "b"]); queue = wait for speech already playing
  function speak(text, queue) {
    try {
      if (muted || !("speechSynthesis" in window)) return;
      if (!queue) window.speechSynthesis.cancel();
      (Array.isArray(text) ? text : [text]).forEach((part) => window.speechSynthesis.speak(makeUtterance(part)));
    } catch (e) { /* ignore */ }
  }

  // Read a text slowly, one sentence at a time (small pauses), and tell us which word is being said
  // so the book can highlight it. onWord(i) gets the word number, onEnd() fires once at the very end.
  // Returns { cancel() }. If the device cannot tell us word positions, we estimate them with a timer.
  function speakWords(text, onWord, onEnd) {
    const words = text.split(/\s+/).filter(Boolean);
    let stopped = false, timers = [];
    const stop = () => { stopped = true; timers.forEach(clearTimeout); timers = []; };
    const finish = () => { if (!stopped) { stopped = true; timers.forEach(clearTimeout); if (onEnd) onEnd(); } };
    if (muted || !("speechSynthesis" in window) || !words.length) { setTimeout(finish, 0); return { cancel: stop }; }
    try {
      window.speechSynthesis.cancel();
      // chunks = lines/sentences, each remembers the number of the first word in it
      const chunks = []; let n = 0;
      (text.match(/[^.!?\n]+[.!?]*/g) || [text]).map((t) => t.trim()).filter(Boolean).forEach((t) => {
        chunks.push({ t, first: n }); n += t.split(/\s+/).filter(Boolean).length;
      });
      chunks.forEach((c, ci) => {
        const u = makeUtterance(c.t); let gotBoundary = false;
        const perWord = 60000 / (150 * u.rate);
        u.onstart = () => {
          if (stopped) return;
          if (onWord) onWord(c.first);
          // timer fallback until the first real "boundary" event arrives
          const cnt = c.t.split(/\s+/).filter(Boolean).length;
          for (let k = 1; k < cnt; k++) timers.push(setTimeout(() => { if (!gotBoundary && !stopped && onWord) onWord(c.first + k); }, k * perWord));
        };
        u.onboundary = (e) => {
          if (stopped || (e.name && e.name !== "word")) return;
          gotBoundary = true;
          const before = c.t.slice(0, e.charIndex).split(/\s+/).filter(Boolean).length;
          if (onWord) onWord(c.first + before);
        };
        u.onend = () => { if (ci === chunks.length - 1) finish(); };
        u.onerror = () => { if (ci === chunks.length - 1) finish(); };
        window.speechSynthesis.speak(u);
      });
    } catch (e) { setTimeout(finish, 0); }
    return { cancel: () => { stop(); try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } } };
  }

  // Play a few short notes. good = rising happy notes, otherwise one soft low note.
  function tone(good) {
    try {
      if (muted) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = ctx || new AC();
      const notes = good ? [523, 659, 784] : [220];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "sine"; o.frequency.value = f;
        const t = ctx.currentTime + i * 0.12;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.3);
      });
    } catch (e) { /* ignore */ }
  }

  // Wire a 🔊/🔇 button
  function bindButton(btn) {
    if (!btn) return;
    const paint = () => {
      btn.textContent = muted ? "🔇" : "🔊";
      btn.setAttribute("aria-pressed", String(!muted));
      btn.setAttribute("aria-label", muted ? "Sound is off. Turn sound on" : "Sound is on. Turn sound off");
    };
    btn.addEventListener("click", () => { setMuted(!muted); paint(); });
    paint();
  }

  return {
    speak, speakWords, tone, bindButton, isMuted: () => muted,
    englishVoices, pickVoice, setVoice, setRate, getRate: () => rateKey, getVoiceName: () => voiceName
  };
})();
