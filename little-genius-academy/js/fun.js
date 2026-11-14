// Little Genius Academy — fun.js
// Everything that makes the child area feel alive:
//   • sparkle bursts and the feedback banner for correct answers
//   • confetti for finished lessons and games
//   • "Sparky", the friendly star mascot who cheers children on
//   • floating letters, numbers and stars in the child-area background
// All motion is skipped when the device asks for reduced motion.

window.LGA = window.LGA || {};

LGA.fun = (function () {
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const PRAISE = ["Awesome!", "Super!", "Great job!", "You got it!", "Fantastic!", "Brilliant!", "Wow!", "Yay!", "Well done!"];

  // ---------- sparkle burst around any element ----------
  function burst(target, count) {
    if (reduced() || !target) return;
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const n = count || 14;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.setAttribute("aria-hidden", "true");
      s.textContent = pick(["✨", "⭐", "🌟", "💫"]);
      const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 70;
      s.style.left = cx + "px"; s.style.top = cy + "px";
      s.style.setProperty("--dx", Math.cos(angle) * dist + "px");
      s.style.setProperty("--dy", Math.sin(angle) * dist + "px");
      document.body.append(s);
      setTimeout(() => s.remove(), 1000);
    }
  }

  // ---------- feedback banner ----------
  let bannerEl = null, bannerTimer = null;
  function banner(text) {
    if (!bannerEl) {
      bannerEl = document.createElement("div");
      bannerEl.className = "fun-banner";
      bannerEl.setAttribute("role", "status");
      bannerEl.setAttribute("aria-live", "polite");
      document.body.append(bannerEl);
    }
    bannerEl.textContent = text || pick(PRAISE);
    bannerEl.classList.remove("is-show");
    void bannerEl.offsetWidth;                 // restart the animation
    bannerEl.classList.add("is-show");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => bannerEl.classList.remove("is-show"), 1700);
  }

  // ---------- confetti rain ----------
  function confetti() {
    if (reduced()) return;
    for (let i = 0; i < 36; i++) {
      const c = document.createElement("span");
      c.className = "confetti";
      c.setAttribute("aria-hidden", "true");
      c.textContent = pick(["🎉", "⭐", "🎈", "✨", "🌟", "🎊"]);
      c.style.left = Math.random() * 100 + "vw";
      c.style.animationDuration = 2.2 + Math.random() * 2 + "s";
      c.style.animationDelay = Math.random() * 0.6 + "s";
      c.style.fontSize = 1.2 + Math.random() * 1.2 + "rem";
      document.body.append(c);
      setTimeout(() => c.remove(), 5000);
    }
  }

  // ---------- Sparky the star mascot (an original character) ----------
  const MOUTHS = {
    happy: '<path d="M42 60 Q50 68 58 60" fill="none" stroke="#26264a" stroke-width="3" stroke-linecap="round"/>',
    cheer: '<path d="M39 57 Q50 76 61 57 Z" fill="#c2185b" stroke="#26264a" stroke-width="3" stroke-linejoin="round"/>',
    oops:  '<path d="M43 67 Q50 60 57 67" fill="none" stroke="#26264a" stroke-width="3" stroke-linecap="round"/>'
  };
  function mascotSvg() {
    return '<svg viewBox="0 0 100 100" class="mascot__svg" aria-hidden="true" focusable="false">' +
      '<polygon points="50,6 62,36 94,38 69,58 78,90 50,72 22,90 31,58 6,38 38,36" fill="#ffd84a" stroke="#f5b700" stroke-width="6" stroke-linejoin="round"/>' +
      '<circle cx="42" cy="49" r="4.5" fill="#26264a"/><circle cx="58" cy="49" r="4.5" fill="#26264a"/>' +
      '<circle cx="43.5" cy="47.5" r="1.5" fill="#fff"/><circle cx="59.5" cy="47.5" r="1.5" fill="#fff"/>' +
      '<circle cx="34" cy="57" r="4" fill="#ff8a65" opacity=".6"/><circle cx="66" cy="57" r="4" fill="#ff8a65" opacity=".6"/>' +
      '<g class="mascot__mouth">' + MOUTHS.happy + '</g></svg>';
  }

  // Build a mascot inside "host". Returns { say(text), mood(name) }.
  function mascot(host, opts) {
    const wrap = document.createElement("div");
    wrap.className = "mascot" + (opts && opts.corner ? " mascot--corner" : "");
    wrap.innerHTML = '<div class="mascot__bubble" hidden></div>' + mascotSvg();   // constant markup only
    host.append(wrap);
    const bubble = wrap.querySelector(".mascot__bubble"), mouth = wrap.querySelector(".mascot__mouth");
    let bubbleTimer = null, moodTimer = null;
    function say(text, ms) {
      bubble.textContent = text; bubble.hidden = false;
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => { bubble.hidden = true; }, ms || 2600);
    }
    function mood(name) {
      mouth.innerHTML = MOUTHS[name] || MOUTHS.happy;
      wrap.classList.remove("is-cheer", "is-oops");
      void wrap.offsetWidth;
      if (name === "cheer") wrap.classList.add("is-cheer");
      if (name === "oops") wrap.classList.add("is-oops");
      clearTimeout(moodTimer);
      moodTimer = setTimeout(() => { mouth.innerHTML = MOUTHS.happy; wrap.classList.remove("is-cheer", "is-oops"); }, 1400);
    }
    return { say, mood };
  }

  // One small mascot in the corner of activity pages
  let corner = null;
  function cornerMascot() {
    if (!corner) corner = mascot(document.body, { corner: true });
    return corner;
  }

  // Correct answer: sparkle burst + banner + happy mascot
  function cheer(target, text) {
    burst(target);
    banner(text);
    cornerMascot().mood("cheer");
  }
  // Wrong answer: gentle, no banner
  function oops(text) {
    const m = cornerMascot();
    m.mood("oops"); m.say(text || "Try again!");
  }

  // ---------- floating background for child pages ----------
  function background() {
    if (!document.body.classList.contains("child-theme") || reduced()) return;
    const layer = document.createElement("div");
    layer.className = "fun-bg";
    layer.setAttribute("aria-hidden", "true");
    const bits = ["A", "B", "C", "1", "2", "3", "★", "✿", "♪", "☁", "☀", "♥"];
    const colors = ["#ff8a65", "#4cc3ff", "#9b7bff", "#5fdcb0", "#ffd84a", "#ec407a"];
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = bits[i % bits.length];
      s.style.left = (i * 7.3 + Math.random() * 6) % 96 + "%";
      s.style.top = Math.random() * 90 + "%";
      s.style.color = colors[i % colors.length];
      s.style.fontSize = 1.8 + Math.random() * 2.4 + "rem";
      s.style.animationDelay = -Math.random() * 8 + "s";
      s.style.animationDuration = 7 + Math.random() * 6 + "s";
      layer.append(s);
    }
    document.body.prepend(layer);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", background);
  else background();

  return { burst, banner, confetti, mascot, cornerMascot, cheer, oops, PRAISE };
})();
