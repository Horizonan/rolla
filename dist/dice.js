// A tiny, dependency-free 3D renderer. All geometry is projected into a 2D canvas.
// Roll outcomes are supplied by the app; visual motion never determines randomness.
export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const mul=(a,k)=>a.map(v=>v*k);
export const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const norm=a=>mul(a,1/(Math.hypot(...a)||1));
const avg=vs=>mul(vs.reduce(add,[0,0,0]),1/vs.length);
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const axisQ=(axis,a)=>[...mul(norm(axis),Math.sin(a/2)),Math.cos(a/2)];
export const rotate=(v,q)=>add(v,add(mul(cross(q.slice(0,3),v),2*q[3]),mul(cross(q.slice(0,3),cross(q.slice(0,3),v)),2)));
const betweenQ=(a,b)=>{const d=dot(a,b);if(d<-.9999)return axisQ(Math.abs(a[0])<.9?cross(a,[1,0,0]):cross(a,[0,1,0]),Math.PI);return norm([...cross(a,b),1+d]);};
const blendQ=(a,b,t)=>{if(dot(a,b)<0)b=mul(b,-1);return norm(a.map((v,i)=>v+(b[i]-v)*t));};

function face(vs,value=0,bevel=false){
  let center=avg(vs),normal=norm(cross(sub(vs[1],vs[0]),sub(vs[2],vs[0])));
  if(dot(center,normal)<0){vs=[...vs].reverse();normal=mul(normal,-1);}
  const u=norm(cross(Math.abs(normal[1])>.95?[0,0,1]:[0,1,0],normal));
  return {vs,center,normal,u,v:cross(normal,u),value,bevel};
}

function hull(vertices){
  const faces=[],seen=new Set();
  for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++)for(let k=j+1;k<vertices.length;k++){
    const n=norm(cross(sub(vertices[j],vertices[i]),sub(vertices[k],vertices[i])));
    if(Math.hypot(...n)<.5)continue;
    const distances=vertices.map(v=>dot(n,sub(v,vertices[i])));
    if(distances.some(v=>v>1e-5)&&distances.some(v=>v< -1e-5))continue;
    const indices=distances.map((v,id)=>Math.abs(v)<1e-5?id:-1).filter(id=>id>=0);
    const key=indices.join(',');if(seen.has(key))continue;seen.add(key);
    const points=indices.map(id=>vertices[id]),c=avg(points),u=norm(sub(points[0],c)),v=cross(n,u);
    points.sort((a,b)=>Math.atan2(dot(sub(a,c),v),dot(sub(a,c),u))-Math.atan2(dot(sub(b,c),v),dot(sub(b,c),u)));
    faces.push(face(points,faces.length+1));
  }
  return faces;
}

function cube(){
  const faces=[],b=.84;
  // Broad faces, twelve small edge bevels, and eight rounded-looking corners.
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const others=[0,1,2].filter(i=>i!==axis),vs=[[-b,-b],[b,-b],[b,b],[-b,b]].map(p=>{const v=[0,0,0];v[axis]=sign;v[others[0]]=p[0];v[others[1]]=p[1];return v;});
    const values=[[1,6],[4,3],[2,5]];
    faces.push(face(vs,values[axis][sign===1?1:0]));
  }
  for(let free=0;free<3;free++)for(const a of [-1,1])for(const bsign of [-1,1]){
    const axes=[0,1,2].filter(i=>i!==free),vs=[];
    for(const [height,t]of [[-b,0],[b,0],[b,1],[-b,1]]){const p=[0,0,0];p[free]=height;p[axes[0]]=a*(t?b:1);p[axes[1]]=bsign*(t?1:b);vs.push(p);}
    faces.push(face(vs,0,true));
  }
  for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])faces.push(face([[x,y*b,z*b],[x*b,y,z*b],[x*b,y*b,z]],0,true));
  return faces;
}

