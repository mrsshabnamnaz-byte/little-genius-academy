// Little Genius Academy — timeup.js
// The "time for a break" page. Same grown-ups-only question as the child dashboard.
(async function () {
  const who = await LGA.requireChild({ skipLimit: true });   // this page must open even when time is up
  if (!who) return;
  const gate = LGA.$("#gate"), form = LGA.$("#gate-form"), q = LGA.$("#gate-question"), out = LGA.$("#gate-msg");
  let answer = 0;
  function newQuestion() {
    const a = 6 + Math.floor(Math.random() * 7), b = 6 + Math.floor(Math.random() * 7);
    answer = a + b; q.textContent = "What is " + a + " + " + b + " ?"; form.reset(); LGA.clearMsg(out);
  }
  LGA.$("#parent-btn").addEventListener("click", () => { newQuestion(); gate.hidden = false; form.answer.focus(); });
  LGA.$("#gate-cancel").addEventListener("click", () => { gate.hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") gate.hidden = true; });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (Number(form.answer.value) === answer) {
      try { sessionStorage.removeItem("lga-child"); } catch (err) { /* ignore */ }
      window.location.href = LGA.url("parent/settings.html");
    } else { newQuestion(); LGA.msg(out, "Not quite. Please ask a grown-up to help."); }
  });
  LGA.$("#switch-btn").addEventListener("click", () => {
    try { sessionStorage.removeItem("lga-child"); } catch (e) { /* ignore */ }
    window.location.href = LGA.url("parent/choose-child.html");
  });
})();
