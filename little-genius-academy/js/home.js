// Homepage only: hides the loading screen and starts the 3D scene (with a 2D fallback).
(function () {
  const loader = document.getElementById("loader");
  const stage = document.getElementById("hero-stage");
  const minShowMs = 1600; // show the welcome screen long enough to be seen
  const started = performance.now();

  function hideLoader() {
    if (!loader) return;
    const wait = Math.max(0, minShowMs - (performance.now() - started));
    setTimeout(() => {
      loader.classList.add("hide");
      loader.setAttribute("aria-hidden", "true");
    }, LGA.prefersReducedMotion() ? 0 : wait);
  }

  async function start3D() {
    if (!stage || !LGA.hasWebGL()) return; // 2D fallback stays visible
    try {
      const mod = await import("../threejs/world-scene.js");
      mod.initWorld(stage, { reducedMotion: LGA.prefersReducedMotion() });
      stage.classList.add("has-3d");
    } catch (err) {
      console.warn("3D scene unavailable, using the 2D fallback.", err);
    }
  }

  window.addEventListener("load", () => {
    start3D().finally(hideLoader);
  });
  // Safety net: never trap the child behind the loader.
  setTimeout(hideLoader, 6000);
})();