const shapeCache=new Map();
export function geometry(sides){
  if(shapeCache.has(sides))return shapeCache.get(sides);
  let faces;
  if(sides===6)faces=cube();
  else if(sides===4)faces=hull([[1,1,1],[-1,-1,1],[-1,1,-1],[1,-1,-1]].map(v=>mul(v,.82)));
  else if(sides===8)faces=hull([[1.4,0,0],[-1.4,0,0],[0,1.4,0],[0,-1.4,0],[0,0,1.4],[0,0,-1.4]]);
  else if(sides===20||sides===12){
    const p=(1+Math.sqrt(5))/2,vs=[];
    for(const a of [-1,1])for(const b of [-1,1])vs.push([0,a,b*p],[a,b*p,0],[b*p,0,a]);
    const ico=hull(vs.map(v=>mul(norm(v),1.45)));
    faces=sides===20?ico:hull(ico.map(f=>mul(norm(f.center),1.43)));
  }else{
    // The dual of a pentagonal antiprism gives ten true kite-shaped faces.
    const vs=[];
    for(let i=0;i<5;i++){const a=2*Math.PI*i/5;vs.push([Math.cos(a),.52,Math.sin(a)],[Math.cos(a+Math.PI/5),-.52,Math.sin(a+Math.PI/5)]);}
    const anti=hull(vs);
    faces=hull(anti.map(f=>mul(f.normal,1.05/dot(f.normal,f.center))));
  }
  const shape={sides,faces,radius:Math.max(...faces.flatMap(f=>f.vs.map(v=>Math.hypot(...v))))};shapeCache.set(sides,shape);return shape;
}

// Z is table-up in world space. The camera is separate, so a level winning
// face can stay on top while the viewer still sees the sides of the die.
export function settledOrientation(sides,value,yaw=.32){
  const standard=[4,6,8,10,12,20].includes(sides);
  const selected=geometry(sides).faces.find(f=>f.value===(standard?value:1));
  const aligned=betweenQ(selected.normal,[0,0,1]);
  const right=rotate(selected.u,aligned);
  return qmul(axisQ([0,0,1],yaw-Math.atan2(right[1],right[0])),aligned);
}

export function supportHeight(shape,q){
  return -Math.min(...shape.faces.flatMap(f=>f.vs.map(p=>rotate(p,q)[2])));
}

export const bounceContacts=[.46,.71,.86];
export function rollMotion(t){
  t=Math.max(0,Math.min(1,t));
  const intervals=[[0,.46,.65,0,.81],[.46,.71,.19,.81,.965],[.71,.86,.068,.965,1]];
  for(const [start,end,peak,a,b] of intervals)if(t<end){
    const u=(t-start)/(end-start);
    return {height:4*peak*u*(1-u),turn:a+(b-a)*u,rock:0};
  }
  const u=(t-.86)/.14;
  return {height:0,turn:1,rock:.085*Math.sin(u*Math.PI*3)*Math.exp(-u*3)*(1-u)**2};
}

export function randomDie(sides,random=globalThis.crypto){
  if(!Number.isInteger(sides)||sides<2||sides>1000)throw new RangeError('Sides must be an integer from 2 to 1000.');
  const limit=2**32-(2**32%sides),buffer=new Uint32Array(1);
  do{random.getRandomValues(buffer);}while(buffer[0]>=limit);
  return buffer[0]%sides+1;
}

