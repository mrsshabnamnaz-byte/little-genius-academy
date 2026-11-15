// Little Genius Academy — utils.js
// Small helpers shared by many pages. Everything lives under window.LGA.

window.LGA = window.LGA || {};

// Avatar "keys" saved in the database → pictures shown on screen.
// Only original / generic characters here (no copyrighted cartoon characters).
LGA.AVATARS = {
  lion: "🦁", panda: "🐼", rabbit: "🐰", elephant: "🐘", owl: "🦉", fox: "🦊",
  dolphin: "🐬", unicorn: "🦄", bear: "🐻", tiger: "🐯", monkey: "🐵", frog: "🐸",
  penguin: "🐧", koala: "🐨", cat: "🐱", dog: "🐶", butterfly: "🦋", octopus: "🐙",
  robot: "🤖", rocket: "🚀", dragon: "🐲", dinosaur: "🦖", fairy: "🧚", superhero: "🦸",
  mermaid: "🧜", alien: "👽", wizard: "🧙", astronaut: "🧑‍🚀"
};
LGA.avatar = (key) => LGA.AVATARS[key] || "⭐";

// Build a link that works from any folder (uses data-root on <body>).
LGA.url = (path) => (document.body.dataset.root || "") + path;

LGA.$ = (selector, root = document) => root.querySelector(selector);

// Show a message in a <p class="msg" hidden> element. type: "error" | "success" | "info"
LGA.msg = (el, text, type = "error") => {
  if (!el) return;
  el.textContent = text;           // textContent (never innerHTML) = safe from injected code
  el.className = "msg msg--" + type;
  el.hidden = false;
};
LGA.clearMsg = (el) => { if (el) { el.hidden = true; el.textContent = ""; } };

// Disable a button while something is loading.
LGA.setBusy = (btn, busy, busyText = "Please wait…") => {
  if (!btn) return;
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = busyText; }
  else if (btn.dataset.label) { btn.textContent = btn.dataset.label; }
  btn.disabled = busy;
};

// Warn clearly if the Supabase keys are missing.
LGA.checkConfigured = () => {
  if (window.lgaConfigured) return true;
  const main = document.getElementById("main");
  if (main) {
    const box = document.createElement("p");
    box.className = "msg msg--error";
    box.style.margin = "16px";
    box.textContent = "Supabase is not connected yet. " +
      (window.lgaConfigReason || "Open js/config.js and paste your Project URL and publishable key.");
    main.prepend(box);
  }
  return false;
};

// Friendly text for common database errors.
LGA.friendlyError = (error) => {
  const m = (error && error.message) || "";
  if (/Maximum of 10/i.test(m)) return "You can add up to 10 children.";
  // A table or function is missing = a database SQL file was not run yet (owner setup step)
  if ((error && (error.code === "PGRST205" || error.code === "42P01" || error.code === "PGRST202")) || /could not find the (table|function)|does not exist/i.test(m)) {
    return "This page needs one more setup step in Supabase (run database/reports.sql and database/achievements.sql). Please ask the website owner.";
  }
  if (/network|fetch/i.test(m)) return "Network problem. Please check your internet and try again.";
  return "Something went wrong. Please try again.";
};

// A small message at the bottom of the screen (for new badges).
LGA.toast = (text) => {
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.remove(), 4500);
};

// Ask the database to award any badges this child has now earned (the database decides, not the browser).
LGA.checkAchievements = async (childId) => {
  try {
    const { data, error } = await window.lgaDb.rpc("check_achievements", { p_child_id: childId });
    if (error || !Array.isArray(data)) return [];
    data.forEach((b, i) => setTimeout(() => {
      LGA.toast("🏆 New badge: " + b.title + "!");
      if (LGA.sound) LGA.sound.speak("New badge! " + b.title, true);
    }, i * 1500));
    return data;
  } catch (e) { return []; }   // badges are a bonus; never break learning
};

// Remember how long a finished activity took (used for weekly reports and the daily time limit).
LGA.logSession = async (childId, seconds, kind) => {
  try {
    await window.lgaDb.from("learning_sessions").insert({
      child_id: childId, kind, seconds: Math.max(0, Math.min(Math.round(seconds), 7200))
    });
  } catch (e) { /* reports are a bonus; never break learning */ }
};

// Local midnight today (the "day" for screen time follows the family's own clock).
LGA.todayStart = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

// If the parent set a daily limit and it is used up, send the child to the break page.
// Returns true when the child may continue.
LGA.enforceTimeLimit = async (childId) => {
  try {
    const db = window.lgaDb;
    const { data: set } = await db.from("child_settings").select("daily_limit_minutes").eq("child_id", childId).maybeSingle();
    if (!set || !set.daily_limit_minutes) return true;
    const { data: rows } = await db.from("learning_sessions").select("seconds")
      .eq("child_id", childId).gte("created_at", LGA.todayStart().toISOString());
    const used = (rows || []).reduce((t, r) => t + r.seconds, 0);
    if (used >= set.daily_limit_minutes * 60) { window.location.replace(LGA.url("child/time-up.html")); return false; }
  } catch (e) { /* if settings cannot be read, do not block the child */ }
  return true;
};

// Helpers used by the homepage 3D scene.
LGA.prefersReducedMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
LGA.hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
  } catch (e) { return false; }
};
