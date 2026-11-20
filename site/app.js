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
  var stepLis = [].slice.call(document.querySelectorAll("#steps li"));
  var playBtn = document.getElementById("playBtn"), demoEl = document.getElementById("demo");
  var fit = document.getElementById("phoneFit");
  var recMode = /[?&]rec=/.test(location.search);
  var T = 0, playing = !reduce, demoVisible = false, curStep = -1;

  function stepOf(t) { for (var i = STEPS.length - 1; i >= 0; i--) if (t >= STEPS[i].s) return i; return 0; }
  var stepCap = document.getElementById("stepCap");
  function setDemo(t) {
    T = ((t % DEMO_LEN) + DEMO_LEN) % DEMO_LEN;
    render(T);
    var i = stepOf(T);
    if (i !== curStep) {
      curStep = i;
      stepLis.forEach(function (li, k) {
        li.classList.toggle("on", k === i); li.classList.toggle("done", k < i);
        li.querySelector("button").setAttribute("aria-current", k === i ? "step" : "false");
      });
      if (stepCap) stepCap.textContent = stepLis[i].querySelector("button").getAttribute("data-cap") || "";
    }
    // each pill fills as its step plays: finished steps are full, later ones empty
    var f = 100 * clamp((T - STEPS[i].s) / (STEPS[i].e - STEPS[i].s));
    stepLis.forEach(function (li, k) { li.style.setProperty("--p", (k < i ? 100 : k === i ? f.toFixed(1) : 0) + "%"); });
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
    // desktop: as big as fits the window (the phone is 740px tall at full size); phone width: fit the screen
    var ps = window.innerWidth > 900 ? Math.max(.72, Math.min(1, (window.innerHeight - 190) / 740)) : Math.min(.95, (window.innerWidth - 32) / 380);
    fit.style.setProperty("--ps", ps.toFixed(3));
  }
  fitPhone(); window.addEventListener("resize", fitPhone);
  setPlaying(playing);
  setDemo(reduce ? STEPS[0].rest : 0);

  /* ======================================================================
     Hero scene. Everything below is a function of one clock (B.t), so the page and the screen recordings agree.
       - Mynna glides in, flaps her own wing and lands, then breathes, blinks, looks around and flicks her tail
       - her head and eyes follow the pointer; the hills behind drift slightly against it (parallax)
       - clouds drift, the sun turns; a dotted trip route draws itself through the place chips and a dot travels along it
       - the scarf is two linked pieces, so it ripples like cloth
       - she talks; click her and she asks where you want to go, offers answers, and replies
     ====================================================================== */
  var wrap = document.getElementById("birdWrap"), svg = document.getElementById("heroBird");
  var B = null;
  if (wrap && svg) {
    var q = function (s) { return svg.querySelector(s); };
    var part = { hop: q(".hopper"), head: document.getElementById("birdHead"), eye: q(".eye"), jaw: q(".jaw"), scarf: q(".scarf"), scarf2: q(".scarf2"), wing: q(".wing"), tail: q(".tail"), chirp: document.getElementById("birdChirp") };
    // pivots (fill-box percentages): wing at the shoulder, scarf pieces at where each hangs from
    var origin = { hop: "50% 100%", head: "35% 95%", eye: "50% 50%", jaw: "0% 0%", scarf: "30% 4%", scarf2: "35% 4%", wing: "79% 12%", tail: "100% 15%" };
    Object.keys(origin).forEach(function (k) { if (part[k]) { part[k].style.transformBox = "fill-box"; part[k].style.transformOrigin = origin[k]; } });
    var arcs = part.chirp ? [].slice.call(part.chirp.querySelectorAll("path")) : [];
    arcs.forEach(function (p) { p.style.transformBox = "fill-box"; p.style.transformOrigin = "0% 50%"; p.style.opacity = 0; });
    var bub = document.getElementById("speech"), txt = document.getElementById("speechTxt"), opts = document.getElementById("speechOpts"), art = document.querySelector(".hero-art");
    var el = function (id) { return document.getElementById(id); };
    var S = { sun: el("sunRays"), cA: el("cloudA"), cB: el("cloudB"), far: el("hillFar"), mid: el("hillMid"), near: el("hillNear"), rp: el("routePath"), rm: el("routeMaskPath"), rd: el("routeDot") };
    var order = [".c1", ".c2", ".c4", ".c3"].map(function (c) { return document.querySelector(".hero-art " + c); });

    /* what she says. Idle: a short introduction. Click: she asks where you want to go and answers what you pick. */
    var INTRO = ["Namaste! I'm Mynna, your Northeast India trip guide.", "Planning with friends? Send them one link and we all plan in one chat.", "Waterfalls, monasteries or wildlife? I know all three.", "I flag permits and seasons, so there are no surprises on the road."];
    var TALK = {
      ask: { t: "Where are you dreaming of going?", o: [["Meghalaya", "meg"], ["Assam", "asm"], ["Sikkim", "sik"]] },
      meg: { t: "Great pick! Waterfalls, living root bridges and the clear Dawki river. Three to five days works well.", next: "go" },
      asm: { t: "Lovely. Tea gardens, Brahmaputra sunsets and Kaziranga's rhinos. Three days is plenty.", next: "go" },
      sik: { t: "Monasteries and Kanchenjunga views. Give it five or six days, and check permits for the north.", next: "go" },
      go: { t: "Shall we plan it together?", o: [["Start a trip", "start"], ["Maybe later", "idle"]] }
    };
    B = { t: 0, sx: 0, sy: 0, tx: 0, ty: 0, lastLook: -99, hopAt: -9, flapAt: -9, chirpAt: -9, li: 0, phase: "wait", at: reduce ? 0 : 2.4, line: "", spk: 0, nextFlap: 6.5, pts: null, len: 0, marks: [], node: null, convo: false };

    /* route through the visible chips, in art-local pixels */
    B.layout = function () {
      var r = art.getBoundingClientRect(), pts = [];
      order.forEach(function (c) { var b = c.getBoundingClientRect(); if (b.width > 0) pts.push({ x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2, c: c }); });
      if (pts.length < 2) { B.pts = null; return; }
      var d = "M" + pts[0].x + " " + pts[0].y, cx = r.width / 2, cy = r.height / 2;
      for (var i = 1; i < pts.length; i++) {
        var a = pts[i - 1], b = pts[i], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var vx = mx - cx, vy = my - cy, vl = Math.hypot(vx, vy) || 1;   // bow every leg outward so the route rings the bird instead of crossing it
        d += " Q" + (mx + vx / vl * 70) + " " + (my + vy / vl * 70) + " " + b.x + " " + b.y;
      }
      S.rp.setAttribute("d", d); S.rm.setAttribute("d", d); B.len = S.rp.getTotalLength(); B.pts = pts;
      B.marks = pts.map(function (p) { var best = 0, bd = 1e9; for (var s = 0; s <= B.len; s += 4) { var q2 = S.rp.getPointAtLength(s), dd = (q2.x - p.x) * (q2.x - p.x) + (q2.y - p.y) * (q2.y - p.y); if (dd < bd) { bd = dd; best = s; } } return best; });
    };

    /* speech: B.say(line, options, onDone). Options are real buttons; choosing one continues the conversation. */
    B.say = function (line, o) {
      B.line = line; B.opts = o || null; B.phase = "say"; B.at = B.t; B.shown = -1;
      opts.innerHTML = ""; bub.style.pointerEvents = "none";
    };
    B.showOpts = function () {
      if (!B.opts || opts.childNodes.length) return;
      B.opts.forEach(function (o) {
        var b = document.createElement("button"); b.type = "button"; b.textContent = o[0]; b.dataset.k = o[1];
        if (o[1] === "start") { b = document.createElement("a"); b.textContent = o[0]; b.className = "opt go"; b.href = appUrl + "/"; b.rel = "noopener"; }
        else b.className = "opt";
        opts.appendChild(b);
      });
      bub.style.pointerEvents = "auto";
    };
    B.choose = function (k) {
      var n = TALK[k];
      if (k === "idle" || !n) { B.convo = false; B.phase = "out"; B.at = B.t; bub.style.pointerEvents = "none"; return; }
      B.convo = true; B.say(n.t, n.o || null); B.next = n.next || null;
    };
    B.ask = function () { B.convo = true; B.next = null; B.say(TALK.ask.t, TALK.ask.o); };

    B.tick = function (dt) {
      B.t += dt;
      var t = B.t, k = 1 - Math.exp(-dt * 5);
      // gaze: follows the pointer; when idle she looks around in slow sweeps with pauses
      if (t - B.lastLook > 4) { var w = Math.sin(t * .5) + .5 * Math.sin(t * .83 + 1); B.tx = Math.max(-1, Math.min(1, .55 * w)); B.ty = .18 * Math.sin(t * .31 + 2); }
      B.sx += (B.tx - B.sx) * k; B.sy += (B.ty - B.sy) * k;

      // landing: glides down from above with two wing beats, then settles with a small squash
      var lu = clamp(t / 1.3), land = 1 - Math.pow(1 - lu, 3);
      var landY = (1 - land) * -90, landFlap = lu < 1 ? Math.abs(Math.sin(Math.PI * 4 * lu)) * (1 - lu) : 0;
      var squash = lu >= 1 ? 0 : (lu > .78 ? Math.sin(Math.PI * (lu - .78) / .22) * .05 : 0);
      wrap.style.opacity = clamp(t / .35).toFixed(3);
      wrap.style.transform = "translateY(" + landY.toFixed(2) + "px)";

      // speech state machine
      var talking = false, bo = 0;
      if (B.phase === "wait" && t >= B.at && !B.convo) { B.say(INTRO[B.li++ % INTRO.length], null); B.next = null; }
      if (B.phase === "say") {
        var cc = Math.min(B.line.length, Math.floor((t - B.at) * 32)); talking = cc < B.line.length; bo = clamp((t - B.at) / .3);
        if (cc !== B.shown) { B.shown = cc; txt.innerHTML = ""; var a1 = document.createElement("span"), a2 = document.createElement("span"); a2.style.visibility = "hidden"; a1.textContent = B.line.slice(0, cc); a2.textContent = B.line.slice(cc); txt.appendChild(a1); txt.appendChild(a2); }
        var doneAt = B.line.length / 32;
        if (!talking && B.opts) B.showOpts();
        if (!talking && B.opts && t - B.at > doneAt + 14) B.choose("idle");           // nobody answered: she lets it go
        else if (!talking && !B.opts && t - B.at > doneAt + (B.next ? 1.6 : 2.6)) { if (B.next) B.choose(B.next); else { B.phase = "out"; B.at = t; } }
      } else if (B.phase === "out") {
        bo = 1 - easeIO(clamp((t - B.at) / .4));
        if (t - B.at > .4) { B.phase = "wait"; B.at = t + 1.2; B.convo = false; bo = 0; opts.innerHTML = ""; }
      }
      bub.style.opacity = easeOut(bo).toFixed(3); bub.style.transform = "translateY(" + ((1 - easeOut(bo)) * 6).toFixed(2) + "px)";
      B.spk += ((talking ? 1 : 0) - B.spk) * (1 - Math.exp(-dt * 12));

      // periodic flap of her own wing
      if (t >= B.nextFlap && t > 2) { B.flapAt = t; B.nextFlap = t + 7 + 2 * Math.sin(t); }
      var fu = (t - B.flapAt) / 1.0, flap = fu >= 0 && fu < 1 ? Math.abs(Math.sin(2 * Math.PI * fu)) : 0;
      flap = Math.max(flap, landFlap);

      // hop (click)
      var hu = (t - B.hopAt) / .8, hy = 0, hs = 1, jawHop = 0;
      if (hu >= 0 && hu < 1) { hy = -22 * (1 - Math.pow(2 * hu - 1, 2)); hs = 1 - .05 * Math.max(0, 1 - hu * 7) + .035 * Math.sin(Math.PI * hu); jawHop = 11 * Math.sin(Math.PI * clamp(hu * 2)); }

      var br = Math.sin(2 * Math.PI * t / 3.8), br2 = Math.sin(2 * Math.PI * t / 3.8 + .8);
      part.hop.style.transform = "translateY(" + (hy - 5 * flap - .5 * br).toFixed(2) + "px) scale(" + (1 - .004 * br).toFixed(4) + "," + ((hs - squash) * (1 + .012 * br)).toFixed(4) + ")";
      part.head.style.transform = "translate(" + (B.sx * 7).toFixed(2) + "px," + (B.sy * 4 + .9 * br2 - 2 * flap).toFixed(2) + "px) rotate(" + (B.sx * 7 + B.sy * 2).toFixed(2) + "deg)";
      var ph = t % 4.3, bl = ph < .16 ? 1 - .92 * Math.sin(Math.PI * ph / .16) : 1;
      part.eye.style.transform = "translate(" + (B.sx * 2.8).toFixed(2) + "px," + (B.sy * 2).toFixed(2) + "px) scale(1," + bl.toFixed(3) + ")";
      part.jaw.style.transform = "rotate(" + (B.spk * 7 * (.5 + .5 * Math.sin(2 * Math.PI * 4.6 * t)) + jawHop).toFixed(2) + "deg)";
      // scarf: a slow sway driven by the breeze and her head turn, with the lower piece lagging behind the upper one
      var wind = 2.4 * Math.sin(2 * Math.PI * t / 3.4) - B.sx * 2.2 + 7 * flap;
      part.scarf.style.transform = "rotate(" + (wind * .55).toFixed(2) + "deg)";
      part.scarf2.style.transform = "rotate(" + (wind * 1.2 + 4.5 * Math.sin(2 * Math.PI * t / 3.4 - 1.2)).toFixed(2) + "deg)";
      // the wing is hers: it lifts away from the body at the shoulder and sweeps back down
      part.wing.style.transform = "rotate(" + (1.2 * Math.sin(2 * Math.PI * t / 3.8 + 1) + 36 * flap).toFixed(2) + "deg) scale(" + (1 + .08 * flap).toFixed(3) + ")";
      var flick = (t % 6.1) < .5 ? Math.sin(Math.PI * 4 * (t % 6.1)) * 7 : 0;
      part.tail.style.transform = "rotate(" + (2.2 * Math.sin(t * 1.1) + flick + 6 * flap).toFixed(2) + "deg)";
      // chirp rings
      var cu = (t - B.chirpAt) / 1.0;
      arcs.forEach(function (p, i) { var pp = clamp((cu - i * .13) / .6); p.style.opacity = (cu >= 0 && pp > 0 && pp < 1 ? Math.sin(Math.PI * pp) * .95 : 0).toFixed(3); p.style.transform = "scale(" + (1 + pp * .45).toFixed(3) + ")"; });

      // scene: slow parallax against the gaze, clouds and sun
      S.far.style.transform = "translateX(" + (-B.sx * 5).toFixed(2) + "px)";
      S.mid.style.transform = "translateX(" + (-B.sx * 10).toFixed(2) + "px)";
      S.near.style.transform = "translateX(" + (-B.sx * 16).toFixed(2) + "px)";
      S.sun.style.transform = "rotate(" + (t * 5).toFixed(2) + "deg)";
      S.cA.setAttribute("transform", "translate(" + (((t * 5 + 40) % 520) - 100).toFixed(2) + " 78)");
      S.cB.setAttribute("transform", "translate(" + (((t * 3 + 300) % 520) - 100).toFixed(2) + " 140)");

      // trip route: draws over 7s, holds, fades; the dot arrives at each chip and lights it
      if (B.pts) {
        var cyc = (t - 1.8) % 13, pr = cyc < 0 ? 0 : easeIO(clamp((cyc - .5) / 7)), fade = cyc > 10.5 ? 1 - clamp((cyc - 10.5) / 1.3) : 1;
        var L = B.len * pr;
        S.rp.style.opacity = (cyc < 0 ? 0 : fade * .9).toFixed(3);
        S.rm.style.strokeDasharray = L.toFixed(1) + " 99999";
        var pt = S.rp.getPointAtLength(Math.max(0, Math.min(B.len, L)));
        S.rd.setAttribute("cx", pt.x); S.rd.setAttribute("cy", pt.y); S.rd.style.opacity = (cyc < .3 || fade < .05 ? 0 : fade).toFixed(3);
        B.pts.forEach(function (p, i) { p.c.classList.toggle("hit", L >= B.marks[i] - 6 && cyc <= 10.5 && cyc >= 0); });
      }
    };
    B.look = function (nx, ny) { B.tx = Math.max(-1, Math.min(1, nx)); B.ty = Math.max(-1, Math.min(1, ny)); B.lastLook = B.t; };
    B.hop = function () { B.hopAt = B.t; B.flapAt = B.t; B.chirpAt = B.t; B.ask(); };
    B.layout();
    window.addEventListener("resize", B.layout);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(B.layout);
    opts.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { e.stopPropagation(); B.choose(b.dataset.k); } else e.stopPropagation(); });
    bub.addEventListener("click", function (e) { e.stopPropagation(); });
    if (!reduce) {
      window.addEventListener("pointermove", function (e) {
        var r = svg.getBoundingClientRect();
        B.look((e.clientX - (r.left + r.width * .6)) / (window.innerWidth * .4), (e.clientY - (r.top + r.height * .35)) / (window.innerHeight * .4));
      }, { passive: true });
      wrap.addEventListener("click", B.hop);
    }
    B.tick(0);
    if (reduce) {
      B.t = 3; txt.textContent = INTRO[0]; B.phase = "hold"; bub.style.opacity = 1; wrap.style.opacity = 1; wrap.style.transform = "";
      if (B.pts) { S.rp.style.opacity = .9; S.rm.style.strokeDasharray = "99999 0"; }
    }
  }

  /* ---- floating "Start a trip": shown while neither the hero nor the closing banner is on screen ---- */
  (function () {
    var fab = document.getElementById("fab"), hero = document.querySelector(".hero"), end = document.querySelector(".final-cta");
    if (!fab || !hero || !("IntersectionObserver" in window) || recMode) return;
    var onHero = true, onEnd = false;
    function sync() { var on = !onHero && !onEnd; fab.classList.toggle("show", on); fab.setAttribute("aria-hidden", on ? "false" : "true"); fab.tabIndex = on ? 0 : -1; }
    new IntersectionObserver(function (es) { onHero = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(hero);
    if (end) new IntersectionObserver(function (es) { onEnd = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(end);
  })();

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
    window.__mynna = { demo: setDemo, mascot: function (dt) { if (B) B.tick(dt); }, look: function (x, y) { if (B) B.look(x, y); }, hop: function () { if (B) B.hop(); }, choose: function (k) { if (B) B.choose(k); } };
  }
})();
