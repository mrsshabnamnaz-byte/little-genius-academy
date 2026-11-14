// Little Genius Academy — rewards.js
// Achievements page (badges) and Daily Challenge page.

(async function () {
  const page = document.body.dataset.page;      // "achievements" | "daily"
  const who = await LGA.requireChild();
  if (!who) return;
  const { child } = who;
  const db = window.lgaDb;
  const out = LGA.$("#page-msg");
  LGA.$("#child-badge").textContent = LGA.avatar(child.avatar_key) + " " + child.nickname;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // ---------------- Achievements ----------------
  if (page === "achievements") {
    const grid = LGA.$("#badge-grid");
    await LGA.checkAchievements(child.id);   // catch up on any badge not yet awarded
    const [all, mine] = await Promise.all([
      db.from("achievements").select("id, title, description").order("title"),
      db.from("child_achievements").select("achievement_id, earned_at").eq("child_id", child.id)
    ]);
    grid.replaceChildren();
    if (all.error || mine.error) return LGA.msg(out, "We could not load the badges. Please refresh the page.");
    const earned = {};
    mine.data.forEach((r) => { earned[r.achievement_id] = r.earned_at; });
    LGA.$("#badge-count").textContent = Object.keys(earned).length + " of " + all.data.length + " badges";
    all.data.forEach((a) => {
      const got = !!earned[a.id];
      const card = el("div", "badge" + (got ? " is-earned" : ""));
      card.append(el("div", "badge__icon", got ? "🏆" : "🔒"));
      card.lastChild.setAttribute("aria-hidden", "true");
      card.append(el("h3", "", a.title), el("p", "muted", a.description || ""));
      card.append(el("span", "badge__state", got ? "Earned!" : "Keep playing to earn this"));
      grid.append(card);
    });
    return;
  }

  // ---------------- Daily Challenge ----------------
  if (page === "daily") {
    // Today's game rotates every day: the same for everyone.
    const GAMES = [
      { type: "abc_match", name: "ABC Match", icon: "🔤" },
      { type: "count_and_win", name: "Count and Win", icon: "🔢" },
      { type: "memory_master", name: "Memory Master", icon: "🧠" }
    ];
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const today = GAMES[((Math.floor(midnight.getTime() / 86400000)) % GAMES.length + GAMES.length) % GAMES.length];

    const { data: game } = await db.from("games").select("id").eq("game_type", today.type);
    const gameRow = game && game[0];
    let done = false;
    if (gameRow) {
      const { data: plays } = await db.from("game_results").select("id, completed_at")
        .eq("child_id", child.id).eq("game_id", gameRow.id);
      done = (plays || []).some((r) => new Date(r.completed_at) >= midnight);
    }
    const box = LGA.$("#daily-box");
    box.replaceChildren();
    const icon = el("div", "card__icon", done ? "⭐" : today.icon); icon.setAttribute("aria-hidden", "true");
    box.append(icon);
    box.append(el("h2", "", "Today's challenge: " + today.name));
    box.append(el("p", "muted", done ? "You did it today! Come back tomorrow for a new challenge." : "Play " + today.name + " once today to complete the challenge."));
    const a = el("a", "btn " + (done ? "btn--ghost" : "btn--sun"), done ? "Play again" : "Play now");
    a.href = "play.html?type=" + today.type;
    box.append(a);
  }
})();
