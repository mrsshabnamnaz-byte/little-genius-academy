// Little Genius Academy — admin.js
// The owner's area: a summary, game on/off switches, and lessons/stories management.
// IMPORTANT: the real protection is in the database (Row Level Security: only a profile with role = 'admin'
// can change lessons or games). The check below only decides what to SHOW. Even if someone opened this page,
// the database would refuse every change.

(async function () {
  const page = document.body.dataset.page;               // "admin" | "admin-lessons"
  const session = await LGA.requireParent();
  if (!session) return;
  const db = window.lgaDb;
  const out = LGA.$("#page-msg");

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // ---------- who is this? ----------
  LGA.$("#who").textContent = session.user && session.user.email ? session.user.email : "";
  LGA.$("#logout-btn").addEventListener("click", LGA.logout);
  const { data: me, error: meErr } = await db.from("profiles").select("role").eq("id", session.user.id).maybeSingle();
  if (meErr) { LGA.msg(out, "We could not check your account. Please refresh the page."); return; }
  if (!me || me.role !== "admin") { LGA.$("#denied").hidden = false; return; }
  LGA.$("#admin-content").hidden = false;

  // ====================== Admin home ======================
  if (page === "admin") {
    const count = async (table, f) => {
      let q = db.from(table).select("id", { count: "exact", head: true });
      if (f) q = f(q);
      const r = await q;
      return r.error ? "–" : (r.count || 0);
    };
    const [parents, children, lessonsAll, lessonsOn, gamesAll, gamesOn, lessonsDone, gamesPlayed] = await Promise.all([
      count("profiles", (q) => q.eq("role", "parent")),
      count("children"),
      count("lessons"),
      count("lessons", (q) => q.eq("is_published", true)),
      count("games"),
      count("games", (q) => q.eq("is_published", true)),
      count("child_progress", (q) => q.eq("status", "completed")),
      count("game_results")
    ]);
    const stats = LGA.$("#stats"); stats.replaceChildren();
    [["Parents", parents], ["Children", children], ["Lessons shown", lessonsOn + " of " + lessonsAll],
     ["Games shown", gamesOn + " of " + gamesAll], ["Lessons finished", lessonsDone], ["Games played", gamesPlayed]].forEach(([label, num]) => {
      const c = el("div", "card");
      c.append(el("div", "stat__num", String(num)), el("div", "stat__label", label));
      stats.append(c);
    });

    const list = LGA.$("#game-list");
    const { data: games, error } = await db.from("games").select("id, title, description, game_type, is_published").order("title");
    list.replaceChildren();
    if (error) { LGA.msg(out, "We could not load the games."); return; }
    games.forEach((g) => list.append(row(g, "games", g.game_type.replace(/_/g, " "), null)));
  }

  // one row with a "Published" switch (used for games and lessons)
  function row(item, table, meta, extra) {
    const r = el("div", "admin-row");
    const main = el("div", "admin-row__main");
    const title = el("p", "admin-row__title", item.title);
    if (!item.is_published) title.append(el("span", "badge-off", "Hidden"));
    main.append(title, el("p", "admin-row__meta", meta));
    const actions = el("div", "admin-row__actions");
    const sw = el("label", "switch");
    const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!item.is_published;
    cb.setAttribute("aria-label", "Show “" + item.title + "” to children");
    sw.append(cb, document.createTextNode("Shown"));
    cb.addEventListener("change", async () => {
      cb.disabled = true;
      const { error } = await db.from(table).update({ is_published: cb.checked }).eq("id", item.id);
      cb.disabled = false;
      if (error) { cb.checked = !cb.checked; LGA.msg(out, "We could not save that change. Are you logged in as the admin?"); return; }
      item.is_published = cb.checked;
      const old = title.querySelector(".badge-off"); if (old) old.remove();
      if (!cb.checked) title.append(el("span", "badge-off", "Hidden"));
      LGA.clearMsg(out);
    });
    actions.append(sw);
    if (extra) extra.forEach((x) => actions.append(x));
    r.append(main, actions);
    return r;
  }

  if (page !== "admin-lessons") return;

  // ====================== Lessons & stories ======================
  const list = LGA.$("#lesson-list"), filter = LGA.$("#subject-filter");
  const card = LGA.$("#story-card"), form = LGA.$("#story-form"), fmsg = LGA.$("#form-msg");
  let lessons = [], levels = [], subjects = [], editing = null;

  async function load() {
    const [l, lv, s] = await Promise.all([
      db.from("lessons").select("id, subject_id, learning_level_id, title, description, difficulty, sort_order, is_published, content, subjects(name), learning_levels(name)")
        .order("sort_order"),
      db.from("learning_levels").select("id, name").order("sort_order"),
      db.from("subjects").select("id, name").order("sort_order")
    ]);
    if (l.error || lv.error || s.error) throw (l.error || lv.error || s.error);
    lessons = l.data; levels = lv.data; subjects = s.data;
  }

  function fillLevels() {
    const sel = LGA.$("#f-level"); sel.replaceChildren();
    levels.forEach((lv) => { const o = el("option", "", lv.name); o.value = lv.id; sel.append(o); });
    const keep = filter.value;
    filter.replaceChildren(); const all = el("option", "", "All subjects"); all.value = ""; filter.append(all);
    subjects.forEach((s) => { const o = el("option", "", s.name); o.value = s.id; filter.append(o); });
    filter.value = keep;
  }

  const isStory = (les) => les.content && Array.isArray(les.content.pages);

  function render() {
    list.replaceChildren();
    const shown = lessons.filter((x) => !filter.value || x.subject_id === filter.value);
    if (!shown.length) { list.append(el("p", "muted", "No lessons here yet.")); return; }
    shown.forEach((les) => {
      const subj = les.subjects ? les.subjects.name : "";
      const meta = subj + " · " + (les.learning_levels ? les.learning_levels.name : "no level") +
        (isStory(les) ? " · " + les.content.pages.length + " pages" : "");
      const extra = [];
      if (isStory(les)) {
        const e = el("button", "btn btn--ghost btn--small", "Edit"); e.type = "button";
        e.addEventListener("click", () => openForm(les));
        extra.push(e);
      }
      const d = el("button", "btn btn--danger btn--small", "Delete"); d.type = "button";
      d.addEventListener("click", () => remove(les));
      extra.push(d);
      list.append(row(les, "lessons", meta, extra));
    });
  }

  async function remove(les) {
    if (!window.confirm("Delete “" + les.title + "”?\n\nThis also removes the children's progress for this lesson. Hiding it (the “Shown” switch) is safer.")) return;
    const { error } = await db.from("lessons").delete().eq("id", les.id);
    if (error) { LGA.msg(out, "We could not delete that lesson."); return; }
    lessons = lessons.filter((x) => x.id !== les.id); render(); LGA.clearMsg(out);
  }

  // ---------- the add / edit form ----------
  // "Pages" textarea  ⇄  [{ emoji, text }] ; pages are separated by an empty line
  let emojiRe = null;
  try { emojiRe = new RegExp("^(\\p{Extended_Pictographic}(?:\\uFE0F|\\u200D\\p{Extended_Pictographic})*)\\s+", "u"); } catch (e) { emojiRe = null; }
  function parsePages(text, kind) {
    const fallback = kind === "rhyme" ? "🎵" : "📖";
    return String(text).replace(/\r/g, "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => {
      let emoji = fallback, body = b;
      const m = emojiRe && b.match(emojiRe);
      if (m) { emoji = m[1]; body = b.slice(m[0].length).trim(); }
      return { emoji, text: body };
    });
  }
  function pagesToText(pages) {
    return pages.map((p) => (p.emoji ? p.emoji + " " : "") + p.text).join("\n\n");
  }

  function openForm(les) {
    editing = les || null;
    LGA.clearMsg(fmsg); form.reset();
    LGA.$("#form-title").textContent = les ? "Edit “" + les.title + "”" : "Add a story or rhyme";
    if (les) {
      LGA.$("#f-title").value = les.title; LGA.$("#f-kind").value = les.content.kind === "rhyme" ? "rhyme" : "story";
      LGA.$("#f-desc").value = les.description || ""; LGA.$("#f-diff").value = String(les.difficulty || 1);
      if (les.learning_level_id) LGA.$("#f-level").value = les.learning_level_id;
      LGA.$("#f-pages").value = pagesToText(les.content.pages);
    }
    card.hidden = false; card.scrollIntoView({ behavior: "smooth", block: "start" }); LGA.$("#f-title").focus();
  }
  LGA.$("#add-btn").addEventListener("click", () => openForm(null));
  LGA.$("#cancel-btn").addEventListener("click", () => { card.hidden = true; editing = null; });
  filter.addEventListener("change", render);

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); LGA.clearMsg(fmsg);
    const title = LGA.$("#f-title").value.trim(), kind = LGA.$("#f-kind").value;
    const desc = LGA.$("#f-desc").value.trim(), pages = parsePages(LGA.$("#f-pages").value, kind);
    if (!title) return LGA.msg(fmsg, "Please write a title.");
    if (!pages.length) return LGA.msg(fmsg, "Please write at least one page.");
    if (pages.length > 12) return LGA.msg(fmsg, "A story can have up to 12 pages. You have " + pages.length + ".");
    const long = pages.findIndex((p) => p.text.length > 300 || !p.text);
    if (long !== -1) return LGA.msg(fmsg, "Page " + (long + 1) + " is empty or longer than 300 letters.");
    const btn = LGA.$("#save-btn"); LGA.setBusy(btn, true, "Saving…");
    try {
      const content = { kind, pages };
      const instructions = kind === "rhyme" ? "Tap 🔊 and sing along!" : "Tap 🔊 to hear it, then tap Next.";
      let res;
      if (editing) {
        res = await db.from("lessons").update({
          title, description: desc, instructions, content, difficulty: Number(LGA.$("#f-diff").value),
          learning_level_id: LGA.$("#f-level").value || null
        }).eq("id", editing.id);
      } else {
        const subj = subjects.find((s) => s.name === "Stories and Rhymes");
        if (!subj) { LGA.msg(fmsg, "The “Stories and Rhymes” subject is missing. Please run database/stories.sql first."); return; }
        const maxSort = lessons.filter((x) => x.subject_id === subj.id).reduce((m, x) => Math.max(m, x.sort_order || 0), 0);
        res = await db.from("lessons").insert({
          subject_id: subj.id, learning_level_id: LGA.$("#f-level").value || null, title, description: desc, instructions, content,
          difficulty: Number(LGA.$("#f-diff").value), sort_order: maxSort + 1, is_published: true
        });
      }
      if (res.error) {
        const dup = /duplicate|unique/i.test(res.error.message || "");
        LGA.msg(fmsg, dup ? "A lesson with this title already exists. Please choose another title." : "We could not save. Are you logged in as the admin?");
        return;
      }
      await load(); fillLevels(); render();
      card.hidden = true; editing = null;
      LGA.msg(out, "Saved! Children can see it now.", "success");
    } catch (err) {
      LGA.msg(fmsg, LGA.friendlyError(err));
    } finally { LGA.setBusy(btn, false); }
  });

  try { await load(); fillLevels(); render(); }
  catch (e) { list.replaceChildren(); LGA.msg(out, "We could not load the lessons. Please refresh the page."); }
})();
