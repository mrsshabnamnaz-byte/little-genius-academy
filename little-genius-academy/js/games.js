// Little Genius Academy — games.js
// Games Playground list, the three games (ABC Match, Count and Win, Memory Master)
// and the Picture Matching activity.
// Results are saved to Supabase: game_results (games) and child_progress (Picture Matching).

(async function () {
  const page = document.body.dataset.page;      // "games" | "play" | "matching"
  const who = await LGA.requireChild();
  if (!who) return;
  const { child } = who;
  const db = window.lgaDb;
  const out = LGA.$("#page-msg");
  const badge = LGA.$("#child-badge");
  if (badge) badge.textContent = LGA.avatar(child.avatar_key) + " " + child.nickname;
  LGA.sound.bindButton(LGA.$("#sound-btn"));
  LGA.fun.cornerMascot().say("Let's play!", 2500);

  // ---------- helpers ----------
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const seconds = (t0) => Math.min(Math.round((Date.now() - t0) / 1000), 1800);

  // Show the end screen (stars + buttons)
  function showResult(area, score, max, saved, again) {
    area.replaceChildren();
    const ratio = score / max;
    const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
    const box = el("div", "reward");
    box.append(el("div", "reward__stars", "⭐".repeat(stars)));
    box.append(el("h2", "", "Great job, " + child.nickname + "!"));
    box.append(el("p", "", "You scored " + score + " points."));
    if (!saved) box.append(el("p", "msg msg--error", "We could not save this score, but you did great!"));
    const actions = el("div", "reward__actions");
    const a = el("button", "btn btn--sun", "Play again"); a.type = "button"; a.addEventListener("click", again);
    const m = el("a", "btn", "More games"); m.href = "games.html";
    actions.append(a, m); box.append(actions);
    area.append(box);
    LGA.sound.tone(true);
    LGA.sound.speak("Great job, " + child.nickname + "!", true);
    LGA.fun.confetti();
    LGA.fun.banner("You did it!");
  }

  // ====================== Games Playground (list) ======================
  if (page === "games") {
    const list = LGA.$("#game-list");
    const ICONS = { abc_match: "🔤", count_and_win: "🔢", memory_master: "🧠", color_sorter: "🎨", shape_builder: "🏠", trace_and_learn: "✏️", puzzle_world: "🧩" };
    const { data, error } = await db.from("games").select("id, title, description, game_type").order("title");
    list.replaceChildren();
    if (error) return LGA.msg(out, "We could not load the games. Please refresh the page.");
    const playable = data.filter((g) => ICONS[g.game_type]);
    if (!playable.length) { list.append(el("p", "muted", "No games yet. Please check back soon!")); return; }
    playable.forEach((g) => {
      const a = el("a", "world-card");
      a.href = "play.html?type=" + encodeURIComponent(g.game_type);
      a.append(el("div", "card__icon", ICONS[g.game_type]), el("h3", "", g.title), el("p", "muted", g.description || ""));
      a.firstChild.setAttribute("aria-hidden", "true");
      list.append(a);
    });
    const m = el("a", "world-card"); m.href = "matching.html";
    const mi = el("div", "card__icon", "🧩"); mi.setAttribute("aria-hidden", "true");
    m.append(mi, el("h3", "", "Picture Matching"), el("p", "muted", "Match each picture with its word."));
    list.append(m);
    return;
  }

  // ====================== Play a game ======================
  if (page === "play") {
    const type = new URLSearchParams(window.location.search).get("type");
    const area = LGA.$("#game-area");
    if (!["abc_match", "count_and_win", "memory_master", "color_sorter", "shape_builder", "trace_and_learn", "puzzle_world"].includes(type)) {
      return LGA.msg(out, "That game was not found. Please go back and choose a game.");
    }
    const { data, error } = await db.from("games").select("id, title, instructions").eq("game_type", type);
    if (error || !data || !data.length) return LGA.msg(out, "That game is not available right now.");
    const game = data[0];
    LGA.$("#game-title").textContent = game.title;
    LGA.$("#game-help").textContent = game.instructions || "";

    let t0 = Date.now();
    async function finish(score, max) {
      const { error: e } = await db.from("game_results").insert({
        child_id: child.id, game_id: game.id, score, duration_seconds: seconds(t0)
      });
      showResult(area, score, max, !e, start);
      LGA.logSession(child.id, seconds(t0), "game");
      LGA.checkAchievements(child.id);
    }

    // ---- shared: 5-round multiple choice ----
    const ROUNDS = 5;
    function choiceGame(makeRounds) {
      const rounds = makeRounds();
      let i = 0, score = 0, streak = 0;
      function next() {
        if (i >= ROUNDS) return finish(score, ROUNDS * 10);
        const r = rounds[i];
        let wrongTried = false, done = false;
        area.replaceChildren();
        area.append(el("p", "round-label", "Question " + (i + 1) + " of " + ROUNDS + "  ·  Score " + score));
        const prompt = el("div", "prompt");
        prompt.append(r.visual, el("p", "prompt__text", r.text));
        area.append(prompt);
        const opts = el("div", "choices");
        r.options.forEach((o) => {
          const b = el("button", "choice", o.label);
          b.type = "button";
          if (o.bg) { b.classList.add("choice--color"); b.style.setProperty("--bg", o.bg); b.style.setProperty("--fg", o.fg || "#26264a"); }
          b.addEventListener("click", () => {
            if (done) return;
            if (o.correct) {
              done = true;
              if (!wrongTried) { score += 10; streak++; }
              b.classList.add("is-right");
              LGA.fun.cheer(b, streak >= 2 ? streak + " in a row!" : undefined);
              LGA.sound.tone(true); LGA.sound.speak(r.say);
              setTimeout(() => { i++; next(); }, 1500);
            } else {
              wrongTried = true; streak = 0;
              b.classList.add("is-wrong"); b.disabled = true;
              LGA.fun.oops();
              LGA.sound.tone(false); LGA.sound.speak("Try again");
            }
          });
          opts.append(b);
        });
        area.append(opts);
        LGA.sound.speak(r.speak);
      }
      next();
    }

    const GAMES = {
      // Which letter does this picture start with?
      abc_match() {
        const letters = Object.keys(LGA.DATA.letters);
        choiceGame(() => shuffle(letters).slice(0, ROUNDS).map((L) => {
          const [word, emoji] = LGA.DATA.letters[L];
          const wrong = shuffle(letters.filter((x) => x !== L)).slice(0, 2);
          const v = el("div", "prompt__pic", emoji); v.setAttribute("aria-hidden", "true");
          return {
            visual: v, text: word + ". Which letter does it start with?",
            speak: word + ". Which letter does it start with?",
            say: LGA.DATA.letterNames[L] + " is for " + word + ".",
            options: shuffle([L, ...wrong]).map((x) => ({ label: x, correct: x === L }))
          };
        }));
      },
      // Count the objects, pick the number.
      count_and_win() {
        const things = ["🍎", "⭐", "🐟", "🎈", "🚗", "🐥"];
        choiceGame(() => shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, ROUNDS).map((n) => {
          const wrong = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => x !== n)).slice(0, 2);
          const thing = things[Math.floor(Math.random() * things.length)];
          const v = el("div", "prompt__pic prompt__pic--count", thing.repeat(n));
          v.setAttribute("aria-hidden", "true");
          return {
            visual: v, text: "How many do you see?", speak: "How many do you see?",
            say: "Yes! " + LGA.DATA.numberWords[n] + ".",
            options: shuffle([n, ...wrong]).map((x) => ({ label: String(x), correct: x === n }))
          };
        }));
      },
      // Puzzle World: finish the pattern, or find the odd one out.
      puzzle_world() {
        const SETS = [["🔴", "🔵", "🟡", "🟢"], ["⭐", "🌙", "☀️", "☁️"], ["🍎", "🍌", "🍇", "🍊"], ["🐶", "🐱", "🐸", "🐥"], ["🚗", "🚲", "✈️", "🚂"]];
        const GROUPS = [
          ["🍎", "🍌", "🍇", "🍊", "🍓"], ["🐶", "🐱", "🐮", "🐷", "🐴"], ["🚗", "🚲", "✈️", "🚂", "🚌"],
          ["🌳", "🌸", "🌻", "🌷", "🌵"], ["⚽", "🏀", "🎾", "🏐", "🎱"]
        ];
        const makePattern = () => {
          const set = shuffle(SETS[Math.floor(Math.random() * SETS.length)]);
          const kinds = [[0, 1], [0, 1, 1], [0, 1, 2]];
          const unit = kinds[Math.floor(Math.random() * kinds.length)];
          const seq = []; while (seq.length < unit.length * 2 + 1) unit.forEach((u) => seq.push(set[u]));
          const shown = seq.slice(0, unit.length * 2);
          const answer = seq[unit.length * 2];
          const wrong = shuffle(set.filter((x) => x !== answer)).slice(0, 2);
          const v = el("div", "puzzle-seq", shown.join(" ") + " ❓"); v.setAttribute("aria-label", "pattern");
          return {
            visual: v, text: "What comes next in the pattern?", speak: "What comes next in the pattern?",
            say: "Well done! You finished the pattern.",
            options: shuffle([answer, ...wrong]).map((x) => ({ label: x, correct: x === answer }))
          };
        };
        const makeOdd = () => {
          const g = shuffle(GROUPS[Math.floor(Math.random() * GROUPS.length)]).slice(0, 2);
          const other = shuffle(GROUPS.filter((x) => !x.includes(g[0])))[0][0];
          const all = shuffle([...g, other]);
          const v = el("div", "prompt__pic", "🔎"); v.setAttribute("aria-hidden", "true");
          return {
            visual: v, text: "Which one is different?", speak: "Which one is different?",
            say: "Great spotting! That one is different.",
            options: all.map((x) => ({ label: x, correct: x === other }))
          };
        };
        choiceGame(() => [makePattern(), makeOdd(), makePattern(), makeOdd(), makePattern()]);
      },
      // What colour is this? (Colour name is always written on the button too.)
      color_sorter() {
        const C = LGA.DATA.colors;
        const items = [
          ["🍎", "apple", "red"], ["🍓", "strawberry", "red"], ["🚒", "fire truck", "red"],
          ["🍌", "banana", "yellow"], ["🐥", "chick", "yellow"], ["🌻", "sunflower", "yellow"],
          ["🐸", "frog", "green"], ["🥦", "broccoli", "green"], ["🐢", "turtle", "green"],
          ["🐳", "whale", "blue"], ["🫐", "blueberries", "blue"], ["🌊", "wave", "blue"],
          ["🍊", "orange", "orange"], ["🥕", "carrot", "orange"], ["🎃", "pumpkin", "orange"],
          ["🍇", "grapes", "purple"], ["🍆", "eggplant", "purple"], ["👾", "alien", "purple"]
        ];
        const names = ["red", "yellow", "green", "blue", "orange", "purple"];
        const light = { yellow: 1, orange: 1 };
        choiceGame(() => shuffle(items).slice(0, ROUNDS).map(([emoji, name, color]) => {
          const wrong = shuffle(names.filter((n) => n !== color)).slice(0, 2);
          const v = el("div", "prompt__pic", emoji); v.setAttribute("aria-hidden", "true");
          return {
            visual: v, text: "What colour is the " + name + "?", speak: "What colour is the " + name + "?",
            say: "Yes! The " + name + " is " + color + ".",
            options: shuffle([color, ...wrong]).map((n) => ({ label: n, bg: C[n], fg: light[n] ? "#26264a" : "#fff", correct: n === color }))
          };
        }));
      },
      // Build a picture by tapping shapes in the right order (bottom first).
      shape_builder() {
        const SC = LGA.DATA.shapeColors;
        // pieces go from the BOTTOM up. w/h are pixel sizes.
        const RECIPES = [
          { name: "house",   pieces: [{ s: "square", w: 110, h: 90, c: "#4cc3ff" }, { s: "triangle", w: 140, h: 70, c: "#e53935" }] },
          { name: "snowman", pieces: [{ s: "circle", w: 110, h: 110, c: "#cfe8ff" }, { s: "circle", w: 70, h: 70, c: "#e3f2fd" }] },
          { name: "tree",    pieces: [{ s: "rectangle", w: 34, h: 40, c: "#795548" }, { s: "triangle", w: 120, h: 60, c: "#43a047" }, { s: "triangle", w: 90, h: 50, c: "#66bb6a" }] },
          { name: "rocket",  pieces: [{ s: "rectangle", w: 70, h: 110, c: "#9b7bff" }, { s: "triangle", w: 70, h: 50, c: "#ec407a" }] }
        ];
        const TRAY = ["circle", "square", "triangle", "rectangle"];
        const ROUNDS_B = 3;
        const rounds = shuffle(RECIPES).slice(0, ROUNDS_B);
        let ri = 0, score = 0;

        function piece(p, k) {
          const d = el("div", "shape shape--" + p.s);
          d.style.width = Math.round(p.w * k) + "px"; d.style.height = Math.round(p.h * k) + "px";
          d.style.background = p.c; d.setAttribute("aria-hidden", "true");
          return d;
        }
        function round() {
          if (ri >= rounds.length) return finish(score, ROUNDS_B * 10);
          const r = rounds[ri]; let step = 0, mistakes = 0;
          area.replaceChildren();
          area.append(el("p", "round-label", "Picture " + (ri + 1) + " of " + ROUNDS_B + "  ·  Score " + score));
          const wrap = el("div", "builder-wrap");
          const target = el("div", "builder builder--target");
          r.pieces.forEach((p) => target.append(piece(p, 0.5)));
          const tcard = el("div", "builder-card"); tcard.append(el("p", "builder-title", "Make this " + r.name), target);
          const mine = el("div", "builder");
          const bcard = el("div", "builder-card builder-card--mine"); bcard.append(el("p", "builder-title", "Your " + r.name), mine);
          wrap.append(tcard, bcard); area.append(wrap);
          const hint = el("p", "match-feedback"); hint.setAttribute("role", "status"); area.append(hint);
          const tray = el("div", "tray");
          const say = () => { hint.textContent = "Tap the " + r.pieces[step].s + " 👇"; hint.className = "match-feedback"; };
          TRAY.forEach((sh) => {
            const b = el("button", "tray__btn"); b.type = "button"; b.setAttribute("aria-label", sh);
            const v = el("div", "shape shape--" + sh); v.style.background = SC[sh]; v.setAttribute("aria-hidden", "true");
            b.append(v, el("span", "tray__label", sh));
            b.addEventListener("click", () => {
              if (step >= r.pieces.length) return;
              if (sh === r.pieces[step].s) {
                const el2 = piece(r.pieces[step], 0.8); el2.classList.add("is-placed"); mine.append(el2);
                step++; LGA.sound.tone(true);
                if (step === r.pieces.length) {
                  score += mistakes ? 5 : 10;
                  LGA.fun.cheer(mine, "You built a " + r.name + "!");
                  LGA.sound.speak("You built a " + r.name + "!");
                  hint.textContent = "✅ A " + r.name + "!"; hint.className = "match-feedback match-feedback--good";
                  setTimeout(() => { ri++; round(); }, 1800);
                } else { LGA.fun.burst(b, 8); say(); LGA.sound.speak("Now the " + r.pieces[step].s); }
              } else {
                mistakes++; LGA.fun.oops(); LGA.sound.tone(false);
                b.classList.add("is-wrong"); setTimeout(() => b.classList.remove("is-wrong"), 400);
                hint.textContent = "Oops! Try the " + r.pieces[step].s + " 💪"; hint.className = "match-feedback match-feedback--bad";
                LGA.sound.speak("Try again");
              }
            });
            tray.append(b);
          });
          area.append(tray);
          say(); LGA.sound.speak("Let's build a " + r.name + "! Start at the bottom. Tap the " + r.pieces[0].s + ".");
        }
        round();
      },
      // Trace a big letter or number with a finger or mouse.
      trace_and_learn() {
        const SIZE = 300, FONT = "bold 250px 'Baloo 2', 'Arial Rounded MT Bold', Arial, sans-serif";
        const glyphs = shuffle([..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", ..."123456789"]).slice(0, 4);
        const ROUNDS_T = glyphs.length;
        let gi = 0, score = 0;
        // Pen thickness: the child (or parent) can choose. Thinner pens need less of the letter covered.
        const PENS = { thin: { w: 12, need: 0.2, label: "Thin" }, medium: { w: 22, need: 0.3, label: "Medium" }, thick: { w: 34, need: 0.4, label: "Thick" } };
        let pen = "medium";
        const STRAY = 0.2;   // at most 20% of the ink may be off the letter
        try { const saved = localStorage.getItem("lga-trace-pen"); if (PENS[saved]) pen = saved; } catch (e) { /* ignore */ }

        // Draw text into a hidden canvas and keep a "mask" of which pixels belong to it.
        function makeMask(ch, extra) {
          const c = document.createElement("canvas"); c.width = c.height = SIZE;
          const x = c.getContext("2d");
          x.font = FONT; x.textAlign = "center"; x.textBaseline = "alphabetic";
          const m = x.measureText(ch); const asc = m.actualBoundingBoxAscent || 180, desc = m.actualBoundingBoxDescent || 0;
          const y = (SIZE + asc - desc) / 2;
          x.fillStyle = "#000"; x.fillText(ch, SIZE / 2, y);
          if (extra) { x.strokeStyle = "#000"; x.lineWidth = extra; x.lineJoin = "round"; x.strokeText(ch, SIZE / 2, y); }
          return { data: x.getImageData(0, 0, SIZE, SIZE).data, y };
        }
        function round() {
          if (gi >= ROUNDS_T) return finish(score, ROUNDS_T * 10);
          const ch = glyphs[gi]; let mistakes = 0, drawing = false, done = false, last = null;
          const isNum = /\d/.test(ch);
          const spoken = isNum ? LGA.DATA.numberWords[Number(ch)] : LGA.DATA.letterNames[ch];
          area.replaceChildren();
          area.append(el("p", "round-label", "Trace " + (gi + 1) + " of " + ROUNDS_T + "  ·  Score " + score));
          const box = el("div", "trace-box");
          const guide = el("canvas", "trace-canvas trace-canvas--guide"); guide.width = guide.height = SIZE;
          const ink = el("canvas", "trace-canvas trace-canvas--ink"); ink.width = ink.height = SIZE;
          ink.dataset.font = FONT; ink.dataset.char = ch; ink.setAttribute("role", "img");
          ink.setAttribute("aria-label", "Drawing area. Trace the " + (isNum ? "number " : "letter ") + spoken);
          box.append(guide, ink); area.append(box);
          const gx = guide.getContext("2d");
          const base = makeMask(ch, 0);
          // faint dotted guide
          gx.font = FONT; gx.textAlign = "center"; gx.fillStyle = "rgba(155,123,255,.18)"; gx.fillText(ch, SIZE / 2, base.y);
          gx.lineWidth = 3; gx.setLineDash([10, 10]); gx.strokeStyle = "#9b7bff"; gx.strokeText(ch, SIZE / 2, base.y);
          const ix = ink.getContext("2d");
          ix.lineWidth = PENS[pen].w; ix.lineCap = "round"; ix.lineJoin = "round"; ix.strokeStyle = "#ff6f91";
          const meter = el("p", "match-feedback", "Use your finger to trace the " + (isNum ? "number " : "letter ") + spoken + " ✏️");
          meter.setAttribute("role", "status"); area.append(meter);
          const row = el("div", "reward__actions");
          const clear = el("button", "btn btn--ghost", "Start again"); clear.type = "button";
          const hear = el("button", "btn btn--ghost", "🔊 Hear it"); hear.type = "button";
          row.append(clear, hear); area.append(row);
          // Pen thickness choice
          const penRow = el("div", "pen-row"); penRow.setAttribute("role", "group"); penRow.setAttribute("aria-label", "Pen thickness");
          penRow.append(el("span", "pen-row__label", "Pen:"));
          Object.keys(PENS).forEach((k) => {
            const pb = el("button", "pen-btn" + (k === pen ? " is-on" : ""), PENS[k].label); pb.type = "button";
            pb.setAttribute("aria-pressed", String(k === pen));
            const dot = el("span", "pen-btn__dot"); dot.style.width = dot.style.height = Math.max(6, PENS[k].w / 2) + "px"; dot.setAttribute("aria-hidden", "true");
            pb.prepend(dot);
            pb.addEventListener("click", () => {
              pen = k; ix.lineWidth = PENS[k].w;
              try { localStorage.setItem("lga-trace-pen", k); } catch (e) { /* ignore */ }
              penRow.querySelectorAll(".pen-btn").forEach((x) => { const on = x === pb; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
            });
            penRow.append(pb);
          });
          area.append(penRow);

          // How much of the letter is covered, and how much ink went far outside it?
          function check() {
            // ink is "on the line" if it is within the pen's own radius + a little slack of the letter
            const wide = makeMask(ch, PENS[pen].w + 16);
            const inkData = ix.getImageData(0, 0, SIZE, SIZE).data;
            let need = 0, hit = 0, ink = 0, stray = 0;
            for (let y = 0; y < SIZE; y += 3) for (let x = 0; x < SIZE; x += 3) {
              const k = (y * SIZE + x) * 4 + 3;
              const inGlyph = base.data[k] > 128, inked = inkData[k] > 128;
              if (inGlyph) { need++; if (inked) hit++; }
              if (inked) { ink++; if (wide.data[k] <= 128) stray++; }
            }
            return { cover: need ? hit / need : 0, stray: ink ? stray / ink : 0 };
          }
          function pos(e) {
            const r = ink.getBoundingClientRect();
            return [(e.clientX - r.left) * SIZE / r.width, (e.clientY - r.top) * SIZE / r.height];
          }
          ink.addEventListener("pointerdown", (e) => {
            if (done) return; e.preventDefault();
            try { ink.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            drawing = true; last = pos(e);
            ix.beginPath(); ix.moveTo(last[0], last[1]); ix.lineTo(last[0] + 0.1, last[1]); ix.stroke();
          });
          ink.addEventListener("pointermove", (e) => {
            if (!drawing || done) return; e.preventDefault();
            const p = pos(e); ix.beginPath(); ix.moveTo(last[0], last[1]); ix.lineTo(p[0], p[1]); ix.stroke(); last = p;
          });
          const up = () => {
            if (!drawing || done) return; drawing = false;
            const r = check(), pct = Math.round(r.cover * 100);
            if (r.cover >= PENS[pen].need && r.stray <= STRAY) {
              done = true; score += mistakes ? 5 : 10;
              meter.textContent = "✅ You traced it!"; meter.className = "match-feedback match-feedback--good";
              LGA.fun.cheer(ink, "You traced " + (isNum ? "" : "the letter ") + ch + "!");
              LGA.sound.tone(true); LGA.sound.speak("Great tracing! " + spoken + ".");
              setTimeout(() => { gi++; round(); }, 1900);
            } else if (r.stray > STRAY) {
              mistakes++; meter.textContent = "Stay on the dotted line 🌈 Tap “Start again”."; meter.className = "match-feedback match-feedback--bad";
              LGA.fun.oops("Stay on the line!"); LGA.sound.tone(false);
            } else {
              meter.textContent = "Keep going! " + pct + "% traced 💪"; meter.className = "match-feedback";
            }
          };
          ink.addEventListener("pointerup", up); ink.addEventListener("pointercancel", up);
          clear.addEventListener("click", () => { ix.clearRect(0, 0, SIZE, SIZE); meter.textContent = "Try again, trace slowly ✏️"; meter.className = "match-feedback"; });
          hear.addEventListener("click", () => LGA.sound.speak(spoken));
          LGA.sound.speak("Trace the " + (isNum ? "number " : "letter ") + spoken + ".");
        }
        round();
      },
      // Flip two cards to find matching pairs.
      memory_master() {
        const faces = [["🐶", "dog"], ["🐱", "cat"], ["🐼", "panda"], ["🦁", "lion"], ["🐸", "frog"], ["🐵", "monkey"],
                       ["🍎", "apple"], ["🍌", "banana"], ["🚗", "car"], ["⭐", "star"], ["🌈", "rainbow"], ["🎈", "balloon"]];
        const pairs = shuffle(faces).slice(0, 6);
        const deck = shuffle([...pairs, ...pairs]);
        let first = null, lock = false, moves = 0, matched = 0;
        area.replaceChildren();
        const info = el("p", "round-label", "Moves: 0");
        const grid = el("div", "memory-grid");
        area.append(info, grid);
        deck.forEach(([emoji, name], idx) => {
          const c = el("button", "mem-card");
          c.type = "button";
          c.setAttribute("aria-label", "Card " + (idx + 1) + ", face down");
          c.dataset.emoji = emoji;
          c.addEventListener("click", () => {
            if (lock || c.classList.contains("is-open") || c.classList.contains("is-matched")) return;
            c.classList.add("is-open"); c.textContent = emoji;
            c.setAttribute("aria-label", "Card " + (idx + 1) + ": " + name);
            LGA.sound.speak(name);
            if (!first) { first = c; return; }
            moves++; info.textContent = "Moves: " + moves;
            if (first.dataset.emoji === c.dataset.emoji) {
              first.classList.add("is-matched"); c.classList.add("is-matched");
              first = null; matched++;
              LGA.fun.cheer(c, "Match!");
              LGA.sound.tone(true);
              if (matched === pairs.length) {
                setTimeout(() => finish(Math.max(10, 100 - (moves - pairs.length) * 10), 100), 900);
              }
            } else {
              lock = true; LGA.sound.tone(false);
              const a = first, b = c; first = null;
              setTimeout(() => {
                [a, b].forEach((x, k) => { x.classList.remove("is-open"); x.textContent = ""; x.setAttribute("aria-label", "Card, face down"); });
                lock = false;
              }, 1100);
            }
          });
          grid.append(c);
        });
        LGA.sound.speak("Find the matching pairs!");
      }
    };

    function start() { t0 = Date.now(); GAMES[type](); }
    start();
    return;
  }

  // ====================== Picture Matching (a lesson, saved to child_progress) ======================
  if (page === "matching") {
    const area = LGA.$("#game-area");
    const { data: subject } = await db.from("subjects").select("id").eq("name", "Picture Matching").maybeSingle();
    const { data: lessons, error } = subject
      ? await db.from("lessons").select("id, title, instructions, content").eq("subject_id", subject.id).order("sort_order")
      : { data: null, error: true };
    if (error || !lessons || !lessons.length) return LGA.msg(out, "We could not load this activity. Please refresh the page.");
    const lesson = lessons[0];
    LGA.$("#game-title").textContent = lesson.title;
    LGA.$("#game-help").textContent = lesson.instructions || "Tap a picture, then tap its word.";
    const names = ((lesson.content && lesson.content.pairs) || []).filter((n) => LGA.DATA.pictures[n]);

    let t0 = Date.now(), selected = null, done = 0;

    async function save() {
      const { data: old } = await db.from("child_progress")
        .select("id, status, score, attempts, time_spent_seconds").eq("child_id", child.id).eq("lesson_id", lesson.id).maybeSingle();
      const row = {
        child_id: child.id, lesson_id: lesson.id, status: "completed", score: names.length,
        attempts: (old ? old.attempts : 0) + 1,
        time_spent_seconds: (old ? old.time_spent_seconds : 0) + seconds(t0),
        completed_at: new Date().toISOString()
      };
      const r = old ? await db.from("child_progress").update(row).eq("id", old.id) : await db.from("child_progress").insert(row);
      return !r.error;
    }

    function start() {
      t0 = Date.now(); selected = null; done = 0;
      area.replaceChildren();
      const feedback = el("p", "match-feedback", "Tap a picture, then tap its word.");
      feedback.setAttribute("role", "status");
      area.append(feedback);
      const cols = el("div", "match-cols");
      const left = el("div", "match-col"), right = el("div", "match-col");
      shuffle(names).forEach((n) => {
        const b = el("button", "match-card", LGA.DATA.pictures[n]);
        b.type = "button"; b.dataset.name = n; b.setAttribute("aria-label", "Picture of " + n);
        left.append(b);
      });
      shuffle(names).forEach((n) => {
        const b = el("button", "match-card match-card--word", n);
        b.type = "button"; b.dataset.name = n;
        right.append(b);
      });
      cols.append(left, right); area.append(cols);

      area.querySelectorAll(".match-card").forEach((b) => b.addEventListener("click", async () => {
        if (b.classList.contains("is-matched")) return;
        const isPic = !b.classList.contains("match-card--word");
        if (!selected) { selected = b; b.classList.add("is-selected"); LGA.sound.speak(b.dataset.name); feedback.textContent = "Now tap the matching " + (isPic ? "word" : "picture") + " 👉"; feedback.className = "match-feedback"; return; }
        const same = selected.classList.contains("match-card--word") === !isPic;  // both from the same column?
        if (same) { selected.classList.remove("is-selected"); selected = b; b.classList.add("is-selected"); LGA.sound.speak(b.dataset.name); return; }
        if (selected.dataset.name === b.dataset.name) {
          [selected, b].forEach((x) => { x.classList.remove("is-selected"); x.classList.add("is-matched"); });
          LGA.fun.cheer(b, "Yes! " + b.dataset.name + "!");
          LGA.sound.tone(true); LGA.sound.speak("Yes! " + b.dataset.name + "!");
          feedback.textContent = "✅ Yes! " + b.dataset.name + "!  (" + (done + 1) + " of " + names.length + ")";
          feedback.className = "match-feedback match-feedback--good";
          selected = null; done++;
          if (done === names.length) {
            const ok = await save();
            LGA.logSession(child.id, seconds(t0), "matching");
            LGA.checkAchievements(child.id);
            setTimeout(() => showResult(area, names.length * 10, names.length * 10, ok, start), 700);
          }
        } else {
          const a = selected; selected = null;
          [a, b].forEach((x) => x.classList.add("is-wrong"));
          LGA.fun.oops();
          LGA.sound.tone(false); LGA.sound.speak("Try again");
          feedback.textContent = "Oops! Try again 💪";
          feedback.className = "match-feedback match-feedback--bad";
          setTimeout(() => [a, b].forEach((x) => x.classList.remove("is-wrong", "is-selected")), 700);
        }
      }));
      LGA.sound.speak("Tap a picture, then tap its word.");
    }
    start();
  }
})();
