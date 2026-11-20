/* Mynna landing page behaviour. No dependencies, no build. */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- where "Start" buttons go: <meta name="mynna-app-url">, overridable with ?app= for testing ---- */
  var meta = document.querySelector('meta[name="mynna-app-url"]');
  var appUrl = (meta && meta.content || "").replace(/\/+$/, "");
  document.querySelectorAll("[data-app]").forEach(function (a) {
    a.href = appUrl + (a.getAttribute("data-path") || "/");
    a.rel = "noopener";
  });

  /* ---- packages: card art is generated SVG, so there are no image files to ship ---- */
  var RAIL = document.getElementById("rail");
  function art(p) {
    var c = p.pal, W = 320, H = 170, o = "";
    o += '<defs><linearGradient id="sk-' + p.id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c[0] + '"/><stop offset="1" stop-color="' + c[1] + '"/></linearGradient></defs>';
    o += '<rect width="' + W + '" height="' + H + '" fill="url(#sk-' + p.id + ')"/>';
    o += '<circle cx="250" cy="48" r="22" fill="#fff" opacity=".75"/>';
    if (p.art === "peaks") {
      o += '<path d="M0 120 L60 52 L100 96 L150 30 L215 108 L262 62 L320 118 L320 170 L0 170Z" fill="' + c[2] + '"/>';
      o += '<path d="M150 30 L132 54 L146 50 L152 60 L162 48 L172 56Z M60 52 L48 68 L58 64 L64 70 L72 62Z" fill="#fff" opacity=".9"/>';
    } else {
      o += '<path d="M0 110 Q60 62 130 100 T260 88 T320 104 L320 170 L0 170Z" fill="' + c[2] + '"/>';
    }
    o += '<path d="M0 132 Q70 94 150 126 T320 118 L320 170 L0 170Z" fill="' + c[3] + '"/>';
    o += '<path d="M0 154 Q90 120 180 150 T320 142 L320 170 L0 170Z" fill="' + c[4] + '"/>';
    if (p.art === "falls") {
      o += '<g stroke="#fff" stroke-linecap="round" opacity=".9"><path d="M96 98 V140" stroke-width="5"/><path d="M108 100 V136" stroke-width="3"/><path d="M200 106 V146" stroke-width="4"/></g>';
    } else if (p.art === "tea") {
      o += '<g stroke="' + c[2] + '" stroke-width="2" fill="none" opacity=".8"><path d="M20 160 Q90 138 170 156"/><path d="M60 166 Q140 144 230 162"/><path d="M150 162 Q230 142 310 156"/></g>';
      o += '<path d="M268 128 l6 -22 l6 22z" fill="#6b4a2f"/>';
    } else if (p.art === "village") {
      o += '<g fill="#5b2e1a"><path d="M52 150 l16 -18 l16 18z"/><path d="M92 152 l12 -14 l12 14z"/><path d="M236 148 l18 -20 l18 20z"/></g>';
    } else if (p.art === "lake") {
      o += '<ellipse cx="170" cy="150" rx="88" ry="9" fill="#fff" opacity=".45"/>';
    }
    return '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + o + "</svg>";
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  if (RAIL && window.MYNNA_PACKAGES) {
    RAIL.innerHTML = window.MYNNA_PACKAGES.map(function (p) {
      return '<article class="pk"><div class="pk-art">' + art(p) + '<span class="pk-days">' + p.days + " days</span></div>" +
        '<div class="pk-body"><h3>' + esc(p.title) + '</h3><p class="route">' + esc(p.route) + '</p><p class="tag">' + esc(p.tag) + "</p><ul>" +
        p.highlights.map(function (h) { return '<li><svg class="ic" aria-hidden="true"><use href="#i-ok"/></svg><span>' + esc(h) + "</span></li>"; }).join("") +
        '</ul><div class="meta"><span class="pill">' + esc(p.season) + '</span><span class="pill">' + esc(p.level) + "</span>" +
        (p.note ? '<span class="pill w">' + esc(p.note) + "</span>" : "") + "</div>" +
        '<a class="btn btn-sm" data-app data-path="/?package=' + encodeURIComponent(p.id) + '" href="#">Plan this trip</a></div></article>';
    }).join("");
    RAIL.querySelectorAll("[data-app]").forEach(function (a) { a.href = appUrl + a.getAttribute("data-path"); a.rel = "noopener"; });
    var step = function () { var c = RAIL.querySelector(".pk"); return c ? c.getBoundingClientRect().width + 20 : 340; };
    document.getElementById("pkPrev").onclick = function () { RAIL.scrollBy({ left: -step(), behavior: reduce ? "auto" : "smooth" }); };
    document.getElementById("pkNext").onclick = function () { RAIL.scrollBy({ left: step(), behavior: reduce ? "auto" : "smooth" }); };
  }

  /* ======================================================================
     One clock drives everything animated. Each element in the phone replica carries its own timing:
       data-t / data-d     appear at t seconds over d seconds     data-out / data-outd   disappear
       data-fx             rise (default) | pop | fade | none      data-keep              keep its layout space while hidden
       data-tw="p a b t d" tween prop p (x, y, s, o) from a to b starting at t over d s, ";"-separated, later ones override
       data-type / data-cps   type the text out at cps characters per second
       data-on="t0 t1"     add class "on" between t0 and t1
     render(T) is a pure function of time, so the page, the step buttons and the screen recordings all show the same frames.
     ====================================================================== */
  var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var easeOut = function (x) { return 1 - Math.pow(1 - x, 3); };
  var easeIO = function (x) { return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  var num = function (el, k, d) { var v = el.getAttribute(k); return v == null ? d : parseFloat(v); };

  var scr = document.getElementById("scr");
  var items = [];
  if (scr) {
    [].slice.call(scr.querySelectorAll("[data-t],[data-tw],[data-out],[data-on],[data-type]")).forEach(function (el) {
      var it = { el: el, at: num(el, "data-t", null), d: num(el, "data-d", .45), out: num(el, "data-out", null), outd: num(el, "data-outd", .3),
        fx: el.getAttribute("data-fx") || "rise", keep: el.hasAttribute("data-keep"), tw: [], type: null, cps: num(el, "data-cps", 40), shown: -1, on: null };
      (el.getAttribute("data-tw") || "").split(";").forEach(function (s) {
        var a = s.trim().split(/\s+/); if (a.length === 5) it.tw.push({ p: a[0], a: +a[1], b: +a[2], t: +a[3], d: +a[4] });
      });
      if (el.hasAttribute("data-type")) { it.type = el.getAttribute("data-type"); it.fx = it.fx === "rise" ? "none" : it.fx; el.textContent = ""; }
      if (el.hasAttribute("data-on")) { var o = el.getAttribute("data-on").split(/\s+/).map(parseFloat); it.on = [o[0], isNaN(o[1]) ? 1e9 : o[1]]; }
      items.push(it);
    });
  }
  var dotSpans = scr ? [].slice.call(scr.querySelectorAll(".dots span")) : [];

  function render(T) {
    for (var n = 0; n < items.length; n++) {
      var it = items[n], el = it.el;
      if (it.on) el.classList.toggle("on", T >= it.on[0] && T < it.on[1]);
      var vis = !((it.at != null && T < it.at) || (it.out != null && T >= it.out + it.outd));
      if (!vis) { if (it.keep) el.style.visibility = "hidden"; else el.hidden = true; continue; }
      el.hidden = false; el.style.visibility = "";
      var p = it.at != null ? easeOut(clamp((T - it.at) / it.d)) : 1;
      var q = it.out != null ? 1 - easeIO(clamp((T - it.out) / it.outd)) : 1;
      var op = (it.fx === "none" ? 1 : p) * q, x = 0, y = 0, s = 1;
      if (it.fx === "rise") y = (1 - p) * 10; else if (it.fx === "pop") s = .94 + .06 * p;
      if (it.tw.length) {
        var tv = {};
        for (var k = 0; k < it.tw.length; k++) {
          var w = it.tw[k];
          if (tv[w.p] == null) tv[w.p] = T < w.t ? w.a : w.a + (w.b - w.a) * easeIO(clamp((T - w.t) / w.d));
          else if (T >= w.t) tv[w.p] = w.a + (w.b - w.a) * easeIO(clamp((T - w.t) / w.d));
        }
        if (tv.x != null) x += tv.x; if (tv.y != null) y += tv.y; if (tv.s != null) s *= tv.s; if (tv.o != null) op *= tv.o;
      }
      el.style.opacity = op >= .999 ? "" : op.toFixed(3);
      el.style.transform = (x || y || s !== 1) ? "translate3d(" + x.toFixed(2) + "px," + y.toFixed(2) + "px,0) scale(" + s.toFixed(4) + ")" : "";
      if (it.type != null) {
        var c = Math.max(0, Math.min(it.type.length, Math.floor((T - it.at) * it.cps)));
        if (c !== it.shown) { it.shown = c; el.textContent = it.type.slice(0, c); }
      }
    }
    for (var i = 0; i < dotSpans.length; i++) dotSpans[i].style.opacity = (.3 + .7 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * (T * 1.15 - i * .17))), 2)).toFixed(3);
  }

  /* ---- walkthrough player ---- */
  var DEMO_LEN = 40;
  var STEPS = [{ s: 0, e: 4.6, rest: 2.9 }, { s: 4.6, e: 10.4, rest: 10.2 }, { s: 10.4, e: 22.6, rest: 21.8 }, { s: 22.6, e: 30.6, rest: 30.5 }, { s: 30.6, e: 39.3, rest: 36.4 }];
  var stepLis = [].slice.call(document.querySelectorAll("#steps li:not(.ctrl)"));
  var bar = document.getElementById("bar"), playBtn = document.getElementById("playBtn"), demoEl = document.getElementById("demo");
  var fit = document.getElementById("phoneFit");
  var recMode = /[?&]rec=/.test(location.search);
  var T = 0, playing = !reduce, demoVisible = false, curStep = -1;

  function stepOf(t) { for (var i = STEPS.length - 1; i >= 0; i--) if (t >= STEPS[i].s) return i; return 0; }
  function setDemo(t) {
    T = ((t % DEMO_LEN) + DEMO_LEN) % DEMO_LEN;
    render(T);
    var i = stepOf(T);
    if (i !== curStep) {
      curStep = i;
      stepLis.forEach(function (li, k) { li.classList.toggle("on", k === i); li.querySelector("button").setAttribute("aria-current", k === i ? "step" : "false"); });
    }
    if (bar) bar.style.width = (100 * clamp((T - STEPS[i].s) / (STEPS[i].e - STEPS[i].s))).toFixed(1) + "%";
  }
  function setPlaying(p) {
    playing = p;
    if (!playBtn) return;
    playBtn.setAttribute("aria-label", p ? "Pause animation" : "Play animation");
    playBtn.innerHTML = '<svg class="ic"><use href="#' + (p ? "i-pause" : "i-play") + '"/></svg><span>' + (p ? "Pause" : "Play") + "</span>";
  }
  stepLis.forEach(function (li, k) {
    li.querySelector("button").addEventListener("click", function () { setDemo(reduce ? STEPS[k].rest : STEPS[k].s + .01); });
  });
  if (playBtn) playBtn.addEventListener("click", function () { setPlaying(!playing); });
  function fitPhone() {
    if (!fit) return;
    var ps = window.innerWidth > 900 ? .86 : Math.min(.95, (window.innerWidth - 32) / 380);
    fit.style.setProperty("--ps", ps.toFixed(3));
  }
  fitPhone(); window.addEventListener("resize", fitPhone);
  setPlaying(playing);
  setDemo(reduce ? STEPS[0].rest : 0);

  /* ======================================================================
     Hero mascot: calm, physical motion. A pose is computed from time each frame (breathing, eased blink, a slow wing shrug,
     scarf sway); eyes and head follow the pointer through critically-damped smoothing; speech bubble types out on a schedule.
     ====================================================================== */
  var wrap = document.getElementById("birdWrap"), svg = document.getElementById("heroBird");
  var B = null;
  if (wrap && svg) {
    var q = function (s) { return svg.querySelector(s); };
    var part = { hop: q(".hopper"), head: document.getElementById("birdHead"), eye: q(".eye"), jaw: q(".jaw"), scarf: q(".scarf"), wing: q(".wing") };
    var origin = { hop: "50% 100%", head: "35% 95%", eye: "50% 50%", jaw: "0% 0%", scarf: "50% 0%", wing: "85% 20%" };
    Object.keys(part).forEach(function (k) { if (part[k]) { part[k].style.transformBox = "fill-box"; part[k].style.transformOrigin = origin[k]; } });
    var bub = document.getElementById("speech");
    var LINES = ["Namaste! Where to?", "Dawki fits nicely on Day 3.", "Pack a rain jacket for Cherrapunji.", "Tawang needs a permit. I'll flag it.", "Try the living root bridges.", "Kaziranga is best from November to April.", "Send the link, I'll start the plan."];
    B = { t: 0, sx: 0, sy: 0, tx: 0, ty: 0, lastLook: -99, hopAt: -9, li: 0, phase: "wait", at: reduce ? 0 : 1.7, line: "", spk: 0 };
    B.draw = function () {
      var t = B.t, c = Math.min(B.line.length, Math.floor((t - B.at) * 30));
      var shown = B.phase === "say" ? c : B.line.length;
      bub.innerHTML = "";
      var a = document.createElement("span"), b = document.createElement("span"); b.style.visibility = "hidden";
      a.textContent = B.line.slice(0, shown); b.textContent = B.line.slice(shown); bub.appendChild(a); bub.appendChild(b);
    };
    B.say = function (line) { B.line = line; B.phase = "say"; B.at = B.t; };
    B.tick = function (dt) {
      B.t += dt;
      var t = B.t, k = 1 - Math.exp(-dt * 5.5);
      if (t - B.lastLook > 4) { B.tx = .35 * Math.sin(t * .37); B.ty = .12 * Math.sin(t * .23 + 1); }
      B.sx += (B.tx - B.sx) * k; B.sy += (B.ty - B.sy) * k;
      var u = clamp(t / 1.1), ent = easeOut(u);
      wrap.style.opacity = ent.toFixed(3); wrap.style.transform = "translateY(" + ((1 - ent) * 22).toFixed(2) + "px)";
      // speech schedule
      var len = B.line.length;
      if (B.phase === "wait" && t >= B.at) { B.line = LINES[B.li++ % LINES.length]; B.phase = "say"; B.at = t; }
      var talking = false, bo = 0;
      if (B.phase === "say") {
        var c = (t - B.at) * 30; talking = c < B.line.length; bo = clamp((t - B.at) / .3);
        if (!talking && t - B.at > B.line.length / 30 + 2.6) { B.phase = "out"; B.at = t; }
        B.draw();
      } else if (B.phase === "out") {
        bo = 1 - easeIO(clamp((t - B.at) / .4));
        if (t - B.at > .4) { B.phase = "wait"; B.at = t + 1.3; bo = 0; }
      }
      bub.style.opacity = easeOut(bo).toFixed(3); bub.style.transform = "translateY(" + ((1 - easeOut(bo)) * 6).toFixed(2) + "px)";
      B.spk += ((talking ? 1 : 0) - B.spk) * (1 - Math.exp(-dt * 12));
      // pose
      var br = Math.sin(2 * Math.PI * t / 3.8), br2 = Math.sin(2 * Math.PI * t / 3.8 + .8);
      var hu = (t - B.hopAt) / .8, hy = 0, hs = 1, jawHop = 0;
      if (hu >= 0 && hu < 1) { hy = -24 * (1 - Math.pow(2 * hu - 1, 2)); hs = 1 - .05 * Math.max(0, 1 - hu * 7) + .035 * Math.sin(Math.PI * hu); jawHop = 12 * Math.sin(Math.PI * clamp(hu * 2)); }
      part.hop.style.transform = "translateY(" + (hy - .5 * br).toFixed(2) + "px) scale(" + (1 - .004 * br).toFixed(4) + "," + (hs * (1 + .012 * br)).toFixed(4) + ")";
      part.head.style.transform = "translate(" + (B.sx * 6).toFixed(2) + "px," + (B.sy * 3.5 + .9 * br2).toFixed(2) + "px) rotate(" + (B.sx * 6 + B.sy * 2).toFixed(2) + "deg)";
      var ph = t % 4.3, bl = ph < .16 ? 1 - .92 * Math.sin(Math.PI * ph / .16) : 1;
      part.eye.style.transform = "translate(" + (B.sx * 2.6).toFixed(2) + "px," + (B.sy * 2).toFixed(2) + "px) scale(1," + bl.toFixed(3) + ")";
      var jaw = B.spk * 7 * (.5 + .5 * Math.sin(2 * Math.PI * 4.6 * t)) + jawHop;
      part.jaw.style.transform = "rotate(" + jaw.toFixed(2) + "deg)";
      part.scarf.style.transform = "rotate(" + (2.6 * Math.sin(2 * Math.PI * t / 3.2) - B.sx * 2).toFixed(2) + "deg)";
      var sc = (t - 2.5) % 9.5, shrug = sc >= 0 && sc < 1.3 ? -13 * Math.pow(Math.sin(Math.PI * sc / 1.3), 2) : 0;
      part.wing.style.transform = "rotate(" + (1.2 * Math.sin(2 * Math.PI * t / 3.8 + 1) + shrug).toFixed(2) + "deg)";
    };
    B.look = function (nx, ny) { B.tx = Math.max(-1, Math.min(1, nx)); B.ty = Math.max(-1, Math.min(1, ny)); B.lastLook = B.t; };
    B.hop = function () { B.hopAt = B.t; B.say(["Chirp! Where shall we go?", "Hello again!", "Ask me anything about the Northeast."][Math.floor(B.t) % 3]); };
    if (!reduce) {
      window.addEventListener("pointermove", function (e) {
        var r = svg.getBoundingClientRect();
        B.look((e.clientX - (r.left + r.width * .6)) / (window.innerWidth * .4), (e.clientY - (r.top + r.height * .35)) / (window.innerHeight * .4));
      }, { passive: true });
      wrap.addEventListener("click", B.hop);
    }
    B.tick(0);
    if (reduce) { B.line = LINES[0]; B.phase = "hold"; B.draw(); bub.style.opacity = 1; wrap.style.opacity = 1; wrap.style.transform = ""; }
  }

  /* ---- frame loop (skipped when recording; the recorder calls the hooks below frame by frame) ---- */
  var heroVisible = true, last = 0;
  if (!recMode) {
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { demoVisible = es[0].isIntersecting; }, { threshold: .3 }).observe(demoEl);
      if (wrap) new IntersectionObserver(function (es) { heroVisible = es[0].isIntersecting; }, { threshold: .05 }).observe(wrap);
    } else demoVisible = true;
    requestAnimationFrame(function frame(now) {
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      if (!reduce && B && heroVisible) B.tick(dt);
      if (playing && demoVisible && !reduce) setDemo(T + dt);
      requestAnimationFrame(frame);
    });
  } else {
    window.__mynna = { demo: setDemo, mascot: function (dt) { if (B) B.tick(dt); }, look: function (x, y) { if (B) B.look(x, y); }, hop: function () { if (B) B.hop(); } };
  }
})();
