(function(){
"use strict";
var STYLE_ID="mbg-fireflies-css";
var cleanup=null;
function mount(host,api){
  if(cleanup)cleanup();
  const rnd=(a,b)=>a+Math.random()*(b-a),TAU=Math.PI*2,RM=!!api.reduced;
  host.classList.add("mbg-fireflies");
  const st=document.createElement("style");st.id=STYLE_ID;
  st.textContent=".mbg-fireflies{overflow:hidden;background:#0b2a27}.mbg-fireflies canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}";
  document.head.appendChild(st);
  const cv=document.createElement("canvas");cv.setAttribute("aria-hidden","true");host.appendChild(cv);
  const ctx=cv.getContext("2d");
  let W=0,H=0,dpr=1,S=1,t=0;
// ---------- sprites ----------
function glow(rgb,size=128){
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),h=size/2;
  const r=rgb.join(',');const gr=g.createRadialGradient(h,h,0,h,h,h);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.06,'rgba(255,255,240,.95)');
  gr.addColorStop(.14,`rgba(${r},.75)`);gr.addColorStop(.32,`rgba(${r},.3)`);
  gr.addColorStop(.6,`rgba(${r},.07)`);gr.addColorStop(1,`rgba(${r},0)`);
  g.fillStyle=gr;g.fillRect(0,0,size,size);return c;
}
function bokeh(rgb,size=128){
  const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),h=size/2;
  const r=rgb.join(',');const gr=g.createRadialGradient(h,h,0,h,h,h);
  gr.addColorStop(0,`rgba(${r},.28)`);gr.addColorStop(.7,`rgba(${r},.38)`);gr.addColorStop(.88,`rgba(${r},.75)`);
  gr.addColorStop(.97,`rgba(${r},.2)`);gr.addColorStop(1,`rgba(${r},0)`);
  g.fillStyle=gr;g.fillRect(0,0,size,size);return c;
}
let SP=[glow([226,255,130]),glow([255,190,85]),glow([255,236,170]),glow([255,150,70]),glow([190,255,170])];
let BK=[bokeh([255,205,110]),bokeh([255,160,80]),bokeh([210,255,160])];
let LANT=(()=>{const k=2,c=document.createElement('canvas');c.width=64*k;c.height=80*k;const g=c.getContext('2d');g.scale(k,k);
  const path=()=>{g.beginPath();g.moveTo(20,14);g.bezierCurveTo(20,0,44,0,44,14);g.bezierCurveTo(52,30,50,52,42,66);g.lineTo(22,66);g.bezierCurveTo(14,52,12,30,20,14);g.closePath();};
  path();const gr=g.createLinearGradient(0,4,0,66);gr.addColorStop(0,'#fff3c4');gr.addColorStop(.5,'#ffc765');gr.addColorStop(1,'#ee861a');g.fillStyle=gr;g.fill();
  g.save();path();g.clip();
  g.strokeStyle='rgba(150,70,10,.22)';g.lineWidth=1;for(let x=24;x<=40;x+=8){g.beginPath();g.moveTo(32+(x-32)*.35,2);g.quadraticCurveTo(x+(x-32)*.9,34,32+(x-32)*.8,66);g.stroke();}
  g.fillStyle='rgba(179,38,30,.92)';g.fillRect(0,56,64,5);g.fillStyle='rgba(251,248,242,.9)';g.fillRect(0,61,64,1.5);
  const ig=g.createRadialGradient(32,50,0,32,50,26);ig.addColorStop(0,'rgba(255,255,230,.95)');ig.addColorStop(1,'rgba(255,220,120,0)');g.fillStyle=ig;g.fillRect(0,20,64,50);
  g.restore();
  g.fillStyle='#6d2a10';g.fillRect(22,66,20,2.5);
  const fg=g.createRadialGradient(32,67,0,32,67,9);fg.addColorStop(0,'rgba(255,255,255,1)');fg.addColorStop(1,'rgba(255,170,60,0)');g.fillStyle=fg;g.fillRect(20,56,24,24);
  return c;})();
