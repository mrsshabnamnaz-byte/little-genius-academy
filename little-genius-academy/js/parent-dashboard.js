// Little Genius Academy — parent-dashboard.js
// Handles the three parent pages: choose-child, dashboard, add-child (also used for editing).
// The database (RLS) guarantees a parent only ever receives THEIR OWN children,
// even if someone tampers with this code in the browser.

(async function () {
  const page = document.body.dataset.page;
  const session = await LGA.requireParent();
  if (!session) return;
  const db = window.lgaDb;

  // Header on parent pages: show who is logged in + logout
  const who = LGA.$("#who");
  if (who) who.textContent = session.user.email;
  const logoutBtn = LGA.$("#logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", LGA.logout);

  async function loadChildren() {
    const { data, error } = await db
      .from("children")
      .select("id, nickname, avatar_key, learning_level_id, learning_levels(name)")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  }

  // ---------- Page: choose-child ("Who is learning today?") ----------
  async function initChoose() {
    const grid = LGA.$("#child-grid"), out = LGA.$("#page-msg");
    try {
      const kids = await loadChildren();
      grid.replaceChildren();
      if (!kids.length) {
        LGA.$("#empty").hidden = false;
        return;
      }
      kids.forEach((k) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "child-tile";
        b.innerHTML = '<span class="child-tile__avatar" aria-hidden="true"></span><span class="child-tile__name"></span>';
        b.querySelector(".child-tile__avatar").textContent = LGA.avatar(k.avatar_key);
        b.querySelector(".child-tile__name").textContent = k.nickname;
        b.setAttribute("aria-label", "Start learning as " + k.nickname);
        b.addEventListener("click", () => {
          try { sessionStorage.setItem("lga-child", k.id); } catch (e) { /* ignore */ }
          window.location.href = LGA.url("child/dashboard.html");
        });
        grid.append(b);
      });
    } catch (e) {
      grid.replaceChildren();
      LGA.msg(out, LGA.friendlyError(e));
    }
  }

  // ---------- Page: dashboard ----------
  async function initDashboard() {
    const list = LGA.$("#child-cards"), out = LGA.$("#page-msg");
    try {
      const [kids, prog] = await Promise.all([
        loadChildren(),
        db.from("child_progress").select("child_id, status, time_spent_seconds")
      ]);
      if (prog.error) throw prog.error;
      LGA.$("#stat-children").textContent = kids.length;

      const stats = {};
      let totalDone = 0, totalSecs = 0;
      prog.data.forEach((r) => {
        const s = (stats[r.child_id] = stats[r.child_id] || { done: 0, secs: 0 });
        if (r.status === "completed") { s.done++; totalDone++; }
        s.secs += r.time_spent_seconds; totalSecs += r.time_spent_seconds;
      });
      LGA.$("#stat-lessons").textContent = totalDone;
      LGA.$("#stat-time").textContent = Math.round(totalSecs / 60) + " min";

      list.replaceChildren();
      if (!kids.length) { LGA.$("#empty").hidden = false; return; }

      kids.forEach((k) => {
        const s = stats[k.id] || { done: 0, secs: 0 };
        const card = document.createElement("article");
        card.className = "card child-card";
        card.innerHTML =
          '<div class="child-card__head"><span class="child-card__avatar" aria-hidden="true"></span>' +
          '<div><h3></h3><p class="muted level"></p></div></div>' +
          '<p class="muted stats"></p>' +
          '<div class="child-card__actions"></div>';
        card.querySelector(".child-card__avatar").textContent = LGA.avatar(k.avatar_key);
        card.querySelector("h3").textContent = k.nickname;
        card.querySelector(".level").textContent = k.learning_levels ? k.learning_levels.name : "No level chosen";
        card.querySelector(".stats").textContent =
          s.done + " lessons completed · " + Math.round(s.secs / 60) + " min of learning";
        const actions = card.querySelector(".child-card__actions");

        const edit = document.createElement("a");
        edit.className = "btn btn--ghost btn--small";
        edit.href = "add-child.html?id=" + encodeURIComponent(k.id);
        edit.textContent = "Edit";

        const del = document.createElement("button");
        del.type = "button";
        del.className = "btn btn--danger btn--small";
        del.textContent = "Delete";
        del.addEventListener("click", async () => {
          const ok = window.confirm(
            "Delete " + k.nickname + "'s profile and ALL their learning records? This cannot be undone.");
          if (!ok) return;
          const { error } = await db.from("children").delete().eq("id", k.id);
          if (error) return LGA.msg(out, LGA.friendlyError(error));
          initDashboard();
        });
        actions.append(edit, del);
        list.append(card);
      });
    } catch (e) {
      list.replaceChildren();
      LGA.msg(out, LGA.friendlyError(e));
    }
  }

  // ---------- Page: add-child (also edit when ?id=... is present) ----------
  async function initAddChild() {
    const form = LGA.$("#child-form"), out = LGA.$("#form-msg"), btn = LGA.$("#submit-btn");
    const editId = new URLSearchParams(window.location.search).get("id");
    const picker = LGA.$("#avatar-picker");
    let chosen = "lion";

    Object.entries(LGA.AVATARS).forEach(([key, emoji]) => {
      const label = document.createElement("label");
      label.className = "avatar-option";
      label.innerHTML = '<input type="radio" name="avatar" class="visually-hidden"><span aria-hidden="true"></span>';
      const input = label.querySelector("input");
      input.value = key;
      input.checked = key === chosen;
      input.setAttribute("aria-label", key);
      label.querySelector("span").textContent = emoji;
      input.addEventListener("change", () => { chosen = key; });
      picker.append(label);
    });

    // Learning levels come from the database
    const sel = form.level;
    const { data: levels, error } = await db
      .from("learning_levels").select("id, name, minimum_age, maximum_age").order("sort_order");
    if (error) return LGA.msg(out, LGA.friendlyError(error));
    levels.forEach((l) => {
      const o = document.createElement("option");
      o.value = l.id;
      o.textContent = l.name + " (ages " + l.minimum_age + "–" + l.maximum_age + ")";
      sel.append(o);
    });

    if (editId) {
      LGA.$("#form-title").textContent = "Edit child profile";
      btn.textContent = "Save changes";
      const { data: child, error: e2 } = await db.from("children").select("*").eq("id", editId).maybeSingle();
      if (e2 || !child) return LGA.msg(out, "We could not find that child profile.");
      form.nickname.value = child.nickname;
      sel.value = child.learning_level_id || "";
      chosen = child.avatar_key;
      picker.querySelectorAll("input").forEach((i) => { i.checked = i.value === chosen; });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      LGA.clearMsg(out);
      const nickname = form.nickname.value.trim();
      if (nickname.length < 1 || nickname.length > 30) return LGA.msg(out, "Please enter a nickname (up to 30 letters).");
      if (!sel.value) return LGA.msg(out, "Please choose a learning level.");
      LGA.setBusy(btn, true, "Saving…");
      const row = { nickname, avatar_key: chosen, learning_level_id: sel.value };
      // parent_id is set from the logged-in user; the database also double-checks it.
      const result = editId
        ? await db.from("children").update(row).eq("id", editId)
        : await db.from("children").insert({ ...row, parent_id: session.user.id });
      LGA.setBusy(btn, false);
      if (result.error) return LGA.msg(out, LGA.friendlyError(result.error));
      window.location.href = "dashboard.html";
    });
  }

  if (page === "choose-child") initChoose();
  if (page === "parent-dashboard") initDashboard();
  if (page === "add-child") initAddChild();
})();
