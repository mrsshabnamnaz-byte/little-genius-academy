// Little Genius Academy — learning.js
// One learning engine used by ABC, Numbers, Colors & Shapes and Animals pages.
// Each page sets <body data-subject="..."> and this file loads that subject's lessons
// from the database, lets the child tap items (with spoken words), and saves progress
// to the child_progress table when the lesson is finished.

(async function () {
  const page = document.body.dataset.page;          // "learn" or "world"
  const subjectName = document.body.dataset.subject;
  const session = await LGA.requireParent();
  if (!session) return;
  const db = window.lgaDb;

  // ---------- Which child is playing? (RLS makes sure the parent owns this child) ----------
  let childId = null;
  try { childId = sessionStorage.getItem("lga-child"); } catch (e) { /* ignore */ }
  const toChoose = () => window.location.replace(LGA.url("parent/choose-child.html"));
  if (!childId) return toChoose();
  const { data: child } = await db.from("children").select("id, nickname, avatar_key").eq("id", childId).maybeSingle();
  if (!child) return toChoose();
  if (!(await LGA.enforceTimeLimit(child.id))) return;
  const badge = LGA.$("#child-badge");
  if (badge) badge.textContent = LGA.avatar(child.avatar_key) + " " + child.nickname;

  if (page === "world") return;   // the world map page needs nothing more

  // ---------- Sound (speech) with mute ----------
  let muted = false;
  try { muted = localStorage.getItem("lga-mute") === "1"; } catch (e) { /* ignore */ }
  const soundBtn = LGA.$("#sound-btn");
  function paintSound() {
    soundBtn.textContent = muted ? "🔇" : "🔊";
    soundBtn.setAttribute("aria-pressed", String(!muted));
    soundBtn.setAttribute("aria-label", muted ? "Sound is off. Turn sound on" : "Sound is on. Turn sound off");
  }
  soundBtn.addEventListener("click", () => {
    muted = !muted;
    try { localStorage.setItem("lga-mute", muted ? "1" : "0"); } catch (e) { /* ignore */ }
    if (muted && window.speechSynthesis) window.speechSynthesis.cancel();
    paintSound();
  LGA.fun.cornerMascot().say("Tap a picture!", 3000);
  });
  paintSound();
  // speak("text") or speak(["part one", "part two"]). queue=true waits for speech already playing.
  function speak(text, queue) {
    // Speech is a bonus: if it fails for any reason, learning must still work.
    try {
      if (muted || !("speechSynthesis" in window)) return;   // words are ALWAYS also shown on screen
      if (!queue) window.speechSynthesis.cancel();
      (Array.isArray(text) ? text : [text]).forEach((part) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = "en-US"; u.rate = 0.8; u.pitch = 1.1;
        window.speechSynthesis.speak(u);
      });
    } catch (e) { /* ignore */ }
  }

  // ---------- Load lessons + this child's progress ----------
  const out = LGA.$("#page-msg"), list = LGA.$("#lesson-list"), view = LGA.$("#lesson-view");
  LGA.$("#subject-title").textContent = subjectName;
  let lessons = [], progress = {};

  async function load() {
    const { data: subject, error: e1 } = await db.from("subjects").select("id").eq("name", subjectName).maybeSingle();
    if (e1 || !subject) throw e1 || new Error("subject missing");
    const [l, p] = await Promise.all([
      db.from("lessons").select("id, title, description, instructions, content, sort_order")
        .eq("subject_id", subject.id).order("sort_order", { ascending: true }),
      db.from("child_progress").select("id, lesson_id, status, score, attempts, time_spent_seconds").eq("child_id", child.id)
    ]);
    if (l.error) throw l.error;
    if (p.error) throw p.error;
    lessons = l.data;
    progress = {};
    p.data.forEach((r) => { progress[r.lesson_id] = r; });
  }

  function renderList() {
    list.replaceChildren();
    if (!lessons.length) {
      const empty = document.createElement("p");
      empty.className = "muted"; empty.textContent = "No lessons here yet. Please check back soon!";
      list.append(empty);
      return;
    }
    lessons.forEach((les) => {
      const st = progress[les.id] ? progress[les.id].status : "new";
      const b = document.createElement("button");
      b.type = "button"; b.className = "lesson-card";
      b.innerHTML = '<span class="lesson-card__star" aria-hidden="true"></span><strong></strong><span class="muted desc"></span><span class="lesson-card__status"></span>';
      b.querySelector(".lesson-card__star").textContent = st === "completed" ? "⭐" : "📘";
      b.querySelector("strong").textContent = les.title;
      b.querySelector(".desc").textContent = les.description || "";
      b.querySelector(".lesson-card__status").textContent =
        st === "completed" ? "Done! Play again" : st === "in_progress" ? "Keep going" : "Start";
      b.addEventListener("click", () => openLesson(les));
      list.append(b);
    });
  }

  // ---------- A lesson ----------
  let current = null, seen = new Set(), startedAt = 0;
  const stage = LGA.$("#stage"), tiles = LGA.$("#tiles"), prog = LGA.$("#lesson-progress"), reward = LGA.$("#reward");

  function showOnStage(info) {
    stage.replaceChildren();
    stage.append(LGA.itemVisual(info, true));
    const w = document.createElement("strong"); w.className = "stage__word"; w.textContent = info.word;
    stage.append(w);
    if (info.sub) { const s = document.createElement("span"); s.className = "stage__sub"; s.textContent = info.sub; stage.append(s); }
    if (info.kind === "letter") {
      const row = document.createElement("div"); row.className = "stage__buttons";
      [["Letter", info.parts.name], ["Sound", info.parts.sound], ["Word", info.parts.word]].forEach(([label, say]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "btn btn--ghost btn--small"; b.textContent = "🔊 " + label;
        b.addEventListener("click", () => speak(say));
        row.append(b);
      });
      stage.append(row);
    }
    if (info.kind === "number" || info.kind === "letter") {
      const e = document.createElement("span"); e.className = "stage__emoji"; e.setAttribute("aria-hidden", "true");
      e.textContent = info.kind === "number" ? info.emoji.repeat(Math.min(info.count, 20)) : info.emoji;
      stage.append(e);
    }
  }

  async function openLesson(les) {
    current = les; seen = new Set(); startedAt = Date.now();
    reward.hidden = true;
    LGA.$("#lesson-title").textContent = les.title;
    LGA.$("#lesson-instructions").textContent = les.instructions || "Tap each picture!";
    const items = (les.content && les.content.items) || [];
    tiles.replaceChildren();
    stage.replaceChildren();
    const hint = document.createElement("span"); hint.className = "stage__sub"; hint.textContent = "Tap a picture to begin 👇";
    stage.append(hint);
    items.forEach((item) => {
      const info = LGA.resolveItem(item);
      const t = document.createElement("button");
      t.type = "button"; t.className = "tile";
      t.setAttribute("aria-label", info.word);
      t.append(LGA.itemVisual(info, false));
      const cap = document.createElement("span"); cap.className = "tile__label"; cap.textContent = info.word;
      t.append(cap);
      t.addEventListener("click", () => {
        showOnStage(info); speak(info.say);
        LGA.fun.burst(t, 9);
        t.classList.add("is-seen"); seen.add(String(item));
        updateProgressText(items.length);
        if (seen.size === items.length) finish(items.length);
      });
      tiles.append(t);
    });
    updateProgressText(items.length);
    list.hidden = true; view.hidden = false;
    window.scrollTo({ top: 0 });
    // Remember that this lesson was started (never downgrade a finished lesson).
    if (!progress[les.id]) await saveProgress("in_progress", 0, 0);
  }

  function updateProgressText(total) {
    prog.textContent = seen.size + " of " + total + " found";
    LGA.$("#lesson-bar").style.width = Math.round((seen.size / Math.max(total, 1)) * 100) + "%";
  }

  // Save to the database (child_progress). The database checks the parent owns the child.
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
    const res = old
      ? await db.from("child_progress").update(row).eq("id", old.id)
      : await db.from("child_progress").insert(row);
    if (res.error) { LGA.msg(out, "We could not save your progress. Please try again later."); return; }
    // Re-read so we have the row id and fresh numbers.
    const { data } = await db.from("child_progress")
      .select("id, lesson_id, status, score, attempts, time_spent_seconds")
      .eq("child_id", child.id).eq("lesson_id", current.id).maybeSingle();
    if (data) progress[current.id] = data;
  }

  let finishing = false;
  async function finish(total) {
    if (finishing) return;
    finishing = true;
    const seconds = Math.min(Math.round((Date.now() - startedAt) / 1000), 1800);  // ignore long idle time
    await saveProgress("completed", total, seconds);
    LGA.logSession(child.id, seconds, "lesson");
    LGA.checkAchievements(child.id);
    reward.hidden = false;
    LGA.fun.confetti(); LGA.fun.banner("Lesson complete!"); LGA.fun.cornerMascot().mood("cheer");
    speak("Great job, " + child.nickname + "!", true);   // queued: lets the last word finish first
    reward.scrollIntoView({ behavior: "smooth", block: "center" });
    finishing = false;
  }

  function backToList() {
    view.hidden = true; list.hidden = false; current = null;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    renderList();
  }
  LGA.$("#lesson-back").addEventListener("click", backToList);
  LGA.$("#reward-back").addEventListener("click", backToList);
  LGA.$("#reward-again").addEventListener("click", () => openLesson(current));

  try { await load(); renderList(); }
  catch (e) { list.replaceChildren(); LGA.msg(out, "We could not load the lessons. Please refresh the page."); }
})();
