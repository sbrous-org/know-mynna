/* Animated background scenes for the hero.
   Each scene is a separate file in scenes/ that registers itself here and is downloaded only when picked.
   A scene is { id, name, dark, mount(host, api), unmount() }; see scenes/README.md for the contract.
   Choose the default below. "classic" is the original look with no background and is the default. */
(function () {
  "use strict";
  var DEFAULT_SCENE = "classic";
  var SCENES = [
    { id: "classic", name: "Classic" },
    { id: "hills", name: "Hills" },
    { id: "terrain", name: "Valley" },
    { id: "leaves", name: "Leaves" },
    { id: "fireflies", name: "Fireflies" },
    { id: "flock", name: "Flock" },
    { id: "river", name: "River" }
  ];
  var KEY = "mynna-scene";

  var registry = (window.MynnaBackgrounds = window.MynnaBackgrounds || {});
  registry.defs = registry.defs || {};
  registry.register = function (id, def) { registry.defs[id] = def; if (waiting[id]) { var f = waiting[id]; delete waiting[id]; f(def); } };
  var waiting = {};

  var hero = document.getElementById("hero"), host = document.getElementById("sceneHost"), row = document.getElementById("spRow");
  if (!hero || !host || !row) return;

  // the deploy stamps this script's URL with ?v=<commit>; reuse it so scene files are as fresh as the page
  var me = document.currentScript, stamp = me && /[?&]v=([^&]+)/.exec(me.src);
  var ver = stamp ? "?v=" + stamp[1] : "";
  var base = me ? me.src.replace(/[^\/?#]*([?#].*)?$/, "") : "";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var api = {
    surface: hero,
    reduced: reduce,
    isMobile: window.matchMedia("(max-width: 760px)").matches,
    textRect: function () { var c = hero.querySelector(".hero-copy"); return (c || hero).getBoundingClientRect(); }
  };
  window.matchMedia("(max-width: 760px)").addEventListener("change", function (e) { api.isMobile = e.matches; });

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; }
  var valid = function (id) { return SCENES.some(function (s) { return s.id === id; }); };

  var current = "classic", token = 0, active = null;

  function load(id) {                       // resolves with the scene definition, downloading its file the first time
    return new Promise(function (resolve, reject) {
      if (registry.defs[id]) return resolve(registry.defs[id]);
      waiting[id] = resolve;
      var s = document.createElement("script");
      s.src = base + "scenes/" + id + ".js" + ver;
      s.onerror = function () { delete waiting[id]; reject(new Error("scene failed to load")); };
      document.head.appendChild(s);
    });
  }

  function setPressed(id, busy) {
    [].slice.call(row.querySelectorAll("button")).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.id === id));
      if (b.dataset.id === id && busy) b.setAttribute("aria-busy", "true"); else b.removeAttribute("aria-busy");
      // on a narrow screen the row scrolls sideways: bring the chosen scene into view (without moving the page)
      if (b.dataset.id === id && row.scrollWidth > row.clientWidth) row.scrollTo({ left: b.offsetLeft - (row.clientWidth - b.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
    });
  }

  function stop() {
    if (active) { try { active.unmount(); } catch (e) { /* a broken scene must not break the page */ } active = null; }
    host.textContent = ""; hero.removeAttribute("data-dark");
  }

  function show(id, remember) {
    var my = ++token;
    if (remember) store(KEY, id);
    setPressed(id, id !== "classic");
    if (id === "classic") { stop(); hero.setAttribute("data-scene", "classic"); current = id; return; }
    load(id).then(function (def) {
      if (my !== token) return;                         // the visitor already picked something else
      stop();
      hero.setAttribute("data-scene", id);
      if (def.dark) hero.setAttribute("data-dark", ""); else hero.removeAttribute("data-dark");
      try { def.mount(host, api); active = def; current = id; setPressed(id, false); }
      catch (e) { stop(); hero.setAttribute("data-scene", "classic"); current = "classic"; setPressed("classic", false); }
    }, function () {
      if (my !== token) return;
      hero.setAttribute("data-scene", "classic"); current = "classic"; setPressed("classic", false);
      var b = row.querySelector('[data-id="' + id + '"]'); if (b) { b.disabled = true; b.title = "This scene could not be loaded"; b.style.opacity = ".4"; }
    });
  }

  SCENES.forEach(function (s) {
    var b = document.createElement("button");
    b.type = "button"; b.textContent = s.name; b.dataset.id = s.id; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () { if (s.id !== current) show(s.id, true); });
    row.appendChild(b);
  });

  // ?scene=river picks a scene for this visit; recordings (?rec=1) stay on the classic hero unless one is named
  var q = new URLSearchParams(location.search), asked = q.get("scene"), saved = store(KEY);
  var start = valid(asked) ? asked : (q.has("rec") ? "classic" : (valid(saved) ? saved : DEFAULT_SCENE));
  hero.setAttribute("data-scene", "classic");
  setPressed("classic", false);
  // start after the page has settled so the first paint and the mascot's entrance are not competing with a scene download
  var go = function () { show(start, false); };
  if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
})();
