// Little Genius Academy — stories.js
// Storybook reader for "Stories and Rhymes".
// Lessons live in the database: content = { kind: "story"|"rhyme", pages: [{ emoji, text }] }.
// This file adds: an opening book cover, a painted picture page for every page (scene + characters),
// a page-turn animation, word-by-word highlighting while the story is read aloud, and a better voice
// (it picks the best English voice on the device; a button lets the child/parent change it).
// Finishing a story saves progress in child_progress.

(async function () {
  const who = await LGA.requireChild();
  if (!who) return;
  const { child } = who;
  const db = window.lgaDb;
  const out = LGA.$("#page-msg");
  const badge = LGA.$("#child-badge");
  if (badge) badge.textContent = LGA.avatar(child.avatar_key) + " " + child.nickname;
  LGA.sound.bindButton(LGA.$("#sound-btn"));

  const list = LGA.$("#story-list"), view = LGA.$("#story-view"), reward = LGA.$("#reward");
  const cover = LGA.$("#cover"), spread = LGA.$("#spread"), paper = LGA.$("#paper"), scene = LGA.$("#scene");
  const nav = LGA.$("#book-nav"), tools = LGA.$("#book-tools"), dots = LGA.$("#dots"), textEl = LGA.$("#book-text");
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  let lessons = [], progress = {}, current = null, pages = [], idx = 0, startedAt = 0, finishing = false, opened = false;

  // ======================= The pictures: a scene + characters for each page =======================
  // theme: day | rain | night | pond.  cast: the characters standing in the scene.
  const ART = {
    "Twinkle, Twinkle, Little Star": [["night", ["⭐"]], ["night", ["🌙"]], ["night", ["🌟"]]],
    "Baa, Baa, Black Sheep":        [["day", ["🐑"]], ["day", ["🐑", "🧶"]], ["day", ["🧺", "🐑"]], ["day", ["👦", "🏡"]]],
    "Humpty Dumpty":                [["day", ["🥚", "🧱"]], ["day", ["👑", "🐴"]], ["day", ["🥚", "🧩"]]],
    "Little Raindrop":              [["day", ["☁️", "💧"]], ["rain", ["☂️", "💧"]], ["day", ["🌈"]]],
    "Sleepy Moon":                  [["night", ["🌙"]], ["night", ["🧸", "⭐"]], ["night", ["😴", "🌙"]]],
    "Sunny the Little Duck":        [["day", ["🐥"]], ["rain", ["🐥"]], ["pond", ["🐥", "💦"]], ["pond", ["🐸", "🐥"]], ["day", ["🐥", "💛", "🐸"]]],
    "The Red Balloon":              [["day", ["👧", "🎈"]], ["day", ["🎈", "🌬️"]], ["day", ["👧"]], ["day", ["🐦", "☁️"]], ["day", ["👧", "🎈"]]],
    "The Kind Little Cat":          [["day", ["🐱", "🥛"]], ["day", ["🐶"]], ["day", ["🐱", "🐶"]], ["day", ["🐱", "🥛", "🐶"]], ["day", ["🐱", "💖", "🐶"]]]
  };
  const BOUNCY = new Set(["🐥", "🐱", "🐶", "🐸", "🐑", "🐦", "🐴", "👦", "👧", "🧸"]);
  const FLOATY = new Set(["🎈", "☁️", "🌟", "⭐", "🌙", "💖", "💛", "🌈", "🌬️", "💧", "💦", "😴", "☂️"]);

  function artFor(page) {
    const set = current && ART[current.title];
    const a = set && set[idx];
    return a ? { theme: a[0], cast: a[1] } : { theme: "day", cast: [page.emoji || "📖"] };
  }

  // the decorations never change, so build them once per theme change (constant markup, no user text)
  function drawScene(theme, cast) {
    const art = current && window.LGA.storyArt ? LGA.storyArt.scene(current.title, idx) : null;
    if (art) {                                           // our own drawn picture (constant markup, no user text)
      scene.className = "scene scene--art is-new";
      scene.innerHTML = art;
      return;
    }
    const stars = Array.from({ length: 12 }, (_, i) =>
      '<span class="sc-star" style="left:' + ((i * 8.3 + (i % 3) * 3) % 92) + '%;top:' + ((i * 17) % 55 + 4) + '%;animation-delay:-' + (i * 0.37).toFixed(2) + 's">✦</span>').join("");
    const drops = Array.from({ length: 16 }, (_, i) =>
      '<span class="sc-drop" style="left:' + (i * 6.2 + 2) + '%;animation-delay:-' + ((i * 0.13) % 0.9).toFixed(2) + 's"></span>').join("");
    scene.className = "scene scene--" + theme + " is-new";
    scene.innerHTML =
      '<div class="sc-sun"></div><div class="sc-moon"></div>' + stars +
      '<div class="sc-cloud c1"></div><div class="sc-cloud c2"></div>' + drops +
      '<div class="sc-hill h1"></div><div class="sc-hill h2"></div><div class="sc-pond"></div>' +
      '<div class="sc-flowers">🌼🌷🌸🌼🌷</div><div class="cast cast--' + Math.min(cast.length, 3) + '"></div>';
    const box = scene.querySelector(".cast");
    cast.forEach((e) => {
      const s = document.createElement("span");
      s.className = "actor " + (BOUNCY.has(e) ? "is-bounce" : FLOATY.has(e) ? "is-float" : "is-sway");
      s.textContent = e;
      box.append(s);
    });
  }

  // ======================= Voice (the best English voice on this device) =======================
  const Voice = (function () {
    let voices = [], chosen = null;
    const NICE = /natural|neural|online|enhanced|premium|samantha|karen|daniel|serena|moira|tessa|aria|jenny|libby|sonia|google us english|google uk english|zira|catherine/i;
    const ROBOT = /espeak|compact|fred|albert|bad news|bubbles|cellos|deranged|whisper|zarvox|trinoids|boing|bells|organ|junior|ralph|kathy/i;
    function score(v) {
      let s = 0;
      if (NICE.test(v.name)) s += 6;
      if (/google/i.test(v.name)) s += 2;
      if (ROBOT.test(v.name)) s -= 8;
      if (/^en[-_]US/i.test(v.lang)) s += 2; else if (/^en[-_](GB|AU|IE|ZA|IN)/i.test(v.lang)) s += 1;
      if (!v.localService) s += 1;      // online voices are usually smoother
      return s;
    }
    function refresh() {
      try {
        const all = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
        voices = all.filter((v) => /^en/i.test(v.lang)).sort((a, b) => score(b) - score(a)).slice(0, 8);
      } catch (e) { voices = []; }
      const saved = store.get("lga-voice");
      chosen = voices.find((v) => v.name === saved) || voices[0] || null;
    }
    function next() {
      if (voices.length < 2) return chosen;
      const i = Math.max(0, voices.indexOf(chosen));
      chosen = voices[(i + 1) % voices.length];
      store.set("lga-voice", chosen.name);
      return chosen;
    }
    refresh();
    try { if (window.speechSynthesis) window.speechSynthesis.addEventListener("voiceschanged", refresh); } catch (e) { /* ignore */ }
    return { get: () => chosen, next, count: () => voices.length, refresh,
             label: () => (chosen ? chosen.name.replace(/^(Microsoft|Google)\s+/i, "").replace(/\s*\(.*\)/, "").slice(0, 22) : "Default") };
  })();

  // ---- Optional recorded voice ----
  // If a real voice recording exists for a page, it is played instead of the computer voice.
  // See assets/audio/stories/README.txt for how to add recordings.
  let clips = {}, audioEl = null;
  const slug = (t) => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  fetch(LGA.url("assets/audio/stories/manifest.json")).then((r) => (r.ok ? r.json() : {})).then((j) => { if (j && typeof j === "object") clips = j; }).catch(() => { /* no recordings: fine */ });
  const clipFor = () => {
    const list = current && clips[slug(current.title)];
    return Array.isArray(list) && list.indexOf(idx + 1) !== -1 ? LGA.url("assets/audio/stories/" + slug(current.title) + "/" + (idx + 1) + ".mp3") : null;
  };

  let slow = store.get("lga-story-slow") === "1";
  const rate = () => (slow ? 0.68 : 0.85);

  // ======================= Reading aloud + word highlighting =======================
  // Text is split into words (spans). It is spoken one sentence/line at a time with a short pause between,
  // and the word being read is highlighted. Where the browser reports word boundaries we use them;
  // otherwise a timer moves the highlight at reading speed.
  let wordEls = [], chunks = [], narrationId = 0, timers = [];
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };
  function later(fn, ms) { const t = setTimeout(fn, ms); timers.push(t); return t; }

  function buildText(text) {
    textEl.replaceChildren(); wordEls = []; chunks = [];
    String(text).split("\n").forEach((line) => {
      const lineEl = document.createElement("span"); lineEl.className = "line";
      const sentences = line.match(/[^.!?]+[.!?"”]*\s*/g) || [line];
      sentences.forEach((sentence) => {
        const first = wordEls.length;
        const toks = sentence.trim().split(/\s+/).filter(Boolean);
        toks.forEach((tok, k) => {
          const w = document.createElement("span"); w.className = "w"; w.textContent = tok;
          lineEl.append(w); if (k < toks.length - 1) lineEl.append(" "); wordEls.push(w);
        });
        if (toks.length) { lineEl.append(" "); chunks.push({ text: sentence.trim(), first, n: toks.length }); }
      });
      textEl.append(lineEl);
    });
  }

  function setOn(i) {
    wordEls.forEach((w, k) => w.classList.toggle("is-on", k === i));
  }
  function stopReading() {
    narrationId++; clearTimers(); setOn(-1);
    if (audioEl) { try { audioEl.pause(); } catch (e) { /* ignore */ } audioEl = null; }
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
  }

  // play a recorded voice and move the highlight along with it
  function playClip(url) {
    const my = narrationId;
    const weights = wordEls.map((w) => w.textContent.length + 2);
    const total = weights.reduce((a, b) => a + b, 0);
    let a;
    try { a = new Audio(url); } catch (e) { return; }
    audioEl = a; a.playbackRate = slow ? 0.85 : 1;
    a.addEventListener("timeupdate", () => {
      if (my !== narrationId || !a.duration) return;
      const target = (a.currentTime / a.duration) * total;
      let acc = 0, k = 0; while (k < weights.length - 1 && acc + weights[k] < target) { acc += weights[k]; k++; }
      setOn(k);
    });
    a.addEventListener("ended", () => { if (my === narrationId) setOn(-1); });
    a.addEventListener("error", () => { if (my === narrationId) { clips = {}; readPage(); } });   // recording missing: use the computer voice
    a.play().catch(() => { /* blocked until the child taps: the Read button will work */ });
  }

  function readPage() {
    stopReading();
    if (LGA.sound.isMuted()) { LGA.fun.cornerMascot().say("Sound is off. Tap 🔇 to turn it on.", 2800); return; }
    const url = clipFor();
    if (url && wordEls.length) { playClip(url); return; }
    if (!("speechSynthesis" in window) || !chunks.length) return;
    const my = ++narrationId;
    const perWord = 430 / (rate() / 0.85);          // ms per word, used when the browser gives no timing

    function speakChunk(i) {
      if (my !== narrationId) return;
      if (i >= chunks.length) { setOn(-1); return; }
      const c = chunks[i];
      let finished = false, gotBoundary = false;
      const done = () => {
        if (finished || my !== narrationId) return;
        finished = true; clearTimers();
        later(() => speakChunk(i + 1), 320);          // a small breath between lines
      };
      setOn(c.first);
      try {
        const u = new SpeechSynthesisUtterance(c.text);
        u.lang = "en-US"; u.rate = rate(); u.pitch = 1.08; u.volume = 1;
        const v = Voice.get(); if (v) { u.voice = v; u.lang = v.lang; }
        u.onboundary = (e) => {
          if (my !== narrationId || (e.name && e.name !== "word")) return;
          gotBoundary = true;
          const before = c.text.slice(0, e.charIndex || 0).trim();
          setOn(c.first + (before ? before.split(/\s+/).length : 0));
        };
        u.onend = done; u.onerror = done;
        window.speechSynthesis.speak(u);
      } catch (e) { done(); return; }
      // Fallback highlighter if no word timing arrives
      later(() => {
        if (gotBoundary || finished || my !== narrationId) return;
        let k = 1;
        const step = () => {
          if (gotBoundary || finished || my !== narrationId || k >= c.n) return;
          setOn(c.first + k); k++; later(step, perWord);
        };
        later(step, perWord * 0.6);
      }, 450);
      // Safety: some browsers never fire "end"
      later(done, c.n * perWord + 3500);
    }
    speakChunk(0);
  }

  // ======================= Lessons list =======================
  async function load() {
    const { data: subject, error: e1 } = await db.from("subjects").select("id").eq("name", "Stories and Rhymes").maybeSingle();
    if (e1) throw e1;
    if (!subject) { lessons = []; progress = {}; return; }   // stories not added to the database yet: show "No stories yet"
    const [l, p] = await Promise.all([
      db.from("lessons").select("id, title, description, instructions, content, sort_order")
        .eq("subject_id", subject.id).order("sort_order", { ascending: true }),
      db.from("child_progress").select("id, lesson_id, status, score, attempts, time_spent_seconds").eq("child_id", child.id)
    ]);
    if (l.error) throw l.error;
    if (p.error) throw p.error;
    lessons = l.data; progress = {};
    p.data.forEach((r) => { progress[r.lesson_id] = r; });
  }

  function renderList() {
    list.replaceChildren();
    if (!lessons.length) {
      const e = document.createElement("p"); e.className = "muted"; e.textContent = "No stories here yet. Please check back soon!";
      list.append(e); return;
    }
    lessons.forEach((les) => {
      const st = progress[les.id] ? progress[les.id].status : "new";
      const kind = les.content && les.content.kind === "rhyme" ? "rhyme" : "story";
      const b = document.createElement("button");
      b.type = "button"; b.className = "lesson-card";
      b.innerHTML = '<span class="lesson-card__star" aria-hidden="true"></span><strong></strong><span class="muted desc"></span><span class="lesson-card__status"></span>';
      b.querySelector(".lesson-card__star").textContent = st === "completed" ? "⭐" : (kind === "rhyme" ? "🎵" : "📖");
      b.querySelector("strong").textContent = les.title;
      b.querySelector(".desc").textContent = (kind === "rhyme" ? "Rhyme · " : "Story · ") + (les.description || "");
      b.querySelector(".lesson-card__status").textContent = st === "completed" ? "Done! Read again" : st === "in_progress" ? "Keep going" : "Start";
      b.addEventListener("click", () => open(les));
      list.append(b);
    });
  }

  // ======================= The book =======================
  function paintTools() {
    LGA.$("#voice-btn").textContent = "🎤 Voice: " + Voice.label();
    LGA.$("#voice-btn").hidden = Voice.count() < 2;
    const sp = LGA.$("#speed-btn");
    sp.textContent = slow ? "🐢 Slow" : "🐇 Normal speed";
    sp.setAttribute("aria-pressed", String(slow));
  }

  function paintDots() {
    dots.replaceChildren();
    pages.forEach((_, i) => {
      const d = document.createElement("span");
      d.className = i === idx ? "is-here" : i < idx ? "is-past" : "";
      dots.append(d);
    });
  }

  function fillPage(speak) {
    const pg = pages[idx], art = artFor(pg);
    drawScene(art.theme, art.cast);
    buildText(pg.text);                                  // spans built with textContent: page text is never HTML
    LGA.$("#book-count").textContent = "Page " + (idx + 1) + " of " + pages.length;
    LGA.$("#book-prev").disabled = idx === 0;
    LGA.$("#book-next").textContent = idx === pages.length - 1 ? "The end ⭐" : "Next →";
    paintDots();
    if (speak) later(readPage, 250);
  }

  // dir: "next" | "prev" | undefined (no turn animation)
  function showPage(speak, dir) {
    stopReading();
    if (!dir || reduced()) { fillPage(speak); return; }
    paper.className = "paper is-out-" + dir;
    later(() => {
      fillPage(speak);
      paper.className = "paper is-in-" + dir;
      later(() => { paper.className = "paper"; }, 340);
    }, 270);
  }

  async function saveProgress(status, score, seconds) {
    const old = progress[current.id];
    const row = {
      child_id: child.id, lesson_id: current.id,
      status: old && old.status === "completed" ? "completed" : status,
      score: Math.max(score, old ? old.score : 0),
      attempts: (old ? old.attempts : 0) + (status === "completed" || !old ? 1 : 0),
      time_spent_seconds: (old ? old.time_spent_seconds : 0) + seconds
    };
    if (status === "completed") row.completed_at = new Date().toISOString();
    const res = old ? await db.from("child_progress").update(row).eq("id", old.id) : await db.from("child_progress").insert(row);
    if (res.error) { LGA.msg(out, "We could not save your progress. Please try again later."); return; }
    const { data } = await db.from("child_progress").select("id, lesson_id, status, score, attempts, time_spent_seconds")
      .eq("child_id", child.id).eq("lesson_id", current.id).maybeSingle();
    if (data) progress[current.id] = data;
  }

  async function open(les) {
    const raw = les.content && Array.isArray(les.content.pages) ? les.content.pages : [];
    pages = raw.filter((p) => p && typeof p.text === "string");
    if (!pages.length) { LGA.msg(out, "This story is not ready yet."); return; }
    current = les; idx = 0; startedAt = Date.now(); opened = false;
    stopReading();
    // the closed book (cover)
    const kind = les.content && les.content.kind === "rhyme" ? "rhyme" : "story";
    cover.dataset.kind = kind;
    cover.className = "cover";
    LGA.$("#story-title").textContent = les.title;
    const coverArt = window.LGA.storyArt ? LGA.storyArt.scene(les.title, 0) : null;
    if (coverArt) LGA.$("#cover-emoji").innerHTML = coverArt;      // our own drawing
    else LGA.$("#cover-emoji").textContent = (pages[0] && pages[0].emoji) || "📖";
    LGA.$("#cover-kind").textContent = kind === "rhyme" ? "A rhyme to sing" : "A story to read";
    // the first page is already laid out under the cover so the book has its final size
    fillPage(false);
    nav.hidden = true; tools.hidden = true; dots.hidden = true;
    reward.hidden = true; LGA.$("#storybook").hidden = false;
    list.hidden = true; view.hidden = false;
    paintTools();
    window.scrollTo({ top: 0 });
    LGA.sound.speak(les.title);
    LGA.fun.cornerMascot().say("Tap the book to open it!", 3500);
    if (!progress[les.id]) await saveProgress("in_progress", 0, 0);
  }

  function openBook() {
    if (opened) return; opened = true;
    LGA.sound.tone(true);
    if (reduced()) cover.className = "cover is-gone";
    else { cover.classList.add("is-open"); setTimeout(() => { if (opened) cover.className = "cover is-gone"; }, 1000); }   // own timer: reading must not cancel it
    nav.hidden = false; tools.hidden = false; dots.hidden = false;
    LGA.fun.cornerMascot().say("Let's read!", 2000);
    later(readPage, reduced() ? 100 : 700);
  }

  async function finish() {
    if (finishing) return; finishing = true;
    stopReading();
    const seconds = Math.min(Math.round((Date.now() - startedAt) / 1000), 1800);
    await saveProgress("completed", pages.length, seconds);
    LGA.logSession(child.id, seconds, "lesson");
    LGA.checkAchievements(child.id);
    LGA.$("#storybook").hidden = true; nav.hidden = true; tools.hidden = true; dots.hidden = true; reward.hidden = false;
    LGA.fun.confetti(); LGA.fun.banner("The end!"); LGA.fun.cornerMascot().mood("cheer");
    LGA.sound.speak("The end! Great reading, " + child.nickname + "!");
    reward.scrollIntoView({ behavior: "smooth", block: "center" });
    finishing = false;
  }

  LGA.$("#cover-open").addEventListener("click", openBook);
  cover.addEventListener("click", (e) => { if (e.target === cover) openBook(); });
  LGA.$("#book-next").addEventListener("click", () => {
    if (idx < pages.length - 1) { idx++; showPage(true, "next"); } else finish();
  });
  LGA.$("#book-prev").addEventListener("click", () => { if (idx > 0) { idx--; showPage(true, "prev"); } });
  LGA.$("#book-read").addEventListener("click", readPage);
  LGA.$("#voice-btn").addEventListener("click", () => { Voice.next(); paintTools(); readPage(); });
  LGA.$("#speed-btn").addEventListener("click", () => { slow = !slow; store.set("lga-story-slow", slow ? "1" : "0"); paintTools(); readPage(); });
  document.addEventListener("keydown", (e) => {
    if (view.hidden || !opened || nav.hidden) return;
    if (e.key === "ArrowRight") LGA.$("#book-next").click();
    if (e.key === "ArrowLeft") LGA.$("#book-prev").click();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopReading(); });
  function back() { stopReading(); view.hidden = true; list.hidden = false; current = null; renderList(); }
  LGA.$("#story-back").addEventListener("click", back);
  LGA.$("#reward-back").addEventListener("click", back);
  LGA.$("#reward-again").addEventListener("click", () => open(current));

  try { await load(); renderList(); }
  catch (e) { list.replaceChildren(); LGA.msg(out, "We could not load the stories. Please refresh the page."); }
})();