const pips={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,-1],[-1,1],[1,-1],[1,1]],5:[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>1-(1-t)**3;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const cameraQ=axisQ([1,0,0],-.62);
export const cameraUp=rotate([0,0,1],cameraQ);
const cameraDistance=20;
const dieYaw=i=>[.32,-.28,.24,-.30,.18,-.22][i%6];

export class DiceRenderer{
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d');if(!this.ctx)throw new Error('Canvas unavailable');
    this.skin={color:[232,44,58],ink:'#fff9f8',shade:'#821d2a',glint:[255,207,213],gloss:.2};this.held=[];this.bounds=[];
    this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.sides=6;this.count=1;this.qs=[];this.positions=[];this.values=[];this.roll=null;this.frame=0;this.resize=()=>{const r=canvas.getBoundingClientRect();this.w=r.width;this.h=r.height;const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);this.ctx.setTransform(d,0,0,d,0,0);this.draw(performance.now());};
    this.observer=new ResizeObserver(this.resize);this.observer.observe(canvas);
    this.set(6,1);
  }
  set(sides,count){this.sides=sides;this.count=count;this.shape=geometry(sides);this.values=[];this.held=[];this.positions=Array.from({length:count},()=>[0,0]);this.qs=Array.from({length:count},(_,i)=>settledOrientation(sides,sides===6?5:1,dieYaw(i)));this.draw(performance.now());}
  setSkin(skin){this.skin=skin;this.draw(performance.now());}
  setHeld(held){this.held=[...held];this.draw(performance.now());}
  hitTest(x,y){return this.bounds.findIndex(b=>x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom);}
  async animate(values,onImpact,held=[]){
    this.values=values;
    this.held=[...held];
    const targets=values.map((value,i)=>held[i]?[...this.qs[i]]:settledOrientation(this.sides,value,dieYaw(i)+(Math.random()-.5)*.12));
    const positions=values.map((_,i)=>held[i]?[...this.positions[i]]:[(Math.random()-.5)*(this.count===1?.65:.3),(Math.random()-.5)*.18]);
    if(this.motion.matches){this.qs=targets;this.positions=positions;this.draw(performance.now());onImpact?.();return;}
    return new Promise(resolve=>{
      this.roll={start:performance.now(),duration:1850,from:this.qs.map(q=>[...q]),fromPositions:this.positions.map(p=>[...p]),positions,targets,axes:values.map(()=>norm([.65+Math.random()*.4,.4+Math.random()*.4,.12+Math.random()*.2])),turns:values.map(()=>Math.random()<.5?2:3),impacts:new Set(),onImpact,resolve};
      const tick=now=>{this.draw(now);if(this.roll)this.frame=requestAnimationFrame(tick);};
      this.frame=requestAnimationFrame(tick);
    });
  }
  project(p,cx,cy,scale){const perspective=cameraDistance/(cameraDistance-p[2]);return[cx+p[0]*scale*perspective,cy-p[1]*scale*perspective];}
  draw(now){
    if(!this.w||!this.h)return;
    const ctx=this.ctx;ctx.clearRect(0,0,this.w,this.h);this.bounds=[];
    let progress=1;
    if(this.roll)progress=clamp((now-this.roll.start)/this.roll.duration,0,1);
    const cols=this.count<=3?this.count:Math.ceil(this.count/2),rows=Math.ceil(this.count/cols);
    const cellWidth=this.w/cols,cellHeight=this.h/rows;
    // Reserve room for the full airborne bounding sphere, so a high corner
    // never clips at the canvas edge during a tumble, including on phones.
    const radius=this.shape.radius,highestCenter=radius+.65;
    const projectedTop=(radius+cameraUp[1]*highestCenter)*cameraDistance/(cameraDistance-radius-cameraUp[2]*highestCenter);
    const scale=Math.min(cellWidth/(radius*3),cellHeight*.67/projectedTop,this.count===1?78:58);
    for(let i=0;i<this.count;i++){
      let q=this.qs[i],height=0,position=this.positions[i];
      if(this.roll&&!this.held[i]){
        const t=clamp((progress-.012*i)/(1-.012*i),0,1),motion=rollMotion(t);
        q=blendQ(this.roll.from[i],this.roll.targets[i],smooth(t/.86));
        q=qmul(axisQ(this.roll.axes[i],motion.turn*Math.PI*2*this.roll.turns[i]),q);
        if(t>=.86)q=qmul(axisQ([1,.45,0],motion.rock),this.roll.targets[i]);
        height=motion.height;
        position=this.roll.fromPositions[i].map((p,j)=>p+(this.roll.positions[i][j]-p)*ease(t));
        position[0]+=Math.sin(t*Math.PI)*(1-t)*(i%2?-.38:.38);
      }
      const row=Math.floor(i/cols),col=i%cols,itemsInRow=Math.min(cols,this.count-row*cols);
      const cx=this.w/2+(col-(itemsInRow-1)/2)*cellWidth;
      const groundY=cellHeight*(row+.73);
      const ground=rotate([...position,0],cameraQ),shadowCenter=this.project(ground,cx,groundY,scale);
      const shadowRadius=scale*(1.5+height*.35),opacity=1/(1+height*1.5);
      ctx.save();ctx.translate(shadowCenter[0]+scale*.08,shadowCenter[1]+scale*.06);ctx.scale(1,.62);const shadow=ctx.createRadialGradient(0,0,0,0,0,shadowRadius);shadow.addColorStop(0,`rgba(47,29,30,${.3*opacity})`);shadow.addColorStop(.52,`rgba(47,29,30,${.16*opacity})`);shadow.addColorStop(1,'rgba(47,29,30,0)');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,shadowRadius,0,Math.PI*2);ctx.fill();ctx.restore();
      const offset=rotate([...position,supportHeight(this.shape,q)+height],cameraQ);
      if(this.held[i]){ctx.save();ctx.strokeStyle='#b58b40';ctx.lineWidth=1.6;ctx.setLineDash([3,4]);ctx.beginPath();ctx.ellipse(shadowCenter[0],shadowCenter[1],scale*1.52,scale*.73,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
      const screenPoints=this.shape.faces.flatMap(f=>f.vs.map(v=>this.project(add(rotate(rotate(v,q),cameraQ),offset),cx,groundY,scale)));
      this.bounds.push({left:Math.min(...screenPoints.map(p=>p[0]))-8,right:Math.max(...screenPoints.map(p=>p[0]))+8,top:Math.min(...screenPoints.map(p=>p[1]))-8,bottom:Math.max(...screenPoints.map(p=>p[1]))+8});
      this.drawDie(q,cx,groundY,scale,this.values[i],this.held[i]||!this.roll||progress>=.86,offset);
    }
    if(this.roll){
      for(const [index,beat] of bounceContacts.entries())if(progress>=beat&&!this.roll.impacts.has(beat)){this.roll.impacts.add(beat);this.roll.onImpact?.([.8,.4,.15][index]);}
      if(progress===1){const r=this.roll;this.qs=r.targets;this.positions=r.positions;this.roll=null;r.resolve();}
    }
  }
  drawDie(worldQ,cx,cy,scale,result,settled,offset){
    const ctx=this.ctx,light=norm([-.6,1,1.7]);
    const q=qmul(cameraQ,worldQ);
    const visible=this.shape.faces.map(f=>({...f,up:rotate(f.normal,worldQ)[2],n:rotate(f.normal,q),c:add(rotate(f.center,q),offset),points:f.vs.map(v=>add(rotate(v,q),offset))})).filter(f=>dot(f.n,sub([0,0,cameraDistance],f.c))>0).sort((a,b)=>a.c[2]-b.c[2]);
    for(const f of visible){
      const pts=f.points.map(p=>this.project(p,cx,cy,scale)),lighting=clamp(dot(f.n,light),-.6,1);
      const brightness=.54+lighting*.42+(f.bevel?.04:0);
      const rgb=this.skin.color.map(v=>Math.round(v*brightness)),shine=ctx.createLinearGradient(cx-scale,cy-scale*1.5,cx+scale,cy+scale*1.5);
      shine.addColorStop(0,`rgb(${rgb.map((v,i)=>clamp(v+(i===0?17:10),0,255)).join(',')})`);shine.addColorStop(.45,`rgb(${rgb.join(',')})`);shine.addColorStop(1,`rgb(${rgb.map(v=>Math.round(v*.87)).join(',')})`);
      ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=shine;ctx.fill();ctx.lineJoin='round';ctx.lineWidth=.7;ctx.strokeStyle=`rgb(${rgb.join(',')})`;ctx.stroke();
      if(f.bevel||!f.value)continue;
      const spec=Math.pow(Math.max(0,dot(f.n,norm([-.25,.6,1]))),12)*this.skin.gloss;
      if(spec>.02){ctx.fillStyle=`rgba(${this.skin.glint.join(',')},${spec})`;ctx.fill();}
      const center=this.project(f.c,cx,cy,scale),u=this.project(add(f.c,rotate(f.u,q)),cx,cy,scale),v=this.project(add(f.c,rotate(f.v,q)),cx,cy,scale);
      ctx.save();ctx.setTransform(this.canvas.width/this.w,0,0,this.canvas.height/this.h,0,0);ctx.transform(u[0]-center[0],u[1]-center[1],-(v[0]-center[0]),-(v[1]-center[1]),center[0],center[1]);
      // Retain side markings for depth, but give the upper face full contrast.
      ctx.globalAlpha=settled&&f.up<.99?.32:1;
      if(this.sides===6){
        for(const [px,py]of pips[f.value]){const x=px*.43,y=py*.43;ctx.beginPath();ctx.arc(x,y,.127,0,Math.PI*2);ctx.fillStyle=this.skin.shade;ctx.fill();ctx.beginPath();ctx.arc(x+.004,y+.021,.112,0,Math.PI*2);ctx.fillStyle=this.skin.ink;ctx.fill();}
      }else{
        const standard=[4,6,8,10,12,20].includes(this.sides);
        const value=!standard&&result&&f.value===1?result:(this.sides===100?f.value*10:((f.value-1)%this.sides)+1);
        const size=this.sides===4?.48:this.sides===20?.38:this.sides===8?.44:.46;
        ctx.font=`600 ${size}px 'DM Sans',sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=this.skin.shade;ctx.fillText(String(value),.006,.02);ctx.fillStyle=this.skin.ink;ctx.fillText(String(value),0,0);
        if(value===6||value===9){ctx.fillRect(-.1,.22,.2,.018);}
      }
      ctx.restore();
      // A fine warm edge catches the light along the bevel.
      if(f.n[1]>.1){ctx.beginPath();ctx.moveTo(...pts[0]);ctx.lineTo(...pts[1]);ctx.strokeStyle=`rgba(${this.skin.glint.join(',')},${Math.max(.05,lighting*.22)})`;ctx.lineWidth=.7;ctx.stroke();}
    }
  }
}
