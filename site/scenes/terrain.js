(function(){
'use strict';
var STYLE_ID='mbg-terrain-css';
var CSS="\n.mbg-terrain{overflow:hidden;background:#f7f4ec}\n.mbg-terrain canvas{position:absolute;inset:0;width:100%;height:100%;display:block}\n.mbg-terrain-fade{position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(247,244,236,.84) 0%,rgba(247,244,236,.62) 30%,rgba(247,244,236,.16) 52%,rgba(247,244,236,0) 68%)}\n.mbg-terrain-static{background:radial-gradient(120% 55% at 20% 105%,#2f9e72 0 38%,transparent 39%),radial-gradient(100% 50% at 80% 112%,#1a6b4d 0 40%,transparent 41%),radial-gradient(140% 45% at 50% 100%,#8fd0ac 0 45%,transparent 46%),radial-gradient(60% 40% at 80% 30%,rgba(232,130,12,.22),transparent 70%),linear-gradient(#dcebe3,#f7f4ec 62%)}\n@media (max-width:700px){.mbg-terrain-fade{background:linear-gradient(180deg,rgba(247,244,236,.88) 0%,rgba(247,244,236,.78) 42%,rgba(247,244,236,.25) 66%,rgba(247,244,236,0) 80%)}}\n";
var cleanup=null,hostRef=null,styleRef=null;
function finish(){
  var st=document.getElementById(STYLE_ID);if(st&&st.parentNode)st.parentNode.removeChild(st);
  if(hostRef){while(hostRef.firstChild)hostRef.removeChild(hostRef.firstChild);hostRef.classList.remove('mbg-terrain','mbg-terrain-static');}
}
function teardownStatic(){finish();}
function mount(host,api){
  if(cleanup)unmount();
  hostRef=host;
  var reduced=!!api.reduced;
  var dead=false;
  var styleEl=document.createElement('style');styleEl.id=STYLE_ID;styleEl.textContent=CSS;document.head.appendChild(styleEl);
  host.classList.add('mbg-terrain');
  var fade=document.createElement('div');fade.className='mbg-terrain-fade';
  var canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');
  host.appendChild(canvas);host.appendChild(fade);
  var gl=null;
  try{gl=canvas.getContext('webgl2',{antialias:true,alpha:false,powerPreference:'high-performance'});}catch(e){}
  function nogl(){
    try{var lc=gl&&gl.getExtension('WEBGL_lose_context');if(lc)lc.loseContext();}catch(e){}
    if(canvas.parentNode)canvas.parentNode.removeChild(canvas);
    host.classList.add('mbg-terrain-static');
  }
  if(!gl){nogl();cleanup=teardownStatic;return;}

  /* ---------- GLSL ---------- */
  var N=128, CELL=1.75;          // terrain grid
  var TN=40, TC=5.5;             // tree lattice

  var NOISE=
  'float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\n'+
  'float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);'+
  'float a=hash21(i),b=hash21(i+vec2(1.,0.)),c=hash21(i+vec2(0.,1.)),d=hash21(i+vec2(1.,1.));'+
  'return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}\n'+
  'float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}\n';

  var TERRAIN=
  'uniform float uTime;uniform vec4 uRip[4];uniform vec3 uBump;\n'+
  'float riverX(float z){return 10.*sin(z*.012)+5.*sin(z*.031+1.3);}\n'+
  'float baseH(vec2 p,out float d){\n'+
  '  d=abs(p.x-riverX(p.y));\n'+
  '  float hills=2.+fbm(p*.03)*19.+vnoise(p*.09)*3.;\n'+
  '  float v=smoothstep(3.,52.,d);\n'+
  '  return mix(-.5,hills,pow(v,1.3));\n'+
  '}\n'+
  'float ripH(vec2 p){\n'+
  '  float h=0.;\n'+
  '  for(int i=0;i<4;i++){\n'+
  '    float t=uTime-uRip[i].z; if(t<0.||t>9.) continue;\n'+
  '    float r=length(p-uRip[i].xy); float w=r-t*11.;\n'+
  '    h+=uRip[i].w*exp(-t*.45)*exp(-w*w/20.)*cos(w*.7)/(1.+r*.04);\n'+
  '  }\n'+
  '  vec2 q=p-uBump.xy; h+=uBump.z*exp(-dot(q,q)/70.);\n'+
  '  return h;\n'+
  '}\n';

  var SKY=
  'const vec3 SUN=vec3(-.4356,.2265,.8712);\n'+
  'const vec3 LDIR=vec3(-.6083,.7098,.3549);\n'+
  'vec3 skyCol(vec3 r){\n'+
  '  vec3 hor=vec3(.956,.945,.905),top=vec3(.76,.89,.85);\n'+
  '  float t=smoothstep(-.02,.7,r.y);\n'+
  '  vec3 c=mix(hor,top,pow(t,.8));\n'+
  '  float s=max(dot(r,SUN),0.);\n'+
  '  c+=vec3(1.,.66,.28)*pow(s,8.)*.20+vec3(1.,.74,.35)*pow(s,60.)*.35;\n'+
  '  c=mix(c,vec3(1.,.84,.52),smoothstep(.9962,.9978,s)*.92);\n'+
  '  return c;\n'+
  '}\n';

  var HEAD='#version 300 es\nprecision highp float;\nprecision highp int;\n';

  function compile(type,src){
    var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){throw new Error(gl.getShaderInfoLog(s));}
    return s;
  }
  function program(vs,fs){
    var p=gl.createProgram();
    gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));
    gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS)){throw new Error(gl.getProgramInfoLog(p));}
    return p;
  }

  var FOG='float fogAmt(float dist){return clamp(1.-exp(-pow(dist/88.,1.9)),0.,1.);}\n';

  var skyVS=HEAD+
  'out vec2 vUv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUv=p;gl_Position=vec4(p*2.-1.,.999,1.);}';
  var skyFS=HEAD+NOISE+SKY+
  'in vec2 vUv;uniform vec3 uF,uR,uU;uniform float uTan,uAsp,uTime;out vec4 o;\n'+
  'void main(){\n'+
  '  vec2 q=vUv*2.-1.;\n'+
  '  vec3 r=normalize(uF+uR*q.x*uTan*uAsp+uU*q.y*uTan);\n'+
  '  vec3 c=skyCol(r);\n'+
  '  if(r.y>.02){\n'+
  '    vec2 cp=r.xz/(r.y+.2)*1.3+vec2(uTime*.012,0.);\n'+
  '    float cl=smoothstep(.52,.88,fbm(cp));\n'+
  '    cl*=smoothstep(.02,.22,r.y);\n'+
  '    float s=max(dot(r,SUN),0.);\n'+
  '    vec3 cc=mix(vec3(1.,.99,.96),vec3(1.,.86,.62),pow(s,6.)*.8);\n'+
  '    c=mix(c,cc,cl*.6);\n'+
  '  }\n'+
  '  o=vec4(c,1.);\n'+
  '}';

  var terVS=HEAD+NOISE+TERRAIN+
  'in vec2 aG;uniform mat4 uVP;uniform vec2 uSnap;uniform float uCell;\n'+
  'out vec3 vW;flat out vec3 vCol;flat out float vWat;\n'+
  'void main(){\n'+
  '  vec2 id=floor(uSnap/uCell+.5)+aG;\n'+
  '  vec2 p=id*uCell;\n'+
  '  p+=(vec2(hash21(id+3.1),hash21(id+9.7))-.5)*uCell*.6;\n'+
  '  float d;float b=baseH(p,d);\n'+
  '  float h=b+ripH(p);\n'+
  '  vec3 w=vec3(p.x,h,p.y);\n'+
  '  float tc=clamp(b/22.,0.,1.);\n'+
  '  vec3 lowc=vec3(.40,.72,.52),midc=vec3(.16,.56,.40),hic=vec3(.07,.34,.24);\n'+
  '  vec3 col=mix(lowc,midc,smoothstep(0.,.42,tc));\n'+
  '  col=mix(col,hic,smoothstep(.38,.95,tc));\n'+
  '  col=mix(col,vec3(.80,.74,.38),.32*smoothstep(.45,.8,vnoise(p*.045+5.))*(1.-smoothstep(0.,.6,tc)));\n'+
  '  col*=.9+.2*hash21(id+1.7);\n'+
  '  col=mix(col,vec3(.93,.86,.66),.8*(1.-smoothstep(3.4,6.5,d)));\n'+
  '  float wat=d<3.3?1.:0.;\n'+
  '  if(wat>.5)col=vec3(.70,.87,.85);\n'+
  '  vCol=col;vWat=wat;vW=w;\n'+
  '  gl_Position=uVP*vec4(w,1.);\n'+
  '}';
  var terFS=HEAD+SKY+FOG+
  'in vec3 vW;flat in vec3 vCol;flat in float vWat;uniform vec3 uCam;out vec4 o;\n'+
  'void main(){\n'+
  '  vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));if(n.y<0.)n=-n;\n'+
  '  vec3 vd=normalize(vW-uCam);\n'+
  '  float dif=max(dot(n,LDIR),0.);\n'+
  '  vec3 amb=mix(vec3(.52,.60,.58),vec3(.84,.89,.84),n.y*.5+.5);\n'+
  '  vec3 c=vCol*(amb*.62+vec3(1.,.90,.70)*dif*.95);\n'+
  '  if(vWat>.5){\n'+
  '    vec3 R=reflect(vd,n);\n'+
  '    float fr=pow(1.-max(dot(n,-vd),0.),3.);\n'+
  '    c=mix(vCol*(.92+.2*dif),skyCol(vec3(R.x,abs(R.y),R.z)),.38+.5*fr);\n'+
  '    c+=vec3(1.,.8,.5)*pow(max(dot(R,SUN),0.),50.)*.9;\n'+
  '  }\n'+
  '  float f=fogAmt(length(vW-uCam));\n'+
  '  vec3 fc=skyCol(normalize(vec3(vd.x,.03,vd.z)));\n'+
  '  o=vec4(mix(c,fc,f),1.);\n'+
  '}';

  var objVS=HEAD+NOISE+TERRAIN+
  'in vec3 aPos;in vec4 aCol;uniform mat4 uVP;uniform int uMode;uniform vec2 uSnapT;uniform vec2 uTent[4];\n'+
  'out vec3 vW;out vec3 vCol;\n'+
  'void main(){\n'+
  '  vec3 lp=aPos;vec3 col=aCol.rgb;vec2 pos;float sx=1.,sy=1.,rot=0.;bool ok=true;\n'+
  '  int id=gl_InstanceID;\n'+
  '  if(uMode==0){\n'+
  '    float fi=float(id%'+TN+'),fj=float(id/'+TN+');\n'+
  '    vec2 base=uSnapT+(vec2(fi,fj)-float('+(TN/2)+'))*'+TC.toFixed(2)+';\n'+
  '    vec2 cid=floor(base/'+TC.toFixed(2)+'+.5);\n'+
  '    float h1=hash21(cid),h2=hash21(cid+7.7),h3=hash21(cid+13.3);\n'+
  '    pos=base+(vec2(h2,h3)-.5)*'+TC.toFixed(2)+'*.8;\n'+
  '    float d;float bh=baseH(pos,d);\n'+
  '    float grove=vnoise(pos*.05+3.);\n'+
  '    ok=h1<smoothstep(.36,.72,grove)*.9+.03&&d>9.&&bh>.6;\n'+
  '    float sc=.8+h2*.9;rot=h1*6.283;\n'+
  '    if(h3>.62){sx=sc*1.5;sy=sc*.42;col=mix(col,vec3(.55,.74,.28),.65);}\n'+
  '    else{sx=sc*.85;sy=sc;}\n'+
  '    col*=.85+.3*h1;\n'+
  '  }else{\n'+
  '    pos=uTent[id];ok=pos.x>-9000.;sx=1.5;sy=1.5;\n'+
  '    if(aCol.w>0.)lp.z+=sin(uTime*5.+lp.x*3.)*.22*aCol.w;\n'+
  '  }\n'+
  '  float cs=cos(rot),sn=sin(rot);\n'+
  '  vec2 xz=vec2(cs*lp.x-sn*lp.z,sn*lp.x+cs*lp.z)*sx;\n'+
  '  float d2;float b=baseH(pos,d2)+ripH(pos);\n'+
  '  vec3 w=vec3(pos.x+xz.x,b+lp.y*sy,pos.y+xz.y);\n'+
  '  vW=w;vCol=col;\n'+
  '  gl_Position=ok?uVP*vec4(w,1.):vec4(2.,2.,2.,1.);\n'+
  '}';
  var objFS=HEAD+SKY+FOG+
  'in vec3 vW;in vec3 vCol;uniform vec3 uCam;out vec4 o;\n'+
  'void main(){\n'+
  '  vec3 n=normalize(cross(dFdx(vW),dFdy(vW)));vec3 vd0=normalize(vW-uCam);if(dot(n,vd0)>0.)n=-n;\n'+
  '  vec3 vd=vd0;\n'+
  '  float dif=max(dot(n,LDIR),0.);\n'+
  '  vec3 amb=mix(vec3(.52,.60,.58),vec3(.84,.89,.84),n.y*.5+.5);\n'+
  '  vec3 c=vCol*(amb*.62+vec3(1.,.90,.70)*dif*.95);\n'+
  '  float f=fogAmt(length(vW-uCam));\n'+
  '  vec3 fc=skyCol(normalize(vec3(vd.x,.03,vd.z)));\n'+
  '  o=vec4(mix(c,fc,f),1.);\n'+
  '}';

  var progSky,progTer,progObj;
  try{
    progSky=program(skyVS,skyFS);
    progTer=program(terVS,terFS);
    progObj=program(objVS,objFS);
  }catch(err){
    nogl();cleanup=teardownStatic;return;
  }
  function U(p,n){return gl.getUniformLocation(p,n);}
  var uS={F:U(progSky,'uF'),R:U(progSky,'uR'),U:U(progSky,'uU'),tan:U(progSky,'uTan'),asp:U(progSky,'uAsp'),time:U(progSky,'uTime')};
  var uT={vp:U(progTer,'uVP'),snap:U(progTer,'uSnap'),cell:U(progTer,'uCell'),cam:U(progTer,'uCam'),time:U(progTer,'uTime'),rip:U(progTer,'uRip'),bump:U(progTer,'uBump')};
  var uO={vp:U(progObj,'uVP'),mode:U(progObj,'uMode'),snapT:U(progObj,'uSnapT'),tent:U(progObj,'uTent'),cam:U(progObj,'uCam'),time:U(progObj,'uTime'),rip:U(progObj,'uRip'),bump:U(progObj,'uBump')};

  /* ---------- geometry ---------- */
  // terrain grid
  var vcount=(N+1)*(N+1);
  var gridV=new Float32Array(vcount*2);
  for(var j=0;j<=N;j++)for(var i=0;i<=N;i++){var k=(j*(N+1)+i)*2;gridV[k]=i-N/2;gridV[k+1]=j-N/2;}
  var idx=new Uint16Array(N*N*6),q=0;
  for(var j2=0;j2<N;j2++)for(var i2=0;i2<N;i2++){
    var a=j2*(N+1)+i2,b=a+1,c=a+(N+1),d=c+1;
    idx[q++]=a;idx[q++]=b;idx[q++]=c;
    idx[q++]=c;idx[q++]=b;idx[q++]=d;
  }
  var terVAO=gl.createVertexArray();gl.bindVertexArray(terVAO);
  var gb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,gb);gl.bufferData(gl.ARRAY_BUFFER,gridV,gl.STATIC_DRAW);
  var aG=gl.getAttribLocation(progTer,'aG');gl.enableVertexAttribArray(aG);gl.vertexAttribPointer(aG,2,gl.FLOAT,false,0,0);
  var ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idx,gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  // object meshes (non indexed, pos3 + col4)
  function Mesh(){this.p=[];this.c=[];}
  Mesh.prototype.tri=function(A,B,C,col,w){
    var V=[A,B,C];
    for(var i=0;i<3;i++){this.p.push(V[i][0],V[i][1],V[i][2]);this.c.push(col[0],col[1],col[2],w?w[i]:0);}
  };
  Mesh.prototype.cone=function(y0,y1,r,sides,cb,ct,rot){
    for(var i=0;i<sides;i++){
      var a0=rot+i/sides*6.2832,a1=rot+(i+1)/sides*6.2832;
      var P0=[Math.cos(a0)*r,y0,Math.sin(a0)*r],P1=[Math.cos(a1)*r,y0,Math.sin(a1)*r],T=[0,y1,0];
      var f=0.88+0.24*((i*7%5)/4);
      var col=[ (cb[0]*.45+ct[0]*.55)*f,(cb[1]*.45+ct[1]*.55)*f,(cb[2]*.45+ct[2]*.55)*f ];
      this.tri(P0,P1,T,col);
      this.tri(P0,[0,y0,0],P1,[cb[0]*.7,cb[1]*.7,cb[2]*.7]);
    }
  };
  Mesh.prototype.quad=function(A,B,C,D,col,w){
    this.tri(A,B,C,col,w&&[w[0],w[1],w[2]]);
    this.tri(A,C,D,col,w&&[w[0],w[2],w[3]]);
  };
  function upload(m,prog){
    var vao=gl.createVertexArray();gl.bindVertexArray(vao);
    var b1=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b1);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.p),gl.STATIC_DRAW);
    var l1=gl.getAttribLocation(prog,'aPos');gl.enableVertexAttribArray(l1);gl.vertexAttribPointer(l1,3,gl.FLOAT,false,0,0);
    var b2=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b2);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.c),gl.STATIC_DRAW);
    var l2=gl.getAttribLocation(prog,'aCol');gl.enableVertexAttribArray(l2);gl.vertexAttribPointer(l2,4,gl.FLOAT,false,0,0);
    gl.bindVertexArray(null);
    return {vao:vao,n:m.p.length/3};
  }
  // pine / tea bush
  var pm=new Mesh();
  pm.cone(-0.2,0.8,0.22,4,[.30,.20,.12],[.36,.25,.16],0.3);
  pm.cone(0.5,3.4,1.5,7,[.08,.36,.26],[.22,.60,.42],0.2);
  pm.cone(1.9,5.3,1.1,7,[.10,.42,.30],[.34,.70,.50],0.6);
  var treeMesh=upload(pm,progObj);

  // tent with gamusa flag
  var tm=new Mesh();
  var RED=[.70,.15,.12],WHT=[.98,.96,.91],BRN=[.36,.25,.16];
  var hs=1.0,wh=.5,ph=1.5;
  var cs=[[-hs,0,-hs],[hs,0,-hs],[hs,0,hs],[-hs,0,hs]];
  for(var s=0;s<4;s++){
    var c0=cs[s],c1=cs[(s+1)%4];
    var col=(s%2)?WHT:RED;
    tm.quad(c0,c1,[c1[0],wh,c1[2]],[c0[0],wh,c0[2]],col);
    var ap=[0,ph,0];
    tm.tri([c0[0],wh,c0[2]],[c1[0],wh,c1[2]],ap,(s%2)?RED:WHT);
  }
  // pole
  var pw=.05;
  tm.quad([-pw,ph,-pw],[pw,ph,-pw],[pw,2.7,-pw],[-pw,2.7,-pw],BRN);
  tm.quad([-pw,ph,pw],[pw,ph,pw],[pw,2.7,pw],[-pw,2.7,pw],BRN);
  tm.quad([-pw,ph,-pw],[-pw,ph,pw],[-pw,2.7,pw],[-pw,2.7,-pw],BRN);
  tm.quad([pw,ph,-pw],[pw,ph,pw],[pw,2.7,pw],[pw,2.7,-pw],BRN);
  // flag: red band on top, white band below (waves toward the tip)
  tm.quad([.05,2.7,0],[1.05,2.7,0],[1.05,2.5,0],[.05,2.5,0],RED,[0,1,1,0]);
  tm.quad([.05,2.5,0],[1.05,2.5,0],[1.05,2.3,0],[.05,2.3,0],WHT,[0,1,1,0]);
  var tentMesh=upload(tm,progObj);

  var skyVAO=gl.createVertexArray();

  /* ---------- math ---------- */
  function riverX(z){return 10*Math.sin(z*.012)+5*Math.sin(z*.031+1.3);}
  function norm(v){var l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];}
  function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function mul(a,b){var o=new Float32Array(16);for(var c=0;c<4;c++)for(var r=0;r<4;r++){var s=0;for(var k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;}
  function clamp(x,a,b){return x<a?a:x>b?b:x;}

  /* ---------- state ---------- */
  var W=1,H=1,dpr=1,quality=1,aspect=1;
  var t=0,travel=0;
  var yawOff=0,pitchOff=0,velYaw=0,velPitch=0;
  var ptr={x:0,y:0,tx:0,ty:0,inside:false};
  var drag={on:false,id:-1,lx:0,ly:0,lt:0,sx:0,sy:0,st:0};
  var rips=[{x:0,z:0,s:-100,a:0},{x:0,z:0,s:-100,a:0},{x:0,z:0,s:-100,a:0},{x:0,z:0,s:-100,a:0}],ripI=0;
  var ripArr=new Float32Array(16);
  for(var ri=0;ri<4;ri++)ripArr[ri*4+2]=-100;
  var bump={x:0,z:20,a:0,ta:0};
  var cam={e:[0,13,0],f:[0,0,1],r:[-1,0,0],u:[0,1,0],tan:.5};
  var dirty=true,hintGone=false;
  var tentArr=new Float32Array(8);

  function resize(){
    if(dead)return;
    dpr=Math.min(window.devicePixelRatio||1,2);
    var hr=host.getBoundingClientRect();hostRect=hr;var w=Math.max(1,hr.width),h=Math.max(1,hr.height);
    var sc=dpr*quality;
    W=Math.max(2,Math.round(w*sc));H=Math.max(2,Math.round(h*sc));
    if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
    aspect=w/h;dirty=true;
  }
  var hostRect={left:0,top:0,width:1,height:1};
  var onResize=function(){resize();};
  window.addEventListener('resize',onResize);
  var ro=null;if(window.ResizeObserver){ro=new ResizeObserver(onResize);ro.observe(host);}
  resize();

  function updateCamera(){
    var camZ=travel;
    var ex=riverX(camZ)+8+6*Math.sin(t*.13)-ptr.x*5;
    var ey=17+1.2*Math.sin(t*.21)+ptr.y*1.5;
    var tz=camZ+38,tx=riverX(tz)+3,ty=5;
    var f=norm([tx-ex,ty-ey,tz-camZ]);
    var th=Math.atan2(f[0],f[2]),ph=Math.asin(f[1]);
    var portrait=aspect<1;
    th+=yawOff-ptr.x*.28;
    ph+=(portrait?.04:0)+clamp(pitchOff,-.4,.4)+ptr.y*.05;
    ph=clamp(ph,-.7,.5);
    var cp=Math.cos(ph);
    var F=[Math.sin(th)*cp,Math.sin(ph),Math.cos(th)*cp];
    var R=norm(cross(F,[0,1,0])),Uu=cross(R,F);
    var roll=clamp(ptr.x*.05+velYaw*1.1,-.16,.16),cr=Math.cos(roll),sr=Math.sin(roll);
    var R2=[R[0]*cr+Uu[0]*sr,R[1]*cr+Uu[1]*sr,R[2]*cr+Uu[2]*sr];
    var U2=[Uu[0]*cr-R[0]*sr,Uu[1]*cr-R[1]*sr,Uu[2]*cr-R[2]*sr];
    cam.e=[ex,ey,camZ];cam.f=F;cam.r=R2;cam.u=U2;
    cam.tan=Math.tan((portrait?66:52)*Math.PI/360);
  }
  function viewProj(){
    var e=cam.e,f=cam.f,r=cam.r,u=cam.u;
    var V=new Float32Array([r[0],u[0],-f[0],0, r[1],u[1],-f[1],0, r[2],u[2],-f[2],0, -dot(r,e),-dot(u,e),dot(f,e),1]);
    var n=.5,fa=420,t2=cam.tan;
    var P=new Float32Array(16);
    P[0]=1/(aspect*t2);P[5]=1/t2;P[10]=(fa+n)/(n-fa);P[11]=-1;P[14]=2*fa*n/(n-fa);
    return mul(P,V);
  }
  function groundHit(nx,ny){
    var d=[cam.f[0]+cam.r[0]*nx*cam.tan*aspect+cam.u[0]*ny*cam.tan,
           cam.f[1]+cam.r[1]*nx*cam.tan*aspect+cam.u[1]*ny*cam.tan,
           cam.f[2]+cam.r[2]*nx*cam.tan*aspect+cam.u[2]*ny*cam.tan];
    var tt=d[1]<-.02?(2-cam.e[1])/d[1]:70;
    tt=Math.min(tt,85);
    return [cam.e[0]+d[0]*tt,cam.e[2]+d[2]*tt];
  }

  /* ---------- input ---------- */
  function setPtr(cx,cy){
    ptr.tx=clamp(cx/hostRect.width*2-1,-1,1);
    ptr.ty=clamp(-(cy/hostRect.height*2-1),-1,1);
    dirty=true;
  }
  function rel(e){hostRect=host.getBoundingClientRect();return [e.clientX-hostRect.left,e.clientY-hostRect.top];}
  function addRipple(cx,cy,amp){
    if(reduced)return;
    var h=groundHit(cx/hostRect.width*2-1,-(cy/hostRect.height*2-1));
    var r=rips[ripI];ripI=(ripI+1)%4;
    r.x=h[0];r.z=h[1];r.s=t;r.a=amp;
  }
  function onDown(e){
    if(e.target&&e.target.closest&&e.target.closest('a,button,input,[data-nobg]'))return;
    var p=rel(e);
    drag.on=true;drag.id=e.pointerId;drag.lx=drag.sx=p[0];drag.ly=drag.sy=p[1];drag.lt=drag.st=performance.now();
    velYaw=0;
    ptr.inside=true;setPtr(p[0],p[1]);
    bump.ta=e.pointerType==='mouse'?1.6:2.2;
  }
  function onMove(e){
    var p=rel(e);
    setPtr(p[0],p[1]);
    ptr.inside=true;
    if(e.pointerType==='mouse'&&!drag.on)bump.ta=1.6;
    if(drag.on&&e.pointerId===drag.id&&!reduced){
      var now=performance.now(),dx=p[0]-drag.lx,dtm=Math.max(8,now-drag.lt);
      var sens=2.0/Math.max(320,Math.min(hostRect.width,900));
      yawOff+=dx*sens;yawOff=clamp(yawOff,-1.4,1.4);
      velYaw=clamp(dx*sens/dtm*16.7,-.08,.08);
      drag.lx=p[0];drag.ly=p[1];drag.lt=now;
    }
  }
  function endDrag(e,cancelled){
    if(!drag.on||e.pointerId!==drag.id)return;
    drag.on=false;
    var p=rel(e);
    var moved=Math.hypot(p[0]-drag.sx,p[1]-drag.sy),dur=performance.now()-drag.st;
    if(!cancelled&&moved<10&&dur<500){addRipple(p[0],p[1],4.2);}
    if(performance.now()-drag.lt>90){velYaw=0;}
    if(e.pointerType!=='mouse'){bump.ta=0;ptr.tx=0;ptr.ty=0;ptr.inside=false;}
  }
  function onUp(e){endDrag(e,false);}
  function onCancel(e){endDrag(e,true);}
  function onLeave(e){
    if(e.pointerType&&e.pointerType!=='mouse')return;
    bump.ta=0;ptr.tx=0;ptr.ty=0;ptr.inside=false;dirty=true;
  }
  var PO={passive:true},surf=api.surface||host;
  surf.addEventListener('pointerdown',onDown,PO);
  surf.addEventListener('pointermove',onMove,PO);
  surf.addEventListener('pointerup',onUp,PO);
  surf.addEventListener('pointercancel',onCancel,PO);
  surf.addEventListener('pointerleave',onLeave,PO);

  /* ---------- loop ---------- */
  var visible=true;
  var raf=0,last=0,ema=16,slowCount=0;
  function frame(now){
    if(dead)return;
    raf=requestAnimationFrame(frame);
    var dt=last?Math.min((now-last)/1000,.05):.016;last=now;
    if(!reduced){
      ema=ema*.95+dt*1000*.05;
      if(ema>24&&quality>.55){slowCount++;if(slowCount>20){quality=Math.max(.55,quality-.15);slowCount=0;ema=16;resize();}}
      t+=dt;travel+=dt*4.2;
      if(!drag.on){
        yawOff+=velYaw*dt*60;
        var dec=Math.pow(.93,dt*60);velYaw*=dec;
        var ret=1-Math.exp(-dt*.28);yawOff-=yawOff*ret;pitchOff-=pitchOff*(1-Math.exp(-dt*.5));
      }
      var k=1-Math.exp(-dt*4);
      ptr.x+=(ptr.tx-ptr.x)*k;ptr.y+=(ptr.ty-ptr.y)*k;
    }else{
      var k2=1-Math.exp(-dt*4);
      var ox=ptr.x,oy=ptr.y;
      ptr.x+=(ptr.tx-ptr.x)*k2;ptr.y+=(ptr.ty-ptr.y)*k2;
      if(Math.abs(ptr.x-ox)+Math.abs(ptr.y-oy)>1e-4)dirty=true;
    }
    if(reduced&&!dirty)return;
    dirty=false;
    updateCamera();
    // pointer-driven swell under the cursor
    if(!reduced){
      var hit=groundHit(ptr.x,ptr.y);
      var kb=1-Math.exp(-dt*6);
      bump.x+=(hit[0]-bump.x)*kb;bump.z+=(hit[1]-bump.z)*kb;
      bump.a+=(bump.ta-bump.a)*(1-Math.exp(-dt*3));
    }else bump.a=0;
    for(var i=0;i<4;i++){ripArr[i*4]=rips[i].x;ripArr[i*4+1]=rips[i].z;ripArr[i*4+2]=rips[i].s;ripArr[i*4+3]=rips[i].a;}
    // tents along the river banks
    var ti=0;
    for(var kk=Math.floor((cam.e[2]-10)/70);kk<Math.floor((cam.e[2]+115)/70)+1&&ti<4;kk++){
      var tz=kk*70+35;
      if(tz<cam.e[2]-10)continue;
      tentArr[ti*2]=riverX(tz)+-9;tentArr[ti*2+1]=tz;ti++;
    }
    for(;ti<4;ti++){tentArr[ti*2]=-9999;tentArr[ti*2+1]=0;}

    gl.viewport(0,0,W,H);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(progSky);
    gl.uniform3fv(uS.F,cam.f);gl.uniform3fv(uS.R,cam.r);gl.uniform3fv(uS.U,cam.u);
    gl.uniform1f(uS.tan,cam.tan);gl.uniform1f(uS.asp,aspect);gl.uniform1f(uS.time,t);
    gl.bindVertexArray(skyVAO);gl.drawArrays(gl.TRIANGLES,0,3);

    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    var vp=viewProj();
    var snapX=Math.floor(cam.e[0]/CELL)*CELL,snapZ=Math.floor(cam.e[2]/CELL)*CELL;
    gl.useProgram(progTer);
    gl.uniformMatrix4fv(uT.vp,false,vp);
    gl.uniform2f(uT.snap,snapX,snapZ);gl.uniform1f(uT.cell,CELL);
    gl.uniform3fv(uT.cam,cam.e);gl.uniform1f(uT.time,t);
    gl.uniform4fv(uT.rip,ripArr);gl.uniform3f(uT.bump,bump.x,bump.z,bump.a);
    gl.bindVertexArray(terVAO);gl.drawElements(gl.TRIANGLES,idx.length,gl.UNSIGNED_SHORT,0);

    gl.useProgram(progObj);
    gl.uniformMatrix4fv(uO.vp,false,vp);gl.uniform3fv(uO.cam,cam.e);gl.uniform1f(uO.time,t);
    gl.uniform4fv(uO.rip,ripArr);gl.uniform3f(uO.bump,bump.x,bump.z,bump.a);
    gl.uniform1i(uO.mode,0);
    gl.uniform2f(uO.snapT,Math.floor(cam.e[0]/TC)*TC,Math.floor(cam.e[2]/TC)*TC);
    gl.bindVertexArray(treeMesh.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,treeMesh.n,TN*TN);
    gl.uniform1i(uO.mode,1);gl.uniform2fv(uO.tent,tentArr);
    gl.bindVertexArray(tentMesh.vao);gl.drawArraysInstanced(gl.TRIANGLES,0,tentMesh.n,4);
  }
  function start(){if(!raf&&!dead&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(frame);}}
  function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}}
  function onVis(){if(document.hidden)stop();else start();}
  document.addEventListener('visibilitychange',onVis);
  var io=null;
  if(window.IntersectionObserver){io=new IntersectionObserver(function(en){
    visible=en[en.length-1].isIntersecting;if(visible){dirty=true;start();}else stop();
  });io.observe(host);}
  function onLost(e){e.preventDefault();stop();}
  canvas.addEventListener('webglcontextlost',onLost);
  if(reduced){travel=26;t=2;}
  cleanup=function(){
    dead=true;stop();
    surf.removeEventListener('pointerdown',onDown,PO);
    surf.removeEventListener('pointermove',onMove,PO);
    surf.removeEventListener('pointerup',onUp,PO);
    surf.removeEventListener('pointercancel',onCancel,PO);
    surf.removeEventListener('pointerleave',onLeave,PO);
    window.removeEventListener('resize',onResize);
    document.removeEventListener('visibilitychange',onVis);
    canvas.removeEventListener('webglcontextlost',onLost);
    if(ro)ro.disconnect();if(io)io.disconnect();
    try{gl.deleteVertexArray(terVAO);gl.deleteVertexArray(skyVAO);gl.deleteVertexArray(treeMesh.vao);gl.deleteVertexArray(tentMesh.vao);
        gl.deleteProgram(progSky);gl.deleteProgram(progTer);gl.deleteProgram(progObj);}catch(e){}
    try{var lc=gl.getExtension('WEBGL_lose_context');if(lc)lc.loseContext();}catch(e){}
    finish();
  };
  start();

}
function unmount(){var c=cleanup;cleanup=null;if(c)c();else finish();hostRef=null;}
var def={id:'terrain',name:'Low-poly valley',dark:false,mount:mount,unmount:unmount};
if(window.MynnaBackgrounds&&window.MynnaBackgrounds.register)window.MynnaBackgrounds.register('terrain',def);
})();
