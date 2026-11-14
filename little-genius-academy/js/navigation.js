// Little Genius Academy — navigation.js
// Builds the shared header and footer on every page so they are always identical.
// Each page has <body data-root="" data-page="home"> (data-root is "" for top-level pages,
// "../" for pages inside a sub-folder such as parent/).

(function () {
  const cfg = window.LGA_CONFIG;
  const root = document.body.dataset.root || "";
  const current = document.body.dataset.page || "";

  // Link list in one place → easy to add pages later.
  const links = [
    { id: "home", label: "Home", href: "index.html" },
    { id: "about", label: "About", href: "about.html" },
    { id: "levels", label: "Learning Levels", href: "learning-levels.html" }
  ];

  // Favicon on every page (set here so we do not edit each HTML file)
  if (!document.querySelector('link[rel~="icon"]')) {
    const ic = document.createElement("link");
    ic.rel = "icon"; ic.type = "image/svg+xml"; ic.href = root + "assets/favicon.svg";
    document.head.append(ic);
  }

  function renderHeader() {
    const host = document.getElementById("site-header");
    if (!host) return;
    const items = links
      .map((l) => `<a href="${root}${l.href}"${l.id === current ? ' aria-current="page"' : ""}>${l.label}</a>`)
      .join("");
    host.className = "site-header";
    host.innerHTML = `
      <div class="container">
        <div class="site-header__bar">
          <a class="brand" href="${root}index.html" aria-label="${cfg.appName} home">
            <span class="brand__logo" aria-hidden="true">★</span>${cfg.appName}
          </a>
          <button class="nav-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Open menu">☰</button>
          <nav class="nav" id="main-nav" aria-label="Main">
            ${items}
            <a class="btn btn--ghost" href="${root}login.html" data-auth-link>Log in</a>
          </nav>
        </div>
      </div>`;

    const btn = host.querySelector(".nav-toggle");
    const nav = host.querySelector(".nav");
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    const items = links.map((l) => `<li><a href="${root}${l.href}">${l.label}</a></li>`).join("");
    host.className = "site-footer";
    host.innerHTML = `
      <div class="container">
        <div class="footer__grid">
          <div>
            <strong style="font-family:var(--font-display);font-size:1.3rem;color:#fff">${cfg.appName}</strong>
            <p style="margin:.3em 0 0">${cfg.tagline}</p>
            <p class="footer__note">A safe, ad-free place for children aged 2–6 to learn through play.</p>
          </div>
          <ul class="footer__links" aria-label="Footer">${items}</ul>
        </div>
        <div class="footer__bottom">
          <p class="creator-credit creator-credit--dark creator-credit--small">${cfg.creatorCredit}</p>
          <span><a href="${root}privacy.html" style="color:inherit;text-decoration:underline">Privacy</a> · © ${new Date().getFullYear()} ${cfg.appName}</span>
        </div>
      </div>`;
  }

  // Fill every <... data-creator-credit> element so the text is never typed by hand twice.
  function fillCredits() {
    document.querySelectorAll("[data-creator-credit]").forEach((el) => {
      el.textContent = cfg.creatorCredit;
    });
  }

  // Welcome screen: shown once per browser tab session, then fades away.
  function setupLoader() {
    const loader = document.getElementById("welcome-loader");
    if (!loader) return;
    let seen = false;
    try { seen = sessionStorage.getItem("lga-welcome") === "1"; } catch (e) { /* storage may be blocked */ }
    if (seen) { loader.remove(); return; }
    const hide = () => {
      loader.classList.add("is-hidden");
      loader.addEventListener("transitionend", () => loader.remove(), { once: true });
      try { sessionStorage.setItem("lga-welcome", "1"); } catch (e) { /* ignore */ }
    };
    const wait = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 800 : 2400;
    window.addEventListener("load", () => setTimeout(hide, wait));
  }

  renderHeader();
  renderFooter();
  fillCredits();
  setupLoader();
})();
