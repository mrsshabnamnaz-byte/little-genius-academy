// Little Genius Academy — auth.js
// Parent registration, login, logout, password reset and page protection.
// All real security is enforced by Supabase Auth + database rules; this file
// only talks to them and redirects people nicely.

(function () {
  const page = document.body.dataset.page || "";
  const db = window.lgaDb;

  // ---------- Page protection ----------
  // Protected pages call: await LGA.requireParent()  → returns the session or redirects.
  LGA.requireParent = async function () {
    if (!db) { LGA.checkConfigured(); return null; }
    const { data } = await db.auth.getSession();
    if (!data.session) {
      window.location.replace(LGA.url("login.html"));
      return null;
    }
    return data.session;
  };

  // Pages for children call: const ctx = await LGA.requireChild()  → { session, child } or redirects.
  LGA.requireChild = async function (opts) {
    const session = await LGA.requireParent();
    if (!session) return null;
    let id = null;
    try { id = sessionStorage.getItem("lga-child"); } catch (e) { /* ignore */ }
    const back = () => window.location.replace(LGA.url("parent/choose-child.html"));
    if (!id) { back(); return null; }
    // RLS: the database only returns this child if the logged-in parent owns it.
    const { data: child } = await window.lgaDb.from("children").select("id, nickname, avatar_key").eq("id", id).maybeSingle();
    if (!child) { back(); return null; }
    if (!(opts && opts.skipLimit) && !(await LGA.enforceTimeLimit(child.id))) return null;
    return { session, child };
  };

  LGA.logout = async function () {
    if (db) await db.auth.signOut();
    try {
      sessionStorage.removeItem("lga-child");
      Object.keys(sessionStorage).filter((k) => k.indexOf("lga-admin:") === 0).forEach((k) => sessionStorage.removeItem(k));   // forget the admin answer
    } catch (e) { /* ignore */ }
    window.location.href = LGA.url("index.html");
  };

  // Is this person the admin? Asked once per browser tab and remembered, so pages stay fast.
  async function isAdmin(uid) {
    const key = "lga-admin:" + uid;
    try {
      const c = sessionStorage.getItem(key);                     // "1:time" or "0:time"
      if (c) {
        const [v, t] = c.split(":");
        const age = Date.now() - Number(t);
        if (age < (v === "1" ? 600000 : 60000)) return v === "1";   // "no" is remembered for only 1 minute
      }
    } catch (e) { /* ignore */ }
    let ok = false;
    try {
      const { data } = await db.from("profiles").select("role").eq("id", uid).maybeSingle();
      ok = !!data && data.role === "admin";
      try { sessionStorage.setItem(key, (ok ? "1:" : "0:") + Date.now()); } catch (e) { /* ignore */ }
    } catch (e) { ok = false; }
    return ok;
  }

  // ---------- Header: switch "Log in" to "Parent Area" + Log out when signed in ----------
  async function updateHeader() {
    if (!db) return;
    const { data } = await db.auth.getSession();
    const link = document.querySelector("[data-auth-link]");
    if (!data.session || !link) return;
    link.textContent = "Parent Area";
    link.href = LGA.url("parent/choose-child.html");
    // Owners (role = admin) also get an "Admin" link. This only shows a link: the database still decides who may change what.
    if (await isAdmin(data.session.user.id)) {
      const a = document.createElement("a");
      a.href = LGA.url("admin/index.html"); a.textContent = "Admin";
      link.before(a);
    }
    const out = document.createElement("button");
    out.type = "button";
    out.className = "btn btn--ghost nav-logout";
    out.textContent = "Log out";
    out.addEventListener("click", LGA.logout);
    link.after(out);
  }

  // ---------- Forms ----------
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function wireRegister() {
    const form = LGA.$("#register-form"), out = LGA.$("#form-msg"), btn = LGA.$("#submit-btn");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      LGA.clearMsg(out);
      if (!LGA.checkConfigured()) return;
      const name = form.fullName.value.trim();
      const email = form.email.value.trim();
      const pw = form.password.value;
      if (name.length < 2) return LGA.msg(out, "Please enter your name.");
      if (!validEmail(email)) return LGA.msg(out, "Please enter a valid email address.");
      if (pw.length < 8) return LGA.msg(out, "Password must be at least 8 characters.");
      if (pw !== form.confirm.value) return LGA.msg(out, "The two passwords do not match.");
      if (!form.guardian.checked) return LGA.msg(out, "Please confirm you are a parent or legal guardian.");

      LGA.setBusy(btn, true, "Creating account…");
      const { data, error } = await db.auth.signUp({
        email, password: pw,
        options: {
          data: { full_name: name },
          emailRedirectTo: new URL("login.html", window.location.href).href
        }
      });
      LGA.setBusy(btn, false);
      if (error) return LGA.msg(out, /already|registered/i.test(error.message)
        ? "That email already has an account. Try logging in."
        : "We could not create the account: " + error.message);
      if (data.session) { window.location.href = LGA.url("parent/choose-child.html"); return; }
      form.reset();
      LGA.msg(out, "Almost done! Please check your email and click the confirmation link, then log in.", "success");
    });
  }

  function wireLogin() {
    const form = LGA.$("#login-form"), out = LGA.$("#form-msg"), btn = LGA.$("#submit-btn");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      LGA.clearMsg(out);
      if (!LGA.checkConfigured()) return;
      const email = form.email.value.trim();
      if (!validEmail(email) || !form.password.value) return LGA.msg(out, "Please enter your email and password.");
      LGA.setBusy(btn, true, "Logging in…");
      const { error } = await db.auth.signInWithPassword({ email, password: form.password.value });
      LGA.setBusy(btn, false);
      if (error) {
        return LGA.msg(out, /confirm/i.test(error.message)
          ? "Please confirm your email first (check your inbox)."
          : "Email or password is not correct.");
      }
      window.location.href = LGA.url("parent/choose-child.html");
    });
  }

  function wireForgot() {
    const form = LGA.$("#forgot-form"), out = LGA.$("#form-msg"), btn = LGA.$("#submit-btn");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      LGA.clearMsg(out);
      if (!LGA.checkConfigured()) return;
      const email = form.email.value.trim();
      if (!validEmail(email)) return LGA.msg(out, "Please enter a valid email address.");
      LGA.setBusy(btn, true, "Sending…");
      await db.auth.resetPasswordForEmail(email, {
        redirectTo: new URL("reset-password.html", window.location.href).href
      });
      LGA.setBusy(btn, false);
      // Same message whether or not the email exists (protects privacy).
      LGA.msg(out, "If that email has an account, we have sent a link to reset the password.", "success");
    });
  }

  function wireReset() {
    const form = LGA.$("#reset-form"), out = LGA.$("#form-msg"), btn = LGA.$("#submit-btn");
    if (!db) { LGA.checkConfigured(); return; }
    form.hidden = true;
    LGA.msg(out, "Checking your reset link…", "info");
    db.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") { form.hidden = false; LGA.clearMsg(out); }
    });
    setTimeout(() => {
      if (form.hidden) LGA.msg(out, "This reset link is not valid or has expired. Please request a new one.");
    }, 3000);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      LGA.clearMsg(out);
      const pw = form.password.value;
      if (pw.length < 8) return LGA.msg(out, "Password must be at least 8 characters.");
      if (pw !== form.confirm.value) return LGA.msg(out, "The two passwords do not match.");
      LGA.setBusy(btn, true, "Saving…");
      const { error } = await db.auth.updateUser({ password: pw });
      LGA.setBusy(btn, false);
      if (error) return LGA.msg(out, "Could not change the password: " + error.message);
      LGA.msg(out, "Password changed! Taking you to the app…", "success");
      setTimeout(() => { window.location.href = LGA.url("parent/choose-child.html"); }, 1200);
    });
  }

  // ---------- Start ----------
  updateHeader();
  if (page === "register") wireRegister();
  if (page === "login") wireLogin();
  if (page === "forgot") wireForgot();
  if (page === "reset") wireReset();
})();
