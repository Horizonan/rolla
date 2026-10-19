export class MomentEffects {
  constructor(canvas,badge){this.canvas=canvas;this.badge=badge;this.ctx=canvas.getContext('2d');this.motion=matchMedia('(prefers-reduced-motion: reduce)');this.frame=0;this.timer=0;}
  clear(){cancelAnimationFrame(this.frame);clearTimeout(this.timer);this.ctx?.clearRect(0,0,this.canvas.width,this.canvas.height);this.badge.hidden=true;this.canvas.parentElement.classList.remove('moment-lucky','moment-unlucky','moment-chaos');}
  play(moment){
    this.clear();if(!moment)return;
    const {kind,label,detail}=moment;
    this.badge.replaceChildren();const title=document.createElement('strong'),subtitle=document.createElement('span');title.textContent=label;subtitle.textContent=detail;this.badge.append(title,subtitle);this.badge.dataset.kind=kind;this.badge.hidden=false;
    this.canvas.parentElement.classList.add(`moment-${kind}`);
    this.timer=setTimeout(()=>this.clear(),3800);
    if(this.motion.matches||!this.ctx)return;
    const rect=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=rect.width,h=rect.height;
    this.canvas.width=w*d;this.canvas.height=h*d;const ctx=this.ctx;ctx.setTransform(d,0,0,d,0,0);
    const center=[w/2,h*.42],dark=kind==='unlucky',count=dark?38:66;
    const colors=dark?['#9676b5','#565676','#c3abc9']:kind==='chaos'?['#d2a13c','#e9c36a','#8270ab']:['#d4a43c','#e3b754','#f6d98d','#f2eee2'];
    const particles=Array.from({length:count},(_,i)=>({a:Math.PI*2*i/count+(Math.random()-.5)*.4,speed:45+Math.random()*150,size:2+Math.random()*3,delay:Math.random()*.12,color:colors[i%colors.length],spin:Math.random()*6}));
    const cracks=Array.from({length:7},(_,i)=>{const a=i*Math.PI*2/7;return Array.from({length:5},(_,j)=>{const r=15+j*26;return[center[0]+Math.cos(a+(Math.random()-.5)*.25)*r,center[1]+Math.sin(a+(Math.random()-.5)*.25)*r*.6];});});
    const start=performance.now();
    const draw=now=>{
      const t=(now-start)/1000;ctx.clearRect(0,0,w,h);if(t>2.9)return;
      if(dark||kind==='chaos'){
        ctx.globalAlpha=Math.max(0,1-t/1.5)*.5;ctx.strokeStyle='#766187';ctx.lineWidth=1.5;
        for(const points of cracks){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke();}
      }
      ctx.globalAlpha=Math.max(0,1-t/1.15)*.5;ctx.strokeStyle=dark?'#9886ac':'#d8b655';ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(...center,25+t*110,12+t*56,0,0,Math.PI*2);ctx.stroke();
      for(const p of particles){
        const age=t-p.delay;if(age<0)continue;
        const x=center[0]+Math.cos(p.a)*p.speed*age*.8,y=center[1]+Math.sin(p.a)*p.speed*age*.55+(dark?70:48)*age*age-(dark?0:50)*age;
        ctx.save();ctx.globalAlpha=Math.max(0,1-age/2.6);ctx.translate(x,y);ctx.rotate(p.spin+age*2);ctx.fillStyle=p.color;
        ctx.beginPath();if(dark){ctx.moveTo(-p.size,0);ctx.lineTo(0,-p.size*2);ctx.lineTo(p.size,0);ctx.lineTo(0,p.size);}
        else{for(let j=0;j<8;j++){const a=j*Math.PI/4,r=j%2?p.size*.3:p.size;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}}ctx.closePath();ctx.fill();ctx.restore();
      }
      ctx.globalAlpha=1;this.frame=requestAnimationFrame(draw);
    };this.frame=requestAnimationFrame(draw);
  }
}
