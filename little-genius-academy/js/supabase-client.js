// Little Genius Academy — supabase-client.js
// Creates ONE connection to Supabase (window.lgaDb) that every page shares.
// It uses only the public URL + publishable/anon key from config.js.
// Security does not depend on this key being secret — the database rules (RLS) protect the data.

(function () {
  const cfg = window.LGA_CONFIG || {};
  const url = cfg.supabaseUrl || "";
  const key = cfg.supabaseAnonKey || "";

  const looksValid =
    url.startsWith("https://") && !url.includes("PASTE") && key.length > 20 && !key.includes("PASTE");

  // Work out the exact reason when something is wrong (shown on screen to help you fix it).
  let reason = "";
  if (url.includes("PASTE") || key.includes("PASTE")) {
    reason = "js/config.js still contains the PASTE_... text. Replace it with your Supabase Project URL and key, then press Ctrl+S to save.";
  } else if (!url.startsWith("https://")) {
    reason = "The Project URL in js/config.js must start with https:// and be inside quotes.";
  } else if (key.length <= 20) {
    reason = "The key in js/config.js looks too short. Copy the full publishable (anon) key.";
  } else if (!window.supabase) {
    reason = "The Supabase library did not load. Check your internet connection and refresh the page (Ctrl+F5).";
  }
  window.lgaConfigReason = reason;
  window.lgaConfigured = looksValid && !!window.supabase;
  window.lgaDb = window.lgaConfigured
    ? window.supabase.createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      })
    : null;
})();