// ---------- world ----------
let bg,layers=[],F=[],L=[],P=[],R=[];
const M=48;
const ptr={x:0,y:0,sx:0,sy:0,active:false,act:0,px:0,py:0,tpx:0,tpy:0};
const trail=[];
function mk(w,h){const c=document.createElement('canvas');c.width=Math.ceil(w*dpr);c.height=Math.ceil(h*dpr);const g=c.getContext('2d');g.scale(dpr,dpr);return[c,g];}
function buildBg(){
  const[c,g]=mk(W,H);
  const sk=g.createLinearGradient(0,0,0,H*.78);
  sk.addColorStop(0,'#0a2524');sk.addColorStop(.3,'#124a3b');sk.addColorStop(.52,'#5b6b3e');sk.addColorStop(.66,'#d9944f');sk.addColorStop(.78,'#f6b977');
  g.fillStyle=sk;g.fillRect(0,0,W,H);
  const sx=W*(W<700?.7:.72),sy=H*.7,sr=Math.max(W,H)*.55;
  let gr=g.createRadialGradient(sx,sy,0,sx,sy,sr);gr.addColorStop(0,'rgba(255,214,150,.75)');gr.addColorStop(.25,'rgba(255,170,90,.38)');gr.addColorStop(1,'rgba(255,140,60,0)');
  g.fillStyle=gr;g.fillRect(0,0,W,H);
  const dr=Math.min(W,H)*.075;gr=g.createRadialGradient(sx,sy,0,sx,sy,dr);gr.addColorStop(0,'rgba(255,248,220,1)');gr.addColorStop(.8,'rgba(255,225,160,.95)');gr.addColorStop(1,'rgba(255,200,130,0)');
  g.fillStyle=gr;g.beginPath();g.arc(sx,sy,dr,0,TAU);g.fill();
  for(let i=0;i<70;i++){const y=Math.pow(Math.random(),1.6)*H*.5;g.fillStyle=`rgba(255,246,220,${rnd(.15,.6)*(1-y/(H*.5))})`;g.fillRect(Math.random()*W,y,rnd(.6,1.6),rnd(.6,1.6));}
  bg=c;
}
function hillY(x,o,H0){const u=x/Math.max(W,720)*TAU;return H*o.base+H*o.amp*(Math.sin(u*o.f[0]+o.p[0])*.6+Math.sin(u*o.f[1]+o.p[1])*.3+Math.sin(u*o.f[2]+o.p[2])*.1);}
function buildLayers(){
  const defs=[
   {base:.715,amp:.045,f:[.9,2.1,4.7],c0:'#9a8a55',c1:'#4f6840',rim:.35,par:7},
   {base:.775,amp:.05,f:[1.2,2.6,5.3],c0:'#476a46',c1:'#1c4132',rim:.22,par:14},
   {base:.84,amp:.045,f:[1.0,2.9,6.1],c0:'#22503a',c1:'#0e2a20',rim:.12,par:24},
   {base:.905,amp:.03,f:[1.5,3.3,6.9],c0:'#143c2a',c1:'#06150e',rim:.08,par:38,tea:1}];
  layers=defs.map((o,i)=>{
    o.p=[rnd(0,6),rnd(0,6),rnd(0,6)];if(i==0)o.p=[1.3,.4,2.2];
    const[c,g]=mk(W+2*M,H);const hy=x=>hillY(x-M,o);
    g.beginPath();g.moveTo(0,H);for(let x=0;x<=W+2*M;x+=5)g.lineTo(x,hy(x));g.lineTo(W+2*M,H);g.closePath();
    const gr=g.createLinearGradient(0,H*(o.base-.05),0,H);gr.addColorStop(0,o.c0);gr.addColorStop(1,o.c1);g.fillStyle=gr;g.fill();
    g.beginPath();for(let x=0;x<=W+2*M;x+=5){x?g.lineTo(x,hy(x)):g.moveTo(x,hy(x));}
    g.strokeStyle=`rgba(255,196,120,${o.rim})`;g.lineWidth=1.6;g.stroke();
    if(o.tea){
      const rows=11;
      for(let r=0;r<rows;r++){
        const tt=r/(rows-1),yb=H*(o.base+.025)+(H-H*(o.base+.025))*Math.pow(tt,1.35);
        const rx=(5+17*tt)*Math.max(.7,Math.min(1.3,S)),ry=rx*.5,ph=r*1.7;
        for(let x=-rx;x<W+2*M+rx;x+=rx*1.55){
          const y=yb+Math.sin((x/W)*TAU*1.4+ph)*H*.012*(.5+tt);
          if(y<hy(x)+ry)continue;
          g.fillStyle='#071a11';g.beginPath();g.ellipse(x,y+ry*.35,rx,ry,0,0,TAU);g.fill();
          g.fillStyle=`rgba(${60+Math.round(30*tt)},${130+Math.round(40*tt)},90,${.45+.3*tt})`;g.beginPath();g.ellipse(x,y-ry*.1,rx*.82,ry*.62,0,Math.PI,TAU);g.fill();
          g.fillStyle='rgba(255,190,110,.18)';g.beginPath();g.ellipse(x+rx*.15,y-ry*.35,rx*.5,ry*.25,0,0,TAU);g.fill();
        }
      }
    }
    return{c,par:o.par};
  });
}
function makeFirefly(i,nb,init){
  const bok=i<nb;const z=bok?rnd(.9,1):Math.pow(Math.random(),1.35)*.88;
  const f={x:rnd(-20,W+20),y:rnd(H*.06,H*.92),vx:0,vy:0,z,bok,th:rnd(0,TAU),turn:rnd(.2,.8),ph:rnd(0,TAU),fr:rnd(1.2,4.2),
    sp:rnd(14,34),c:Math.random()<.42?rnd(.05,.2):rnd(.5,1),ro:(25+230*Math.pow(Math.random(),1.2)),oa:rnd(0,TAU),ow:rnd(.7,1.7)*(Math.random()<.5?-1:1),
    spr:bok?(Math.random()*3|0):(Math.random()<.62?0:Math.random()<.5?2:Math.random()<.5?4:1)};
  if(bok){f.c*=.6;f.sp*=.5;}
  return f;
}
function lantern(init,x,tap){
  const z=tap?rnd(.68,.92):.06+Math.pow(Math.random(),1.15)*.86;
  return{x:x??rnd(0,W),y:init?rnd(H*.05,H*.9):H*rnd(.9,1)+50,z,ph:rnd(0,TAU),tap:!!tap,boost:tap?1:0,vy:-(12+24*z)*S,fl:rnd(.8,1.6)};
}
function populate(){
  const area=W*H,mf=api.isMobile?.6:1;const n=Math.round(Math.max(170,Math.min(360,Math.round(area/4100)))*mf);
  F=[];for(let i=0;i<n;i++)F.push(makeFirefly(i,Math.round(n*.045)));
  const nl=Math.round(Math.max(9,Math.min(18,Math.round(area/85000)))*(api.isMobile?.75:1));L=[];for(let i=0;i<nl;i++)L.push(lantern(true));
}
function resize(){
  const ow=W,oh=H;
  dpr=Math.min(2,window.devicePixelRatio||1);W=Math.max(1,host.clientWidth);H=Math.max(1,host.clientHeight);S=Math.max(.72,Math.min(1.25,Math.min(W,H*1.3)/860*(W<700?1.25:1)));
  cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  buildBg();buildLayers();
  if(!F.length)populate();else{const sx=W/ow,sy=H/oh;F.forEach(f=>{f.x*=sx;f.y*=sy});L.forEach(l=>{l.x*=sx;l.y*=sy});}
  if(!ptr.sx){ptr.x=ptr.sx=W*.7;ptr.y=ptr.sy=H*.5;}
  if(RM)frame(0,true);else if(running===false&&started)render(false);
}
// ---------- input ----------
function setPtr(e){const r=host.getBoundingClientRect();ptr.x=e.clientX-r.left;ptr.y=e.clientY-r.top;ptr.tpx=Math.max(-1,Math.min(1,(ptr.x/W-.5)*2));ptr.tpy=Math.max(-1,Math.min(1,(ptr.y/H-.5)*2));}
function tap(x,y){
  for(let i=0;i<26;i++){const a=i/26*TAU,s=rnd(150,200)*S;P.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0,max:rnd(.8,1.3),sz:rnd(8,13)*S,spr:i%3?2:1});}
  for(let i=0;i<14;i++){const a=rnd(0,TAU),s=rnd(30,120)*S;P.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,life:0,max:rnd(1,1.8),sz:rnd(6,10)*S,spr:2});}
  R.push({x,y,r:6,life:0});
  F.forEach(f=>{const dx=f.x-x,dy=f.y-y,d=Math.hypot(dx,dy)||1,R0=230*S;if(d<R0){const k=(1-d/R0)*320*S;f.vx+=dx/d*k;f.vy+=dy/d*k;}});
  const taps=L.filter(l=>l.tap);if(taps.length>=10)L.splice(L.indexOf(taps[0]),1);
  const l=lantern(false,x,true);l.y=y+10;l.boost=1;L.push(l);
}
const sf=api.surface,opt={passive:true},offs=[];
function on(n,f){sf.addEventListener(n,f,opt);offs.push(()=>sf.removeEventListener(n,f,opt));}
if(!RM){
  on('pointermove',e=>{setPtr(e);ptr.active=true;});
  on('pointerdown',e=>{setPtr(e);ptr.active=true;if(e.pointerType!=='mouse'){ptr.sx=ptr.x;ptr.sy=ptr.y;}if(e.target&&e.target.closest&&e.target.closest('a,button,input,[data-nobg]'))return;tap(ptr.x,ptr.y);});
  on('pointerup',e=>{if(e.pointerType!=='mouse')ptr.active=false;});
  on('pointercancel',()=>{ptr.active=false;});
  on('pointerleave',()=>{ptr.active=false;});
}
// ---------- update ----------
function update(dt){
  t+=dt;
  const k=1-Math.exp(-dt*7);ptr.sx+=(ptr.x-ptr.sx)*k;ptr.sy+=(ptr.y-ptr.sy)*k;
  const tg=ptr.active?1:0;ptr.act+=(tg-ptr.act)*(1-Math.exp(-dt*(tg?2.4:1.1)));
  const kp=1-Math.exp(-dt*3);ptr.px+=(ptr.tpx-ptr.px)*kp;ptr.py+=(ptr.tpy-ptr.py)*kp;
  if(ptr.act>.04){trail.push({x:ptr.sx,y:ptr.sy});if(trail.length>26)trail.shift();}else if(trail.length)trail.shift();
  const act=ptr.act,sx=ptr.sx,sy=ptr.sy;
  for(let i=0;i<F.length;i++){
    const f=F[i];
    f.th+=Math.sin(t*f.turn+f.ph)*dt*2.4;
    const w=act*f.c*(f.bok?.5:1),sp=f.sp*(.35+f.z)*S;
    const rel=Math.min(1,dt*1.3)*(1-w);
    f.vx+=(Math.cos(f.th)*sp-f.vx)*rel;f.vy+=(Math.sin(f.th)*sp*.7-f.vy-Math.sin(t*.9+f.ph)*6)*rel;
    if(w>.01){
      const a=f.oa+t*f.ow,tx=sx+Math.cos(a)*f.ro*S,ty=sy+Math.sin(a)*f.ro*S*.72;
      f.vx+=(tx-f.x)*14*w*dt;f.vy+=(ty-f.y)*14*w*dt;
      const d=Math.exp(-w*3.4*dt);f.vx*=d;f.vy*=d;
    }
    const v=Math.hypot(f.vx,f.vy),vm=520*S;if(v>vm){f.vx*=vm/v;f.vy*=vm/v;}
    f.x+=f.vx*dt;f.y+=f.vy*dt;
    if(f.x<-60)f.x=W+60;else if(f.x>W+60)f.x=-60;
    if(f.y>H*.94)f.vy-=140*dt;else if(f.y<H*.03)f.vy+=120*dt;
  }
  for(let i=L.length-1;i>=0;i--){
    const l=L[i];l.boost=Math.max(0,l.boost-dt*.35);
    l.y+=(l.vy*(1+l.boost*2.2))*dt;l.x+=Math.sin(t*.5+l.ph)*9*S*dt;
    if(act>.05){const dx=sx-l.x,dy=sy-l.y,d=Math.hypot(dx,dy);if(d<320*S)l.x+=dx*.35*act*dt*(1-d/(320*S));}
    if(l.y<-90*S){if(l.tap)L.splice(i,1);else{Object.assign(l,lantern(false));}}
  }
  for(let i=P.length-1;i>=0;i--){const p=P[i];p.life+=dt;if(p.life>p.max){P.splice(i,1);continue;}const d=Math.exp(-2.4*dt);p.vx*=d;p.vy*=d;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  for(let i=R.length-1;i>=0;i--){const r=R[i];r.life+=dt;r.r=6+r.life*330*S*(1-r.life*.3);if(r.life>.9)R.splice(i,1);}
}
// ---------- render ----------
function haze(y0,a){const g=ctx.createLinearGradient(0,y0,0,y0+H*.22);g.addColorStop(0,`rgba(255,175,100,${a})`);g.addColorStop(1,'rgba(255,175,100,0)');ctx.fillStyle=g;ctx.fillRect(0,y0,W,H*.22);}
function drawLayer(i){const l=layers[i];ctx.drawImage(l.c,-M-ptr.px*l.par,-ptr.py*l.par*.35,W+2*M,H);}
function drawLights(start,end,still){
  ctx.globalCompositeOperation='lighter';
  for(let i=start;i<end;i++){
    const f=F[i];if(f.bok)continue;
    const fl=still?.8:Math.pow(.5+.5*Math.sin(t*f.fr+f.ph),1.5)*.75+.25*(.5+.5*Math.sin(t*f.fr*2.7+f.ph*3));
    const base=(.4+.6*f.z)*(1-.45*ptr.act*f.c);
    const X=f.x-ptr.px*(.3+f.z)*20,Y=f.y-ptr.py*(.3+f.z)*10;
    const r=(7+36*f.z*f.z)*S*(.85+.3*fl)*(1-.3*ptr.act*f.c);
    const sp=SP[f.spr];
    const dm=dim(X,Y);ctx.globalAlpha=Math.min(1,base*fl*1.05)*dm;
    ctx.drawImage(sp,X-r,Y-r,2*r,2*r);
    const v=f.vx*f.vx+f.vy*f.vy;
    if(!still&&v>6400&&ptr.act>.2){const m=Math.min(.09,Math.sqrt(v)*.00018);ctx.globalAlpha*=.4;ctx.drawImage(sp,X-f.vx*m-r*.8,Y-f.vy*m-r*.8,1.6*r,1.6*r);ctx.globalAlpha*=.6;ctx.drawImage(sp,X-f.vx*m*2-r*.6,Y-f.vy*m*2-r*.6,1.2*r,1.2*r);}
  }
  ctx.globalAlpha=1;
}
function drawLanterns(still){
  const ord=L.slice().sort((a,b)=>a.z-b.z);
  for(const l of ord){
    const s=(.32+.95*l.z)*S,w=44*s,h=55*s;
    const fl=still?.85:.82+.18*Math.sin(t*l.fl*3+l.ph)*Math.sin(t*1.3+l.ph);
    const X=l.x-ptr.px*(.3+l.z)*20,Y=l.y-ptr.py*(.3+l.z)*10,rot=Math.sin(t*.6+l.ph)*.09;
    const a=(.5+.5*l.z)*dim(X,Y);
    ctx.globalCompositeOperation='lighter';
    const gr=w*3.1;ctx.globalAlpha=.55*fl*a;ctx.drawImage(SP[1],X-gr,Y-gr*.95,gr*2,gr*2);
    ctx.globalCompositeOperation='source-over';
    ctx.save();ctx.translate(X,Y);ctx.rotate(rot);ctx.globalAlpha=Math.min(1,.7+.3*a);ctx.drawImage(LANT,-w/2,-h*.52,w,h);ctx.restore();
    ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35*fl*a;ctx.drawImage(SP[2],X-w*.9,Y-h*.1,w*1.8,w*1.8);
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
function drawBokeh(still){
  ctx.globalCompositeOperation='lighter';
  for(const f of F){if(!f.bok)continue;
    const fl=still?.8:.5+.5*Math.sin(t*f.fr*.45+f.ph);
    const X=f.x-ptr.px*(.3+f.z)*26,Y=f.y-ptr.py*(.3+f.z)*13,r=(26+(f.z-.9)*480)*S;
    ctx.globalAlpha=(.14+.16*fl)*(1-.5*ptr.act)*dim(X,Y);ctx.drawImage(BK[f.spr%3],X-r,Y-r,2*r,2*r);
  }
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
function drawFx(){
  ctx.globalCompositeOperation='lighter';
  const act=ptr.act;
  for(let i=0;i<trail.length;i++){const q=trail[i],u=(i+1)/trail.length,r=(10+36*u)*S;ctx.globalAlpha=.34*u*u*Math.min(1,act*1.5);ctx.drawImage(SP[1],q.x-r,q.y-r,2*r,2*r);}
  if(act>.02){const r=(90+14*Math.sin(t*3))*S;ctx.globalAlpha=.3*act;ctx.drawImage(SP[1],ptr.sx-r,ptr.sy-r,2*r,2*r);const r2=26*S;ctx.globalAlpha=.7*act;ctx.drawImage(SP[2],ptr.sx-r2,ptr.sy-r2,2*r2,2*r2);}
  for(const p of P){const u=1-p.life/p.max;ctx.globalAlpha=u*u;const r=p.sz*(.5+u*.5);ctx.drawImage(SP[p.spr],p.x-r,p.y-r,2*r,2*r);}
  for(const r of R){const u=1-r.life/.9;ctx.globalAlpha=u*u*.8;ctx.strokeStyle='rgb(255,214,140)';ctx.lineWidth=2.5*S;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,TAU);ctx.stroke();ctx.globalAlpha=u*u*.25;ctx.lineWidth=9*S;ctx.stroke();}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
}
let TR=null;
function dim(X,Y){if(!TR)return 1;return(X>TR.l&&X<TR.r&&Y>TR.t&&Y<TR.b)?.5:1;}
function render(still){
  TR=null;try{const q=api.textRect(),h=host.getBoundingClientRect();if(q&&q.width){TR={l:q.left-h.left-30,r:q.right-h.left+30,t:q.top-h.top-30,b:q.bottom-h.top+30};}}catch(_){}
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  ctx.drawImage(bg,-ptr.px*3,-ptr.py*2,W,H);
  drawLayer(0);drawLayer(1);haze(H*.72,.1);drawLayer(2);haze(H*.8,.07);
  drawLights(0,F.length,still);drawLanterns(still);
  drawLayer(3);
  drawBokeh(still);drawFx();
  if(TR){ctx.globalCompositeOperation='source-over';const cx=(TR.l+TR.r)/2,cy=(TR.t+TR.b)/2,rr=Math.max(TR.r-TR.l,TR.b-TR.t)*.95;const g=ctx.createRadialGradient(cx,cy,rr*.3,cx,cy,rr);g.addColorStop(0,'rgba(6,24,20,.62)');g.addColorStop(1,'rgba(6,24,20,0)');ctx.fillStyle=g;ctx.fillRect(TR.l-rr,TR.t-rr,TR.r-TR.l+2*rr,TR.b-TR.t+2*rr);}
}
let last=0,raf=0,running=false,started=false,alive=true,onScreen=true;
function frame(now,still){
  if(still){t=7;render(true);return;}
  raf=0;if(!running)return;
  let dt=(now-last)/1000;last=now;if(!(dt>0))dt=.016;dt=Math.min(dt,.05);
  update(dt);render(false);raf=requestAnimationFrame(frame);
}
function sync(){
  const want=alive&&!RM&&onScreen&&!document.hidden;
  if(want&&!running){running=true;raf=requestAnimationFrame(n=>{last=n;frame(n);});}
  else if(!want&&running){running=false;if(raf){cancelAnimationFrame(raf);raf=0;}}
}

  const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(()=>{if(alive)resize();}):null;
  if(ro)ro.observe(host);
  const onWin=()=>{if(alive)resize();};
  window.addEventListener("resize",onWin);
  const onVis=()=>sync();
  document.addEventListener("visibilitychange",onVis);
  const io=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(es=>{onScreen=es[es.length-1].isIntersecting;sync();}):null;
  if(io)io.observe(host);
  resize();started=true;
  if(RM)frame(0,true);else sync();
  cleanup=function(){
    alive=false;running=false;if(raf){cancelAnimationFrame(raf);raf=0;}
    offs.forEach(f=>f());offs.length=0;
    window.removeEventListener("resize",onWin);document.removeEventListener("visibilitychange",onVis);
    if(ro)ro.disconnect();if(io)io.disconnect();
    SP=null;BK=null;LANT=null;bg=null;layers=[];F=[];L=[];P=[];R=[];trail.length=0;
    cv.width=cv.height=0;if(cv.parentNode)cv.parentNode.removeChild(cv);
    while(host.firstChild)host.removeChild(host.firstChild);
    host.classList.remove("mbg-fireflies");
    if(st.parentNode)st.parentNode.removeChild(st);
    cleanup=null;
  };
}
function unmount(){if(cleanup)cleanup();}
window.MynnaBackgrounds.register("fireflies",{id:"fireflies",name:"Fireflies at dusk",dark:true,mount:mount,unmount:unmount});
})();
