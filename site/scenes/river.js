(function(){
"use strict";
var FS = "\n#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform vec2 uRes;\nuniform float uT;\nuniform float uK;\nuniform vec4 uDrops[16];\nuniform vec4 uBox;\n\nconst float HOR = 0.80;\nconst float PI = 3.14159265;\n\nfloat h21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }\nvec2 h22(vec2 p){ float a=h21(p); return vec2(a,h21(p+a+17.3)); }\n\n// Sky, hills and sun. y is screen (0 bottom..1 top), x in aspect-corrected units\nvec3 skyCol(vec2 uv, float asp){\n  float x = uv.x*max(asp,1.0);\n  float y = uv.y;\n  float up = clamp((y-HOR)/(1.0-HOR),0.0,1.0);\n  vec3 haze = vec3(0.90,0.95,0.90);\n  vec3 top  = vec3(0.98,0.96,0.91);\n  vec3 c = mix(haze, top, smoothstep(0.0,0.7,up));\n  // sun glow\n  vec2 sp = vec2(0.70*max(asp,1.0), HOR+0.13);\n  vec2 d = vec2(x,y)-sp;\n  float r = length(vec2(d.x,d.y*1.0));\n  c += vec3(1.0,0.72,0.35)*exp(-r*5.0)*0.55;\n  c = mix(c, vec3(1.0,0.78,0.38), smoothstep(0.045,0.035,r));\n  // far hills\n  float f1 = HOR + 0.035 + 0.030*sin(x*2.6+1.2) + 0.018*sin(x*6.1+0.4) + 0.008*sin(x*15.0);\n  float f2 = HOR + 0.012 + 0.026*sin(x*3.7+4.0) + 0.012*sin(x*9.3+2.0) + 0.005*sin(x*21.0);\n  vec3 farC  = mix(haze, vec3(0.62,0.80,0.72), 0.75);\n  vec3 nearC = mix(haze, vec3(0.30,0.58,0.46), 0.8);\n  c = mix(c, farC,  smoothstep(f1+0.002, f1-0.002, y));\n  c = mix(c, nearC, smoothstep(f2+0.002, f2-0.002, y));\n  // mist band at horizon\n  c = mix(c, vec3(0.95,0.96,0.92), exp(-abs(y-HOR)*28.0)*0.65);\n  return c;\n}\n\nvec2 baseGrad(vec2 p, float t, float z){\n  float fade = 1.0/(1.0+z*0.55);\n  vec2 g = vec2(0.0);\n  vec2 d;\n  d = vec2(0.80,0.60);  g += d*5.0*0.50*cos(dot(d,p)*5.0 + t*0.55);\n  d = vec2(-0.55,0.84); g += d*8.0*0.35*cos(dot(d,p)*8.0 - t*0.70 + 1.3);\n  d = vec2(0.20,0.98);  g += d*13.0*0.22*fade*cos(dot(d,p)*13.0 + t*0.95 + 2.1);\n  d = vec2(-0.90,0.43); g += d*21.0*0.14*fade*cos(dot(d,p)*21.0 - t*1.20 + 0.7);\n  d = vec2(0.64,-0.77); g += d*34.0*0.07*fade*fade*cos(dot(d,p)*34.0 + t*1.5);\n  return g;\n}\n\nfloat caustic(vec2 p, float t){\n  vec2 i = p; float c = 1.0; const float inten = 0.006;\n  for(int n=0;n<4;n++){\n    float tt = t*(1.0-(3.5/float(n+1)));\n    i = p + vec2(cos(tt-i.x)+sin(tt+i.y), sin(tt-i.y)+cos(tt+i.x));\n    c += 1.0/max(length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten))),0.02);\n  }\n  c /= 4.0; c = 1.17-pow(max(c,0.0),1.4);\n  return min(pow(clamp(abs(c),0.0,2.0),8.0),1.0);\n}\n\n// floating things: lily pads, marigolds, red petals\nvec4 floaters(vec2 p, float cell, float seed, float aa, vec2 flow){\n  vec2 q = (p - flow)/cell;\n  vec2 id = floor(q);\n  vec2 f = q-id;\n  vec2 hh = h22(id+seed);\n  float ty = h21(id*1.7+seed*3.1);\n  vec2 c = 0.5 + (hh-0.5)*0.42;\n  vec2 dq = (f-c)*cell;\n  float rad = cell*(0.10+0.10*h21(id+seed*7.0));\n  float ang0 = h21(id*3.3+seed)*6.2832;\n  float len = length(dq);\n  float a = atan(dq.y,dq.x) - ang0;\n  vec4 o = vec4(0.0);\n  if(ty<0.30){\n    // lily pad with notch\n    float wa = abs(mod(a+PI,2.0*PI)-PI);\n    float notch = smoothstep(0.17,0.25,wa);\n    float al = (1.0-smoothstep(-aa,aa,len-rad*1.25))*mix(0.0,1.0,notch);\n    float lit = smoothstep(-rad,rad,dq.y);\n    vec3 col = mix(vec3(0.07,0.38,0.27), vec3(0.20,0.60,0.38), lit*0.8);\n    col += 0.04*sin(a*11.0)*smoothstep(0.1,0.9,len/(rad*1.25));\n    col = mix(col, vec3(0.04,0.26,0.20), smoothstep(0.80,1.0,len/(rad*1.25))*0.7);\n    // little pink-cream lotus bud on some pads\n    if(h21(id*9.7+seed)>0.7){\n      float lr = len/(rad*0.55);\n      float pet = 0.85+0.15*cos(a*7.0);\n      float la = 1.0-smoothstep(pet-0.1,pet,lr);\n      col = mix(col, mix(vec3(0.98,0.88,0.84), vec3(0.96,0.60,0.62), smoothstep(0.2,1.0,lr)), la);\n      col = mix(col, vec3(0.95,0.72,0.2), 1.0-smoothstep(0.12,0.3,lr));\n    }\n    o = vec4(col, al);\n  } else if(ty<0.52){\n    // marigold\n    float rr = rad*0.85*(0.86+0.14*cos(a*12.0));\n    float al = 1.0-smoothstep(-aa,aa,len-rr);\n    float t2 = len/rr;\n    vec3 col = mix(vec3(0.98,0.62,0.10), vec3(0.88,0.40,0.04), smoothstep(0.3,1.0,t2));\n    col = mix(col, vec3(0.58,0.26,0.03), 1.0-smoothstep(0.08,0.35,t2));\n    col += 0.07*sin(a*12.0+t2*3.0);\n    col *= 0.9+0.2*smoothstep(-rr,rr,dq.y);\n    o = vec4(col, al);\n  } else if(ty<0.66){\n    // red/white gamusa-ish petal\n    float ca=cos(ang0), sa=sin(ang0);\n    vec2 e = vec2(ca*dq.x+sa*dq.y, -sa*dq.x+ca*dq.y);\n    float ell = length(vec2(e.x/(rad*0.95), e.y/(rad*0.42)));\n    float al = 1.0-smoothstep(1.0-aa/rad,1.0+aa/rad,ell);\n    vec3 col = mix(vec3(0.72,0.15,0.12), vec3(0.85,0.30,0.22), smoothstep(-rad*0.4,rad*0.4,e.y));\n    col = mix(col, vec3(0.98,0.95,0.90), smoothstep(0.62,0.72,ell)*0.9);\n    o = vec4(col, al);\n  }\n  return o;\n}\n\nvoid main(){\n  vec2 uv = gl_FragCoord.xy/uRes;\n  float asp = uRes.x/uRes.y;\n  float t = uT;\n  vec3 col;\n  vec2 bc = (uBox.xy+uBox.zw)*0.5*vec2(asp,1.0);\n  vec2 bh = (uBox.zw-uBox.xy)*0.5*vec2(asp,1.0);\n  float bd = length(max(abs(uv*vec2(asp,1.0)-bc)-bh,0.0));\n  float tmask = (1.0-smoothstep(0.0,0.30,bd))*step(0.001,uBox.z-uBox.x);\n\n  float h = HOR - uv.y;\n  if(h <= 0.0){\n    col = skyCol(uv, asp);\n  } else {\n    float z = 0.6/(h+0.06)*uK;\n    vec2 p = vec2((uv.x-0.5)*asp*z, z);\n\n    // ripples\n    vec2 rg = vec2(0.0);\n    for(int i=0;i<16;i++){\n      vec4 d = uDrops[i];\n      float a = t - d.z;\n      if(a>0.0 && a<10.0 && d.w>0.0){\n        vec2 dv = p - d.xy;\n        float r = length(dv)+1e-4;\n        float R = a*0.42;\n        float w = 0.17 + a*0.06;\n        float x = r-R;\n        float env = exp(-x*x/(w*w));\n        float k = 34.0;\n        float ph = x*k;\n        float df = env*(k*cos(ph) - 2.0*x/(w*w)*sin(ph));\n        float att = d.w*exp(-a*0.5)/(1.0+r*1.6)*smoothstep(0.0,0.12,a);\n        // soft inner \"plop\" that settles\n        float core = exp(-r*r/(0.02+a*0.02))*exp(-a*2.5)*d.w;\n        rg += (df*att)*dv/r - core*dv*18.0*sin(a*18.0);\n      }\n    }\n\n    vec2 bg = baseGrad(p, t, z);\n    vec2 gr = bg*0.020 + rg*0.034;\n    vec3 n = normalize(vec3(-gr.x, 1.0, -gr.y));\n\n    // view vector (towards camera)\n    float vy = 0.07 + h*0.95;\n    vec3 V = normalize(vec3(-(uv.x-0.5)*0.35, vy, -sqrt(max(1.0-vy*vy,0.05))));\n    float F = 0.03 + 0.97*pow(1.0-clamp(dot(n,V),0.0,1.0), 4.0);\n\n    // reflection of sky + hills + sun (mirrored about horizon, distorted by normal)\n    vec2 ruv = vec2(uv.x + gr.x*0.9*(0.3+h), HOR + h*0.55 + gr.y*0.35*(0.3+h) + 0.004);\n    vec3 refl = skyCol(ruv, asp);\n\n    // body colour\n    float lowf = 0.5+0.5*sin(p.x*1.7+p.y*1.3+t*0.15)*cos(p.y*0.9-p.x*0.6);\n    vec3 deep = vec3(0.04,0.27,0.25);\n    vec3 shal = vec3(0.14,0.58,0.43);\n    vec3 body = mix(deep, shal, 0.25+0.55*lowf);\n    body = mix(body, vec3(0.10,0.47,0.40), smoothstep(0.1,0.7,1.0-h)*0.25);\n    // light diffusing through the waves\n    body += vec3(0.05,0.16,0.10)*(0.5+0.5*dot(n.xz,vec2(0.6,0.8))*6.0)*0.6;\n\n    // caustics\n    float cs = caustic(p*2.4 + gr*0.8, t*0.45);\n    body += vec3(0.45,0.85,0.65)*cs*0.30*(1.0-F)/(1.0+z*0.35);\n\n    col = mix(body, refl, clamp(F*0.95,0.0,1.0));\n\n    // floaters (displaced by ripples)\n    vec2 pd = p + rg*0.004 + vec2(0.0, 0.01*sin(t*1.3+p.x*3.0));\n    float aa = max(z/uRes.y, z*z/(0.6*uK*uRes.y))*1.6;\n    vec4 L1 = floaters(pd, 0.75, 1.0, aa, vec2(0.020,-0.030)*t);\n    vec4 L2 = floaters(pd*1.0, 0.46, 5.0, aa, vec2(-0.015,-0.022)*t);\n    float fogO = exp(-h*6.0)*0.0; // placeholder\n    // soft shadow under objects\n    col *= 1.0 - 0.0;\n    L1.a *= 1.0-0.92*tmask; L2.a *= 1.0-0.92*tmask;\n    col = mix(col, L2.rgb, L2.a);\n    col = mix(col, L1.rgb, L1.a);\n    float objA = max(L1.a, L2.a);\n\n    // sun glints / glitter\n    vec3 Ls = normalize(vec3(0.0, 0.22, 1.0));\n    vec3 H = normalize(Ls+V);\n    float sp = pow(max(dot(n,H),0.0), 700.0);\n    float sunPath = exp(-pow((uv.x-0.70)*1.7,2.0)) ;\n    float glint = sp*sunPath*(1.0-objA);\n    // sharp crests from ripples catch sky light too\n    float rl = dot(rg*0.034,vec2(0.5,0.86));\n    float crest = (1.0-0.6*tmask)*(clamp(dot(bg*0.01,vec2(0.5,0.86))*2.2,0.0,1.0)*0.5 + clamp(rl*1.4,0.0,1.0)*0.9)*(1.0-objA);\n    col -= vec3(0.10,0.22,0.17)*clamp(-rl*1.6,0.0,1.0)*(1.0-objA);\n    col += vec3(1.0,0.82,0.5)*glint*2.0 + vec3(0.85,1.0,0.92)*crest;\n    col += vec3(1.0,0.95,0.85)*pow(max(dot(n,H),0.0),2500.0)*sunPath*1.2;\n\n    // drifting mist toward the far edge\n    float mN = 0.5+0.5*sin(p.x*2.2 - t*0.12 + sin(p.y*1.7+t*0.08)*2.0);\n    float mist = exp(-h*7.5)*(0.55+0.4*mN);\n    mist += smoothstep(5.0,14.0,z)*0.25;\n    col = mix(col, vec3(0.94,0.96,0.92), clamp(mist,0.0,0.9));\n  }\n\n  // legibility veil: calmer + lighter under the copy\n  float veil = tmask*0.66;\n  col = mix(col, vec3(0.968,0.957,0.925), veil);\n  // soft edge vignette (gentle, brand green)\n  vec2 vq = uv-0.5;\n  col = mix(col, col*vec3(0.80,0.92,0.88), smoothstep(0.35,0.95,length(vq*vec2(1.0,1.2)))*0.35*(1.0-veil));\n  gl_FragColor = vec4(col,1.0);\n}\n";
var CSS_ID = "mbg-river-css";
var state = null;

function mount(host, api){
  if(state) unmount();
  var st = state = { on:[], dead:false };
  var style = document.createElement("style");
  style.id = CSS_ID;
  style.textContent =
    ".mbg-river{overflow:hidden;background:linear-gradient(180deg,#f7f4ec 0%,#e4f1e9 22%,#8fcfb0 45%,#2f9e72 75%,#1a6b4d 100%)}" +
    ".mbg-river canvas{position:absolute;inset:0;width:100%;height:100%;display:block}";
  document.head.appendChild(style);
  st.style = style;
  host.classList.add("mbg-river");
  st.host = host;

  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden","true");
  host.appendChild(canvas);
  st.canvas = canvas;

  var gl = null;
  try { gl = canvas.getContext("webgl",{antialias:false,alpha:false,powerPreference:"low-power"}) || canvas.getContext("experimental-webgl"); } catch(e){}
  function sh(type, src){
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  var prog = null;
  if(gl){
    var vs = sh(gl.VERTEX_SHADER,"attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}");
    var fs = sh(gl.FRAGMENT_SHADER, FS);
    if(vs && fs){
      prog = gl.createProgram(); gl.attachShader(prog,vs); gl.attachShader(prog,fs); gl.linkProgram(prog);
      if(!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
    }
  }
  if(!gl || !prog){
    // static CSS gradient fallback (host already carries it)
    if(canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if(gl){ var x0 = gl.getExtension("WEBGL_lose_context"); if(x0) x0.loseContext(); }
    st.fallback = true;
    return;
  }
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog,"a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  var uRes = gl.getUniformLocation(prog,"uRes"), uT = gl.getUniformLocation(prog,"uT"),
      uK = gl.getUniformLocation(prog,"uK"), uDr = gl.getUniformLocation(prog,"uDrops"),
      uBox = gl.getUniformLocation(prog,"uBox");

  var reduced = !!api.reduced;
  var HOR = 0.80, STILL_T = 6.5;
  var dprCap = api.isMobile ? 1 : Math.min(window.devicePixelRatio||1, 1.5);
  var quality = 1, K = 1, W = 2, H = 2, cw = 1, ch = 1;
  var drops = new Float32Array(64), di = 0;
  var t0 = performance.now();
  function now(){ return (performance.now()-t0)/1000 + 2.0; }

  function resize(){
    var r = host.getBoundingClientRect();
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    var s = dprCap*quality, maxPx = api.isMobile ? 0.9e6 : 1.6e6;
    if(cw*ch*s*s > maxPx) s = Math.sqrt(maxPx/(cw*ch));
    W = Math.max(2, Math.round(cw*s)); H = Math.max(2, Math.round(ch*s));
    if(canvas.width !== W || canvas.height !== H){ canvas.width = W; canvas.height = H; }
    gl.viewport(0,0,W,H);
    var asp = W/H;
    K = Math.min(Math.max(1.1/asp,1.0),1.8);
    gl.uniform2f(uRes,W,H); gl.uniform1f(uK,K);
  }
  function toPlane(x, y){
    var uvx = x/cw, uvy = 1 - y/ch, a = cw/ch;
    var h = Math.max(HOR-uvy, 0.085), z = 0.6/(h+0.06)*K;
    return [(uvx-0.5)*a*z, z];
  }
  function addDrop(x, y, amp, t){
    var p = toPlane(x,y), i = di*4; di = (di+1)%16;
    drops[i]=p[0]; drops[i+1]=p[1]; drops[i+2]=(t===undefined?now():t); drops[i+3]=amp;
  }
  function setBox(){
    var tr = null;
    try { tr = api.textRect(); } catch(e){}
    var r = host.getBoundingClientRect();
    if(!tr || !tr.width || !r.width){ gl.uniform4f(uBox,0,0,0,0); return; }
    var pad = 20;
    var x0 = (tr.left - pad - r.left)/r.width, x1 = (tr.right + pad - r.left)/r.width;
    var y0 = 1 - (tr.bottom + pad - r.top)/r.height, y1 = 1 - (tr.top - pad - r.top)/r.height;
    gl.uniform4f(uBox, x0, y0, x1, y1);
  }
  function draw(t){
    setBox();
    gl.uniform1f(uT,t);
    gl.uniform4fv(uDr,drops);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }

  function rel(e){ var r = host.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top]; }
  var last = null, pressed = false, acc = 0;
  function onMove(e){
    if(reduced) return;
    var p = rel(e);
    if(last){
      var dx = p[0]-last[0], dy = p[1]-last[1], d = Math.sqrt(dx*dx+dy*dy);
      acc += d;
      var step = pressed ? 22 : 46, spd = Math.min(d/18,1);
      if(acc >= step){ addDrop(p[0],p[1],(pressed?0.75:0.42)*(0.55+0.45*spd)); acc = 0; }
    }
    last = p;
  }
  function onDown(e){
    if(reduced) return;
    var tg = e.target;
    if(tg && tg.closest && tg.closest("a,button,input,[data-nobg]")) return;
    var p = rel(e);
    pressed = true; last = p; acc = 0;
    addDrop(p[0],p[1],2.1);
    addDrop(p[0],p[1],1.0,now()+0.16);
  }
  function onUp(){ pressed = false; }
  function onLeave(){ last = null; }
  var surf = api.surface || host;
  function on(t, ev, fn, opt){ t.addEventListener(ev, fn, opt); st.on.push([t,ev,fn,opt]); }
  on(surf,"pointermove",onMove,{passive:true});
  on(surf,"pointerdown",onDown,{passive:true});
  on(surf,"pointerup",onUp,{passive:true});
  on(surf,"pointercancel",onUp,{passive:true});
  on(surf,"pointerleave",onLeave,{passive:true});
  on(window,"resize",function(){ resize(); if(reduced||!running) draw(reduced?STILL_T:now()); });

  if(reduced){
    var seeds = [[0.72,0.72,1.6,-1.4],[0.60,0.88,1.0,-2.6],[0.86,0.80,1.2,-0.7]];
    resize();
    seeds.forEach(function(s){ addDrop(cw*s[0], ch*s[1], s[2], STILL_T+s[3]); });
  }

  var running = false, raf = 0, ema = 16, lastT = 0, slow = 0, visible = true;
  function frame(ts){
    if(st.dead) return;
    raf = requestAnimationFrame(frame);
    if(lastT){
      var dt = ts-lastT;
      if(dt < 250) ema = ema*0.9 + dt*0.1;
      if(ema > 38 && quality > 0.5){
        if(++slow > 20){ quality = Math.max(0.5, quality*0.8); slow = 0; ema = 20; resize(); }
      } else slow = 0;
    }
    lastT = ts;
    draw(now());
  }
  function update(){
    var want = !reduced && visible && !document.hidden;
    if(want && !running){ running = true; lastT = 0; raf = requestAnimationFrame(frame); }
    else if(!want && running){ running = false; cancelAnimationFrame(raf); }
  }
  on(document,"visibilitychange",update);
  if("IntersectionObserver" in window){
    var io = new IntersectionObserver(function(es){ visible = es[es.length-1].isIntersecting; update(); });
    io.observe(host); st.io = io;
  }
  if("ResizeObserver" in window){
    var ro = new ResizeObserver(function(){ resize(); if(!running) draw(reduced?STILL_T:now()); });
    ro.observe(host); st.ro = ro;
  }
  resize();
  draw(reduced?STILL_T:now());
  update();
  st.stop = function(){ running = false; cancelAnimationFrame(raf); };
  st.gl = gl; st.buf = buf; st.prog = prog;
}

function unmount(){
  var st = state; if(!st) return;
  state = null; st.dead = true;
  if(st.stop) st.stop();
  st.on.forEach(function(a){ a[0].removeEventListener(a[1],a[2],a[3]); });
  if(st.io) st.io.disconnect();
  if(st.ro) st.ro.disconnect();
  if(st.gl){
    try { st.gl.deleteBuffer(st.buf); st.gl.deleteProgram(st.prog); } catch(e){}
    var x = st.gl.getExtension("WEBGL_lose_context"); if(x) x.loseContext();
  }
  if(st.canvas && st.canvas.parentNode) st.canvas.parentNode.removeChild(st.canvas);
  if(st.style && st.style.parentNode) st.style.parentNode.removeChild(st.style);
  if(st.host){ st.host.classList.remove("mbg-river"); while(st.host.firstChild) st.host.removeChild(st.host.firstChild); }
}

window.MynnaBackgrounds.register("river",{id:"river",name:"The river",dark:false,mount:mount,unmount:unmount});
})();
