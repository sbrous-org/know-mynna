(function(){
'use strict';
var CSS_ID='mbg-leaves-css';
function mountImpl(host, api, S){
var cvs=document.createElement('canvas'); cvs.className='mbg-leaves-cvs';
var ctx=cvs.getContext('2d');
var supportsFilter='filter' in ctx;
host.classList.add('mbg-leaves');
host.appendChild(cvs);
var reduced=!!api.reduced;
var DPR=1,W=0,H=0,scaleK=1,hostL=0,hostT=0;
/* ---------- color helpers ---------- */
function hex2rgb(h){h=h.replace('#','');return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)];}
function shade(h,a){ // a>0 lighten toward white, a<0 darken toward black
  var c=hex2rgb(h), t=a>0?255:0, k=Math.abs(a);
  return 'rgb('+c.map(function(v){return Math.round(v+(t-v)*k);}).join(',')+')';
}

/* ---------- sprite drawing ---------- */
function grad(c, w, color){
  var g=c.createLinearGradient(-w,0,w,0);
  g.addColorStop(0,shade(color,.22)); g.addColorStop(.5,color); g.addColorStop(1,shade(color,-.22));
  return g;
}
function drawTea(c,L,color,k){
  var w=L*.29;
  c.beginPath(); c.moveTo(0,-L/2);
  c.bezierCurveTo(w*1.8,-L*.28,w*1.35,L*.26,0,L/2);
  c.bezierCurveTo(-w*1.25,L*.26,-w*1.7,-L*.26,0,-L/2);
  c.closePath(); c.fillStyle=grad(c,w,color); c.fill();
  c.strokeStyle=shade(color,-.3); c.lineWidth=1.2*k; c.stroke();
  c.strokeStyle='rgba(255,255,255,.5)'; c.lineWidth=1.8*k; c.lineCap='round';
  c.beginPath(); c.moveTo(0,L/2+L*.1); c.lineTo(0,-L/2+L*.05); c.stroke();
  c.lineWidth=1*k; c.strokeStyle='rgba(255,255,255,.28)';
  for(var i=1;i<=6;i++){
    var y=-L/2+L*i/7.4, ww=w*1.25*Math.sin(Math.PI*(i/7.4))*.95;
    c.beginPath(); c.moveTo(0,y+L*.02); c.lineTo(ww,y-L*.09); c.moveTo(0,y+L*.02); c.lineTo(-ww,y-L*.09); c.stroke();
  }
}
function drawBanana(c,L,color,k){
  var w=L*.2;
  c.beginPath(); c.moveTo(0,-L/2);
  c.bezierCurveTo(w*.9,-L*.42,w*1.1,-L*.2,w*1.05,0);
  c.bezierCurveTo(w*1.05,L*.28,w*.8,L*.42,w*.1,L/2);
  c.lineTo(-w*.1,L/2);
  c.bezierCurveTo(-w*.9,L*.42,-w*1.1,L*.28,-w*1.1,0);
  c.bezierCurveTo(-w*1.1,-L*.2,-w*.9,-L*.42,0,-L/2);
  c.closePath(); c.fillStyle=grad(c,w,color); c.fill();
  c.strokeStyle=shade(color,-.28); c.lineWidth=1.1*k; c.stroke();
  c.save(); c.clip();
  c.strokeStyle='rgba(255,255,255,.26)'; c.lineWidth=1*k;
  for(var i=0;i<16;i++){
    var y=-L/2+L*(i+1)/17;
    c.beginPath(); c.moveTo(0,y+L*.02); c.lineTo(w*1.3,y-L*.06); c.moveTo(0,y+L*.02); c.lineTo(-w*1.3,y-L*.06); c.stroke();
  }
  c.restore();
  // torn cuts
  c.globalCompositeOperation='destination-out'; c.lineCap='round';
  c.lineWidth=2.2*k;
  [[-.28,1],[-.1,-1],[.12,1],[.3,-1]].forEach(function(p){
    var y=L*p[0], s=p[1];
    c.beginPath(); c.moveTo(s*w*1.5,y-L*.05); c.lineTo(s*w*.45,y+L*.0); c.stroke();
  });
  c.globalCompositeOperation='source-over';
  c.strokeStyle='rgba(255,255,255,.55)'; c.lineWidth=2*k;
  c.beginPath(); c.moveTo(0,L/2+L*.08); c.lineTo(0,-L/2+L*.04); c.stroke();
}
function drawMarigold(c,L,color,k){
  var w=L*.36;
  c.beginPath(); c.moveTo(0,L*.5);
  c.bezierCurveTo(-w*1.1,L*.18,-w*1.5,-L*.3,-w*.55,-L*.46);
  c.quadraticCurveTo(-w*.25,-L*.52,0,-L*.44);
  c.quadraticCurveTo(w*.25,-L*.52,w*.55,-L*.46);
  c.bezierCurveTo(w*1.5,-L*.3,w*1.1,L*.18,0,L*.5);
  c.closePath();
  var g=c.createLinearGradient(0,L/2,0,-L/2);
  g.addColorStop(0,shade('#b85a00',0)); g.addColorStop(.4,color); g.addColorStop(1,shade(color,.25));
  c.fillStyle=g; c.fill();
  c.save(); c.clip();
  c.strokeStyle='rgba(120,50,0,.22)'; c.lineWidth=1.2*k;
  for(var i=-4;i<=4;i++){ c.beginPath(); c.moveTo(0,L*.5); c.quadraticCurveTo(i*w*.18,0,i*w*.3,-L*.5); c.stroke(); }
  c.restore();
}
function drawOrchid(c,L,color,k){
  var w=L*.4, white = (color==='#fbf8f2');
  c.beginPath(); c.moveTo(0,L*.5);
  c.bezierCurveTo(-w*.9,L*.22,-w*1.6,-L*.15,-w*.9,-L*.42);
  c.bezierCurveTo(-w*.5,-L*.55,-w*.1,-L*.45,0,-L*.34);
  c.bezierCurveTo(w*.1,-L*.45,w*.5,-L*.55,w*.9,-L*.42);
  c.bezierCurveTo(w*1.6,-L*.15,w*.9,L*.22,0,L*.5);
  c.closePath();
  var g=c.createRadialGradient(0,L*.35,L*.02,0,0,L*.62);
  if(white){ g.addColorStop(0,'#e9a09a'); g.addColorStop(.35,'#fbf8f2'); g.addColorStop(1,'#efe9dc'); }
  else { g.addColorStop(0,shade(color,-.35)); g.addColorStop(.45,color); g.addColorStop(1,shade(color,.3)); }
  c.fillStyle=g; c.fill();
  c.strokeStyle=white?'rgba(179,38,30,.35)':'rgba(255,255,255,.3)'; c.lineWidth=1.1*k;
  c.save(); c.clip();
  for(var i=-3;i<=3;i++){ c.beginPath(); c.moveTo(0,L*.5); c.quadraticCurveTo(i*w*.2,L*.05,i*w*.34,-L*.4); c.stroke(); }
  c.restore();
}
var KINDS = {
  tea:     {fn:drawTea,     colors:['#1a6b4d','#2f9e72','#3fae80','#5ab98a','#17583f']},
  banana:  {fn:drawBanana,  colors:['#2f9e72','#4cae7e','#7ccaa0','#1a6b4d']},
  marigold:{fn:drawMarigold,colors:['#e8820c','#f2a23a','#f6b94f']},
  orchid:  {fn:drawOrchid,  colors:['#b3261e','#fbf8f2','#d4524a']}
};
var BLUR=[{S:96,px:0},{S:112,px:1.6},{S:160,px:6}];
function makeSprite(kind,color,lvl){
  var S=BLUR[lvl].S, k=S/96;
  var c0=document.createElement('canvas'); c0.width=c0.height=S;
  var x0=c0.getContext('2d'); x0.translate(S/2,S/2);
  KINDS[kind].fn(x0,S*.7,color,k);
  var out=c0;
  if(BLUR[lvl].px>0){
    out=document.createElement('canvas'); out.width=out.height=S;
    var x1=out.getContext('2d');
    if(supportsFilter){ x1.filter='blur('+(BLUR[lvl].px*k)+'px)'; x1.drawImage(c0,0,0); }
    else { // pre-blur fallback: down/up-scale
      var f=lvl===2?.16:.4, sm=document.createElement('canvas'); sm.width=sm.height=Math.max(4,Math.round(S*f));
      var xs=sm.getContext('2d'); xs.imageSmoothingQuality='high'; xs.drawImage(c0,0,0,sm.width,sm.height);
      x1.imageSmoothingEnabled=true; x1.drawImage(sm,0,0,S,S); sm=null;
    }
  }
  var d=document.createElement('canvas'); d.width=d.height=S;
  var xd=d.getContext('2d'); xd.drawImage(out,0,0);
  xd.globalCompositeOperation='source-atop'; xd.fillStyle='rgba(10,30,24,.55)'; xd.fillRect(0,0,S,S);
  return {light:out,dark:d,S:S};
}
var sprites={}; // kind -> [ {color, lvls:[...]} ]
Object.keys(KINDS).forEach(function(kd){
  sprites[kd]=KINDS[kd].colors.map(function(col){
    return [0,1,2].map(function(l){return makeSprite(kd,col,l);});
  });
});

/* ---------- particles ---------- */
var parts=[], N=420, rnd=Math.random;
function pickKind(){
  var r=rnd();
  if(r<.34) return 'tea'; if(r<.56) return 'banana'; if(r<.80) return 'marigold'; return 'orchid';
}
function pickColor(kind){
  var n=KINDS[kind].colors.length;
  if(kind==='orchid'){ var r=rnd(); return r<.3?0:(r<.75?1:2); }
  return Math.floor(rnd()*n);
}
function rightBiasX(){ return (api.isMobile?W*rnd():W*(1-Math.pow(rnd(),1.45))); }
function newPart(initial,burst){
  var s=.42+1.9*Math.pow(rnd(),2.9);
  var kind=pickKind();
  var p={
    kind:kind, ci:pickColor(kind), s:s,
    lvl: s>1.55?2:(s>.95?1:0),
    x:0,y:0,vx:0,vy:0,
    rz:rnd()*6.283, wz:(rnd()-.5)*1.2,
    ry:rnd()*6.283, wy:(rnd()-.3)*2.2,
    rx:rnd()*6.283, wx:(rnd()-.5)*1.4,
    ph:rnd()*6.283, sw:.5+rnd()*.9,
    size:(54+rnd()*20), life:-1
  };
  if(initial){ p.x=rightBiasX(); p.y=rnd()*H; }
  else respawn(p);
  if(burst){ p.life=5.5; }
  return p;
}
function respawn(p){
  var m=p.size*p.s*1.2;
  if(rnd()<.55){ p.x=rightBiasX(); p.y=-m; }
  else { p.x=W+m; p.y=rnd()*H*.9-H*.1; }
  p.vx=-20*p.s; p.vy=20*p.s;
}
function initParts(){
  parts.length=0;
  N = api.isMobile ? 260 : 440;
  for(var i=0;i<N;i++) parts.push(newPart(true,false));
  parts.sort(function(a,b){return a.s-b.s;});
}

/* ---------- pointer / wind ---------- */
var ptr={x:-9999,y:-9999,vx:0,vy:0,str:0,down:false,has:false,lt:0};
var lean={x:0,y:0,tx:0,ty:0};
var surf=api.surface;
function rel(e){ var r=host.getBoundingClientRect(); hostL=r.left; hostT=r.top; return [e.clientX-r.left,e.clientY-r.top]; }
function onMove(e){
  var q=rel(e), x=q[0], y=q[1], t=performance.now();
  if(ptr.has){
    var dt=Math.max(8,t-ptr.lt)/1000;
    ptr.vx=ptr.vx*.6+((x-ptr.x)/dt)*.4; ptr.vy=ptr.vy*.6+((y-ptr.y)/dt)*.4;
    var sp=Math.hypot(x-ptr.x,y-ptr.y);
    ptr.str=Math.min(1.3,ptr.str+.05+sp*.0045);
  }
  ptr.x=x; ptr.y=y; ptr.lt=t; ptr.has=true;
  lean.tx=(x/W-.5)*2; lean.ty=(y/H-.5)*2;
}
function onDown(e){
  var tg=e.target; if(tg&&tg.closest&&tg.closest('a,button,input,[data-nobg]')) return;
  onMove(e); ptr.down=true; ptr.str=1.3; burst(ptr.x,ptr.y);
}
function onUp(){ ptr.down=false; }
function onLeave(){ ptr.down=false; ptr.has=false; lean.tx=lean.ty=0; }
function burst(x,y){
  if(reduced) return;
  for(var i=0;i<parts.length;i++){
    var p=parts[i], dx=p.x-x, dy=p.y-y, r=Math.hypot(dx,dy)+1;
    if(r<380){ var f=(1-r/380); f*=f; p.vx+=dx/r*900*f*(.5+p.s*.4); p.vy+=dy/r*900*f*(.5+p.s*.4); p.wy+=(rnd()-.5)*10*f; p.wz+=(rnd()-.5)*8*f; }
  }
  var extra=Math.min(api.isMobile?28:44,200-countBursts());
  for(var j=0;j<extra;j++){
    var p2=newPart(false,true), a=rnd()*6.283, sp=260+rnd()*620;
    p2.x=x+Math.cos(a)*10; p2.y=y+Math.sin(a)*10;
    p2.s=.5+rnd()*1.2; p2.lvl=p2.s>1.55?2:(p2.s>.95?1:0);
    p2.vx=Math.cos(a)*sp; p2.vy=Math.sin(a)*sp-80;
    p2.wy=(rnd()-.5)*9; p2.wz=(rnd()-.5)*7;
    parts.push(p2);
  }
  parts.sort(function(a,b){return a.s-b.s;});
}
function countBursts(){ var c=0; for(var i=0;i<parts.length;i++) if(parts[i].life>=0) c++; return c; }
var ev=[['pointermove',onMove],['pointerdown',onDown],['pointerup',onUp],['pointercancel',onUp],['pointerleave',onLeave]];
if(!reduced) ev.forEach(function(e){ surf.addEventListener(e[0],e[1],{passive:true}); });

/* ---------- loop ---------- */
function clamp(v,a,b){return v<a?a:(v>b?b:v);}
var textRect=null;
function updText(){ var q=api.textRect&&api.textRect(); if(!q){textRect=null;return;} textRect={l:q.left-hostL-10,t:q.top-hostT-10,r:q.right-hostL+10,b:q.bottom-hostT+10}; }
function textFade(p){
  if(!textRect) return 0;
  var dx=Math.max(textRect.l-p.x,0,p.x-textRect.r), dy=Math.max(textRect.t-p.y,0,p.y-textRect.b);
  return clamp(1-Math.hypot(dx,dy)/110,0,1);
}
function step(dt,t){
  var tp = ptr.has? 1:0;
  ptr.str = ptr.down ? Math.max(ptr.str,.9) : ptr.str*Math.exp(-dt*1.35);
  ptr.vx*=Math.exp(-dt*3); ptr.vy*=Math.exp(-dt*3);
  lean.x+=(lean.tx-lean.x)*Math.min(1,dt*2.2); lean.y+=(lean.ty-lean.y)*Math.min(1,dt*2.2);
  var R=Math.max(190,Math.min(W,H)*.34)*(ptr.down?1.25:1);
  var str=ptr.str*tp;
  for(var i=parts.length-1;i>=0;i--){
    var p=parts[i], s=p.s;
    if(p.life>=0){ p.life-=dt; if(p.life<=0){ parts.splice(i,1); continue; } }
    var sv=Math.pow(s,.8);
    // drift target: down-left breeze with sway
    var tx=-26*sv+Math.sin(t*.6*p.sw+p.ph)*16*sv;
    var ty=24*sv+Math.cos(t*.5*p.sw+p.ph*1.3)*12*sv;
    var k=Math.min(1,dt*(.9/Math.max(.5,s*.8)));
    if(p.life>=0) k=Math.min(1,dt*.5);
    p.vx+=(tx-p.vx)*k; p.vy+=(ty-p.vy)*k;
    // wind vortex around the pointer
    if(str>0.01){
      var dx=p.x-ptr.x, dy=p.y-ptr.y, r2=dx*dx+dy*dy, r=Math.sqrt(r2)+1;
      var f=Math.exp(-r2/(R*R*.9));
      if(f>.01){
        var nx=dx/r, ny=dy/r, g=f*str*(.55+s*.45);
        var sp=Math.min(1,Math.hypot(ptr.vx,ptr.vy)/900);
        // tangential (swirl) + a little outward push + drag along pointer motion
        p.vx+=(-ny*1100+nx*140)*g*dt + ptr.vx*g*dt*1.6;
        p.vy+=( nx*1100+ny*140)*g*dt + ptr.vy*g*dt*1.6;
        p.wy+=(Math.sign(p.wy||1))*g*dt*26; p.wz+=(nx*ny>0?1:-1)*g*dt*14*(1+sp);
      }
    }
    // damp speed
    var spd=Math.hypot(p.vx,p.vy), mx=900;
    if(spd>mx){ p.vx*=mx/spd; p.vy*=mx/spd; }
    p.x+=p.vx*dt; p.y+=p.vy*dt;
    // spin relax toward base tumble
    var ts = (Math.abs(p.wy)>2.4? 1.4:1);
    p.wy+=((p.wy>0?1.1:-1.1)*(.5+s*.2)-p.wy)*Math.min(1,dt*.8);
    p.wz+=((p.wz>0?.35:-.35)-p.wz)*Math.min(1,dt*.7);
    p.rz+=p.wz*dt; p.ry+=p.wy*dt; p.rx+=p.wx*dt;
    // wrap
    if(p.life<0){
      var m=p.size*s*1.4;
      if(p.x<-m*1.5 || p.y>H+m*1.5 || p.x>W+m*3 || p.y<-m*3) respawn(p);
    }
  }
}
function draw(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cvs.width,cvs.height);
  var lx=lean.x, ly=lean.y;
  for(var i=0;i<parts.length;i++){
    var p=parts[i], s=p.s;
    var sx=p.x - lx*(s-.9)*46, sy=p.y - ly*(s-.9)*30;
    var size=p.size*s*scaleK;
    if(sx<-size||sx>W+size||sy<-size||sy>H+size) continue;
    var cy=Math.cos(p.ry), ay=Math.abs(cy);
    var sc=p.s>0?size/BLUR[p.lvl].S*1.45:0;
    var sprite=sprites[p.kind][p.ci][p.lvl];
    var tf=textFade(p);
    var near=clamp((s-.7)/1.4,0,1);
    var a=(.62+.38*(1-clamp((1.1-s)/.8,0,1)))*(1-tf*(.35+.5*near));
    if(p.life>=0 && p.life<1.2) a*=p.life/1.2;
    if(p.lvl===2 && !supportsFilter) a*=.55;
    var cz=Math.cos(p.rz), sz=Math.sin(p.rz);
    var kx=(ay<.06? (cy<0?-.06:.06):cy)*sc*DPR;
    var ky=(.62+.38*Math.abs(Math.cos(p.rx)))*sc*DPR;
    ctx.setTransform(cz*kx,sz*kx,-sz*ky,cz*ky,sx*DPR,sy*DPR);
    ctx.globalAlpha=a;
    var h=sprite.S/2;
    ctx.drawImage(sprite.light,-h,-h);
    var dk=(cy<0?.5:0)+(1-ay)*.38;
    if(dk>.02){ ctx.globalAlpha=a*clamp(dk,0,.85); ctx.drawImage(sprite.dark,-h,-h); }
  }
  ctx.globalAlpha=1;
}
var last=0, running=false, raf=0, onScreen=true, disposed=false;
function frame(now){
  raf=0;
  if(!running||disposed) return;
  var dt=Math.min(.05,(now-last)/1000); last=now;
  rel({clientX:0,clientY:0}); updText();
  step(dt,now/1000);
  draw();
  raf=requestAnimationFrame(frame);
}
function syncRun(){
  var want=!reduced && onScreen && !document.hidden && !disposed;
  if(want && !running){ running=true; last=performance.now(); raf=requestAnimationFrame(frame); }
  else if(!want && running){ running=false; if(raf){cancelAnimationFrame(raf);raf=0;} }
}
document.addEventListener('visibilitychange',syncRun);
var io=null;
if('IntersectionObserver' in window){ io=new IntersectionObserver(function(en){ onScreen=en[en.length-1].isIntersecting; syncRun(); }); io.observe(host); }

