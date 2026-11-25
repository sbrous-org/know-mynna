/* Neon Coast: an 80s neon-Miami sunset (striped sun, palms, skyline, neon grid road). Canvas 2D, no libraries.
   Original artwork in a generic synthwave style. Follows the scene contract in scenes/README.md. */
(function () {
  "use strict";
  var ID = "neon";
  var S = null;

  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var lerp = function (a, b, u) { return a + (b - a) * u; };
  function rng(seed) { var s = seed >>> 0; return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  function mount(host, api) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
    host.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) { host.style.background = "linear-gradient(#1a0b3d,#8f1f7a 60%,#ff4f8b)"; S = { fallback: true, host: host }; return; }

    var st = {
      host: host, api: api, canvas: canvas, ctx: ctx, W: 0, H: 0, dpr: 1, hy: 0, mobile: false,
      t: 3.2, grid: 0, speed: 0.5, boost: 0, flash: 0, pressed: false,
      tx: 0, ty: 0, sx: 0, sy: 0, lastX: 0, vel: 0,
      stars: [], palms: [], rings: [], sparks: [], shoot: null, nextShoot: 4,
      sky: null, floorG: null, lineG: null, overlay: null, vlines: null,
      far: null, near: null, sunC: null, sunCtx: null, R: 0, sunX: 0, sunY: 0, beacons: [], clouds: [],
      raf: 0, running: false, last: 0, visible: true, ro: null, io: null, listeners: []
    };
    S = st;

    /* ---------- layout and static art ---------- */
    function skylineLayer(w, h, seed, base, top, litChance, tall) {
      var c = document.createElement("canvas"); c.width = Math.round(w * st.dpr); c.height = Math.round(h * st.dpr);
      var x = c.getContext("2d"); x.scale(st.dpr, st.dpr);
      var r = rng(seed), px = 0, beacons = [];
      var cols = ["#4df3ff", "#ff4fa3", "#ffd36b", "#9b7bff"];
      while (px < w) {
        var bw = 16 + r() * (st.mobile ? 30 : 42), bh = h * (0.28 + r() * 0.5) * (r() < tall ? 1.35 : 1);
        bh = Math.min(bh, h - 2);
        var g = x.createLinearGradient(0, h - bh, 0, h); g.addColorStop(0, top); g.addColorStop(1, base);
        x.fillStyle = g; x.fillRect(px, h - bh, bw, bh);
        if (r() < 0.3) { x.fillRect(px + bw * 0.4, h - bh - 8 - r() * 16, 1.6, 20); beacons.push({ x: px + bw * 0.4 + 0.8, y: h - bh - 10 }); }   // antenna with a blinking light
        for (var wy = h - bh + 6; wy < h - 4; wy += 7) for (var wx = px + 3; wx < px + bw - 3; wx += 6) {
          if (r() < litChance) { x.globalAlpha = 0.35 + r() * 0.55; x.fillStyle = cols[(r() * cols.length) | 0]; x.fillRect(wx, wy, 2.2, 3); }
        }
        x.globalAlpha = 1; px += bw + (r() < 0.25 ? 3 + r() * 6 : 0.5);
      }
      return { c: c, w: w, h: h, beacons: beacons };
    }
    function build() {
      var W = st.W, H = st.H, hy = st.hy, r = rng(7);
      st.sky = ctx.createLinearGradient(0, 0, 0, hy);
      [[0, "#070624"], [0.3, "#1f0b4a"], [0.55, "#6a1a82"], [0.78, "#e63a86"], [1, "#ff9a4d"]].forEach(function (s) { st.sky.addColorStop(s[0], s[1]); });
      st.floorG = ctx.createLinearGradient(0, hy, 0, H); st.floorG.addColorStop(0, "#3a1266"); st.floorG.addColorStop(0.35, "#1b0840"); st.floorG.addColorStop(1, "#060216");
      st.lineG = ctx.createLinearGradient(0, hy, 0, H); st.lineG.addColorStop(0, "#ff4fb0"); st.lineG.addColorStop(0.5, "#b04cff"); st.lineG.addColorStop(1, "#35e0ff");
      var oc = document.createElement("canvas"); oc.width = Math.round(W * st.dpr); oc.height = Math.round(H * st.dpr); var ox = oc.getContext("2d"); ox.scale(st.dpr, st.dpr);
      var vg = ox.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.35, W / 2, H * 0.5, Math.max(W, H) * 0.75);
      vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(3,0,14,.55)"); ox.fillStyle = vg; ox.fillRect(0, 0, W, H);
      ox.fillStyle = "rgba(0,0,0,.14)"; for (var ly = 0; ly < H; ly += 4) ox.fillRect(0, ly, W, 1);          // faint CRT scanlines
      st.overlay = oc;
      var pad = Math.round(W * 0.1), vw = W + pad * 2, vh = H - hy, vc = document.createElement("canvas"); vc.width = Math.round(vw * st.dpr); vc.height = Math.round(vh * st.dpr);
      var vx = vc.getContext("2d"); vx.scale(st.dpr, st.dpr); var vgd = vx.createLinearGradient(0, 0, 0, vh); vgd.addColorStop(0, "#ff4fb0"); vgd.addColorStop(0.5, "#b04cff"); vgd.addColorStop(1, "#35e0ff");
      var gsp = W * (st.mobile ? 0.2 : 0.12), gK = st.mobile ? 9 : 16, gk; vx.strokeStyle = vgd; vx.lineCap = "round"; vx.beginPath();
      for (gk = -gK; gk <= gK; gk++) { vx.moveTo(vw / 2, 0); vx.lineTo(vw / 2 + gk * gsp, vh); }
      vx.globalAlpha = 0.22; vx.lineWidth = 4; vx.stroke(); vx.globalAlpha = 0.85; vx.lineWidth = 1.2; vx.stroke();
      st.vlines = { c: vc, pad: pad, w: vw, h: vh };
      st.stars = []; for (var i = 0; i < (st.mobile ? 60 : 110); i++) st.stars.push({ x: r() * W, y: r() * hy * 0.78, r: 0.5 + r() * 1.1, ph: r() * 6.28, sp: 0.6 + r() * 1.7 });
      var lw = Math.max(W * 1.5, 900);
      st.far = skylineLayer(lw, Math.min(hy * 0.34, 240), 11, "#2a1060", "#47208a", 0.22, 0.06);
      st.near = skylineLayer(lw, Math.min(hy * 0.26, 190), 23, "#0f0530", "#1c0a46", 0.3, 0.1);
      st.R = Math.min(W * (st.mobile ? 0.26 : 0.15), hy * 0.34);
      st.sunX = W * (st.mobile ? 0.5 : 0.7); st.sunY = hy - st.R * 0.95;
      var D = Math.ceil(st.R * 2) + 2; st.sunC = document.createElement("canvas"); st.sunC.width = Math.round(D * st.dpr); st.sunC.height = Math.round(D * st.dpr); st.sunCtx = st.sunC.getContext("2d"); st.sunCtx.scale(st.dpr, st.dpr); st.sunD = D;
      st.clouds = []; for (i = 0; i < 4; i++) st.clouds.push({ x: r() * W, y: hy * (0.3 + r() * 0.4), w: W * (0.18 + r() * 0.2), h: 6 + r() * 9, sp: 6 + r() * 12, a: 0.12 + r() * 0.12 });
      var m = st.mobile;
      st.palms = m
        ? [{ x: 0.02, h: 0.28, lean: 0.1, s: 0.8, ph: 0.4 }, { x: 0.98, h: 0.33, lean: -0.1, s: 0.9, ph: 1.7 }]
        : [{ x: 0.012, h: 0.34, lean: 0.07, s: 0.78, ph: 0.3 }, { x: 0.875, h: 0.36, lean: -0.07, s: 0.9, ph: 2.1 }, { x: 0.965, h: 0.52, lean: 0.1, s: 1.15, ph: 0.7 }];
    }
    function resize() {
      var r = host.getBoundingClientRect(), W = Math.max(1, Math.round(r.width)), H = Math.max(1, Math.round(r.height));
      if (W === st.W && H === st.H) return;
      st.W = W; st.H = H; st.dpr = Math.min(window.devicePixelRatio || 1, (api.isMobile || W < 700) ? 1.5 : 2);
      canvas.width = Math.round(W * st.dpr); canvas.height = Math.round(H * st.dpr);
      st.mobile = api.isMobile || W < 700; st.hy = Math.round(H * (st.mobile ? 0.5 : 0.6));
      build();
      if (api.reduced || !st.running) draw();
    }

    /* ---------- drawing ---------- */
    function drawSun() {
      var t = st.t, R = st.R, D = st.sunD, sc = st.sunCtx;
      sc.globalCompositeOperation = "source-over"; sc.clearRect(0, 0, D, D);
      var g = sc.createLinearGradient(0, 0, 0, D); g.addColorStop(0, "#fff27a"); g.addColorStop(0.42, "#ffb347"); g.addColorStop(0.72, "#ff3d8f"); g.addColorStop(1, "#b5167f");
      sc.fillStyle = g; sc.beginPath(); sc.arc(D / 2, D / 2, R, 0, 6.2832); sc.fill();
      sc.globalCompositeOperation = "destination-out";       // the slits slide down the lower half and widen as they go
      var N = 9, phase = (t * 0.1) % 1;
      for (var i = 0; i < N; i++) { var u = (i + phase) / N, y = D / 2 + R * (-0.3 + u * 1.3); sc.fillRect(0, y, D, R * 0.022 + u * R * 0.1); }
      var pulse = 0.82 + 0.18 * Math.sin(t * 1.2) + st.flash * 0.7;
      var HR = R * 2.5, h = ctx.createRadialGradient(st.sunX, st.sunY, R * 0.8, st.sunX, st.sunY, HR);
      h.addColorStop(0, "rgba(255,95,175," + clamp(0.6 * pulse, 0, 1).toFixed(3) + ")"); h.addColorStop(1, "rgba(255,95,175,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = h; ctx.fillRect(st.sunX - HR, st.sunY - HR, HR * 2, HR * 2); ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = clamp(0.92 + st.flash * 0.2, 0, 1); ctx.drawImage(st.sunC, st.sunX - D / 2 + st.sx * 6, st.sunY - D / 2, D, D); ctx.globalAlpha = 1;
    }
    function drawLayer(L, off, y) {
      var o = ((off % L.w) + L.w) % L.w;
      ctx.drawImage(L.c, -o, y, L.w, L.h); ctx.drawImage(L.c, L.w - o, y, L.w, L.h);
      return o;
    }
    function blinkBeacons(L, o, y, t, color) {
      ctx.fillStyle = color;
      for (var i = 0; i < L.beacons.length; i++) {
        var b = L.beacons[i], on = Math.sin(t * 2.4 + i * 1.9) > 0.55; if (!on) continue;
        [b.x - o, b.x - o + L.w].forEach(function (bx) { if (bx > -4 && bx < st.W + 4) { ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(bx, y + b.y, 1.7, 0, 6.2832); ctx.fill(); } });
      }
      ctx.globalAlpha = 1;
    }
    function railColor(z) {
      var r, g, b2, u;
      if (z < 0.5) { u = z / 0.5; r = lerp(255, 176, u); g = lerp(79, 76, u); b2 = lerp(176, 255, u); } else { u = (z - 0.5) / 0.5; r = lerp(176, 53, u); g = lerp(76, 224, u); b2 = 255; }
      return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b2 | 0) + ")";
    }
    function drawGrid() {
      var W = st.W, H = st.H, hy = st.hy, NH = 14, i;
      ctx.fillStyle = st.floorG; ctx.fillRect(0, hy, W, H - hy);
      ctx.drawImage(st.vlines.c, -st.vlines.pad + st.sx * W * 0.06, hy, st.vlines.w, st.vlines.h);        // the lines that run to the horizon
      ctx.lineCap = "butt";
      for (i = 0; i < NH; i++) {                                                                              // the rails sliding toward the viewer
        var z = (i + st.grid) / NH, y = hy + (H - hy) * Math.pow(z, 2.2), a = 0.12 + 0.88 * z;
        ctx.strokeStyle = railColor(z);
        ctx.globalAlpha = a * 0.28; ctx.lineWidth = 4 + z * 3; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.globalAlpha = a; ctx.lineWidth = 0.8 + z * 1.6; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var g = ctx.createLinearGradient(0, hy - 8, 0, hy + (H - hy) * 0.22);      // glow where the road meets the sky
      g.addColorStop(0, "rgba(255,110,190,0)"); g.addColorStop(0.2, "rgba(255,120,200," + (0.55 + st.flash * 0.3).toFixed(3) + ")"); g.addColorStop(1, "rgba(120,40,200,0)");
      ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(0, hy - 8, W, (H - hy) * 0.22 + 8); ctx.globalCompositeOperation = "source-over";
    }
    function drawPalm(p, t, wind) {
      var W = st.W, H = st.H, sc = p.s * clamp(W / 1360, 0.6, 1.15);
      var bx = p.x * W - st.sx * 36 * p.s, by = H + 8, topY = by - p.h * H, topX = bx + p.lean * W + wind * 9 * p.s;
      var cx = bx + (topX - bx) * 0.1 - p.lean * W * 0.18, cy = by - (by - topY) * 0.55, i, u, n = 12, L = [], R = [];
      for (i = 0; i <= n; i++) {                              // the trunk: a tapered ribbon along a curve
        u = i / n; var q = 1 - u, x = q * q * bx + 2 * q * u * cx + u * u * topX, y = q * q * by + 2 * q * u * cy + u * u * topY;
        var dx = 2 * q * (cx - bx) + 2 * u * (topX - cx), dy = 2 * q * (cy - by) + 2 * u * (topY - cy), d = Math.hypot(dx, dy) || 1, w = lerp(15, 6.5, u) * sc;
        L.push([x - dy / d * w, y + dx / d * w]); R.push([x + dy / d * w, y - dx / d * w]);
      }
      ctx.fillStyle = "#0a0320"; ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
      for (i = 1; i <= n; i++) ctx.lineTo(L[i][0], L[i][1]);
      for (i = n; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
      ctx.closePath(); ctx.fill();
      var ang = [-2.95, -2.62, -2.28, -1.94, -1.57, -1.2, -0.86, -0.52, -0.18, 0.3, 2.85], leaf = [], j, f;
      ctx.strokeStyle = "#0a0320"; ctx.lineCap = "round";
      for (f = 0; f < ang.length; f++) {
        var a = ang[f] + Math.sin(t * 1.3 + p.ph + f * 0.7) * 0.05 + wind * 0.1, len = (150 + (f % 3) * 18) * sc, dxn = Math.cos(a), dyn = Math.sin(a), up = dyn < -0.2;
        var p0x = topX, p0y = topY, p1x = p0x + dxn * len * 0.55, p1y = p0y + dyn * len * 0.55 - len * (up ? 0.3 : 0.05), p2x = p0x + dxn * len, p2y = p0y + dyn * len + len * 0.4;
        ctx.lineWidth = 4.2 * sc; ctx.beginPath(); ctx.moveTo(p0x, p0y); ctx.quadraticCurveTo(p1x, p1y, p2x, p2y); ctx.stroke();
        ctx.lineWidth = 3.4 * sc; ctx.beginPath();
        for (j = 1; j <= 13; j++) {                           // leaflets: short strokes angled away from the spine and drooping
          u = j / 14; var q2 = 1 - u, lx = q2 * q2 * p0x + 2 * q2 * u * p1x + u * u * p2x, ly = q2 * q2 * p0y + 2 * q2 * u * p1y + u * u * p2y;
          var tx = 2 * q2 * (p1x - p0x) + 2 * u * (p2x - p1x), ty = 2 * q2 * (p1y - p0y) + 2 * u * (p2y - p1y), td = Math.hypot(tx, ty) || 1, nx = -ty / td, ny = tx / td, ll = len * 0.3 * Math.sin(Math.PI * (0.1 + 0.9 * u));
          for (var s = -1; s <= 1; s += 2) { ctx.moveTo(lx, ly); ctx.lineTo(lx + nx * s * ll, ly + ny * s * ll + ll * 0.6); }
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#0a0320"; ctx.beginPath(); ctx.arc(topX, topY + 3, 7 * sc, 0, 6.2832); ctx.fill();   // crown
    }
    function draw() {
      var W = st.W, H = st.H, hy = st.hy, t = st.t, i;
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = st.sky; ctx.fillRect(0, 0, W, hy + 1);
      for (i = 0; i < st.stars.length; i++) {                 // stars, fading toward the horizon
        var s = st.stars[i], a = (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * Math.pow(1 - s.y / hy, 0.8);
        ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s.x + st.sx * 3, s.y, s.r, 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (st.shoot) { var sh = st.shoot, g2 = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 0.14, sh.y - sh.vy * 0.14); g2.addColorStop(0, "rgba(255,255,255," + (1 - sh.age / sh.life).toFixed(3) + ")"); g2.addColorStop(1, "rgba(255,255,255,0)"); ctx.strokeStyle = g2; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - sh.vx * 0.14, sh.y - sh.vy * 0.14); ctx.stroke(); }
      drawSun();
      for (i = 0; i < st.clouds.length; i++) {                // a few thin pink streaks drifting past the sun
        var c = st.clouds[i], cx = ((c.x + t * c.sp) % (W + c.w * 2)) - c.w;
        ctx.save(); ctx.translate(cx, c.y); ctx.scale(1, c.h / c.w); var cg = ctx.createRadialGradient(0, 0, 0, 0, 0, c.w * 0.5); cg.addColorStop(0, "rgba(255,130,200," + c.a + ")"); cg.addColorStop(1, "rgba(255,130,200,0)"); ctx.fillStyle = cg; ctx.fillRect(-c.w * 0.5, -c.w * 0.5, c.w, c.w); ctx.restore();
      }
      var fo = drawLayer(st.far, 30 + st.sx * 14 + t * 1.5, hy - st.far.h);
      blinkBeacons(st.far, fo, hy - st.far.h, t, "#ff6b8b");
      var no = drawLayer(st.near, 140 + st.sx * 30 + t * 3, hy - st.near.h);
      blinkBeacons(st.near, no, hy - st.near.h, t, "#ff2e63");
      drawGrid();
      var tr = api.textRect ? api.textRect() : null, hr = st.host.getBoundingClientRect();     // a soft dark patch keeps the light headline readable
      if (tr && tr.width > 0) {
        var tcx = tr.left - hr.left + tr.width * 0.45, tcy = tr.top - hr.top + tr.height * 0.5, rx = Math.max(tr.width, tr.height) * 0.78, ry = tr.height * 0.8 + 40;
        ctx.save(); ctx.translate(tcx, tcy); ctx.scale(1, ry / rx); var pg = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); pg.addColorStop(0, "rgba(8,2,26,.66)"); pg.addColorStop(0.6, "rgba(8,2,26,.42)"); pg.addColorStop(1, "rgba(8,2,26,0)"); ctx.fillStyle = pg; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore();
      }
      var wind = st.sx * 0.6 + Math.sin(t * 0.9) * 0.25 + st.vel * 0.5;
      for (i = 0; i < st.palms.length; i++) drawPalm(st.palms[i], t, wind);
      ctx.globalCompositeOperation = "lighter";               // taps: a ring along the road and a spray of neon sparks
      for (i = 0; i < st.rings.length; i++) { var rg = st.rings[i], k = rg.age / rg.life; ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = k < 0.5 ? "#35e0ff" : "#ff4fb0"; ctx.lineWidth = 3 - k * 2; ctx.beginPath(); ctx.ellipse(rg.x, rg.y, 20 + k * 260, (20 + k * 260) * 0.28, 0, 0, 6.2832); ctx.stroke(); }
      for (i = 0; i < st.sparks.length; i++) { var sp = st.sparks[i]; ctx.globalAlpha = clamp(1 - sp.age / sp.life, 0, 1); ctx.fillStyle = sp.c; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, 6.2832); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(st.overlay, 0, 0, W, H);                  // vignette and faint scanlines in one go
    }

    /* ---------- simulation ---------- */
    function frame(dt) {
      var t = st.t += dt, k = 1 - Math.exp(-dt * 4), i;
      st.sx += (st.tx - st.sx) * k; st.sy += (st.ty - st.sy) * k;
      st.vel *= Math.exp(-dt * 3); st.boost *= Math.exp(-dt * 1.4); st.flash *= Math.exp(-dt * 2.6);
      st.speed = 0.5 + st.boost * 3.2 + (st.pressed ? 1.2 : 0) + Math.min(2, st.vel * 2);
      st.grid = (st.grid + st.speed * dt * 0.28) % 1;
      if (t > st.nextShoot && !st.shoot) { st.nextShoot = t + 6 + Math.random() * 6; st.shoot = { x: st.W * (0.1 + Math.random() * 0.5), y: st.hy * (0.05 + Math.random() * 0.3), vx: 420, vy: 170, age: 0, life: 0.9 }; }
      if (st.shoot) { st.shoot.x += st.shoot.vx * dt; st.shoot.y += st.shoot.vy * dt; if ((st.shoot.age += dt) > st.shoot.life) st.shoot = null; }
      for (i = st.rings.length - 1; i >= 0; i--) if ((st.rings[i].age += dt) > st.rings[i].life) st.rings.splice(i, 1);
      for (i = st.sparks.length - 1; i >= 0; i--) { var sp = st.sparks[i]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 260 * dt; if ((sp.age += dt) > sp.life) st.sparks.splice(i, 1); }
      draw();
    }
    st.frame = frame;
    function loop(ts) {
      if (!st.running) return;
      var dt = Math.min(0.05, (ts - st.last) / 1000 || 0.016); st.last = ts;
      frame(dt); st.raf = requestAnimationFrame(loop);
    }
    function start() { if (st.running || api.reduced || api.manual || !st.visible || document.hidden) return; st.running = true; st.last = performance.now(); st.raf = requestAnimationFrame(loop); }
    function stop() { st.running = false; cancelAnimationFrame(st.raf); }

    /* ---------- input ---------- */
    function rel(e) { var r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function on(type, fn) { api.surface.addEventListener(type, fn, { passive: true }); st.listeners.push([type, fn]); }
    on("pointermove", function (e) {
      var p = rel(e); st.tx = clamp((p.x / st.W) * 2 - 1, -1, 1); st.ty = clamp((p.y / st.H) * 2 - 1, -1, 1);
      st.vel = Math.min(2, st.vel + Math.abs(p.x - st.lastX) / 400); st.lastX = p.x;
    });
    on("pointerdown", function (e) {
      if (e.target && e.target.closest && e.target.closest("a,button,input,[data-nobg]")) return;
      var p = rel(e); st.pressed = true; st.boost = 1; st.flash = 1;
      st.rings.push({ x: p.x, y: clamp(p.y, st.hy + 10, st.H), age: 0, life: 1.1 });
      var cols = ["#35e0ff", "#ff4fb0", "#ffe66d"];
      for (var i = 0; i < 20; i++) { var a = Math.random() * 6.2832, v = 90 + Math.random() * 200; st.sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, r: 1.2 + Math.random() * 1.8, c: cols[i % 3], age: 0, life: 0.7 + Math.random() * 0.6 }); }
    });
    var release = function () { st.pressed = false; };
    on("pointerup", release); on("pointercancel", release); on("pointerleave", release);

    st.ro = new ResizeObserver(resize); st.ro.observe(host); window.addEventListener("resize", resize); st.onResize = resize;
    st.io = new IntersectionObserver(function (es) { st.visible = es[0].isIntersecting; if (st.visible) start(); else stop(); }, { threshold: 0 }); st.io.observe(host);
    st.onVis = function () { if (document.hidden) stop(); else start(); }; document.addEventListener("visibilitychange", st.onVis);

    st.W = 0; resize();
    if (api.reduced) draw(); else start();
  }

  function unmount() {
    if (!S) return;
    var st = S; S = null;
    if (st.fallback) { st.host.style.background = ""; return; }
    st.running = false; cancelAnimationFrame(st.raf);
    st.listeners.forEach(function (l) { st.api.surface.removeEventListener(l[0], l[1]); });
    if (st.ro) st.ro.disconnect(); if (st.io) st.io.disconnect();
    window.removeEventListener("resize", st.onResize); document.removeEventListener("visibilitychange", st.onVis);
    if (st.canvas.parentNode) st.canvas.parentNode.removeChild(st.canvas);
    st.sunC = st.sunCtx = st.far = st.near = st.overlay = st.vlines = null; st.stars = st.palms = st.rings = st.sparks = st.clouds = null;
  }

  window.MynnaBackgrounds.register(ID, { id: ID, name: "Neon Coast", dark: true, mount: mount, unmount: unmount, __step: function (dt) { if (S && S.frame) S.frame(dt); } });
})();
