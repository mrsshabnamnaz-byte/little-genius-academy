// Little Genius Academy — child-dashboard.js
// The child's home screen. The parent is still the logged-in account;
// the child is only a profile the parent picked.
// Going back to the parent area needs a small "grown-ups only" question.

(async function () {
  const session = await LGA.requireParent();
  if (!session) return;
  const db = window.lgaDb;

  let childId = null;
  try { childId = sessionStorage.getItem("lga-child"); } catch (e) { /* ignore */ }
  if (!childId) { window.location.replace(LGA.url("parent/choose-child.html")); return; }

  // Ask the database for this child. RLS only returns it if the logged-in parent owns it.
  const { data: child } = await db
    .from("children").select("id, nickname, avatar_key, learning_levels(name)").eq("id", childId).maybeSingle();
  if (!child) { window.location.replace(LGA.url("parent/choose-child.html")); return; }
  if (!(await LGA.enforceTimeLimit(child.id))) return;

  LGA.$("#child-avatar").textContent = LGA.avatar(child.avatar_key);
  LGA.$("#child-name").textContent = "Hi, " + child.nickname + "!";
  const sparky = LGA.fun.mascot(LGA.$("#mascot-slot"));
  sparky.say("Hi " + child.nickname + "! Let's play!", 4500);
  LGA.$("#child-level").textContent = child.learning_levels ? child.learning_levels.name : "";

  // Simple progress bar: completed lessons / published lessons
  const [done, total] = await Promise.all([
    db.from("child_progress").select("id", { count: "exact", head: true }).eq("child_id", child.id).eq("status", "completed"),
    db.from("lessons").select("id", { count: "exact", head: true })
  ]);
  const d = done.count || 0, t = total.count || 0;
  const bar = LGA.$("#progress-bar");
  bar.style.width = (t ? Math.round((d / t) * 100) : 0) + "%";
  LGA.$("#progress-text").textContent = d + " of " + t + " lessons done";
  LGA.$("#progress-track").setAttribute("aria-valuenow", String(t ? Math.round((d / t) * 100) : 0));

  // ----- Parent gate: a grown-up question before leaving child mode -----
  const gate = LGA.$("#gate"), form = LGA.$("#gate-form"), q = LGA.$("#gate-question"), out = LGA.$("#gate-msg");
  let answer = 0;
  function newQuestion() {
    const a = 6 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 7);
    answer = a + b;
    q.textContent = "What is " + a + " + " + b + " ?";
    form.reset(); LGA.clearMsg(out);
  }
  LGA.$("#parent-btn").addEventListener("click", () => { newQuestion(); gate.hidden = false; form.answer.focus(); });
  LGA.$("#gate-cancel").addEventListener("click", () => { gate.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") gate.hidden = true; });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (Number(form.answer.value) === answer) {
      try { sessionStorage.removeItem("lga-child"); } catch (err) { /* ignore */ }
      window.location.href = LGA.url("parent/dashboard.html");
    } else {
      newQuestion(); LGA.msg(out, "Not quite. Please ask a grown-up to help.");
    }
  });

  LGA.$("#switch-btn").addEventListener("click", () => {
    try { sessionStorage.removeItem("lga-child"); } catch (e) { /* ignore */ }
    window.location.href = LGA.url("parent/choose-child.html");
  });
})();
