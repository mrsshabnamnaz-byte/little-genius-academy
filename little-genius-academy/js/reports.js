// Little Genius Academy — reports.js
// Parent pages: Progress, Weekly Report and Settings (screen time + your name).
// The database only returns THIS parent's children and records (Row Level Security).

(async function () {
  const page = document.body.dataset.page;       // "progress" | "reports" | "settings"
  const session = await LGA.requireParent();
  if (!session) return;
  const db = window.lgaDb;
  const out = LGA.$("#page-msg");

  const who = LGA.$("#who");
  if (who) who.textContent = session.user.email;
  const logoutBtn = LGA.$("#logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", LGA.logout);

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const mins = (sec) => Math.round(sec / 60);

  // ---------- children ----------
  const { data: kids, error: kidsErr } = await db.from("children").select("id, nickname, avatar_key").order("created_at");
  if (kidsErr) return LGA.msg(out, LGA.friendlyError(kidsErr));

  // Settings page also has the parent's own name, so it can still work with no children
  if (!kids.length && page !== "settings") {
    LGA.$("#empty").hidden = false;
    return;
  }

  // ---------- subject progress (shared by Progress + Weekly Report) ----------
  async function loadChildData(childId) {
    const weekStart = new Date(LGA.todayStart().getTime() - 6 * 86400000);   // today + previous 6 days
    const [subjects, lessons, progress, games, sessions, badges] = await Promise.all([
      db.from("subjects").select("id, name").order("sort_order"),
      db.from("lessons").select("id, subject_id"),
      db.from("child_progress").select("lesson_id, status, completed_at, lessons(title)").eq("child_id", childId),
      db.from("game_results").select("score, completed_at, games(title)").eq("child_id", childId),
      db.from("learning_sessions").select("seconds, created_at").eq("child_id", childId).gte("created_at", weekStart.toISOString()),
      db.from("child_achievements").select("earned_at, achievements(title)").eq("child_id", childId)
    ]);
    const bad = [subjects, lessons, progress, games, sessions, badges].find((r) => r.error);
    if (bad) throw bad.error;

    const subjectOf = {};
    lessons.data.forEach((l) => { subjectOf[l.id] = l.subject_id; });
    const stats = subjects.data
      .map((s) => ({
        name: s.name,
        total: lessons.data.filter((l) => l.subject_id === s.id).length,
        done: progress.data.filter((p) => p.status === "completed" && subjectOf[p.lesson_id] === s.id).length
      }))
      .filter((s) => s.total > 0);
    return { weekStart, stats, progress: progress.data, games: games.data, sessions: sessions.data, badges: badges.data };
  }

  function bar(label, done, total) {
    const row = el("div", "bar-row");
    row.append(el("span", "bar-row__label", label));
    const track = el("div", "bar-row__track");
    const fill = el("div", "bar-row__fill");
    fill.style.width = (total ? Math.round((done / total) * 100) : 0) + "%";
    track.append(fill);
    row.append(track, el("span", "bar-row__count", done + " of " + total));
    return row;
  }

  function fillSelect(sel, onChange) {
    kids.forEach((k) => {
      const o = el("option", "", LGA.avatar(k.avatar_key) + " " + k.nickname);
      o.value = k.id; sel.append(o);
    });
    sel.addEventListener("change", onChange);
  }

  // =============== PROGRESS PAGE ===============
  if (page === "progress") {
    const sel = LGA.$("#child-select"), box = LGA.$("#progress-box");
    async function render() {
      box.replaceChildren(el("p", "muted", "Loading…"));
      try {
        const d = await loadChildData(sel.value);
        box.replaceChildren();
        box.append(el("h2", "", "Progress by subject"));
        d.stats.forEach((s) => box.append(bar(s.name, s.done, s.total)));

        box.append(el("h2", "", "Completed lessons"));
        const done = d.progress.filter((p) => p.status === "completed");
        if (!done.length) box.append(el("p", "muted", "No lessons finished yet. Every little step counts!"));
        else {
          const ul = el("ul", "plain-list");
          done.sort((a, b) => String(b.completed_at).localeCompare(String(a.completed_at))).forEach((p) => {
            const when = p.completed_at ? new Date(p.completed_at).toLocaleDateString() : "";
            ul.append(el("li", "", "✅ " + (p.lessons ? p.lessons.title : "Lesson") + (when ? " — " + when : "")));
          });
          box.append(ul);
        }

        box.append(el("h2", "", "Games"));
        if (!d.games.length) box.append(el("p", "muted", "No games played yet."));
        else {
          const best = {};
          d.games.forEach((g) => { const t = g.games ? g.games.title : "Game"; best[t] = Math.max(best[t] || 0, g.score); });
          const ul = el("ul", "plain-list");
          Object.entries(best).forEach(([t, sc]) => ul.append(el("li", "", "🎮 " + t + " — best score " + sc)));
          box.append(ul);
        }
        box.append(el("p", "hint", "Scores show how a game went today. They are a snapshot of play, not a measure of your child's ability."));
      } catch (e) { box.replaceChildren(); LGA.msg(out, LGA.friendlyError(e)); }
    }
    fillSelect(sel, render);
    render();
    return;
  }

  // =============== WEEKLY REPORT PAGE ===============
  if (page === "reports") {
    const sel = LGA.$("#child-select"), box = LGA.$("#report-box");
    async function render() {
      box.replaceChildren(el("p", "muted", "Loading…"));
      LGA.clearMsg(out);
      try {
        const d = await loadChildData(sel.value);
        const name = kids.find((k) => k.id === sel.value).nickname;
        box.replaceChildren();

        const inWeek = (iso) => iso && new Date(iso) >= d.weekStart;
        const totalSec = d.sessions.reduce((t, s) => t + s.seconds, 0);
        const lessonsDone = d.progress.filter((p) => p.status === "completed" && inWeek(p.completed_at)).length;
        const gamesPlayed = d.games.filter((g) => inWeek(g.completed_at)).length;

        box.append(el("h2", "", name + "'s week"));
        const grid = el("div", "stat-grid");
        [[mins(totalSec) + " min", "Learning time"], [String(lessonsDone), "Lessons completed"], [String(gamesPlayed), "Games played"]]
          .forEach(([v, l]) => { const s = el("div", "stat"); s.append(el("strong", "", v), document.createTextNode(l)); grid.append(s); });
        box.append(grid);

        // Minutes per day (last 7 days)
        box.append(el("h3", "", "Minutes each day"));
        const days = [];
        for (let i = 6; i >= 0; i--) days.push(new Date(LGA.todayStart().getTime() - i * 86400000));
        const perDay = days.map((day) => {
          const next = new Date(day.getTime() + 86400000);
          return d.sessions.filter((s) => { const t = new Date(s.created_at); return t >= day && t < next; })
            .reduce((t, s) => t + s.seconds, 0) / 60;
        });
        const maxV = Math.max(...perDay, 1);
        const chart = el("div", "day-chart");
        chart.setAttribute("role", "img");
        chart.setAttribute("aria-label", "Minutes of learning per day: " + perDay.map((m, i) =>
          days[i].toLocaleDateString(undefined, { weekday: "long" }) + " " + Math.round(m)).join(", "));
        days.forEach((day, i) => {
          const col = el("div", "day-chart__col");
          const b = el("div", "day-chart__bar"); b.style.height = Math.round((perDay[i] / maxV) * 100) + "%";
          col.append(el("span", "day-chart__val", String(Math.round(perDay[i]))), b,
            el("span", "day-chart__day", day.toLocaleDateString(undefined, { weekday: "short" })));
          chart.append(col);
        });
        box.append(chart);

        // Strengths and things to practise (encouraging wording)
        const strong = d.stats.filter((s) => s.done / s.total >= 0.5).map((s) => s.name);
        const practise = d.stats.filter((s) => s.done / s.total < 0.5).sort((a, b) => a.done / a.total - b.done / b.total).slice(0, 2).map((s) => s.name);
        box.append(el("h3", "", "⭐ Going well"));
        box.append(el("p", "", strong.length ? strong.join(", ") : "Every explorer starts somewhere. " + name + " is just getting going!"));
        box.append(el("h3", "", "🌱 Fun to explore together"));
        box.append(el("p", "", practise.length ? practise.join(", ") : "Great variety, keep exploring!"));

        const newBadges = d.badges.filter((b) => inWeek(b.earned_at)).map((b) => b.achievements ? b.achievements.title : "Badge");
        box.append(el("h3", "", "🏆 New badges this week"));
        box.append(el("p", "", newBadges.length ? newBadges.join(", ") : "No new badges this week. They will come with more play!"));

        box.append(el("p", "hint", "This report is a friendly snapshot of play, not a test. Young children learn at their own pace, and a single score never shows everything they can do."));
      } catch (e) { box.replaceChildren(); LGA.msg(out, LGA.friendlyError(e)); }
    }
    fillSelect(sel, render);
    render();
    return;
  }

  // =============== SETTINGS PAGE ===============
  if (page === "settings") {
    // --- your name ---
    const nameForm = LGA.$("#name-form"), nameMsg = LGA.$("#name-msg");
    const { data: prof } = await db.from("profiles").select("full_name").eq("id", session.user.id).maybeSingle();
    if (prof) nameForm.fullName.value = prof.full_name || "";
    nameForm.addEventListener("submit", async (e) => {
      e.preventDefault(); LGA.clearMsg(nameMsg);
      const v = nameForm.fullName.value.trim();
      if (v.length < 2 || v.length > 100) return LGA.msg(nameMsg, "Please enter your name (2 to 100 letters).");
      const { error } = await db.from("profiles").update({ full_name: v }).eq("id", session.user.id);
      LGA.msg(nameMsg, error ? "We could not save your name." : "Saved!", error ? "error" : "success");
    });

    // --- screen time per child ---
    const list = LGA.$("#limit-list");
    const [settings, sessions] = await Promise.all([
      db.from("child_settings").select("child_id, daily_limit_minutes"),
      db.from("learning_sessions").select("child_id, seconds").gte("created_at", LGA.todayStart().toISOString())
    ]);
    if (settings.error || sessions.error) { list.replaceChildren(); return LGA.msg(out, LGA.friendlyError(settings.error || sessions.error)); }
    list.replaceChildren();
    if (!kids.length) { list.append(el("p", "muted", "Add a child first to set a time limit.")); return; }

    const OPTIONS = [[0, "No limit"], [15, "15 minutes"], [30, "30 minutes"], [45, "45 minutes"], [60, "1 hour"], [90, "1.5 hours"], [120, "2 hours"]];
    kids.forEach((k) => {
      const current = settings.data.find((s) => s.child_id === k.id);
      let hasRow = !!current;   // becomes true after the first save, so later saves UPDATE
      const used = mins(sessions.data.filter((s) => s.child_id === k.id).reduce((t, s) => t + s.seconds, 0));
      const card = el("div", "card limit-card");
      card.append(el("h3", "", LGA.avatar(k.avatar_key) + " " + k.nickname));
      const label = el("label", "", "Daily learning time");
      const id = "limit-" + k.id; label.htmlFor = id;
      const sel = el("select"); sel.id = id;
      OPTIONS.forEach(([v, t]) => { const o = el("option", "", t); o.value = String(v); sel.append(o); });
      sel.value = String(current && current.daily_limit_minutes ? current.daily_limit_minutes : 0);
      const msg = el("p", "msg", ""); msg.hidden = true; msg.setAttribute("role", "status");
      const btn = el("button", "btn btn--small", "Save"); btn.type = "button";
      btn.addEventListener("click", async () => {
        const minutes = Number(sel.value) || null;
        const res = hasRow
          ? await db.from("child_settings").update({ daily_limit_minutes: minutes }).eq("child_id", k.id)
          : await db.from("child_settings").insert({ child_id: k.id, daily_limit_minutes: minutes });
        if (!res.error) hasRow = true;
        LGA.msg(msg, res.error ? "We could not save this. Please try again." : "Saved!", res.error ? "error" : "success");
      });
      const field = el("div", "field"); field.append(label, sel);
      card.append(field, el("p", "muted", "Played today: " + used + " min"), btn, msg);
      list.append(card);
    });
  }
})();
