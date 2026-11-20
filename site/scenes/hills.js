(function(){
'use strict';
var cleanup=null;
var CSS='.mbg-hills{overflow:hidden}.mbg-hills .mbg-hills-cv{position:absolute;inset:0;width:100%;height:100%;display:block}.mbg-hills .mbg-hills-grain{position:absolute;inset:0;pointer-events:none;opacity:.22;mix-blend-mode:multiply}';
// ---------- noise ----------
function hash(n,s){var x=Math.sin(n*127.1+s*311.7)*43758.5453;return x-Math.floor(x)}
function vnoise(u,s){var i=Math.floor(u),f=u-i;f=f*f*(3-2*f);return hash(i,s)*(1-f)+hash(i+1,s)*f}
function fbm(u,s,oct,pers){var a=1,t=0,n=0,f=1;for(var o=0;o<oct;o++){n+=a*vnoise(u*f,s+o*17.3);t+=a;a*=pers;f*=2.03}return n/t}
function sstep(a,b,x){x=Math.max(0,Math.min(1,(x-a)/(b-a)));return x*x*(3-2*x)}
function mod(a,n){return ((a%n)+n)%n}

// ---------- layer definitions ----------
// base/amp as fractions of H; depth = parallax strength
var LAYERS=[
 {base:.60,amp:.20,freq:2.2,seed:3, oct:5,pers:.52,ridged:.85,c0:'#a9b9c9',c1:'#d3dde3',depth:.15,left:.45,trees:0},
 {base:.66,amp:.17,freq:2.6,seed:11,oct:5,pers:.5, ridged:.6, c0:'#94adbb',c1:'#c3d3d4',depth:.3, left:.55,trees:0},
 {base:.73,amp:.14,freq:2.9,seed:23,oct:5,pers:.5, ridged:.35,c0:'#78a29f',c1:'#a9c7bc',depth:.5, left:.65,trees:1},
 {base:.80,amp:.12,freq:2.4,seed:37,oct:5,pers:.5, ridged:.15,c0:'#4f917b',c1:'#86b8a0',depth:.78,left:.75,trees:2},
 {base:.87,amp:.09,freq:1.9,seed:51,oct:4,pers:.48,ridged:0,  c0:'#2a7c5c',c1:'#5a9e82',depth:1.15,left:.85,trees:3},
 {base:.955,amp:.07,freq:1.2,seed:77,oct:3,pers:.45,ridged:0, c0:'#1f6e4d',c1:'#124632',depth:1.7,left:1,trees:0,tea:true}
];
// mist bands sit in front of layer index `after`
var MISTS=[
 {after:0,y:.62,h:.20,a:.80,col:'250,244,232',drift:5, depth:.22,blobs:26,wind:.5},
 {after:1,y:.69,h:.20,a:.78,col:'248,243,233',drift:-7,depth:.4, blobs:26,wind:.7},
 {after:2,y:.77,h:.20,a:.74,col:'240,245,238',drift:9, depth:.62,blobs:26,wind:.9},
 {after:3,y:.84,h:.19,a:.66,col:'232,243,236',drift:-12,depth:.95,blobs:24,wind:1.2},
 {after:4,y:.91,h:.18,a:.55,col:'232,244,236',drift:15,depth:1.4, blobs:22,wind:1.5},
 {after:5,y:.985,h:.16,a:.42,col:'240,248,242',drift:-18,depth:2.1,blobs:18,wind:1.9}
];
var PAD=80, SHIFT=26; // css px


function mount(host,api){
  if(cleanup)cleanup();
  if(!document.getElementById('mbg-hills-css')){var st=document.createElement('style');st.id='mbg-hills-css';st.textContent=CSS;document.head.appendChild(st)}
  host.classList.add('mbg-hills');
  var cv=document.createElement('canvas');cv.className='mbg-hills-cv';cv.setAttribute('aria-hidden','true');host.appendChild(cv);
  var ctx=cv.getContext('2d');
  var grain=document.createElement('div');grain.className='mbg-hills-grain';host.appendChild(grain);
  var reduce=!!api.reduced;
  try{
    var g=document.createElement('canvas');g.width=g.height=128;
    var gc=g.getContext('2d'),id=gc.createImageData(128,128),d=id.data;
    for(var i=0;i<d.length;i+=4){var v=200+Math.random()*55|0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255}
    gc.putImageData(id,0,0);grain.style.backgroundImage='url('+g.toDataURL()+')';
  }catch(e){}
var W=0,H=0,DPR=1,layerCv=[],mistCv=[],TW=0,raf=0,running=false,onScreen=true;
var px=0,py=0,tpx=0,tpy=0,tiltOn=false;
var wind=0,drifts=[0,0,0,0,0,0],windOff=[0,0,0,0,0,0];
var puffs=[],ripples=[];
var birds=[];
var T=0,last=0,alive=true;

function makeCanvas(w,h){var c=document.createElement('canvas');c.width=Math.ceil(w*DPR);c.height=Math.ceil(h*DPR);return c}

function ridgeY(L,x){ // x in world css px
  var Wn=Math.max(W,720);
  var u=x/Wn*L.freq+L.seed;
  var n=fbm(u,L.seed,L.oct,L.pers);
  var r=1-Math.abs(2*fbm(u+5.1,L.seed+9,L.oct,L.pers)-1);
  var s=n*(1-L.ridged)+r*L.ridged;
  s=(s-.2)*1.25;
  var wl=L.left+(1-L.left)*sstep(.05,.75,x/W);
  if(L.tea){ // near slope: gentle diagonal rise to the right
    s=s*.6+ .55*sstep(0,1,x/W)-.1;
  }
  return L.base*H-L.amp*H*s*wl;
}

function buildLayer(i){
  var L=LAYERS[i], cw=W+PAD*2, step=2, n=Math.ceil(cw/step)+1, ys=new Array(n), minY=1e9;
  for(var k=0;k<n;k++){var y=ridgeY(L,k*step-PAD);ys[k]=y;if(y<minY)minY=y}
  var top=Math.floor(minY)-18-PAD*.4;
  var ch=H+PAD-top;
  var c=makeCanvas(cw,ch), g=c.getContext('2d');
  g.scale(DPR,DPR);
  function path(yo,arr){g.beginPath();g.moveTo(0,ch+2);for(var k=0;k<n;k++)g.lineTo(k*step,arr[k]+yo-top);g.lineTo(cw,ch+2);g.closePath()}
  // body gradient
  var gr=g.createLinearGradient(0,minY-top,0,H-top);
  gr.addColorStop(0,L.c0);gr.addColorStop(1,L.c1);
  path(0,ys);g.fillStyle=gr;g.fill();
  g.save();path(0,ys);g.clip();
  // fold shading: secondary ridges with other seeds
  var folds=L.tea?2:4;
  for(var f=0;f<folds;f++){
    var ys2=new Array(n), L2={base:L.base,amp:L.amp*(.55-f*.07),freq:L.freq*(1.5+f*.4),seed:L.seed+100+f*13,oct:4,pers:.5,ridged:L.ridged*.7,left:L.left};
    var off=(f+1)*L.amp*H*.26;
    for(var k=0;k<n;k++)ys2[k]=ridgeY(L2,k*step-PAD)+off*(L.tea?.5:1);
    path(0,ys2);
    var gg=g.createLinearGradient(0,minY-top,0,H-top);
    gg.addColorStop(0,'rgba(18,52,56,'+(.10+f*.02)+')');gg.addColorStop(1,'rgba(18,52,56,0)');
    g.fillStyle=gg;g.fill();
    // sunlit side: lighter on right-facing slopes via horizontal gradient
  }
  // warm light from the sun side (right)
  var wl=g.createLinearGradient(cw*.35,0,cw,0);
  wl.addColorStop(0,'rgba(255,236,190,0)');wl.addColorStop(1,'rgba(255,236,190,'+(L.tea?.10:.20)+')');
  g.fillStyle=wl;g.fillRect(0,0,cw,ch);
  // haze near the bottom of every layer so overlapping reads as depth
  if(!L.tea){var hz=g.createLinearGradient(0,ch-H*.16,0,ch);hz.addColorStop(0,'rgba(240,244,236,0)');hz.addColorStop(1,'rgba(240,244,236,.28)');g.fillStyle=hz;g.fillRect(0,0,cw,ch)}
  g.restore();
  // trees along ridge
  if(L.trees){
    var tc=['','rgba(40,94,80,.55)','rgba(26,84,62,.7)','rgba(18,66,46,.85)'][L.trees];
    g.fillStyle=tc;
    var sz=L.trees===1?4:L.trees===2?7:11, x=0, seed=L.seed;
    while(x<cw){
      var kk=Math.min(n-1,Math.round(x/step)), yy=ys[kk]-top+2, h=sz*(.6+hash(x,seed)*.9);
      if(hash(x*1.7,seed+3)>.28){
        g.beginPath();g.moveTo(x-h*.28,yy);g.lineTo(x,yy-h);g.lineTo(x+h*.28,yy);g.closePath();g.fill();
      }
      x+=sz*(.45+hash(x,seed+5)*.7);
    }
  }
  // rim light
  g.beginPath();for(var k=0;k<n;k++){var yy2=ys[k]-top;k?g.lineTo(k*step,yy2):g.moveTo(0,yy2)}
  g.strokeStyle=L.tea?'rgba(255,240,200,.28)':'rgba(255,246,222,.4)';g.lineWidth=1.1;g.stroke();
  // tea garden terraces
  if(L.tea){
    g.save();path(0,ys);g.clip();
    var rows=26;
    for(var j=1;j<=rows;j++){
      var o=Math.pow(j,1.38)*3.6+4, lw=.7+j*.20;
      g.beginPath();
      for(var k=0;k<n;k++){
        var yy3=ys[k]-top+o+Math.sin(k*step*.012+j*.7)*(2+j*.25);
        k?g.lineTo(k*step,yy3):g.moveTo(0,yy3);
      }
      g.strokeStyle=(j%2)?'rgba(8,38,26,.30)':'rgba(120,214,160,.17)';g.lineWidth=lw;g.stroke();
      // tea bushes
      var sp=5+j*1.5, r=1.6+j*.42;
      for(var x2=hash(j,2)*sp;x2<cw;x2+=sp){
        var k2=Math.min(n-1,Math.round(x2/step));
        var y4=ys[k2]-top+o+Math.sin(k2*step*.012+j*.7)*(2+j*.25)-lw*.6;
        g.fillStyle=(j%2)?'rgba(86,176,120,.50)':'rgba(46,130,88,.55)';
        g.beginPath();g.ellipse(x2,y4,r*1.4,r*.8,0,0,6.283);g.fill();
      }
    }
    // a few shade trees dotted on the slope
    for(var t2=0;t2<26;t2++){
      var tx=hash(t2,9)*cw,k3=Math.min(n-1,Math.round(tx/step)),ty=ys[k3]-top+10+hash(t2,4)*H*.07;
      var tr=7+hash(t2,6)*8+ (ty/H)*4;
      g.fillStyle='rgba(10,50,34,.55)';g.beginPath();g.ellipse(tx,ty,tr,tr*.75,0,0,6.283);g.fill();
      g.fillStyle='rgba(60,150,100,.5)';g.beginPath();g.ellipse(tx-tr*.2,ty-tr*.2,tr*.65,tr*.5,0,0,6.283);g.fill();
    }
    // darken to the bottom for grounding
    var dk=g.createLinearGradient(0,H*.82-top,0,ch);dk.addColorStop(0,'rgba(6,32,22,0)');dk.addColorStop(1,'rgba(6,32,22,.35)');
    g.fillStyle=dk;g.fillRect(0,0,cw,ch);
    g.restore();
  }
  return {cv:c,top:top,cw:cw,ch:ch};
}

function buildMist(m,idx){
  var th=Math.ceil(m.h*H*1.6);
  var tw=TW;
  var c=makeCanvas(tw*2,th), g=c.getContext('2d');
  g.scale(DPR,DPR);
  for(var b=0;b<m.blobs;b++){
    var bx=hash(b,idx*7+1)*tw, by=th*(.3+hash(b,idx*7+2)*.4);
    var rx=tw*(.07+hash(b,idx*7+3)*.12), ry=th*(.12+hash(b,idx*7+4)*.2);
    var al=(.35+hash(b,idx*7+5)*.65)*m.a;
    for(var rep=-1;rep<=2;rep++){
      var cx=bx+rep*tw;
      if(cx+rx<0||cx-rx>tw*2)continue;
      g.save();g.translate(cx,by);g.scale(1,ry/rx);
      var rg=g.createRadialGradient(0,0,0,0,0,rx);
      rg.addColorStop(0,'rgba('+m.col+','+al+')');
      rg.addColorStop(.5,'rgba('+m.col+','+al*.5+')');
      rg.addColorStop(1,'rgba('+m.col+',0)');
      g.fillStyle=rg;g.beginPath();g.arc(0,0,rx,0,6.283);g.fill();g.restore();
    }
  }
  // fade vertically at the edges
  g.globalCompositeOperation='destination-in';
  var vg=g.createLinearGradient(0,0,0,th);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.3,'rgba(0,0,0,1)');vg.addColorStop(.7,'rgba(0,0,0,1)');vg.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=vg;g.fillRect(0,0,tw*2,th);
  return {cv:c,th:th};
}

function initBirds(){
  birds=[];
  for(var i=0;i<7;i++){
    birds.push({x:hash(i,1)*W,y:H*(.14+hash(i,2)*.2),s:4+hash(i,3)*4.5,v:10+hash(i,4)*14,ph:hash(i,5)*6.28,sp:5+hash(i,6)*3,boost:0});
  }
}

function resize(){
  W=Math.max(2,host.clientWidth);H=Math.max(2,host.clientHeight);
  DPR=Math.min(window.devicePixelRatio||1,W<700?1.75:2);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  TW=Math.round(W*1.25/32)*32;
  layerCv=LAYERS.map(function(_,i){return buildLayer(i)});
  mistCv=MISTS.map(function(m,i){return buildMist(m,i)});
  initBirds();
  if(reduce||!running)draw(0);
}

// ---------- drawing ----------
var SUN={x:.72,y:.36};
function drawSky(){
  var g=ctx.createLinearGradient(0,0,0,H*.85);
  g.addColorStop(0,'#d9eadf');g.addColorStop(.38,'#eaf0e4');g.addColorStop(.7,'#f9ecd3');g.addColorStop(1,'#fbdcb0');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
function drawSun(){
  var portrait=W<H*.9;
  var sx=W*(portrait?.74:SUN.x)-px*10, sy=H*(portrait?.55:SUN.y)-py*5;
  var R=Math.min(W,H)*(portrait?.09:.075);
  var g=ctx.createRadialGradient(sx,sy,0,sx,sy,Math.max(W,H)*.55);
  g.addColorStop(0,'rgba(255,222,150,.75)');g.addColorStop(.15,'rgba(255,208,130,.38)');g.addColorStop(.5,'rgba(255,214,160,.12)');g.addColorStop(1,'rgba(255,214,160,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // rays
  ctx.save();ctx.translate(sx,sy);ctx.globalCompositeOperation='lighter';
  for(var i=0;i<5;i++){
    var a=1.7+i*.4+Math.sin(T*.05+i)*.03+px*.03, len=Math.max(W,H)*1.1, w0=.10+i%2*.03;
    var rg=ctx.createRadialGradient(0,0,R,0,0,len);
    rg.addColorStop(0,'rgba(255,226,170,.05)');rg.addColorStop(1,'rgba(255,226,170,0)');
    ctx.fillStyle=rg;
    for(var q=0;q<4;q++){var w=w0*(1-q*.22);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,len,a-w,a+w);ctx.closePath();ctx.fill();}
  }
  ctx.restore();
  var core=ctx.createRadialGradient(sx,sy,R*.2,sx,sy,R*1.5);
  core.addColorStop(0,'rgba(255,250,232,1)');core.addColorStop(.55,'rgba(255,238,196,.95)');core.addColorStop(1,'rgba(255,230,170,0)');
  ctx.fillStyle=core;ctx.beginPath();ctx.arc(sx,sy,R*1.5,0,6.283);ctx.fill();
}
function drawLayer(i){
  var Lc=layerCv[i],L=LAYERS[i];
  var ox=-px*SHIFT*L.depth, oy=-py*SHIFT*.45*L.depth;
  ctx.drawImage(Lc.cv,-PAD+ox,Lc.top+oy,Lc.cw,Lc.ch);
}
function drawMist(i){
  var m=MISTS[i],mc=mistCv[i],sw=32;
  var o=-px*SHIFT*m.depth*1.0+drifts[i]+windOff[i];
  var yBase=m.y*H-mc.th/2-py*SHIFT*.45*m.depth;
  var sway=Math.sin(T*.35+i*1.7)*3;
  var nrip=ripples.length;
  for(var sx=-sw;sx<W+sw;sx+=sw){
    var sxm=sx+sw/2, dy=sway*Math.sin(sxm*.004+T*.3+i);
    for(var r=0;r<nrip;r++){
      var rp=ripples[r],age=T-rp.t0,d=Math.abs(sxm-rp.x);
      var ph=d-age*340;
      var env=Math.exp(-(ph*ph)/(2*70*70))*Math.exp(-age*.75)*rp.a;
      dy+=env*Math.cos(ph/26)*(10+i*2.5)*(1-Math.min(1,Math.abs(yBase+mc.th/2-rp.y)/(H*.5))*.6);
    }
    var src=mod(sx-o,TW);
    ctx.drawImage(mc.cv,src*DPR,0,sw*DPR,mc.th*DPR,sx,yBase+dy,sw,mc.th);
  }
}
function drawBirds(dt){
  ctx.save();
  ctx.lineCap='round';ctx.lineJoin='round';
  for(var i=0;i<birds.length;i++){
    var b=birds[i];
    b.x+=(b.v+b.boost)*dt;b.boost*=Math.exp(-dt*.8);
    if(b.x>W+30)b.x=-30;
    var x=b.x-px*SHIFT*.25, y=b.y+Math.sin(T*.4+b.ph)*6-py*SHIFT*.12;
    var f=Math.sin(T*b.sp+b.ph), s=b.s;
    ctx.strokeStyle='rgba(70,86,96,'+(.5+b.s*.05)+')';ctx.lineWidth=Math.max(1,s*.2);
    ctx.beginPath();
    ctx.moveTo(x-s,y-f*s*.7);ctx.quadraticCurveTo(x-s*.45,y-s*.45-f*s*.3,x,y);
    ctx.quadraticCurveTo(x+s*.45,y-s*.45-f*s*.3,x+s,y-f*s*.7);
    ctx.stroke();
  }
  ctx.restore();
}
function drawPuffs(){
  for(var i=0;i<puffs.length;i++){
    var p=puffs[i],t=(T-p.t0)/p.life,e=1-t;
    var r=p.r0+t*p.r1, a=p.a*e*e*Math.min(1,t*8);
    var x=p.x+p.vx*(T-p.t0)-px*SHIFT*p.d, y=p.y-t*20;
    var g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,'rgba(252,250,244,'+a+')');g.addColorStop(.6,'rgba(250,248,240,'+a*.45+')');g.addColorStop(1,'rgba(250,248,240,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(x,y,r,r*.62,0,0,6.283);ctx.fill();
  }
}
function drawScrim(){
  var tr=api.textRect(),hr=host.getBoundingClientRect();
  var cx=tr.left-hr.left+tr.width*.5,cy=tr.top-hr.top+tr.height*.5,rx=tr.width*.75+60,ry=tr.height*.75+60;
  ctx.save();ctx.translate(cx,cy);ctx.scale(1,ry/rx);
  var g=ctx.createRadialGradient(0,0,0,0,0,rx);
  g.addColorStop(0,'rgba(250,246,236,.78)');g.addColorStop(.55,'rgba(250,246,236,.5)');g.addColorStop(1,'rgba(250,246,236,0)');
  ctx.fillStyle=g;ctx.fillRect(-rx,-rx,rx*2,rx*2);ctx.restore();
}
function draw(dt){
  drawSky();drawSun();
  for(var i=0;i<LAYERS.length;i++){
    drawLayer(i);
    drawMist(i);
    if(i===0)drawBirds(dt);
    if(i===3)drawPuffs();
  }
  drawScrim();
}

// ---------- loop ----------
function frame(now){
  if(!running)return;
  raf=requestAnimationFrame(frame);
  var dt=Math.min(.05,(now-last)/1000);last=now;if(!dt)return;
  T+=dt;
  // smooth parallax
  var k=1-Math.exp(-dt*3.2);
  var idleX=Math.sin(T*.22)*.1, idleY=Math.cos(T*.17)*.05;
  px+=(tpx+idleX-px)*k;py+=(tpy+idleY-py)*k;
  // wind
  wind*=Math.exp(-dt*1.1);
  for(var i=0;i<MISTS.length;i++){
    drifts[i]+=MISTS[i].drift*dt*(1+Math.abs(wind)*.002);
    windOff[i]+=wind*MISTS[i].wind*dt;
  }
  // prune
  for(var j=puffs.length-1;j>=0;j--)if(T-puffs[j].t0>puffs[j].life)puffs.splice(j,1);
  for(var q=ripples.length-1;q>=0;q--)if(T-ripples[q].t0>5)ripples.splice(q,1);
  draw(dt);
}
function start(){if(running||reduce||document.hidden||!onScreen||!alive)return;running=true;last=performance.now();raf=requestAnimationFrame(frame)}
function stop(){running=false;cancelAnimationFrame(raf)}

// ---------- input ----------
var down=false,lx=0,ly=0,lt=0,lastPuff={x:-999,y:-999},mouseIdle=0;
function setTarget(x,y){tpx=(x/W-.5)*2;tpy=(y/H-.5)*2}
function spawnPuff(x,y,vx,strong){
  if(puffs.length>26)puffs.shift();
  puffs.push({x:x,y:y,t0:T,life:2.4+Math.random()*1.2,r0:30+Math.random()*30,r1:110+Math.random()*90,a:strong?.5:.3,vx:vx*.12,d:1.0});
}
function onMove(e){
  var hr=host.getBoundingClientRect(),x=e.clientX-hr.left,y=e.clientY-hr.top,now=performance.now(),dt=Math.max(8,now-lt)/1000*1;
  var vx=(x-lx)/dt;
  if(reduce){setTarget(x,y);return}
  if(e.pointerType!=='touch'||down)setTarget(x,y);
  if(lt){
    var dragging=down||e.pointerType==='mouse';
    if(dragging){wind+=Math.max(-900,Math.min(900,vx))*(down?.035:.008)}
    if(Math.hypot(x-lastPuff.x,y-lastPuff.y)>(down?34:90)&&(down||Math.abs(vx)>150)){
      spawnPuff(x,y,vx,down);lastPuff={x:x,y:y};
    }
  }
  lx=x;ly=y;lt=now;
}
function onDown(e){
  if(e.target&&e.target.closest&&e.target.closest('a,button,input,[data-nobg]'))return;
  var hr=host.getBoundingClientRect();
  down=true;lx=e.clientX-hr.left;ly=e.clientY-hr.top;lt=performance.now();
  if(reduce){setTarget(lx,ly);return}
  setTarget(lx,ly);
  if(ripples.length>5)ripples.shift();
  ripples.push({x:lx,y:ly,t0:T,a:1});
  spawnPuff(lx,ly,0,true);
  requestTilt();
}
function onUp(){down=false}
// device tilt (guarded; iOS needs a user gesture)
var tiltAsked=false;
function onTilt(e){
  if(e.gamma==null||reduce)return;
  tiltOn=true;
  if(down)return;
  tpx=Math.max(-1,Math.min(1,e.gamma/25));
  tpy=Math.max(-1,Math.min(1,((e.beta||0)-45)/25));
}
function requestTilt(){
  if(tiltAsked||!('DeviceOrientationEvent' in window))return;
  tiltAsked=true;
  try{
    if(typeof DeviceOrientationEvent.requestPermission==='function'){
      DeviceOrientationEvent.requestPermission().then(function(s){if(s==='granted'&&alive){window.addEventListener('deviceorientation',onTilt);tiltOnAdded=true}}).catch(function(){});
    }
  }catch(e){}
}
var tiltOnAdded=false;
if('DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission!=='function'){
  window.addEventListener('deviceorientation',onTilt);tiltOnAdded=true;
}


var S=api.surface,opts={passive:true};
function onLeave(){down=false;if(!tiltOn){tpx=0;tpy=0}}
function onMoveStatic(){draw(0)}
function onVis(){document.hidden?stop():start()}
var rt=0,ro=null,io=null;
function schedResize(){clearTimeout(rt);rt=setTimeout(function(){if(alive)resize()},100)}
S.addEventListener('pointermove',onMove,opts);
S.addEventListener('pointerdown',onDown,opts);
S.addEventListener('pointerup',onUp,opts);
S.addEventListener('pointercancel',onUp,opts);
S.addEventListener('pointerleave',onLeave,opts);
document.addEventListener('visibilitychange',onVis);
if(typeof ResizeObserver!=='undefined'){ro=new ResizeObserver(schedResize);ro.observe(host)}
if(typeof IntersectionObserver!=='undefined'){io=new IntersectionObserver(function(en){onScreen=en[en.length-1].isIntersecting;onScreen?start():stop()});io.observe(host)}
resize();
if(reduce){draw(0);S.addEventListener('pointermove',onMoveStatic,opts)}else start();

cleanup=function(){
  alive=false;stop();clearTimeout(rt);
  S.removeEventListener('pointermove',onMove,opts);S.removeEventListener('pointerdown',onDown,opts);
  S.removeEventListener('pointerup',onUp,opts);S.removeEventListener('pointercancel',onUp,opts);
  S.removeEventListener('pointerleave',onLeave,opts);S.removeEventListener('pointermove',onMoveStatic,opts);
  document.removeEventListener('visibilitychange',onVis);
  window.removeEventListener('deviceorientation',onTilt);
  if(ro)ro.disconnect();if(io)io.disconnect();
  layerCv=[];mistCv=[];
  if(cv.parentNode)cv.parentNode.removeChild(cv);
  if(grain.parentNode)grain.parentNode.removeChild(grain);
  var st=document.getElementById('mbg-hills-css');if(st)st.parentNode.removeChild(st);
  host.classList.remove('mbg-hills');
};
}
function unmount(){if(cleanup){cleanup();cleanup=null}}
window.MynnaBackgrounds.register("hills",{id:"hills",name:"Hills and mist",dark:false,mount:mount,unmount:unmount});
})();
