(function () {
'use strict';
var CSS_ID = 'mbg-flock-css';
var state = null;

function mount(host, api) {
  if (state) unmount();
  var ST = { dead: false, raf: 0, listeners: [], ro: null, io: null, visible: true };
  state = ST;
  var style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = '.mbg-flock{overflow:hidden}.mbg-flock canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}';
  document.head.appendChild(style);
  host.classList.add('mbg-flock');
  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  host.appendChild(cv);
  var ctx = cv.getContext('2d');
  var reduce = !!api.reduced;
  var RS = 2, ZMAX = 300, FRAMES = 8;
  var W = 0, H = 0, dpr = 1, S = 1;
  ST.style = style; ST.cv = cv; ST.host = host;

function wing(g, phi, len, fill, edge) {
  var a = phi * Math.PI / 180, dx = -Math.cos(a), dy = -Math.sin(a);
  var px = 35, py = 29, nx = -dy, ny = dx, w = 8.5;
  g.beginPath();
  g.moveTo(px + nx * 3, py + ny * 3);
  g.quadraticCurveTo(px + dx * len * .55 + nx * w, py + dy * len * .55 + ny * w, px + dx * len, py + dy * len);
  g.quadraticCurveTo(px + dx * len * .45 - nx * w * .55, py + dy * len * .45 - ny * w * .55, px - nx * 3, py - ny * 3);
  g.closePath();
  g.fillStyle = fill; g.fill();
  g.lineWidth = .8; g.strokeStyle = edge; g.stroke();
}
function drawBird(g, variant, p) {
  var s = Math.sin(p * Math.PI * 2);
  var phi = 14 + 62 * s;
  // far wing (behind)
  wing(g, phi - 16, 20, '#6b4426', '#4e2f1b');
  // tail
  g.fillStyle = '#4a2c19';
  g.beginPath(); g.moveTo(24, 31); g.lineTo(6, 29.5); g.lineTo(5, 36.5); g.lineTo(24, 37); g.closePath(); g.fill();
  // body
  g.fillStyle = '#7d4d2b';
  g.beginPath(); g.ellipse(34, 32, 15.5, 8.6, -0.05, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#a06c40';
  g.beginPath(); g.ellipse(35, 35.5, 11, 4.4, -0.05, 0, Math.PI * 2); g.fill();
  // scarf tail (flutters)
  if (variant === 1) {
    var f = Math.sin(p * Math.PI * 4) * 1.6;
    g.fillStyle = '#b3261e';
    g.beginPath(); g.moveTo(42, 32); g.quadraticCurveTo(34, 37 + f, 27, 38 + f * 1.6);
    g.lineTo(29, 42 + f * 1.6); g.quadraticCurveTo(37, 41 + f, 43, 37); g.closePath(); g.fill();
    g.strokeStyle = '#fbf8f2'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(40, 35.5); g.quadraticCurveTo(34, 39.5 + f, 29, 40.2 + f * 1.6); g.stroke();
  }
  // head
  g.fillStyle = '#1b1816';
  g.beginPath(); g.arc(48, 27, 7.6, 0, Math.PI * 2); g.fill();
  // neck blend
  g.beginPath(); g.ellipse(43, 30, 6, 6, 0, 0, Math.PI * 2); g.fill();
  if (variant === 1) {
    g.save(); g.translate(43, 31); g.rotate(.35);
    g.fillStyle = '#b3261e'; g.fillRect(-2.8, -6.4, 5.6, 12.8);
    g.fillStyle = '#fbf8f2'; g.fillRect(-1.6, -6.4, .9, 12.8); g.fillRect(.9, -6.4, .9, 12.8);
    g.restore();
  }
  // beak
  g.fillStyle = '#f0a500';
  g.beginPath(); g.moveTo(54, 25.2); g.lineTo(64, 29); g.lineTo(54.5, 31.4); g.closePath(); g.fill();
  // eye ring
  g.fillStyle = '#f5c518';
  g.beginPath(); g.arc(50.6, 25.4, 3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1b1816';
  g.beginPath(); g.arc(51.1, 25.4, 1.25, 0, Math.PI * 2); g.fill();
  // near wing
  wing(g, phi, 25, '#5a3820', '#3c2413');
  // white wing patch
  var a = phi * Math.PI / 180;
  g.fillStyle = 'rgba(251,248,242,.9)';
  g.beginPath(); g.ellipse(35 - Math.cos(a) * 12, 29 - Math.sin(a) * 12, 2.6, 1.4, -a * 0 + Math.PI - a, 0, Math.PI * 2); g.fill();
}
  var sprites = [];
  function buildSprites() {
    for (var bl = 0; bl < 2; bl++) {
      sprites[bl] = [];
      for (var v = 0; v < 2; v++) {
        sprites[bl][v] = [];
        for (var f = 0; f < FRAMES; f++) {
          var c = document.createElement('canvas');
          c.width = 80 * RS; c.height = 64 * RS;
          var g = c.getContext('2d');
          g.scale(RS, RS);
          if (bl && 'filter' in g) g.filter = 'blur(1.5px)';
          drawBird(g, v, f / FRAMES);
          sprites[bl][v][f] = c;
        }
      }
    }
  }

  var bgSky = null, hills = [], cloudSpr = null;
  function mk(w, h) { var c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  function buildBackdrop() {
    bgSky = mk(W * dpr, H * dpr);
    var g = bgSky.getContext('2d'); g.scale(dpr, dpr);
    var sg = g.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, '#d7ecdf'); sg.addColorStop(.55, '#ecf4ea'); sg.addColorStop(1, '#f7f4ec');
    g.fillStyle = sg; g.fillRect(0, 0, W, H);
    var sx = W * .8, sy = H * .2, sr = Math.max(W, H) * .5;
    var rg = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
    rg.addColorStop(0, 'rgba(255,214,140,.65)'); rg.addColorStop(.25, 'rgba(255,224,170,.3)'); rg.addColorStop(1, 'rgba(255,230,190,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,236,196,.9)'; g.beginPath(); g.arc(sx, sy, Math.min(W, H) * .045, 0, 7); g.fill();
    var specs = [
      { base: .60, amp: [.035, .02, .01], fr: [.0042, .011, .027], c0: '#cfe6d8', c1: '#e8f2ea', par: 10 },
      { base: .73, amp: [.04, .022, .01], fr: [.0035, .0095, .024], c0: '#aedbc3', c1: '#d2eadb', par: 22 },
      { base: .87, amp: [.045, .02, .008], fr: [.0028, .008, .02], c0: '#86c7a6', c1: '#b6dcc7', par: 40 }
    ];
    hills = specs.map(function (sp, k) {
      var mw = W + 200, c = mk(mw * dpr, H * dpr), gg = c.getContext('2d'); gg.scale(dpr, dpr);
      var ph = [k * 1.7 + .4, k * 2.3 + 1.1, k * .9 + 2.2];
      var grad = gg.createLinearGradient(0, H * (sp.base - .06), 0, H);
      grad.addColorStop(0, sp.c0); grad.addColorStop(1, sp.c1);
      gg.fillStyle = grad; gg.beginPath(); gg.moveTo(0, H);
      for (var x = 0; x <= mw; x += 6) {
        var y = H * sp.base;
        for (var i = 0; i < 3; i++) y += Math.sin(x * sp.fr[i] + ph[i]) * H * sp.amp[i];
        gg.lineTo(x, y);
      }
      gg.lineTo(mw, H); gg.closePath(); gg.fill();
      return { c: c, par: sp.par };
    });
    cloudSpr = mk(360, 120);
    g = cloudSpr.getContext('2d');
    if ('filter' in g) g.filter = 'blur(8px)';
    g.fillStyle = 'rgba(255,255,255,.85)';
    [[80, 70, 40], [130, 56, 52], [190, 64, 46], [250, 74, 36], [160, 80, 40]].forEach(function (a) { g.beginPath(); g.arc(a[0], a[1], a[2], 0, 7); g.fill(); });
  }

  var birds = [], N = 0;
  var targets = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function wantN() { return api.isMobile ? 74 : 124; }
  function makeBirds() {
    N = wantN();
    birds = [];
    for (var i = 0; i < N; i++) {
      var g = i % 3;
      var sx = W * (.2 + g * .3), sy = H * (.35 + (g % 2) * .2);
      var a = rnd(0, 6.28);
      birds.push({
        x: sx + rnd(-W * .18, W * .18), y: sy + rnd(-H * .2, H * .2), z: rnd(10, ZMAX - 10),
        vx: Math.cos(a) * 90, vy: Math.sin(a) * 40, vz: rnd(-10, 10),
        ph: Math.random(), fr: rnd(.85, 1.2), g: g, v: Math.random() < .17 ? 1 : 0,
        face: Math.random() < .5 ? 1 : -1, bank: 0, tilt: 0,
        ox: rnd(-.34, .34), oy: rnd(-.26, .26), ring: rnd(70, 280), zr: rnd(.1, .95),
        eager: Math.random() < .3 ? rnd(.15, .35) : rnd(.7, 1.1), size: rnd(.9, 1.12)
      });
    }
  }
  var P = { x: 0, y: 0, active: false, down: false, lastMove: -9, vx: 0, vy: 0, t: 0, nx: .5, ny: .5, has: false };
  var Ls = 0, scat = 1, ripples = [], tnow = 0;
  function burst(x, y, power) {
    var Rr = 440 * Math.max(.75, S);
    for (var i = 0; i < N; i++) {
      var b = birds[i];
      var dx = b.x - x, dy = b.y - y, d = Math.hypot(dx, dy) + 1;
      if (d < Rr) {
        var k = Math.pow(1 - d / Rr, .8) * power;
        b.vx += dx / d * 520 * k; b.vy += dy / d * 520 * k; b.vz += rnd(-120, 120) * k;
      }
    }
    scat = 0;
    ripples.push({ x: x, y: y, t: tnow, p: power });
  }
  function lim(v, a) { return v > a ? a : v < -a ? -a : v; }
  function smooth(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }

  function step(dt, t) {
    tnow = t;
    for (var g = 0; g < 3; g++) {
      var tg = targets[g];
      tg.x = W * (.5 + .38 * Math.sin(t * .09 + g * 2.1) + .08 * Math.sin(t * .23 + g));
      tg.y = H * (.46 + .22 * Math.sin(t * .13 + g * 1.9 + 1) + .06 * Math.sin(t * .31 + g * 3));
    }
    Ls += ((P.active ? 1 : 0) - Ls) * Math.min(1, dt * (P.active ? 3 : 1.1));
    scat = Math.min(1, scat + dt * .8);
    var Lw = Ls * (.06 + .94 * scat * scat);
    var still = P.active ? Math.min(1, Math.max(0, (t - P.lastMove - .12) / .5)) : 0;
    var sepR = 66 * S, sepR2 = sepR * sepR, perc2 = (120 * S) * (120 * S);
    var maxS = 175, minS = 62;
    for (var i = 0; i < N; i++) {
      var b = birds[i];
      var ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, mvx = 0, mvy = 0, mvz = 0, n = 0;
      for (var j = 0; j < N; j++) {
        if (j === i) continue;
        var o = birds[j];
        var dx = b.x - o.x, dy = b.y - o.y, dz = (b.z - o.z) * .9;
        var d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < sepR2 && d2 > .01) { var k = 4200 * S / d2; ax += dx * k; ay += dy * k; az += dz * k * .5; }
        if (o.g === b.g && d2 < perc2) { n++; cx += o.x; cy += o.y; cz += o.z; mvx += o.vx; mvy += o.vy; mvz += o.vz; }
      }
      if (n) {
        ax += (mvx / n - b.vx) * 1.5 + (cx / n - b.x) * .3;
        ay += (mvy / n - b.vy) * 1.5 + (cy / n - b.y) * .3;
        az += (cz / n - b.z) * .2;
      }
      var tg2 = targets[b.g];
      var wl = 1 - Lw * .85;
      ax += (tg2.x + b.ox * W - b.x) * .34 * wl;
      ay += (tg2.y + b.oy * H - b.y) * .34 * wl;
      if (Lw > .01) {
        var dxp = P.x - b.x, dyp = P.y - b.y, d = Math.hypot(dxp, dyp) + .001;
        var ux = dxp / d, uy = dyp / d;
        var ring = b.ring * S;
        var radial = lim((d - ring * (.9 + .5 * still)) * (1.6 + 1.2 * still), 330);
        var tang = (110 + 240 * still) * smooth(d / (520 * S));
        var w = Lw * b.eager;
        ax += (ux * radial + -uy * tang) * w;
        ay += (uy * radial + ux * tang) * w;
        az += (40 + b.zr * 230 - b.z) * .6 * Lw;
      }
      var mx = 50, top = H * .06, bot = H * .9;
      if (b.x < mx) ax += (mx - b.x) * 3; else if (b.x > W - mx) ax -= (b.x - (W - mx)) * 3;
      if (b.y < top) ay += (top - b.y) * 3; else if (b.y > bot) ay -= (b.y - bot) * 3;
      if (b.z < 15) az += (15 - b.z) * 4; else if (b.z > ZMAX - 15) az -= (b.z - (ZMAX - 15)) * 4;
      b.vx += ax * dt; b.vy += ay * dt; b.vz += az * dt;
      var sp = Math.hypot(b.vx, b.vy, b.vz * .5) + .001;
      var cap = maxS * (1 + .25 * still * Lw);
      if (sp > cap) { var kk = cap / sp; b.vx *= kk; b.vy *= kk; b.vz *= kk; }
      else if (sp < minS) { var k2 = minS / sp; b.vx *= k2; b.vy *= k2; }
      b.vz *= 1 - dt * .4;
      var zf = b.z / ZMAX, pf = .6 + .9 * zf;
      b.x += b.vx * dt * pf; b.y += b.vy * dt * pf * .9; b.z += b.vz * dt;
      var spd = Math.hypot(b.vx, b.vy);
      var fr = 3.4 + spd * .036;
      if (b.vy > 25 && spd < 120) fr *= .45;
      b.ph = (b.ph + dt * fr * b.fr) % 1;
      if (Math.abs(b.vx) > 12) b.face += ((b.vx > 0 ? 1 : -1) - b.face) * Math.min(1, dt * 9);
      var turn = (b.vx * ay - b.vy * ax) / (spd * spd + 1);
      b.bank += (lim(turn * .033, .6) - b.bank) * Math.min(1, dt * 5);
      var tt = Math.atan2(b.vy, Math.abs(b.vx) + 20);
      b.tilt += (lim(tt, .8) * .75 - b.tilt) * Math.min(1, dt * 6);
    }
  }

  var rect = { x0: -1e4, y0: -1e4, x1: -1e4, y1: -1e4 };
  function measure() {
    var hr = host.getBoundingClientRect(), r = api.textRect();
    if (!r) return;
    rect = { x0: r.left - hr.left - 10, y0: r.top - hr.top - 6, x1: r.right - hr.left + 10, y1: r.bottom - hr.top + 6 };
  }
  var cam = { x: 0, y: 0 };
  function render(t) {
    measure();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(bgSky, 0, 0);
    var tx, ty;
    if (P.has && (P.active || Ls > .02)) { tx = P.nx - .5; ty = P.ny - .5; }
    else { tx = Math.sin(t * .12) * .35; ty = Math.cos(t * .09) * .2; }
    cam.x += (tx - cam.x) * .04; cam.y += (ty - cam.y) * .04;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (var i = 0; i < 4; i++) {
      var cw = 360 * (.7 + i * .15) * Math.max(.6, S), ch = cw / 3;
      var span = W + cw;
      var x = ((t * (4 + i * 2.2) + i * span * .27) % span) - cw - cam.x * 14 * (i + 1) * .5;
      ctx.globalAlpha = .55 - i * .06;
      ctx.drawImage(cloudSpr, x, H * (.1 + i * .09) - cam.y * 8, cw, ch);
    }
    ctx.globalAlpha = 1;
    for (var h = 0; h < hills.length; h++) {
      ctx.drawImage(hills[h].c, -100 - cam.x * hills[h].par, -cam.y * hills[h].par * .35, W + 200, H);
    }
    if (Ls > .02) {
      var gr = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 150 * S);
      gr.addColorStop(0, 'rgba(232,130,12,' + (.2 * Ls) + ')'); gr.addColorStop(1, 'rgba(232,130,12,0)');
      ctx.fillStyle = gr; ctx.fillRect(P.x - 160 * S, P.y - 160 * S, 320 * S, 320 * S);
    }
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r], a = (t - rp.t) / .9;
      if (a >= 1) { ripples.splice(r, 1); continue; }
      ctx.strokeStyle = 'rgba(232,130,12,' + (.45 * (1 - a)) + ')'; ctx.lineWidth = 3 * (1 - a) + .5;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, 20 + a * 260 * S, 0, 7); ctx.stroke();
    }
    birds.sort(function (p, q) { return p.z - q.z; });
    for (var k = 0; k < N; k++) {
      var b = birds[k], z = b.z / ZMAX;
      var sc = S * (.4 + z * .85) * b.size;
      var px = b.x + cam.x * (z - .35) * -70, py = b.y + cam.y * (z - .35) * -40;
      if (px < -80 || px > W + 80 || py < -60 || py > H + 60) continue;
      var ddx = Math.max(rect.x0 - px, 0, px - rect.x1), ddy = Math.max(rect.y0 - py, 0, py - rect.y1);
      var f = smooth(Math.hypot(ddx, ddy) / 70);
      var al = (.42 + .58 * z) * (.26 + .74 * f);
      if (z > .7) al *= .85;
      ctx.globalAlpha = al;
      var spr = sprites[z < .33 ? 1 : 0][b.v][(b.ph * FRAMES) | 0];
      var sg2 = b.face >= 0 ? 1 : -1;
      var th = (b.tilt + b.bank * .4) * sg2;
      var c = Math.cos(th), s = Math.sin(th);
      var sq = 1 - Math.min(.3, Math.abs(b.bank) * .5);
      var fx = sg2 * Math.max(Math.abs(b.face), .38) * sc, fy = sc * sq;
      ctx.setTransform(dpr * c * fx, dpr * s * fx, -dpr * s * fy, dpr * c * fy, dpr * px, dpr * py);
      ctx.drawImage(spr, -35, -32, 80, 64);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  var last = 0, clock = 0;
  function frame(ts) {
    ST.raf = 0;
    if (ST.dead) return;
    ST.raf = requestAnimationFrame(frame);
    if (!last) last = ts;
    var dt = (ts - last) / 1000; last = ts;
    if (dt > .05) dt = .05;
    clock += dt;
    step(dt, clock);
    render(clock);
  }
  function start() { if (!ST.raf && !ST.dead && !reduce && ST.visible && !document.hidden) { last = 0; ST.raf = requestAnimationFrame(frame); } }
  function stop() { if (ST.raf) { cancelAnimationFrame(ST.raf); ST.raf = 0; } }

  function resize() {
    if (ST.dead) return;
    var ow = W, oh = H;
    var hr = host.getBoundingClientRect();
    var nw = Math.round(hr.width), nh = Math.round(hr.height);
    if (nw < 2 || nh < 2) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = nw; H = nh;
    S = Math.max(.72, Math.min(1.25, Math.min(W, H * 1.4) / 900));
    if (W < 700) S = Math.max(.72, W / 520);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    buildBackdrop();
    if (!birds.length || wantN() !== N) makeBirds();
    else if (ow && oh) for (var i = 0; i < N; i++) { birds[i].x *= W / ow; birds[i].y *= H / oh; }
    if (reduce) staticFrame();
  }
  function staticFrame() {
    for (var i = 0; i < 260; i++) step(.033, i * .033);
    for (var j = 0; j < N; j++) birds[j].ph = .22 + birds[j].ph * .1;
    render(8);
  }

  /* input */
  function on(el, type, fn) { el.addEventListener(type, fn, { passive: true }); ST.listeners.push([el, type, fn]); }
  function setPos(e) {
    var hr = host.getBoundingClientRect();
    var x = e.clientX - hr.left, y = e.clientY - hr.top;
    var t = performance.now();
    if (P.has) {
      var dt = Math.max(1, t - P.t) / 1000;
      P.vx = P.vx * .6 + (x - P.x) / dt * .4; P.vy = P.vy * .6 + (y - P.y) / dt * .4;
    }
    P.x = x; P.y = y; P.t = t; P.has = true;
    P.nx = W ? x / W : .5; P.ny = H ? y / H : .5;
  }
  var surf = api.surface;
  on(surf, 'pointermove', function (e) {
    if (reduce) return;
    if (e.pointerType !== 'mouse' && !P.down) return;
    var ox = P.x, oy = P.y, had = P.has;
    setPos(e); P.active = true;
    if (!had || Math.abs(P.x - ox) + Math.abs(P.y - oy) > 2) P.lastMove = clock;
  });
  on(surf, 'pointerdown', function (e) {
    if (reduce) return;
    if (e.target && e.target.closest && e.target.closest('a,button,input,[data-nobg]')) return;
    P.vx = P.vy = 0; P.has = false; setPos(e);
    P.down = true; P.active = true; P.lastMove = clock;
    burst(P.x, P.y, 1);
  });
  on(surf, 'pointerup', function (e) {
    if (reduce) return;
    var fast = Math.hypot(P.vx, P.vy) > 900;
    var was = P.down;
    P.down = false;
    if (e.pointerType !== 'mouse') {
      if (was && fast) burst(P.x, P.y, .7);
      P.active = false;
    } else if (was && fast) burst(P.x, P.y, .5);
  });
  on(surf, 'pointercancel', function (e) { P.down = false; if (e.pointerType !== 'mouse') P.active = false; });
  on(surf, 'pointerleave', function (e) { if (e.pointerType === 'mouse' || !P.down) { P.active = false; } });
  on(document, 'visibilitychange', function () { document.hidden ? stop() : start(); });

  if ('ResizeObserver' in window) {
    var rto = 0;
    ST.ro = new ResizeObserver(function () { if (!reduce || true) { resize(); } });
    ST.ro.observe(host);
  } else { on(window, 'resize', resize); }
  if ('IntersectionObserver' in window) {
    ST.io = new IntersectionObserver(function (en) {
      ST.visible = en[en.length - 1].isIntersecting;
      ST.visible ? start() : stop();
    });
    ST.io.observe(host);
  }

  buildSprites();
  resize();
  if (!reduce) { for (var w0 = 0; w0 < 90; w0++) step(.033, -3 + w0 * .033); start(); }
  else staticFrame();

  ST.free = function () {
    sprites = null; bgSky = null; hills = null; cloudSpr = null; birds = null; ripples = null;
  };
}

function unmount() {
  var ST = state;
  if (!ST) return;
  ST.dead = true;
  if (ST.raf) { cancelAnimationFrame(ST.raf); ST.raf = 0; }
  ST.listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2]); });
  ST.listeners = [];
  if (ST.ro) ST.ro.disconnect();
  if (ST.io) ST.io.disconnect();
  if (ST.cv && ST.cv.parentNode) ST.cv.parentNode.removeChild(ST.cv);
  if (ST.style && ST.style.parentNode) ST.style.parentNode.removeChild(ST.style);
  if (ST.host) { ST.host.classList.remove('mbg-flock'); while (ST.host.firstChild) ST.host.removeChild(ST.host.firstChild); }
  if (ST.free) ST.free();
  state = null;
}

window.MynnaBackgrounds.register('flock', { id: 'flock', name: 'Flock of mynas', dark: false, mount: mount, unmount: unmount });
})();
