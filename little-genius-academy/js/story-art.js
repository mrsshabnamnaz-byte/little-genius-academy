// Little Genius Academy — story-art.js
// Original cartoon illustrations for the storybook, drawn as SVG (no image files, nothing downloaded).
// LGA.storyArt.scene(title, pageIndex) → an SVG string, or null when there is no picture for that page.
// Every shape here is our own simple drawing.

window.LGA = window.LGA || {};

LGA.storyArt = (function () {
  const INK = "#3b3355";
  const g = (x, y, s, inner, extra) => `<g transform="translate(${x} ${y}) scale(${s || 1})"${extra || ""}>${inner}</g>`;
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r || 4}" fill="${INK}"/><circle cx="${x + 1.3}" cy="${y - 1.3}" r="${(r || 4) * 0.35}" fill="#fff"/>`;
  const smile = (x, y, w) => `<path d="M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  const cheeks = (x1, x2, y) => `<circle cx="${x1}" cy="${y}" r="5" fill="#ff9aa2" opacity=".55"/><circle cx="${x2}" cy="${y}" r="5" fill="#ff9aa2" opacity=".55"/>`;

  // ---------- backgrounds (400 x 300) ----------
  function cloud(x, y, s, col) {
    return g(x, y, s, `<ellipse cx="0" cy="0" rx="34" ry="16" fill="${col || "#fff"}"/><circle cx="-16" cy="-10" r="15" fill="${col || "#fff"}"/><circle cx="8" cy="-16" r="19" fill="${col || "#fff"}"/><circle cx="26" cy="-4" r="13" fill="${col || "#fff"}"/>`);
  }
  function sun(x, y, s, face) {
    let rays = ""; for (let i = 0; i < 12; i++) rays += `<rect x="-3" y="-44" width="6" height="14" rx="3" fill="#ffc933" transform="rotate(${i * 30})"/>`;
    return g(x, y, s, rays + `<circle r="26" fill="#ffd84a"/>` + (face ? eye(-8, -3, 3) + eye(8, -3, 3) + smile(0, 6, 8) : ""));
  }
  function star(x, y, s, col, rot) {
    return g(x, y, s, `<polygon points="0,-20 6,-6 20,-6 9,3 13,18 0,9 -13,18 -9,3 -20,-6 -6,-6" fill="${col || "#ffd84a"}" stroke="#f5b700" stroke-width="2" stroke-linejoin="round"/>`, rot ? ` transform-origin="0 0"` : "").replace('<g ', '<g ');
  }
  function bg(kind) {
    const sky = {
      day:   ["#a9e2ff", "#eaf9ff"], rain: ["#8fa6c9", "#c9d7ea"], night: ["#1f1b4d", "#4b3f93"],
      dusk:  ["#ff9e7a", "#ffd7a8"], room: ["#ffe9c9", "#fff6e6"], rainbow: ["#a9e2ff", "#eaf9ff"]
    }[kind] || ["#a9e2ff", "#eaf9ff"];
    const ground = kind === "night" ? ["#2c6b57", "#235a49"] : kind === "rain" ? ["#6fb38a", "#5aa077"] : kind === "room" ? ["#e7b98a", "#d9a574"] : ["#8fd68a", "#6cc070"];
    let s = `<defs><linearGradient id="sky${kind}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>` +
      `<rect width="400" height="300" fill="url(#sky${kind})"/>`;
    if (kind === "night") {
      [[40, 40], [90, 90], [150, 30], [220, 70], [300, 35], [360, 95], [60, 150], [340, 160], [250, 120], [120, 140]].forEach(([x, y], i) =>
        s += `<circle cx="${x}" cy="${y}" r="${i % 3 ? 2 : 3}" fill="#fff" opacity=".85"/>`);
    }
    if (kind === "day" || kind === "rainbow") s += sun(335, 52, 1) + cloud(80, 60, 1) + cloud(215, 38, .7);
    if (kind === "rain") s += cloud(90, 55, 1.2, "#7c8cab") + cloud(250, 40, 1, "#8b9abb") + cloud(335, 70, .9, "#7c8cab");
    if (kind === "dusk") s += g(80, 215, 1, `<circle r="48" fill="#ffd84a"/>`);
    if (kind === "room") s += `<rect x="30" y="30" width="110" height="90" rx="10" fill="#bfe8ff" stroke="#c98b5a" stroke-width="8"/>` + star(85, 75, .7, "#fff");
    if (kind !== "room") s += `<ellipse cx="90" cy="250" rx="190" ry="70" fill="${ground[1]}"/><ellipse cx="320" cy="262" rx="210" ry="66" fill="${ground[0]}"/>`;
    else s += `<rect y="215" width="400" height="85" fill="${ground[0]}"/>`;
    return s;
  }

  // ---------- characters and things ----------
  const duck = (x, y, s, flip) => g(x, y, s, `<g transform="scale(${flip ? -1 : 1} 1)">` +
    `<ellipse cx="0" cy="0" rx="46" ry="34" fill="#ffe14d"/><path d="M-30 -6 Q-46 -28 -26 -24 Q-14 -22 -10 -8 Z" fill="#ffd21f"/>` +
    `<ellipse cx="-4" cy="6" rx="22" ry="14" fill="#ffd21f"/><circle cx="30" cy="-30" r="24" fill="#ffe14d"/>` +
    `<path d="M50 -28 Q70 -30 66 -20 Q60 -14 48 -18 Z" fill="#ff9f3a"/>` + eye(32, -34, 4.5) + cheeks(26, 26, -20).replace(/<circle cx="26"[^>]*\/>$/, "") +
    `<path d="M-8 32 L-14 46 M10 32 L16 46" stroke="#ff9f3a" stroke-width="5" stroke-linecap="round"/></g>`);
  const frog = (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="0" rx="38" ry="28" fill="#5fcf6a"/><ellipse cx="0" cy="8" rx="24" ry="14" fill="#a6ea9a"/>` +
    `<circle cx="-18" cy="-26" r="14" fill="#5fcf6a"/><circle cx="18" cy="-26" r="14" fill="#5fcf6a"/>` + eye(-18, -27, 6) + eye(18, -27, 6) + smile(0, -6, 16) +
    `<ellipse cx="-34" cy="22" rx="14" ry="7" fill="#4cbd58"/><ellipse cx="34" cy="22" rx="14" ry="7" fill="#4cbd58"/>`);
  const puddle = (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="0" rx="90" ry="22" fill="#5bb8f0"/><ellipse cx="0" cy="-3" rx="78" ry="15" fill="#8fd3ff"/><path d="M-40 -4 Q-20 -10 0 -4" stroke="#fff" stroke-width="3" fill="none" opacity=".8" stroke-linecap="round"/><path d="M20 2 Q35 -3 50 2" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>`);
  const splash = (x, y, s) => g(x, y, s, [[-30, -30], [-12, -46], [10, -50], [30, -34], [0, -28]].map(([a, b]) => `<path d="M${a} ${b} q-5 8 0 12 q5 -4 0 -12z" fill="#7cc8f5"/>`).join(""));
  const girl = (x, y, s, arm) => g(x, y, s,
    `<path d="M-22 22 L22 22 L30 78 L-30 78 Z" fill="#ff7fa8"/><rect x="-14" y="76" width="9" height="26" rx="4" fill="#f2c5a0"/><rect x="5" y="76" width="9" height="26" rx="4" fill="#f2c5a0"/>` +
    `<ellipse cx="-10" cy="104" rx="11" ry="6" fill="#6b4fd1"/><ellipse cx="10" cy="104" rx="11" ry="6" fill="#6b4fd1"/>` +
    (arm === "up" ? `<path d="M20 30 Q44 6 40 -22" stroke="#f2c5a0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-20 30 Q-34 48 -30 64" stroke="#f2c5a0" stroke-width="9" fill="none" stroke-linecap="round"/>`
      : arm === "wave" ? `<path d="M20 30 Q50 20 54 -6" stroke="#f2c5a0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-20 30 Q-34 48 -30 64" stroke="#f2c5a0" stroke-width="9" fill="none" stroke-linecap="round"/>`
      : `<path d="M20 30 Q34 48 30 64" stroke="#f2c5a0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-20 30 Q-34 48 -30 64" stroke="#f2c5a0" stroke-width="9" fill="none" stroke-linecap="round"/>`) +
    `<circle cx="-30" cy="-10" r="12" fill="#3a2a55"/><circle cx="30" cy="-10" r="12" fill="#3a2a55"/><circle cx="0" cy="0" r="28" fill="#f2c5a0"/>` +
    `<path d="M-28 -6 Q-20 -30 0 -30 Q20 -30 28 -6 Q10 -18 -28 -6Z" fill="#3a2a55"/>` + eye(-10, 2, 3.6) + eye(10, 2, 3.6) + smile(0, 12, 7) + cheeks(-17, 17, 10));
  const balloon = (x, y, s, col) => g(x, y, s, `<path d="M0 46 Q-8 70 4 96" stroke="#7a6f92" stroke-width="2" fill="none"/><ellipse cx="0" cy="0" rx="26" ry="33" fill="${col || "#ff4d5e"}"/><ellipse cx="-9" cy="-12" rx="6" ry="10" fill="#fff" opacity=".45" transform="rotate(20 -9 -12)"/><path d="M-6 34 L6 34 L0 44Z" fill="${col || "#ff4d5e"}"/>`);
  const bird = (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="0" rx="20" ry="15" fill="#4cb5ff"/><circle cx="14" cy="-10" r="12" fill="#4cb5ff"/><path d="M24 -10 L36 -6 L24 -3Z" fill="#ffb02e"/>` + eye(17, -13, 2.8) + `<path d="M-6 0 Q-26 -14 -22 6 Q-12 12 -4 6Z" fill="#2f8fe0"/><path d="M-18 4 L-34 10 L-16 12Z" fill="#2f8fe0"/>`);
  const cat = (x, y, s) => g(x, y, s, `<path d="M30 30 Q70 20 62 -14" stroke="#ff9f3a" stroke-width="12" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="22" rx="34" ry="38" fill="#ffab4d"/><ellipse cx="0" cy="34" rx="20" ry="26" fill="#ffe0b8"/>` +
    `<path d="M-30 -28 L-26 -58 L-8 -40Z" fill="#ffab4d"/><path d="M30 -28 L26 -58 L8 -40Z" fill="#ffab4d"/><circle cx="0" cy="-22" r="30" fill="#ffab4d"/>` +
    `<path d="M-23 -30 L-22 -48 L-12 -38Z" fill="#ffb7c0"/><path d="M23 -30 L22 -48 L12 -38Z" fill="#ffb7c0"/>` + eye(-11, -24, 4) + eye(11, -24, 4) +
    `<path d="M-3 -15 L3 -15 L0 -11Z" fill="#ff7a8a"/>` + `<path d="M0 -11 Q-5 -5 -9 -8 M0 -11 Q5 -5 9 -8" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>` +
    `<path d="M-30 -14 L-48 -18 M-30 -8 L-48 -6 M30 -14 L48 -18 M30 -8 L48 -6" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>` + cheeks(-20, 20, -12));
  const puppy = (x, y, s, sad) => g(x, y, s, `<ellipse cx="0" cy="24" rx="34" ry="30" fill="#c98b5a"/><ellipse cx="0" cy="30" rx="18" ry="20" fill="#f1d2b0"/>` +
    `<ellipse cx="-30" cy="-18" rx="13" ry="26" fill="#8d5a34" transform="rotate(14 -30 -18)"/><ellipse cx="30" cy="-18" rx="13" ry="26" fill="#8d5a34" transform="rotate(-14 30 -18)"/>` +
    `<circle cx="0" cy="-18" r="28" fill="#c98b5a"/><ellipse cx="0" cy="-8" rx="15" ry="11" fill="#f1d2b0"/><ellipse cx="0" cy="-12" rx="6" ry="4.5" fill="${INK}"/>` + eye(-12, -24, 4) + eye(12, -24, 4) +
    (sad ? `<path d="M-6 0 Q0 -5 6 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M-18 -33 L-8 -29 M18 -33 L8 -29" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>` : smile(0, -3, 7) + `<path d="M0 1 q4 12 8 0z" fill="#ff7a8a"/>`));
  const bowl = (x, y, s, full) => g(x, y, s, `<ellipse cx="0" cy="0" rx="34" ry="10" fill="#fff"/>` + (full ? `<ellipse cx="0" cy="0" rx="28" ry="7" fill="#fffdf4"/>` : "") + `<path d="M-34 0 Q-30 28 0 28 Q30 28 34 0Z" fill="#6b4fd1"/><path d="M-22 10 Q0 16 22 10" stroke="#9b86ff" stroke-width="3" fill="none"/>`);
  const sheep = (x, y, s) => g(x, y, s, `<rect x="-26" y="26" width="8" height="30" rx="4" fill="#26264a"/><rect x="16" y="26" width="8" height="30" rx="4" fill="#26264a"/>` +
    [[-30, 0], [-14, -14], [8, -16], [28, -2], [30, 20], [-34, 20], [0, 8], [-12, 22], [14, 24]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="20" fill="#3b3b5c"/>`).join("") +
    `<ellipse cx="-46" cy="4" rx="17" ry="20" fill="#26264a"/><path d="M-58 -10 L-66 -20 L-50 -14Z" fill="#26264a"/>` + eye(-52, 0, 3.2) + `<path d="M-52 12 Q-47 17 -42 12" stroke="#ff9aa2" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);
  const bag = (x, y, s) => g(x, y, s, `<path d="M-20 -22 Q-26 20 -18 30 L18 30 Q26 20 20 -22Z" fill="#f4d9a8"/><path d="M-20 -22 Q0 -34 20 -22" fill="#ffe9c0" stroke="#e5c387" stroke-width="2"/><path d="M-14 -24 Q-8 -40 0 -32 Q8 -42 14 -24Z" fill="#fff"/><path d="M-10 4 L10 4" stroke="#e5c387" stroke-width="3" stroke-linecap="round"/>`);
  const boy = (x, y, s) => g(x, y, s, `<rect x="-20" y="22" width="40" height="46" rx="10" fill="#4cb5ff"/><rect x="-14" y="66" width="9" height="22" rx="4" fill="#f2c5a0"/><rect x="5" y="66" width="9" height="22" rx="4" fill="#f2c5a0"/><ellipse cx="-10" cy="90" rx="11" ry="6" fill="#26264a"/><ellipse cx="10" cy="90" rx="11" ry="6" fill="#26264a"/>` +
    `<circle cx="0" cy="0" r="26" fill="#f2c5a0"/><path d="M-26 -4 Q-24 -28 0 -28 Q24 -28 26 -4 Q10 -14 -26 -4Z" fill="#7a4a2a"/>` + eye(-9, 2, 3.4) + eye(9, 2, 3.4) + smile(0, 11, 7) + cheeks(-16, 16, 9));
  const house = (x, y, s) => g(x, y, s, `<rect x="-40" y="-20" width="80" height="60" fill="#ffd9a0"/><path d="M-52 -18 L0 -64 L52 -18Z" fill="#e8685a"/><rect x="-12" y="8" width="24" height="32" rx="4" fill="#9b6b3d"/><rect x="-34" y="-8" width="18" height="18" rx="3" fill="#bfe8ff" stroke="#fff" stroke-width="3"/><rect x="16" y="-8" width="18" height="18" rx="3" fill="#bfe8ff" stroke="#fff" stroke-width="3"/>`);
  const wall = (x, y, s) => g(x, y, s, `<rect x="-130" y="0" width="260" height="70" fill="#d9825f"/>` + [0, 1, 2].map((r) => [0, 1, 2, 3, 4, 5, 6].map((c) => `<rect x="${-130 + c * 40 + (r % 2 ? 20 : 0) - 20}" y="${r * 23 + 1}" width="38" height="21" rx="2" fill="none" stroke="#b8654a" stroke-width="2"/>`).join("")).join("") + `<rect x="-136" y="-8" width="272" height="14" rx="5" fill="#e89a78"/>`);
  const egg = (x, y, s, crack) => g(x, y, s, `<ellipse cx="0" cy="0" rx="34" ry="44" fill="#fff8ea" stroke="#e9d6b3" stroke-width="3"/>` + (crack ? `<path d="M-26 -8 L-12 0 L-2 -12 L10 2 L22 -10" stroke="#c9a87a" stroke-width="3" fill="none" stroke-linejoin="round"/>` : "") +
    eye(-11, -12, 4) + eye(11, -12, 4) + (crack ? `<path d="M-8 8 Q0 2 8 8" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` : smile(0, 4, 9)) + cheeks(-20, 20, 2));
  const eggBits = (x, y, s) => g(x, y, s, `<path d="M-50 10 Q-40 -26 -12 -8 L-18 12Z" fill="#fff8ea" stroke="#e9d6b3" stroke-width="3"/><path d="M10 14 Q26 -30 52 -4 L38 16Z" fill="#fff8ea" stroke="#e9d6b3" stroke-width="3"/><path d="M-4 24 Q16 36 34 26 L22 10 Q8 16 -4 24Z" fill="#ffd84a"/>`);
  const crown = (x, y, s) => g(x, y, s, `<path d="M-30 20 L-34 -16 L-16 0 L0 -24 L16 0 L34 -16 L30 20Z" fill="#ffd84a" stroke="#f5b700" stroke-width="3" stroke-linejoin="round"/><circle cx="-34" cy="-18" r="5" fill="#ff4d5e"/><circle cx="0" cy="-26" r="5" fill="#4cb5ff"/><circle cx="34" cy="-18" r="5" fill="#ff4d5e"/><rect x="-30" y="14" width="60" height="9" fill="#f5b700"/>`);
  const horse = (x, y, s) => g(x, y, s, `<path d="M-30 50 L-24 -2 Q-22 -34 8 -40 L24 -48 L30 -34 Q46 -22 40 0 L26 16 L22 50Z" fill="#b97a4b"/><path d="M-6 -42 Q-30 -30 -26 10" fill="none" stroke="#5b3a21" stroke-width="12" stroke-linecap="round"/>` + eye(24, -26, 3.6) + `<ellipse cx="38" cy="-6" rx="4" ry="3" fill="${INK}" opacity=".6"/>`);
  const soldier = (x, y, s) => g(x, y, s, `<rect x="-20" y="22" width="40" height="50" rx="8" fill="#4a5fd1"/><rect x="-14" y="70" width="9" height="20" rx="4" fill="#26264a"/><rect x="5" y="70" width="9" height="20" rx="4" fill="#26264a"/><circle cx="0" cy="0" r="24" fill="#f2c5a0"/><path d="M-26 -4 Q-24 -34 0 -34 Q24 -34 26 -4Z" fill="#4a5fd1"/><rect x="-28" y="-6" width="56" height="7" rx="3" fill="#3345a8"/>` + eye(-8, 6, 3.2) + eye(8, 6, 3.2) + smile(0, 14, 6));
  const cloudFace = (x, y, s) => g(x, y, s, cloud(0, 0, 1.5, "#9fb0d0").replace(/<g [^>]*>/, "<g>") + eye(-10, 2, 4) + eye(14, 2, 4) + smile(2, 14, 8));
  const drop = (x, y, s, face) => g(x, y, s, `<path d="M0 -34 Q-28 4 -22 18 Q-16 34 0 34 Q16 34 22 18 Q28 4 0 -34Z" fill="#5bb8f0" stroke="#3a99d8" stroke-width="2"/><ellipse cx="-8" cy="8" rx="4" ry="8" fill="#fff" opacity=".5"/>` + (face ? eye(-7, 12, 3.2) + eye(7, 12, 3.2) + smile(0, 21, 5) : ""));
  const umbrella = (x, y, s) => g(x, y, s, `<path d="M-60 0 Q-58 -52 0 -56 Q58 -52 60 0 Q45 -12 30 0 Q15 -12 0 0 Q-15 -12 -30 0 Q-45 -12 -60 0Z" fill="#ff5d73"/><path d="M0 -56 L0 -0" stroke="#ffd1d8" stroke-width="3"/><path d="M0 0 L0 60 Q0 74 -12 70" stroke="#7a5230" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  const rainbow = (x, y, s) => g(x, y, s, ["#ff5d73", "#ff9f3a", "#ffd84a", "#5fcf6a", "#4cb5ff", "#8a63e8"].map((c, i) => `<path d="M${-150 + i * 11} 0 A${150 - i * 11} ${150 - i * 11} 0 0 1 ${150 - i * 11} 0" stroke="${c}" stroke-width="12" fill="none"/>`).join(""));
  const bigStar = (x, y, s, face) => g(x, y, s, `<polygon points="0,-60 18,-18 62,-16 28,10 40,54 0,28 -40,54 -28,10 -62,-16 -18,-18" fill="#ffd84a" stroke="#f5b700" stroke-width="5" stroke-linejoin="round"/>` + (face ? eye(-13, -2, 5) + eye(13, -2, 5) + smile(0, 10, 11) + cheeks(-24, 24, 8) : ""));
  const sparkle = (x, y, s, col) => g(x, y, s, `<path d="M0 -20 Q2 -2 20 0 Q2 2 0 20 Q-2 2 -20 0 Q-2 -2 0 -20Z" fill="${col || "#fff"}"/>`);
  const diamond = (x, y, s) => g(x, y, s, `<path d="M-30 -10 L-16 -30 L16 -30 L30 -10 L0 32Z" fill="#8fe3ff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M-30 -10 L30 -10 M-16 -30 L-6 -10 L0 32 M16 -30 L6 -10 L0 32" stroke="#fff" stroke-width="2" fill="none" opacity=".85"/>`);
  const moon = (x, y, s, face, sleep) => g(x, y, s, `<circle r="46" fill="#fff2a8"/><circle cx="-14" cy="-12" r="8" fill="#f2e08a" opacity=".6"/><circle cx="16" cy="14" r="10" fill="#f2e08a" opacity=".6"/>` +
    (face ? (sleep ? `<path d="M-22 -4 Q-14 2 -6 -4 M6 -4 Q14 2 22 -4" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` : eye(-14, -4, 4) + eye(14, -4, 4)) + smile(0, 12, 9) + cheeks(-26, 26, 8) : ""));
  const zzz = (x, y, s) => g(x, y, s, `<text font-family="Baloo 2, Arial Rounded MT Bold, Arial" font-weight="800" font-size="26" fill="#fff">Z</text><text x="20" y="-18" font-family="Baloo 2, Arial" font-weight="800" font-size="20" fill="#fff">z</text><text x="36" y="-34" font-family="Baloo 2, Arial" font-weight="800" font-size="14" fill="#fff">z</text>`);
  const teddy = (x, y, s) => g(x, y, s, `<circle cx="-28" cy="-34" r="14" fill="#b57a4a"/><circle cx="28" cy="-34" r="14" fill="#b57a4a"/><ellipse cx="0" cy="34" rx="34" ry="38" fill="#c98b5a"/><ellipse cx="0" cy="38" rx="20" ry="24" fill="#f1d2b0"/><circle cx="0" cy="-12" r="32" fill="#c98b5a"/><ellipse cx="0" cy="0" rx="14" ry="11" fill="#f1d2b0"/><ellipse cx="0" cy="-5" rx="5" ry="4" fill="${INK}"/>` + eye(-12, -18, 3.6) + eye(12, -18, 3.6) + smile(0, 4, 6) + `<path d="M-30 20 Q-52 40 -36 56 M30 20 Q52 40 36 56" stroke="#c98b5a" stroke-width="14" fill="none" stroke-linecap="round"/>`);
  const planet = (x, y, s, col) => g(x, y, s, `<circle r="20" fill="${col}"/><ellipse rx="34" ry="8" fill="none" stroke="#fff" stroke-width="3" opacity=".7" transform="rotate(-20)"/>`);
  const heart = (x, y, s, col) => g(x, y, s, `<path d="M0 12 C-30 -8 -16 -30 0 -14 C16 -30 30 -8 0 12Z" fill="${col || "#ff6f91"}"/>`);
  const bubble = (x, y, s, text) => g(x, y, s, `<path d="M-60 -24 Q-60 -42 -42 -42 L42 -42 Q60 -42 60 -24 L60 0 Q60 18 42 18 L10 18 L-6 34 L-8 18 L-42 18 Q-60 18 -60 0Z" fill="#fff" stroke="#e3dcff" stroke-width="3"/><text x="0" y="-8" text-anchor="middle" font-family="Baloo 2, Arial Rounded MT Bold, Arial" font-weight="800" font-size="22" fill="${INK}">${text}</text>`);
  const windLines = (x, y, s) => g(x, y, s, `<path d="M0 0 Q30 -12 60 0 Q80 8 92 -4 M10 22 Q40 10 74 22 M-6 44 Q24 34 52 44" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/>`);
  const grassTuft = (x, y) => `<path d="M${x} ${y} q-4 -16 -10 -20 M${x} ${y} q0 -20 2 -26 M${x} ${y} q4 -16 12 -18" stroke="#4ea85a" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const flower = (x, y, c) => `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 20}" stroke="#4ea85a" stroke-width="3"/>` + [0, 72, 144, 216, 288].map((a) => `<circle cx="${x + 7 * Math.cos(a * Math.PI / 180)}" cy="${y + 7 * Math.sin(a * Math.PI / 180)}" r="5" fill="${c}"/>`).join("") + `<circle cx="${x}" cy="${y}" r="4" fill="#ffd84a"/>`;

  // ---------- the scenes ----------
  const D = (inner, kind) => `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg" role="img" focusable="false">${bg(kind)}${inner}</svg>`;
  const SCENES = {
    "Twinkle, Twinkle, Little Star": [
      () => D(bigStar(200, 130, 1.5, true) + sparkle(90, 80, 1) + sparkle(320, 70, .8) + sparkle(110, 200, .7) + sparkle(300, 210, 1), "night"),
      () => D(moon(80, 70, .8, true) + diamond(250, 90, 1.3) + sparkle(230, 60, .8) + sparkle(290, 110, .7) + bigStar(330, 40, .35), "night"),
      () => D(bigStar(200, 125, 1.6, true) + sparkle(70, 70, 1) + sparkle(335, 85, 1.1) + sparkle(60, 180, .8) + sparkle(345, 190, .8) + sparkle(130, 40, .6), "night")
    ],
    "Baa, Baa, Black Sheep": [
      () => D(sheep(215, 175, 1.5) + flower(60, 235, "#ff7fa8") + flower(340, 240, "#ffd84a"), "day"),
      () => D(sheep(110, 180, 1.1) + bag(250, 215, 1) + bag(300, 225, 1) + bag(350, 215, 1) + bubble(110, 90, 1, "Yes sir!"), "day"),
      () => D(boy(300, 150, 1) + bag(130, 215, 1.1) + bag(190, 225, 1.1) + sheep(80, 150, .6).replace("<g ", "<g opacity='0' "), "day"),
      () => D(house(110, 190, 1.2) + boy(300, 150, 1) + bag(235, 225, 1) + `<path d="M0 270 Q200 230 400 270" stroke="#e8c98a" stroke-width="22" fill="none" opacity=".7"/>`, "day")
    ],
    "Humpty Dumpty": [
      () => D(wall(200, 190, 1) + egg(200, 150, 1), "day"),
      () => D(crown(110, 90, 1.4) + horse(260, 150, 1) + soldier(345, 150, .9) , "day"),
      () => D(eggBits(200, 230, 1.4) + puddle(0, 0, 0).replace(/./g, "") + sparkle(120, 150, 1, "#ffd84a") + `<text x="280" y="120" font-family="Baloo 2, Arial" font-weight="800" font-size="60" fill="#ff6f91">?</text>`, "day")
    ],
    "Little Raindrop": [
      () => D(cloudFace(200, 70, 1.5) + drop(150, 180, 1, true) + drop(240, 200, .8, true) + drop(300, 150, .6, false), "day"),
      () => D(umbrella(200, 120, 1.4) + drop(110, 100, .6, false) + drop(300, 90, .6, false) + puddle(200, 262, 1.2) + drop(210, 235, .7, true), "rain"),
      () => D(rainbow(200, 220, 1.1) + drop(200, 235, 1, true) + cloud(70, 60, .9) , "rainbow")
    ],
    "Sleepy Moon": [
      () => D(moon(300, 80, .8, true) + `<circle cx="90" cy="215" r="50" fill="#ffd84a"/>` + sparkle(200, 50, .8) + sparkle(340, 160, .6), "dusk"),
      () => D(teddy(200, 190, 1.2) + bigStar(70, 60, .45) + bigStar(340, 70, .4) + bigStar(300, 150, .3), "night"),
      () => D(moon(200, 100, 1.3, true, true) + zzz(260, 80, 1) + planet(80, 80, 1, "#ff6a5a") + bigStar(330, 190, .4) + sparkle(70, 170, .7), "night")
    ],
    "Sunny the Little Duck": [
      () => D(duck(200, 195, 1.4) + flower(60, 235, "#ff7fa8") + flower(345, 245, "#ffffff") + grassTuft(120, 262), "day"),
      () => D(puddle(200, 250, 1.6) + duck(105, 190, 1) + cloud(280, 60, 1, "#9fb0d0") + drop(290, 120, .4) + drop(310, 140, .4), "rain"),
      () => D(puddle(200, 250, 1.6) + duck(200, 195, 1.1) + splash(200, 215, 1.8) + splash(150, 220, 1.2), "day"),
      () => D(puddle(200, 250, 1.6) + duck(150, 195, 1) + frog(280, 205, 1) + bubble(300, 105, .85, "Can I play?"), "day"),
      () => D(rainbow(200, 190, 1) + puddle(200, 262, 1.4) + duck(150, 215, .9) + frog(260, 225, .8) + heart(200, 120, 1), "rainbow")
    ],
    "The Red Balloon": [
      () => D(girl(160, 135, 1.05, "up") + balloon(198, 40, .8, "#ff4d5e") + flower(330, 240, "#ff9f3a") + flower(60, 245, "#ffd84a"), "day"),
      () => D(girl(110, 150, 1, "up") + balloon(260, 55, .9) + windLines(180, 120, .8) + cloud(330, 45, .7), "day"),
      () => D(girl(150, 150, 1, "wave") + balloon(300, 45, .5) + cloud(280, 90, .7), "day"),
      () => D(girl(120, 150, 1) + bird(270, 70, 1.2) + balloon(340, 50, .5) + bubble(250, 30, .7, "Tweet!").replace(/./g, (c) => c), "day"),
      () => D(cloud(110, 75, 1.2) + cloud(300, 90, 1) + balloon(200, 70, .8) + girl(200, 190, .7) + heart(310, 190, .8, "#ffb3c1"), "day")
    ],
    "The Kind Little Cat": [
      () => D(cat(160, 170, 1.2) + bowl(300, 250, 1.1, true) + flower(60, 240, "#ff7fa8"), "day"),
      () => D(cat(110, 165, 1) + puppy(290, 175, 1.1, true) + drop(330, 120, .3), "day"),
      () => D(cat(150, 175, 1.1) + puppy(310, 190, .9) + bubble(150, 60, .95, "Let's share!") + heart(250, 110, .7), "day"),
      () => D(bowl(200, 250, 1.4, true) + cat(115, 175, 1) + puppy(290, 185, .95), "day"),
      () => D(cat(150, 175, 1.1) + puppy(255, 190, 1) + heart(200, 80, 1.1) + heart(120, 90, .6, "#ffb3c1") + heart(290, 100, .6, "#ffb3c1"), "day")
    ]
  };

  function scene(title, i) {
    const list = SCENES[title];
    if (!list || !list[i]) return null;
    try { return list[i](); } catch (e) { return null; }
  }
  return { scene, has: (title) => !!SCENES[title] };
})();