function clamp2(v,a,b){return v<a?a:(v>b?b:v);}
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  var r=host.getBoundingClientRect(); W=Math.max(1,r.width); H=Math.max(1,r.height); hostL=r.left; hostT=r.top;
  cvs.width=Math.round(W*DPR); cvs.height=Math.round(H*DPR);
  scaleK=clamp2(W/1360,.62,1.15);
  updText();
  if(!parts.length) initParts();
  else parts.forEach(function(p){ if(p.x>W*1.5||p.y>H*1.5){ p.x=rnd()*W; p.y=rnd()*H; } });
  if(reduced) staticRender();
}
function staticRender(){ parts.forEach(function(p){ p.ry=p.ry*.3; }); draw(); }
var ro=null;
if('ResizeObserver' in window){ ro=new ResizeObserver(function(){resize();}); ro.observe(host); }
window.addEventListener('resize',resize);
resize();
if(reduced) staticRender(); else syncRun();

return function dispose(){
  disposed=true; running=false;
  if(raf){cancelAnimationFrame(raf);raf=0;}
  document.removeEventListener('visibilitychange',syncRun);
  window.removeEventListener('resize',resize);
  ev.forEach(function(e){ surf.removeEventListener(e[0],e[1]); });
  if(io){io.disconnect();io=null;} if(ro){ro.disconnect();ro=null;}
  Object.keys(sprites).forEach(function(k){ sprites[k].forEach(function(a){ a.forEach(function(s){ s.light.width=s.light.height=0; s.dark.width=s.dark.height=0; }); }); delete sprites[k]; });
  sprites=null; parts.length=0; parts=null;
  cvs.width=cvs.height=0;
  if(cvs.parentNode) cvs.parentNode.removeChild(cvs);
  host.classList.remove('mbg-leaves');
  ctx=null; cvs=null;
};
}

var disposer=null, styleEl=null;
function ensureCss(){
  if(document.getElementById(CSS_ID)) return;
  styleEl=document.createElement('style'); styleEl.id=CSS_ID;
  styleEl.textContent='.mbg-leaves{overflow:hidden}.mbg-leaves .mbg-leaves-cvs{position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none}';
  document.head.appendChild(styleEl);
}
var host_=null;
window.MynnaBackgrounds.register("leaves",{
  id:"leaves", name:"Leaf storm", dark:false,
  mount:function(host,api){
    if(disposer) this.unmount();
    host_=host; ensureCss();
    disposer=mountImpl(host,api);
  },
  unmount:function(){
    if(disposer){ disposer(); disposer=null; }
    if(host_){ while(host_.firstChild) host_.removeChild(host_.firstChild); host_=null; }
    var s=document.getElementById(CSS_ID); if(s&&s.parentNode) s.parentNode.removeChild(s); styleEl=null;
  }
});
})();
