// Little Genius Academy — lesson-data.js
// Turns a simple lesson item ("A", 3, "red", "cow") into what the screen shows and says.
// The lesson LIST lives in the database; these dictionaries only add pictures and words.
// To support a new item later, just add a line to a dictionary below.

window.LGA = window.LGA || {};

LGA.DATA = {
  letters: {
    A: ["Apple", "🍎"], B: ["Ball", "⚽"], C: ["Cat", "🐱"], D: ["Dog", "🐶"], E: ["Elephant", "🐘"],
    F: ["Fish", "🐟"], G: ["Grapes", "🍇"], H: ["Hat", "🎩"], I: ["Ice cream", "🍦"], J: ["Juice", "🧃"],
    K: ["Kite", "🪁"], L: ["Lion", "🦁"], M: ["Moon", "🌙"], N: ["Nest", "🪺"], O: ["Orange", "🍊"],
    P: ["Pizza", "🍕"], Q: ["Queen", "👑"], R: ["Rainbow", "🌈"], S: ["Sun", "☀️"], T: ["Tree", "🌳"],
    U: ["Umbrella", "☂️"], V: ["Violin", "🎻"], W: ["Whale", "🐳"], X: ["Xylophone", "🎼"],
    Y: ["Yo-yo", "🪀"], Z: ["Zebra", "🦓"]
  },
  // How to say each letter name, and its phonics sound, so speech is clear for capital AND small letters.
  letterNames: { A: "ay", B: "bee", C: "see", D: "dee", E: "ee", F: "ef", G: "gee", H: "aitch", I: "eye", J: "jay",
    K: "kay", L: "el", M: "em", N: "en", O: "oh", P: "pee", Q: "cue", R: "are", S: "ess", T: "tee", U: "you",
    V: "vee", W: "double you", X: "ex", Y: "why", Z: "zee" },
  letterSounds: { A: "ah", B: "buh", C: "kuh", D: "duh", E: "eh", F: "fuh", G: "guh", H: "huh", I: "ih", J: "juh",
    K: "kuh", L: "luh", M: "muh", N: "nuh", O: "oh", P: "puh", Q: "kwuh", R: "ruh", S: "suh", T: "tuh", U: "uh",
    V: "vuh", W: "wuh", X: "ks", Y: "yuh", Z: "zuh" },
  pictures: { apple: "🍎", ball: "⚽", cat: "🐱", dog: "🐶", sun: "☀️", star: "⭐", fish: "🐟", car: "🚗", book: "📘", tree: "🌳" },
  numberWords: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"],
  colors: {
    red: "#e53935", blue: "#1e88e5", yellow: "#fdd835", green: "#43a047", orange: "#fb8c00",
    purple: "#8e24aa", pink: "#ec407a", brown: "#795548", black: "#212121", white: "#ffffff"
  },
  shapes: ["circle", "square", "triangle", "star", "heart", "rectangle", "oval", "diamond"],
  shapeColors: {
    circle: "#ff8a65", square: "#4cc3ff", triangle: "#5fdcb0", star: "#ffd84a",
    heart: "#ec407a", rectangle: "#9b7bff", oval: "#43a047", diamond: "#fb8c00"
  },
  animals: {
    cow: ["Cow", "🐮", "Moo"], pig: ["Pig", "🐷", "Oink"], sheep: ["Sheep", "🐑", "Baa"],
    duck: ["Duck", "🦆", "Quack"], horse: ["Horse", "🐴", "Neigh"], cat: ["Cat", "🐱", "Meow"],
    dog: ["Dog", "🐶", "Woof"], lion: ["Lion", "🦁", "Roar"], elephant: ["Elephant", "🐘", "Toot"],
    monkey: ["Monkey", "🐵", "Ooh ooh"], frog: ["Frog", "🐸", "Ribbit"], chicken: ["Chicken", "🐔", "Cluck cluck"]
  }
};

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Returns { kind, tile, word, sub, say, emoji?, color?, shape? } for any lesson item.
LGA.resolveItem = function (item) {
  const D = LGA.DATA;
  if (typeof item === "number") {
    const w = D.numberWords[item] || String(item);
    return { kind: "number", tile: String(item), word: cap(w), sub: "", say: cap(w) + ".", count: item, emoji: "🍎" };
  }
  const text = String(item);
  if (/^[A-Z]$/.test(text) && D.letters[text]) {
    const [word, emoji] = D.letters[text];
    const name = D.letterNames[text], sound = D.letterSounds[text];
    const parts = {
      name: name + ".",
      sound: sound + ".",
      word: name + " is for " + word + "."
    };
    return { kind: "letter", tile: text + text.toLowerCase(), word, sub: text + " is for " + word, emoji, parts,
             say: [parts.name, parts.sound, parts.word] };
  }
  if (D.colors[text]) {
    return { kind: "color", tile: "", word: cap(text), sub: "", color: D.colors[text], say: cap(text) + "." };
  }
  if (D.shapes.includes(text)) {
    return { kind: "shape", tile: "", word: cap(text), sub: "", shape: text, color: D.shapeColors[text], say: cap(text) + "." };
  }
  if (D.animals[text]) {
    const [word, emoji, sound] = D.animals[text];
    return { kind: "animal", tile: emoji, word, sub: "Says " + sound + "!", emoji,
             say: word + ". The " + word.toLowerCase() + " says " + sound + "!" };
  }
  return { kind: "other", tile: text, word: text, sub: "", say: text };
};

// Build the picture part of an item (as DOM, using textContent only).
LGA.itemVisual = function (info, big) {
  const box = document.createElement("span");
  box.className = "visual" + (big ? " visual--big" : "");
  box.setAttribute("aria-hidden", "true");
  if (info.kind === "color") {
    const sw = document.createElement("span");
    sw.className = "swatch"; sw.style.background = info.color;
    box.append(sw);
  } else if (info.kind === "shape") {
    if (info.shape === "heart") {
      const h = document.createElement("span");
      h.className = "heart"; h.style.color = info.color; h.textContent = "♥";
      box.append(h);
    } else {
      const sh = document.createElement("span");
      sh.className = "shape shape--" + info.shape; sh.style.background = info.color;
      box.append(sh);
    }
  } else if (info.kind === "number" && big) {
    const n = document.createElement("span");
    n.className = "visual__text"; n.textContent = info.tile;
    box.append(n);
  } else {
    box.textContent = info.tile;
    box.classList.add("visual--text");
  }
  return box;
};
