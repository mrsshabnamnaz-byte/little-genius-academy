// Little Genius Academy — quiz.js
// Genius Quiz: the list of quizzes, and one quiz at a time.
// Questions come from the questions_public view (NO correct answers).
// Answers are graded on the server by the submit_quiz() function.

(async function () {
  const who = await LGA.requireChild();
  if (!who) return;
  const { child } = who;
  const db = window.lgaDb;
  const out = LGA.$("#page-msg");
  const area = LGA.$("#quiz-area");
  const help = LGA.$("#quiz-help");
  LGA.$("#child-badge").textContent = LGA.avatar(child.avatar_key) + " " + child.nickname;
  LGA.sound.bindButton(LGA.$("#sound-btn"));
  LGA.fun.cornerMascot().say("Quiz time!", 2500);

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const lessonId = new URLSearchParams(location.search).get("id");

  // ---------- list of quizzes ----------
  async function showList() {
    help.textContent = "Pick a quiz!";
    const { data: subj, error: e1 } = await db.from("subjects").select("id").eq("name", "Genius Quiz").maybeSingle();
    if (e1) return LGA.msg(out, LGA.friendlyError(e1, "We could not load the quizzes. Please refresh the page."));
    area.replaceChildren();
    if (!subj) { area.append(el("p", "muted center", "No quizzes yet. Ask a grown-up to add them!")); return; }
    const { data, error } = await db.from("lessons").select("id, title, description").eq("subject_id", subj.id).order("sort_order");
    if (error) return LGA.msg(out, LGA.friendlyError(error, "We could not load the quizzes. Please refresh the page."));
    if (!data.length) { area.append(el("p", "muted center", "No quizzes yet. Please check back soon!")); return; }
    const grid = el("div", "grid grid--3");
    data.forEach((q) => {
      const a = el("a", "world-card");
      a.href = "quiz.html?id=" + encodeURIComponent(q.id);
      const ic = el("div", "card__icon", "🧠"); ic.setAttribute("aria-hidden", "true");
      a.append(ic, el("h3", "", q.title), el("p", "muted", q.description || ""));
      grid.append(a);
    });
    area.append(grid);
  }

  // ---------- one quiz ----------
  async function runQuiz(id) {
    const { data: lesson } = await db.from("lessons").select("title").eq("id", id).maybeSingle();
    const { data: qs, error } = await db.from("questions_public")
      .select("id, question_text, options, sort_order").eq("lesson_id", id).order("sort_order");
    if (error) return LGA.msg(out, LGA.friendlyError(error, "We could not load this quiz. Please refresh the page."));
    area.replaceChildren();
    if (!qs || !qs.length) { area.append(el("p", "muted center", "This quiz has no questions yet.")); return; }
    help.textContent = lesson ? lesson.title : "";

    const answers = {};
    const t0 = Date.now();
    let i = 0;

    function ask() {
      area.replaceChildren();
      const q = qs[i];
      area.append(el("p", "muted center", "Question " + (i + 1) + " of " + qs.length));
      area.append(el("h2", "center", q.question_text));
      LGA.sound.speak(q.question_text, true);
      const opts = el("div", "choices");
      (Array.isArray(q.options) ? q.options : []).forEach((o) => {
        const b = el("button", "choice", String(o));
        b.type = "button";
        b.addEventListener("click", () => {
          answers[q.id] = o;               // saved only in memory; graded on the server at the end
          opts.querySelectorAll("button").forEach((x) => { x.disabled = true; });
          b.classList.add("is-picked");
          setTimeout(() => { i++; i < qs.length ? ask() : finish(); }, 450);
        });
        opts.append(b);
      });
      area.append(opts);
    }

    async function finish() {
      area.replaceChildren(el("p", "muted center", "Checking your answers…"));
      const { data, error: e } = await db.rpc("submit_quiz", { p_child_id: child.id, p_lesson_id: id, p_answers: answers });
      area.replaceChildren();
      if (e) {
        LGA.msg(out, LGA.friendlyError(e, "We could not check your quiz. Please try again."));
        const r = el("button", "btn", "Try again"); r.type = "button"; r.addEventListener("click", () => location.reload());
        area.append(r);
        return;
      }
      LGA.logSession(child.id, Math.min(Math.round((Date.now() - t0) / 1000), 1800), "lesson");
      const ratio = data.correct_answers / data.total_questions;
      const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
      const box = el("div", "reward");
      box.append(el("div", "reward__stars", "⭐".repeat(stars)));
      box.append(el("h2", "", "Great job, " + child.nickname + "!"));
      box.append(el("p", "", "You got " + data.correct_answers + " out of " + data.total_questions + " right."));
      // Show the explanation only for questions answered wrong
      const wrong = (data.details || []).filter((d) => !d.is_correct && d.explanation);
      if (wrong.length) {
        box.append(el("p", "muted", "Let's learn:"));
        wrong.forEach((d) => box.append(el("p", "", "• " + d.explanation)));
      }
      const actions = el("div", "reward__actions");
      const again = el("a", "btn btn--sun", "Try again"); again.href = "quiz.html?id=" + encodeURIComponent(id);
      const more = el("a", "btn", "More quizzes"); more.href = "quiz.html";
      actions.append(again, more); box.append(actions);
      area.append(box);
      LGA.sound.tone(true);
      LGA.sound.speak("Great job, " + child.nickname + "!", true);
      LGA.fun.confetti();
    }
    ask();
  }

  if (lessonId) runQuiz(lessonId); else showList();
})();
